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

  const [adminRows] = await connection.query('SELECT * FROM admin_push_subscriptions');
  console.log("Admin subscriptions:", adminRows.length);
  console.log(adminRows);

  const [customerRows] = await connection.query('SELECT * FROM push_subscriptions');
  console.log("Customer subscriptions:", customerRows.length);

  await connection.end();
}

run().catch(console.error);
