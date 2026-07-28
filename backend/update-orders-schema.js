import db from './db.js';

async function runMigration() {
  try {
    console.log("Updating orders table schema...");
    
    // 1. Update ENUM for orders.status
    await db.query(`ALTER TABLE \`orders\` MODIFY COLUMN \`status\` ENUM('recebido', 'confirmado', 'preparando', 'pronto', 'despachado', 'entregue', 'cancelado') DEFAULT 'recebido'`);
    
    // 2. Update ENUM for order_timelines.status
    await db.query(`ALTER TABLE \`order_timelines\` MODIFY COLUMN \`status\` ENUM('recebido', 'confirmado', 'preparando', 'pronto', 'despachado', 'entregue', 'cancelado') NOT NULL`);

    // 3. Add courier_id column if it doesn't exist
    try {
      await db.query(`ALTER TABLE \`orders\` ADD COLUMN \`courier_id\` INT DEFAULT NULL`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column courier_id already exists.");
      } else {
        throw e;
      }
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit();
  }
}

runMigration();
