import db from './db.js';

async function runMigration() {
  try {
    console.log("Creating product_images table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`product_images\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`product_id\` VARCHAR(50) NOT NULL,
        \`image_url\` VARCHAR(255) NOT NULL,
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("product_images table created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
