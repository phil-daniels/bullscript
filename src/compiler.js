const fs = require(`fs`);
const esbuild = require(`esbuild`);
const lex = require(`./lex`);
const generateJs = require(`./generate-js`);

const APP_FILE_REGEX = /#\s+application/;
const LIB_FILE_REGEX = /#\s+library/;

function compileToCodeComponents(sourceFiles, cache) {
  // TODO use cache
  const appSourceList = groupSourceFilesByApp(sourceFiles);
  return appSourceList.map(appSource => {
    const componentCode = generateAppCode(appSource.mainSourceFile, sourceFiles);
    return {name: componentCode.browserTitle, ...componentCode, moduleName: appSource.moduleName, mainSourceFile: appSource.mainSourceFile};
  });
}

function compileToDeployableFiles(sourceFiles, standardLangTemplate, serverTemplate, browserTemplate, indexTemplate, outputDir) {
  const appSourceList = compileToCodeComponents(sourceFiles, null);
  return appSourceList.map(appSource => {
    let mainCode = standardLangTemplate + (appSource.appBrowserInitCode || ``) + appSource.appMainCode;
    try {
      mainCode = esbuild.transformSync(mainCode)?.code;
    } catch (e) {
      console.log(mainCode);
      throw e;
    }
    if (appSource.mainSourceFile.appType === `component`) {
      mainCode = browserTemplate.replace("/*BROWSER_APP_CODE*/", mainCode)
          .replaceAll(`\\`, `\\\\`)
          .replaceAll(`\``, `\\\``);
      mainCode = indexTemplate
          .replace(`<!--TITLE-->`, appSource.browserTitle)
          .replace(`/*BROWSER_CODE*/`, mainCode);
      mainCode = serverTemplate
          .replace(`/*BROWSER_HTML*/`, mainCode)
          .replace(`/*SERVER_INIT_CODE*/`, appSource.appServerInitCode)
          .replace(`/*SERVER_REQUEST_CODE*/`, appSource.appServerCode);
    }
    const outputFileName = appSource.moduleName || `app`;
    return {appName: appSource.name, fileName: `${outputDir}/${outputFileName}.js`, js: mainCode};
  });
};

function groupSourceFilesByApp(sourceFiles) {
  sourceFiles.forEach(sourceFile => {
    let [moduleName, ...rest] = sourceFile.path.split(`/`);
    if (rest.length === 0) {
      rest[0] = moduleName;
      moduleName = ``;
    }
    sourceFile.moduleName = moduleName;
    sourceFile.modulePath = rest.join(`/`);
  });
  let mainFiles = sourceFiles.filter(_ => _.name === `main.bs`);
  mainFiles.forEach(file => {
    if (!APP_FILE_REGEX.test(file.contents) && !LIB_FILE_REGEX.test(file.contents)) {
      file.contents = `# application\n${file.contents}`;
    }
    return file;
  });
  const appSourceFiles = mainFiles.map(mainFile => {
    const mainPath = mainFile.path;
    const rootDir = mainPath.substring(0, mainPath.length - `main.bs`.length);
    const appSourceFiles = sourceFiles.filter(_ => `${_.moduleName}/` === rootDir);
    if (mainPath.endsWith(`/`)) mainPath = mainPath.substring(-1); // remove trailing slash
    const moduleName = mainPath.substring(0, mainPath.indexOf(`/`));
    return {rootDir, sourceFiles: appSourceFiles, mainSourceFile: mainFile, moduleName};
  });
  return appSourceFiles;
}

function generateAppCode(mainFile, files) {
  try {
    lex(mainFile, files);
    generateJs(mainFile, files);
    let appDatabaseCode = ``;
    let appServerInitCode = ``;
    let appServerCode = ``;
    let appBrowserHeadCode = ``;
    let appBrowserInitCode = ``;
    let appMainCode = ``;
    for (const file of files) {
      if (!file.js) continue;
      appDatabaseCode += file.js.databaseCode || ``;
      appServerInitCode += file.js.serverInitCode || ``;
      appServerCode += file.js.serverCode || ``;
      appBrowserHeadCode += file.js.browserHeadCode || ``;
      appBrowserInitCode += file.js.browserInitCode || ``;
      appMainCode += file.js.mainCode;
    }
    if (mainFile.appType === `component`) {
      appMainCode += `_render()`;
    } else {
      appMainCode += `_import("${mainFile.moduleName}", "${mainFile.modulePath}");`
    }
    return {appDatabaseCode, appServerInitCode, appServerCode, appBrowserHeadCode, appBrowserInitCode, appMainCode, browserTitle: mainFile.js.browserTitle};
  } catch(e) {
    if (e instanceof Error) {
      console.error(`UNEXPECTED ERROR OCCURRED`);
      console.error(e.stack);
    } else {
      writeError(e);
    }
    process.exit(1);
  }
}

function writeError(error) {
  const file = error.file;
  console.error();
  console.error();
  console.error(`-- ${error.type} ERROR ------------------------------ ${file.name}`);
  console.error();
  console.error(error.msg);
  console.error();
  const lines = file.contents.split(`\n`);
  let position = 0;
  let startLineIndex = 0;
  let endLineIndex = 0;
  let columnNumber = 0;
  let lineNumber = 0;
  for (let line of lines) {
    lineNumber++;
    if (position + line.length < error.position) {
      position += line.length + 1; // +1 for newline
    } else {
      startLineIndex = position;
      endLineIndex = position + line.length;
      columnNumber = error.position - position;
      break;
    }
  }
  const lineNumberWidth = (`` + lineNumber).length;
  console.error(`${lineNumber} | ${file.contents.substring(startLineIndex, endLineIndex)}`);
  console.error(`${``.padStart(lineNumberWidth)}   ${``.padStart(columnNumber)}^`);
  console.error();
  console.error();
}

module.exports = {compileToCodeComponents, compileToDeployableFiles};
