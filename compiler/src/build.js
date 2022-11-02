const fs = require("fs");
const compile = require("./compile");
const path = require("path");

const DIST_DIR = "./dist";
const DIST_FILE = DIST_DIR + "/app.js";
const COMPILER_SRC = "./compiler/src";
const INDEX_TEMPLATE = COMPILER_SRC + "/template/index-template.html";
const BROWSER_TEMPLATE = COMPILER_SRC + "/template/browser-template.js";
const SERVER_TEMPLATE = COMPILER_SRC + "/template/server-template.js";
const APP_DIR = "app";

const fileNames = getFileNamesRecursively(APP_DIR);
const files = fileNames.map(_ => {
  const path = _.substring(APP_DIR.length + 1);
  return {
    path,
    name: _.substring(_.lastIndexOf("/") + 1),
    contents: fs.readFileSync(_).toString(),
    id: path.replaceAll(`/`, `--`).replaceAll(`.`, `-`),
  };
});
const appCode = compile(INDEX_TEMPLATE, BROWSER_TEMPLATE, SERVER_TEMPLATE, files);

console.log(path.resolve(DIST_DIR));

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR);
fs.writeFileSync(DIST_FILE, appCode);

function getFileNamesRecursively(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFileNamesRecursively(file));
    } else { 
      results.push(file);
    }
  });
  return results;
}
