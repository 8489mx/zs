const fs = require('fs');
const path = require('path');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filePath.endsWith(filter)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = findFiles('c:/zn/frontend/src', '.tsx');
let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.match(/\balert\(/)) {
    content = content.replace(/\balert\(/g, 'systemAlert(');
    
    // Add import if not present
    if (!content.includes('systemAlert } from')) {
      // Find the last import statement
      const importRegex = /^import\s+.*?;\s*$/gm;
      let lastImportIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      
      const importStmt = `\nimport { systemAlert } from '@/shared/components/system-alert';\n`;
      if (lastImportIndex > 0) {
        content = content.slice(0, lastImportIndex) + importStmt + content.slice(lastImportIndex);
      } else {
        content = importStmt + content;
      }
    }
    
    fs.writeFileSync(file, content);
    console.log('Updated: ' + file);
    updatedCount++;
  }
}

console.log('Total files updated: ' + updatedCount);
