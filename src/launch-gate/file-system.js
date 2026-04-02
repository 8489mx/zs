const fs = require('fs');
const path = require('path');

function fileExists(projectRoot, relPath) {
  return fs.existsSync(path.join(projectRoot, relPath));
}

function readFile(projectRoot, relPath) {
  try {
    return fs.readFileSync(path.join(projectRoot, relPath), 'utf8');
  } catch {
    return '';
  }
}

module.exports = { fileExists, readFile };
