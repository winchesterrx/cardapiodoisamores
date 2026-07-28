import db from './db.js';

async function run() {
  try {
    console.log("Iniciando migração de produtos sob encomenda...");

    try {
      await db.query(`ALTER TABLE \`products\` ADD COLUMN \`is_made_to_order\` BOOLEAN DEFAULT FALSE;`);
      console.log("Coluna is_made_to_order adicionada na tabela products.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("A coluna is_made_to_order já existe na tabela products.");
      else throw e;
    }

    console.log("Migração concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Falha na migração de produtos:", error);
    process.exit(1);
  }
}

run();
