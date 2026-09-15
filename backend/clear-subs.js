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

  // Apagar subscrições do admin (vamos forçar recriar apenas a válida)
  await connection.query('DELETE FROM admin_push_subscriptions');
  console.log("Subscrições antigas apagadas.");

  await connection.end();
}

run().catch(console.error);
