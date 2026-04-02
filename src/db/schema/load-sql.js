const fs = require('fs');
const path = require('path');

function loadSqlFile(name) {
  return fs.readFileSync(path.join(__dirname, name), 'utf8').trim();
}

module.exports = {
  loadSqlFile,
};
