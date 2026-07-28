import db from './db.js';
import bcrypt from 'bcrypt';

async function run() {
  try {
    console.log('Creating users table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(20) DEFAULT 'courier',
        \`delivery_fee\` DECIMAL(10,2) DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [check] = await db.query("SELECT * FROM users WHERE phone='admin'");
    if(check.length === 0){
      const hash = await bcrypt.hash('123', 10);
      await db.query("INSERT INTO users (name,phone,password,role) VALUES ('Admin','admin',?,'admin')", [hash]);
      console.log('Admin seeded!');
    } else {
      console.log('Admin already exists.');
    }
    console.log('Done!');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
