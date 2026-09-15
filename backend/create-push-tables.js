import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  console.log("Conectado ao banco de dados!");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`customer_cpf\` VARCHAR(20) NOT NULL,
      \`endpoint\` TEXT NOT NULL,
      \`p256dh\` TEXT NOT NULL,
      \`auth\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`customer_cpf\` (\`customer_cpf\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`admin_push_subscriptions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`endpoint\` TEXT NOT NULL,
      \`p256dh\` TEXT NOT NULL,
      \`auth\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`endpoint\` (\`endpoint\`(191))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("Tabelas criadas com sucesso!");
  await connection.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
