const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('Iniciando migração do Banco de Dados para Fidelidade...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    const sql = `
      CREATE TABLE IF NOT EXISTS \`loyalty_settings\` (
        \`id\` INT PRIMARY KEY DEFAULT 1,
        \`active\` BOOLEAN DEFAULT FALSE,
        \`spent_amount\` DECIMAL(10,2) DEFAULT 1.00,
        \`points_earned\` INT DEFAULT 1,
        \`points_for_discount\` INT DEFAULT 10,
        \`discount_amount\` DECIMAL(10,2) DEFAULT 1.00
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS \`customers\` (
        \`cpf\` VARCHAR(20) PRIMARY KEY,
        \`points\` INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      INSERT IGNORE INTO \`loyalty_settings\` (\`id\`, \`active\`, \`spent_amount\`, \`points_earned\`, \`points_for_discount\`, \`discount_amount\`)
      VALUES (1, 0, 1.00, 1, 10, 1.00);
    `;

    console.log('Executando script...');
    await connection.query(sql);
    console.log('Migração concluída com sucesso!');
    await connection.end();
  } catch (err) {
    console.error('Erro na migração:', err);
  }
}

migrate();
