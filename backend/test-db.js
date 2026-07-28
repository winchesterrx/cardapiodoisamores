import db from './db.js';

async function run() {
  const [rows] = await db.query('SELECT * FROM orders');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
