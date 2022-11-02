const fs = require(`fs`);
const esbuild = require(`esbuild`);
const lex = require(`./lex`);
const generateJs = require(`./generate-js`);

module.exports = (indexTemplatePath, browserTemplatePath, serverTemplatePath, files) => {
  let serverTemplateCode = fs.readFileSync(serverTemplatePath, 'utf-8');
  let browserTemplateCode = fs.readFileSync(browserTemplatePath, 'utf-8');
  let indexTemplateCode = fs.readFileSync(indexTemplatePath, 'utf-8');
  let {serverInitCode, serverRequestCode, browserCode} = generateAppCode(files);
  try {
    browserCode = esbuild.transformSync(browserCode)?.code;
  } catch (e) {
    console.log(browserCode);
    throw e;
  }
  browserTemplateCode = browserTemplateCode.replace("/*BROWSER_APP_CODE*/", browserCode);
  browserTemplateCode = browserTemplateCode.replaceAll(`\\`, `\\\\`).replaceAll(`\``, `\\\``)
  indexTemplateCode = indexTemplateCode.replace("/*BROWSER_CODE*/", browserTemplateCode);
  serverTemplateCode = serverTemplateCode
      .replace("/*BROWSER_HTML*/", indexTemplateCode)
      .replace("/*SERVER_INIT_CODE*/", serverInitCode)
      .replace("/*SERVER_REQUEST_CODE*/", serverRequestCode);
  return serverTemplateCode;
};

function generateAppCode(files) {
  let appServerInitCode = "";
  let appServerRequestCode = "";
  let appBrowserCode = "";
  let currentFile;
  try {
    const mainFiles = files.filter(x => x.path === `main.bs`);
    if (mainFiles.length === 0) throw new Error(`no main.bs found`);
    const mainFile = mainFiles[0];
    lex(mainFile);
    generateJs(mainFile, files);
  } catch(e) {
    if (e instanceof Error) {
      console.error(`UNEXPECTED ERROR OCCURRED`);
      console.error(e.stack);
    } else {
      writeError(e);
    }
    process.exit(1);
  }
  return {serverInitCode: appServerInitCode, serverRequestCode: appServerRequestCode, browserCode: appBrowserCode};
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
