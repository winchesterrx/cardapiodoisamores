import db from './db.js';

async function fix() {
  try {
    console.log("Fixing URLs in products table...");
    const [result1] = await db.query(`
      UPDATE products 
      SET image = REPLACE(image, 'http://localhost:3000/uploads/', '/uploads/')
      WHERE image LIKE 'http://localhost:3000/uploads/%'
    `);
    console.log(`Updated ${result1.affectedRows} rows in products table.`);

    console.log("Fixing URLs in product_images table...");
    const [result2] = await db.query(`
      UPDATE product_images 
      SET image_url = REPLACE(image_url, 'http://localhost:3000/uploads/', '/uploads/')
      WHERE image_url LIKE 'http://localhost:3000/uploads/%'
    `);
    console.log(`Updated ${result2.affectedRows} rows in product_images table.`);

    console.log("Success!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to fix DB URLs:", error);
    process.exit(1);
  }
}

fix();
