import db from './db.js';

async function runMigration() {
  try {
    console.log("Adding promo fields to products table...");
    await db.query(`
      ALTER TABLE \`products\`
      ADD COLUMN \`original_price\` DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN \`promo_expiry\` DATETIME DEFAULT NULL,
      ADD COLUMN \`promo_stock\` INT DEFAULT NULL;
    `);
    console.log("Promo fields added successfully.");
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("Promo fields already exist. Skipping.");
    } else {
      console.error("Migration failed:", error);
    }
  } finally {
    process.exit(0);
  }
}

runMigration();
