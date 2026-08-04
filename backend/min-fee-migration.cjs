require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    console.log("Conectado ao banco de dados.");
    try {
      await db.query(`ALTER TABLE \`store_settings\` ADD COLUMN \`delivery_fee_minimum\` DECIMAL(10,2) DEFAULT 0.00;`);
      console.log("Coluna delivery_fee_minimum adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("delivery_fee_minimum já existe.");
      else throw e;
    }
  } catch (err) {
    console.error("Erro na migração:", err);
  } finally {
    await db.end();
  }
}

migrate();
