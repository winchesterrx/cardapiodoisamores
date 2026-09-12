import pool from './db.js';
async function run() {
  const [rows] = await pool.query(`SELECT id, name, type FROM addons WHERE name LIKE '%Creme%'`);
  console.log('cremes:', rows);
  process.exit(0);
}
run();
