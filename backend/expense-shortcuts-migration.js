import mysql from 'mysql2/promise';
import dbConfig from './db.js';

async function runMigration() {
  let connection;
  try {
    console.log('Iniciando migração de expense_shortcuts...');
    connection = await mysql.createConnection({
      host: dbConfig.pool.config.connectionConfig.host,
      user: dbConfig.pool.config.connectionConfig.user,
      password: dbConfig.pool.config.connectionConfig.password,
      database: dbConfig.pool.config.connectionConfig.database,
      port: dbConfig.pool.config.connectionConfig.port,
    });
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS expense_shortcuts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        suggested_amount VARCHAR(50) DEFAULT ''
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Tabela expense_shortcuts criada ou já existente.');

    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM expense_shortcuts');
    if (rows[0].count === 0) {
      console.log('Tabela vazia. Inserindo itens padrões...');
      const defaultItems = [
        ['Açaí 10kg', 'materia-prima'],
        ['Nutella 1kg', 'materia-prima'],
        ['Leite em pó', 'materia-prima'],
        ['Leite condensado', 'materia-prima'],
        ['Granola 1kg', 'materia-prima'],
        ['Paçoca', 'materia-prima'],
        ['Banana', 'materia-prima'],
        ['Morango', 'materia-prima'],
        ['Copos 300ml (100un)', 'embalagem'],
        ['Colheres (100un)', 'embalagem'],
        ['Tampas', 'embalagem'],
        ['Sacolas', 'embalagem'],
        ['Álcool 70%', 'higiene'],
        ['Detergente', 'higiene'],
        ['Papel toalha', 'higiene']
      ];

      for (const item of defaultItems) {
        await connection.execute(
          'INSERT INTO expense_shortcuts (description, category) VALUES (?, ?)',
          [item[0], item[1]]
        );
      }
      console.log('Itens padrões inseridos com sucesso.');
    } else {
      console.log('Tabela já possui dados. Nenhuma inserção necessária.');
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro na migração:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
