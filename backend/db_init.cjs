const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();
const crypto = require('crypto');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });
  
  await connection.query('SET SESSION sql_require_primary_key = 0;');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  
  const tables = ['product_addons', 'order_item_addons', 'addons', 'addon_categories', 'products', 'categories', 'coupons', 'customers', 'loyalty_settings', 'order_timelines', 'orders', 'order_items', 'product_images', 'push_subscriptions', 'store_settings', 'users'];
  
  for (const table of tables) {
    try {
      await connection.query('DROP TABLE IF EXISTS `' + table + '`;');
    } catch(e) {}
  }
  
  const sql = fs.readFileSync('schema_fixed.sql', 'utf8');
  // split by ; and execute sequentially
  const statements = sql.split(';').filter(s => s.trim().length > 0);
  for (let s of statements) {
    try {
      if (s.trim().length > 5) {
        await connection.query(s);
      }
    } catch (e) {
      console.log('Error on stmt:', s.substring(0, 50));
      console.error(e);
    }
  }
  
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  
  // Clear data
  await connection.query('DELETE FROM product_addons;');
  await connection.query('DELETE FROM order_item_addons;');
  await connection.query('DELETE FROM addons;');
  await connection.query('DELETE FROM addon_categories;');
  await connection.query('DELETE FROM products;');
  await connection.query('DELETE FROM categories;');
  
  // Create Category
  const catId = crypto.randomUUID();
  await connection.query('INSERT INTO categories (id, name, order_index) VALUES (?, ?, ?)', [catId, 'Açaí', 0]);
  
  // Create Products
  const p1Id = crypto.randomUUID();
  const p2Id = crypto.randomUUID();
  const p3Id = crypto.randomUUID();
  
  await connection.query('INSERT INTO products (id, name, description, price, category_id) VALUES (?, ?, ?, ?, ?)', [p1Id, 'Açaí Pequeno', 'Açaí no copo pequeno (300ml). Escolha seus adicionais!', 18.00, catId]);
  await connection.query('INSERT INTO products (id, name, description, price, category_id) VALUES (?, ?, ?, ?, ?)', [p2Id, 'Açaí Médio', 'Açaí no copo médio (500ml). Escolha seus adicionais!', 20.00, catId]);
  await connection.query('INSERT INTO products (id, name, description, price, category_id) VALUES (?, ?, ?, ?, ?)', [p3Id, 'Açaí Grande', 'Açaí no copo grande (700ml). Escolha seus adicionais!', 22.00, catId]);
  
  console.log('Tabelas recriadas e produtos de Açaí inseridos!');
  await connection.end();
}
run().catch(console.error);
