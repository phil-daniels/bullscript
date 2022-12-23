const fs = require(`fs`);

function getFilesRecursively(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + `/` + file;
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(file));
    } else { 
      results.push(file);
    }
  });
  return results;
};

module.exports = getFilesRecursively;
