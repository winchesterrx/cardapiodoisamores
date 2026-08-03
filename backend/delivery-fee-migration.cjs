const db = require('./db.js');

async function run() {
  try {
    console.log("Iniciando migração de frete dinâmico...");

    // Adicionar store_address
    try {
      await db.query(`ALTER TABLE \`store_settings\` ADD COLUMN \`store_address\` VARCHAR(255) DEFAULT '';`);
      console.log("Coluna store_address adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("store_address já existe.");
      else throw e;
    }

    // Adicionar delivery_fee_per_km
    try {
      await db.query(`ALTER TABLE \`store_settings\` ADD COLUMN \`delivery_fee_per_km\` DECIMAL(10,2) DEFAULT 0.00;`);
      console.log("Coluna delivery_fee_per_km adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("delivery_fee_per_km já existe.");
      else throw e;
    }

    console.log("Migração de frete dinâmico concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Falha na migração:", error);
    process.exit(1);
  }
}

run();
