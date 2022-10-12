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
  for (const file of files) {
    const moduleName = `$${file.path.replaceAll(`/`, `_`).replaceAll(`.`, `$`)}`;
    appBrowserCode += `const ${moduleName} = function($props) {`;
    const tokens = lex(file.contents);
    const {serverInit, serverRequest, browser} = generateJs(tokens, file.name.endsWith(`.component.bs`));
    appServerInitCode += serverInit;
    appServerRequestCode += serverRequest;
    appBrowserCode += browser;
    appBrowserCode += `};`;
  }
  return {serverInitCode: appServerInitCode, serverRequestCode: appServerRequestCode, browserCode: appBrowserCode};
}