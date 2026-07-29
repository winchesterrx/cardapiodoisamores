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

  console.log("Connected to Aiven MySQL");
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

  const tables = ['product_addons', 'order_item_addons', 'addons', 'addon_categories', 'products', 'categories', 'coupons', 'customers', 'loyalty_settings', 'order_timelines', 'orders', 'order_items', 'product_images', 'push_subscriptions', 'store_settings', 'users'];
  
  for (const t of tables) {
    try {
      await connection.query(`DROP TABLE IF EXISTS \`${t}\`;`);
      console.log(`Dropped ${t}`);
    } catch(e) {
      console.log(`Failed dropping ${t}`, e.message);
    }
  }

  const schema = `
CREATE TABLE \`addons\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(100) NOT NULL,
  \`price\` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`addon_categories\` (
  \`addon_id\` varchar(50) NOT NULL,
  \`category_id\` varchar(50) NOT NULL,
  PRIMARY KEY (\`addon_id\`, \`category_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`categories\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(100) NOT NULL,
  \`icon\` varchar(50) DEFAULT NULL,
  \`order_index\` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`coupons\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`code\` varchar(50) NOT NULL,
  \`type\` enum('fixed','percentage','free_shipping') NOT NULL DEFAULT 'fixed',
  \`value\` decimal(10,2) DEFAULT '0.00',
  \`is_active\` tinyint(4) DEFAULT '1',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`usage_count\` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`customers\` (
  \`cpf\` varchar(20) NOT NULL PRIMARY KEY,
  \`points\` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`loyalty_settings\` (
  \`id\` int(11) NOT NULL PRIMARY KEY DEFAULT '1',
  \`active\` tinyint(1) DEFAULT '0',
  \`spent_amount\` decimal(10,2) DEFAULT '1.00',
  \`points_earned\` int(11) DEFAULT '1',
  \`points_for_discount\` int(11) DEFAULT '10',
  \`discount_amount\` decimal(10,2) DEFAULT '1.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`orders\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`order_number\` int(11) NOT NULL,
  \`total\` decimal(10,2) NOT NULL DEFAULT '0.00',
  \`consume_type\` varchar(50) NOT NULL,
  \`payment_method\` varchar(50) NOT NULL,
  \`address\` text,
  \`mesa\` varchar(50) DEFAULT NULL,
  \`customer_whatsapp\` varchar(20) DEFAULT NULL,
  \`customer_cpf\` varchar(20) DEFAULT NULL,
  \`status\` enum('recebido','confirmado','preparando','pronto','despachado','entregue','cancelado') DEFAULT 'recebido',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`customer_name\` varchar(100) DEFAULT NULL,
  \`change_needed_for\` decimal(10,2) DEFAULT NULL,
  \`delivery_fee\` decimal(10,2) DEFAULT '0.00',
  \`coupon_id\` int(11) DEFAULT NULL,
  \`discount_amount\` decimal(10,2) DEFAULT '0.00',
  \`courier_id\` int(11) DEFAULT NULL,
  \`origin\` varchar(50) DEFAULT 'delivery'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`order_items\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`order_id\` varchar(50) NOT NULL,
  \`product_name\` varchar(100) NOT NULL,
  \`product_price\` decimal(10,2) NOT NULL DEFAULT '0.00',
  \`quantity\` int(11) NOT NULL DEFAULT '1',
  \`notes\` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`order_item_addons\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`order_item_id\` int(11) NOT NULL,
  \`name\` varchar(100) NOT NULL,
  \`price\` decimal(10,2) NOT NULL DEFAULT '0.00',
  \`quantity\` int(11) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`order_timelines\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`order_id\` varchar(50) NOT NULL,
  \`status\` enum('recebido','confirmado','preparando','pronto','despachado','entregue','cancelado') NOT NULL,
  \`timestamp\` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`products\` (
  \`id\` varchar(50) NOT NULL PRIMARY KEY,
  \`name\` varchar(100) NOT NULL,
  \`description\` text,
  \`price\` decimal(10,2) NOT NULL DEFAULT '0.00',
  \`image\` varchar(255) DEFAULT NULL,
  \`category_id\` varchar(50) DEFAULT NULL,
  \`is_promo\` tinyint(1) DEFAULT '0',
  \`order_count\` int(11) DEFAULT '0',
  \`original_price\` decimal(10,2) DEFAULT NULL,
  \`promo_expiry\` datetime DEFAULT NULL,
  \`promo_stock\` int(11) DEFAULT NULL,
  \`is_made_to_order\` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`product_addons\` (
  \`product_id\` varchar(50) NOT NULL,
  \`addon_id\` varchar(50) NOT NULL,
  PRIMARY KEY (\`product_id\`, \`addon_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`product_images\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`product_id\` varchar(50) NOT NULL,
  \`image_url\` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`push_subscriptions\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`customer_cpf\` varchar(20) NOT NULL,
  \`endpoint\` text NOT NULL,
  \`p256dh\` varchar(150) NOT NULL,
  \`auth\` varchar(100) NOT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`store_settings\` (
  \`id\` int(11) NOT NULL PRIMARY KEY DEFAULT '1',
  \`has_delivery\` tinyint(4) DEFAULT '1',
  \`has_table\` tinyint(4) DEFAULT '1',
  \`has_pickup\` tinyint(4) DEFAULT '1',
  \`accepts_pix\` tinyint(4) DEFAULT '1',
  \`accepts_cash\` tinyint(4) DEFAULT '1',
  \`accepts_card\` tinyint(4) DEFAULT '1',
  \`opening_time\` varchar(5) DEFAULT '10:00',
  \`closing_time\` varchar(5) DEFAULT '22:00',
  \`delivery_fee\` decimal(10,2) DEFAULT '0.00',
  \`delivery_info_text\` varchar(255) DEFAULT 'Entregas apenas depois das 14:00',
  \`is_open\` tinyint(4) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`users\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`name\` varchar(100) NOT NULL,
  \`phone\` varchar(50) NOT NULL,
  \`password\` varchar(255) NOT NULL,
  \`role\` enum('admin','courier') NOT NULL DEFAULT 'courier',
  \`delivery_fee\` decimal(10,2) DEFAULT '0.00',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  for (const query of schema.split(';').filter(q => q.trim())) {
    await connection.query(query);
  }

  // Insert base settings
  await connection.query("INSERT INTO \`loyalty_settings\` (\`id\`, \`active\`, \`spent_amount\`, \`points_earned\`, \`points_for_discount\`, \`discount_amount\`) VALUES (1, 1, '1.00', 1, 10, '1.00')");
  await connection.query("INSERT INTO \`store_settings\` (\`id\`, \`has_delivery\`, \`has_table\`, \`has_pickup\`, \`accepts_pix\`, \`accepts_cash\`, \`accepts_card\`, \`opening_time\`, \`closing_time\`, \`delivery_fee\`, \`delivery_info_text\`, \`is_open\`) VALUES (1, 1, 0, 1, 1, 1, 1, '9:00', '17:50', '5.00', 'Entregas apenas depois das 14:00', 0)");
  await connection.query("INSERT INTO \`users\` (\`name\`, \`phone\`, \`password\`, \`role\`, \`delivery_fee\`, \`created_at\`) VALUES ('Administrador', 'admin', '$2b$10$OkNKlzRHr5kbj3T/C5r.ne/SkI6CmwF.bXfzofksCQJaNMeIQAtoy', 'admin', '0.00', '2026-07-19 16:50:21'), ('Gabriel ', 'Gabriel', '$2b$10$hudxaod8KB9sveczba5.nO3j627poCTpevzen9g5UFf443NqqYmim', 'courier', '5.00', '2026-07-19 19:38:51')");

  // Create Category
  const catId = "acai";
  await connection.query('INSERT INTO categories (id, name, order_index) VALUES (?, ?, ?)', [catId, 'Açaí', 0]);

  // Create Addons
  const addons = [
    { id: "nutella", name: "Nutella", price: 4.0 },
    { id: "morango", name: "Morango Fresco", price: 3.0 },
    { id: "leite-ninho", name: "Leite Ninho", price: 2.0 },
    { id: "granola", name: "Granola", price: 1.5 },
    { id: "leite-condensado", name: "Leite Condensado", price: 1.5 },
  ];
  for (const a of addons) {
    await connection.query('INSERT INTO addons (id, name, price) VALUES (?, ?, ?)', [a.id, a.name, a.price]);
    await connection.query('INSERT INTO addon_categories (addon_id, category_id) VALUES (?, ?)', [a.id, catId]);
  }

  // Create Products
  const p1Id = "1";
  const p2Id = "2";
  const p3Id = "3";
  const imgUrl = "https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80";

  await connection.query('INSERT INTO products (id, name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?, ?)', [p1Id, 'Açaí Pequeno', 'Açaí no copo pequeno (300ml). Escolha seus adicionais!', 18.00, imgUrl, catId]);
  await connection.query('INSERT INTO products (id, name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?, ?)', [p2Id, 'Açaí Médio', 'Açaí no copo médio (500ml). Escolha seus adicionais!', 20.00, imgUrl, catId]);
  await connection.query('INSERT INTO products (id, name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?, ?)', [p3Id, 'Açaí Grande', 'Açaí no copo grande (700ml). Escolha seus adicionais!', 22.00, imgUrl, catId]);

  for (const p of [p1Id, p2Id, p3Id]) {
    for (const a of addons) {
      await connection.query('INSERT INTO product_addons (product_id, addon_id) VALUES (?, ?)', [p, a.id]);
    }
  }

  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log("Database initialized successfully!");
  await connection.end();
}

run().catch(e => {
  console.error("Error setting up DB:", e);
  process.exit(1);
});
