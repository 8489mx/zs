const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres@127.0.0.1:5433/zs_dev' });
client.connect().then(() => {
  client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'hr_%'").then(res => {
    console.log(res.rows);
    client.end();
  });
});
