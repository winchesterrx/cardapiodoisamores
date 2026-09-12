import db from './backend/db.js';

async function main() {
  const conn = await db.getConnection();
  try {
    await conn.query("ALTER TABLE addons ADD COLUMN type VARCHAR(50) DEFAULT 'comum'");
    console.log("Colunm added successfully");
  } catch (e) {
    console.log("Error or already exists:", e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}
main();
