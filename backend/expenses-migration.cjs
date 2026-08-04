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
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`expenses\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`date\` DATE NOT NULL,
        \`category\` VARCHAR(100) NOT NULL DEFAULT 'Outros',
        \`description\` VARCHAR(255) NOT NULL,
        \`amount\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`note_ref\` VARCHAR(100) DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Tabela 'expenses' criada com sucesso (ou já existia).");
  } catch (err) {
    console.error("Erro na migração:", err);
  } finally {
    await db.end();
  }
}

migrate();
