import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails('mailto:contato@exemplo.com', publicVapidKey, privateVapidKey);
} else {
  console.error("Faltam as chaves VAPID no .env!");
  process.exit(1);
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  const [adminSubs] = await connection.query('SELECT * FROM admin_push_subscriptions');
  console.log("Found", adminSubs.length, "admin subscriptions. Sending test push...");

  const payload = JSON.stringify({
    title: 'Teste de Push do Agente',
    body: 'Isso é um teste de notificação web push forçado.',
    url: '/admin'
  });

  for (const sub of adminSubs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    };
    try {
      await webpush.sendNotification(pushSubscription, payload);
      console.log('Push enviado com sucesso para endpoint:', sub.endpoint);
    } catch (e) {
      console.error('Erro ao enviar push pro admin:', e);
    }
  }

  await connection.end();
}

run().catch(console.error);
