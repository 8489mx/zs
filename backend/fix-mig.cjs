const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres@127.0.0.1:5433/zs_dev' });
client.connect().then(() => {
  client.query("UPDATE kysely_migration SET name = '2030000000001_delivery_representatives.ts' WHERE name = '2030000000000_delivery_representatives.ts'").then(() => {
    console.log('Fixed DB');
    client.end();
  });
});
