const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importDatabase() {
  console.log('Testando conexão com o banco de dados e aplicando tabelas...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true // Importante para rodar o script SQL todo de uma vez
    });

    console.log('Conexão estabelecida com sucesso!');
    
    // Ler o arquivo SQL
    const sqlPath = path.resolve(__dirname, '../appcardapio.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executando arquivo appcardapio.sql no banco de dados...');
    
    // Executar
    await connection.query(sqlContent);
    
    console.log('Importação concluída com sucesso! Banco preparado.');
    await connection.end();
  } catch (error) {
    console.error('Erro ao importar o banco de dados:', error.message);
  }
}

importDatabase();
