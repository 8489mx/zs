const fs = require('fs');
const path = require('path');

const excludeDirs = ['pos', 'cash-drawer'];
const featuresDir = path.join(__dirname, 'frontend/src/features');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        processDir(fullPath);
      }
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('import { Card } from \'@/shared/ui/card\';')) {
        let newContent = content.replace(
          /import \{ Card \} from '@\/shared\/ui\/card';/g,
          `import { FormSection } from '@/shared/components/form-section';`
        );
        newContent = newContent.replace(/<Card/g, '<FormSection');
        newContent = newContent.replace(/<\/Card>/g, '</FormSection>');
        
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(featuresDir);
