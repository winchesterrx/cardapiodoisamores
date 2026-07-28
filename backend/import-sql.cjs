const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importDatabase() {
  console.log('Testando conexão com o banco remoto UOL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    console.log('Conexão estabelecida com sucesso!');
    const sqlPath = path.resolve(__dirname, '../appcardapio.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executando appcardapio.sql remotamente, isso pode levar alguns segundos...');
    await connection.query(sqlContent);
    
    console.log('Importação do banco de dados CONCLUÍDA com sucesso!');
    await connection.end();
  } catch (error) {
    console.error('Erro na importação:', error.message);
  }
}

importDatabase();
