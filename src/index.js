const fs = require(`fs`);
const path = require(`path`);
const compiler = require("./compiler");
const getFilesRecursively = require(`./get-files-recursively`);

const dirName = path.resolve();

if (process.argv.length !== 4) {
  printUsageAndExit();
}

const inputDir = process.argv[2];
const outputDir = process.argv[3];
const inputFiles = loadFiles();
const outputFiles = compiler.compileToDeployableFiles(
  inputFiles.sourceFiles,
  inputFiles.standardLangTemplate,
  inputFiles.serverTemplate,
  inputFiles.browserTemplate,
  inputFiles.indexTemplate,
  outputDir,
);
writeOutput(outputFiles);
console.log(`compile SUCCEEDED!`);

function printUsageAndExit() {
  console.error(`Usage: node bullscript <input-directory> <output-directory>`);
  process.exit(1);
}

function loadFiles() {
  validateDirectoryArg(inputDir, `input`);
  const fileNames = getFilesRecursively(inputDir);
  const sourceFiles = fileNames.map(_ => {
    const path = _.substring(inputDir.length + 1);
    return {
      path,
      name: _.substring(_.lastIndexOf(`/`) + 1),
      contents: fs.readFileSync(_).toString().trim(),
    };
  });
  const standardLangTemplatePath = dirName + `/template/standard-lang.js`;
  const indexTemplatePath = dirName + `/template/index-template.html`;
  const browserTemplatePath = dirName + `/template/browser-template.js`;
  const serverTemplatePath = dirName + `/template/server-template.js`;
  const serverTemplate = fs.readFileSync(serverTemplatePath, `utf-8`);
  const browserTemplate = fs.readFileSync(browserTemplatePath, `utf-8`);
  const indexTemplate = fs.readFileSync(indexTemplatePath, `utf-8`);
  const standardLangTemplate = fs.readFileSync(standardLangTemplatePath, `utf-8`);
  return {sourceFiles, standardLangTemplate, serverTemplate, browserTemplate, indexTemplate};
}

function writeOutput(outputFiles) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir);
  outputFiles.forEach(f => fs.writeFileSync(f.fileName, f.js));
}

function validateDirectoryArg(path, description) {
  const statResult = fs.statSync(path);
  if (!statResult) {
    console.error(`${description} path "${path}" doesn't exist`);
    printUsageAndExit();
  }
  if (!statResult.isDirectory()) {
    console.error(`${description} path "${path}" is not a directory`);
    printUsageAndExit();
  }
}
