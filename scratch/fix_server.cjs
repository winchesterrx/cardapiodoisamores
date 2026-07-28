const fs = require('fs');
require('child_process').execSync('git checkout backend/server.js');

let code = fs.readFileSync('backend/server.js', 'utf8');

const target = `app.get('/api/coupons', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar cupons' });
  }
});`;

const replacement = `app.get('/api/coupons', async (req, res) => {
  try {
    const [rows] = await db.query(\`
      SELECT c.*, COUNT(o.id) as usage_count 
      FROM coupons c 
      LEFT JOIN orders o ON c.id = o.coupon_id 
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    \`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar cupons' });
  }
});`;

code = code.replace(target, replacement);

fs.writeFileSync('backend/server.js', code);
console.log("Fixed server.js");
