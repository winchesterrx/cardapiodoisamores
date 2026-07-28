import db from './db.js';
import bcrypt from 'bcrypt';

const runMigrations = async () => {
  try {
    console.log("Executando migração V3...");

    // 1. Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('admin', 'courier') NOT NULL DEFAULT 'courier',
        \`delivery_fee\` DECIMAL(10,2) DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Add columns to orders
    const alters = [
      "ALTER TABLE `orders` ADD COLUMN `courier_id` INT DEFAULT NULL",
      "ALTER TABLE `orders` ADD COLUMN `origin` VARCHAR(50) DEFAULT 'delivery'"
    ];

    for (const q of alters) {
      try {
        await db.query(q);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          console.error("Erro no alter table:", e);
        }
      }
    }

    // 3. Create default admin user
    const [adminUsers] = await db.query("SELECT id FROM users WHERE role = 'admin'");
    if (adminUsers.length === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      await db.query(
        "INSERT INTO users (name, phone, password, role) VALUES (?, ?, ?, ?)",
        ['Administrador', 'admin', adminPassword, 'admin']
      );
      console.log('Default admin created. Phone: admin, Password: admin123');
    }

    console.log("Migração V3 concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro fatal ao rodar migração V3:", error);
    process.exit(1);
  }
};

runMigrations();
