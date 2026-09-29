const fs = require('node:fs');
const path = require('node:path');

const versionPath = path.resolve(__dirname, '../build-version.json');
const d = new Date();
const mm = String(d.getMonth() + 1).padStart(2, '0');
const dd = String(d.getDate()).padStart(2, '0');
const todayDate = `${mm}${dd}`;

let sequence = 1;
try {
  if (fs.existsSync(versionPath)) {
    const current = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    if (current.date === todayDate && typeof current.sequence === 'number') {
      sequence = current.sequence + 1;
    }
  }
} catch (e) {
  sequence = 1;
}

const buildId = `${todayDate}-${String(sequence).padStart(4, '0')}`;
const data = {
  date: todayDate,
  sequence,
  buildId,
};

fs.writeFileSync(versionPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`[build-version] Build ID: ${buildId}`);
