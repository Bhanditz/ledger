import { Client } from 'pg';

const client = new Client({
  user: 'marco',
  host: 'localhost',
  database: 'opencollective_prod_snapshot',
  // password: 'secretpassword',
  port: 5432,
});

client.connect();

client.query('SELECT * FROM "Collectives" limit 10', (err, res) => {
  console.error(err, res);
  client.end();
});

