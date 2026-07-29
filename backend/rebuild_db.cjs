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
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  });
  
  try {
    await connection.query('SET SESSION sql_require_primary_key = 0;');
  } catch (e) {
    console.log('Ignore sql_require_primary_key error:', e.message);
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  
  const [rows] = await connection.query('SHOW TABLES');
  for (const row of rows) {
    const tableName = Object.values(row)[0];
    await connection.query('DROP TABLE IF EXISTS `' + tableName + '`;');
  }
  
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  
  const sql = fs.readFileSync('schema_fixed.sql', 'utf8');
  await connection.query(sql);
  
  // Clear data just in case
  await connection.query('DELETE FROM product_addons;');
  await connection.query('DELETE FROM order_item_addons;');
  await connection.query('DELETE FROM addons;');
  await connection.query('DELETE FROM addon_categories;');
  await connection.query('DELETE FROM products;');
  await connection.query('DELETE FROM categories;');
  
  // Create Category
  const catId = "acai";
  await connection.query('INSERT INTO categories (id, name, order_index) VALUES (?, ?, ?)', [catId, 'Açaí', 0]);
  
  // Create Products
  const p1Id = "1";
  const p2Id = "2";
  const p3Id = "3";
  
  await connection.query('INSERT INTO products (id, name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?, ?)', [p1Id, 'Açaí Pequeno', 'Açaí no copo pequeno (300ml). Escolha seus adicionais!', 18.00, 'https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', catId]);
  await connection.query('INSERT INTO products (id, name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?, ?)', [p2Id, 'Açaí Médio', 'Açaí no copo médio (500ml). Escolha seus adicionais!', 20.00, 'https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', catId]);
  await connection.query('INSERT INTO products (id, name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?, ?)', [p3Id, 'Açaí Grande', 'Açaí no copo grande (700ml). Escolha seus adicionais!', 22.00, 'https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', catId]);
  
  console.log('Tabelas recriadas e produtos de Açaí inseridos com sucesso!');
  await connection.end();
}
run().catch(console.error);
