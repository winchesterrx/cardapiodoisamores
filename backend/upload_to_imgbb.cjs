const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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

  const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
  if (!IMGBB_API_KEY) {
    console.error("Chave do ImgBB não encontrada no .env!");
    process.exit(1);
  }

  const [products] = await connection.query("SELECT id, name, image FROM products WHERE image LIKE '%/uploads/%'");
  
  console.log(`Encontrados ${products.length} produtos com imagens locais.`);

  for (const p of products) {
    try {
      // Extrai apenas o nome do arquivo da URL local
      const filenameMatch = p.image.match(/img_[a-zA-Z0-9_]+\.(jpg|jpeg|png|webp)/);
      if (!filenameMatch) {
        console.log(`Produto ${p.name}: Nome do arquivo não extraído de ${p.image}`);
        continue;
      }
      
      const filename = filenameMatch[0];
      const filePath = path.join(__dirname, 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`Produto ${p.name}: Arquivo local não encontrado em ${filePath}`);
        continue;
      }

      console.log(`Fazendo upload da imagem do produto: ${p.name} ...`);
      const fileData = fs.readFileSync(filePath, { encoding: 'base64' });
      
      const formData = new URLSearchParams();
      formData.append('image', fileData);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newUrl = result.data.url;
        await connection.query("UPDATE products SET image = ? WHERE id = ?", [newUrl, p.id]);
        console.log(`[SUCESSO] ${p.name} atualizado para: ${newUrl}`);
      } else {
        console.error(`[ERRO] Falha no ImgBB para ${p.name}:`, result);
      }
    } catch (err) {
      console.error(`Erro ao processar produto ${p.name}:`, err.message);
    }
  }

  console.log("Processo finalizado!");
  await connection.end();
}

run().catch(console.error);
