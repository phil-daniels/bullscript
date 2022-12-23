const http = require('http');

let appHtml;

/*SERVER_INIT_CODE*/

http.createServer((request, response) => {
  /*SERVER_REQUEST_CODE*/
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.write(appHtml);
  response.end();
}).listen(8080);

console.log("Started!");

appHtml = `
/*BROWSER_HTML*/
`;