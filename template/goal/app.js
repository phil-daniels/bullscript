const http = require('http');
const fs = require("fs");

let appHtml;



http.createServer((request, response) => {
  let content;
  if (request.url === "/") {
    content = appHtml;
  } else if (request.url !== "/favicon.ico") {
    content = fs.readFileSync("dist" + request.url);
  } else {
    response.writeHead(404, {'Content-Type': 'text/html'});
    response.write("Not found");
    response.end();
    return;
  }
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(content);
  response.end();
}).listen(8080);

console.log("Started!");

appHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title><!--TITLE--></title>
    <script src="https://ajax.googleapis.com/ajax/libs/incrementaldom/0.5.1/incremental-dom.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.9.4/css/bulma.min.css" integrity="sha512-HqxHUkJM0SYcbvxUw5P60SzdOTy/QVwA1JJrvaXJv4q7lmbDZCmZaqz01UPOaQveoxfYRv1tHozWGPMcuTBuvQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <!--HEAD-->
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script src="browser-template.js"></script>
  </body>
</html>

`;