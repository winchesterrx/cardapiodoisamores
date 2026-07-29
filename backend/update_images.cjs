const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  await connection.query('UPDATE products SET image = ? WHERE id = ?', ['/uploads/copos_300ml.png', '1']);
  await connection.query('UPDATE products SET image = ? WHERE id = ?', ['/uploads/copos_500ml.png', '2']);
  await connection.query('UPDATE products SET image = ? WHERE id = ?', ['/uploads/copos_700ml.png', '3']);

  console.log("Images updated successfully in the database!");
  await connection.end();
}

run().catch(console.error);
