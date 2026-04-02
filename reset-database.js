const fs = require('fs');
const files = ['data/zstore.db', 'data/zstore.db-shm', 'data/zstore.db-wal'];
files.forEach(f => {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log('Deleted: ' + f);
  }
});
console.log('Database reset done.');
