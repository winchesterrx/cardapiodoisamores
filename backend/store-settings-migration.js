import db from './db.js';

async function run() {
  try {
    console.log("Iniciando migração de configurações da loja...");

    // 1. Criar tabela store_settings
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`store_settings\` (
        \`id\` INT PRIMARY KEY DEFAULT 1,
        \`has_delivery\` TINYINT DEFAULT 1,
        \`has_table\` TINYINT DEFAULT 1,
        \`has_pickup\` TINYINT DEFAULT 1,
        \`accepts_pix\` TINYINT DEFAULT 1,
        \`accepts_cash\` TINYINT DEFAULT 1,
        \`accepts_card\` TINYINT DEFAULT 1,
        \`opening_time\` VARCHAR(5) DEFAULT "10:00",
        \`closing_time\` VARCHAR(5) DEFAULT "22:00",
        \`delivery_fee\` DECIMAL(10,2) DEFAULT 0.00,
        \`delivery_info_text\` VARCHAR(255) DEFAULT "Entregas apenas depois das 14:00"
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Tabela store_settings verificada/criada.");

    // 2. Inserir linha padrão se não existir
    await db.query(`
      INSERT IGNORE INTO \`store_settings\` (id, has_delivery, has_table, has_pickup, accepts_pix, accepts_cash, accepts_card, opening_time, closing_time, delivery_fee, delivery_info_text)
      VALUES (1, 1, 1, 1, 1, 1, 1, '10:00', '22:00', 0.00, 'Entregas apenas depois das 14:00');
    `);
    console.log("Registro padrão de store_settings inserido.");

    // 3. Adicionar novas colunas na tabela orders
    console.log("Adicionando colunas de cliente e troco em orders...");
    try {
      await db.query(`ALTER TABLE \`orders\` ADD COLUMN \`customer_name\` VARCHAR(100) DEFAULT NULL;`);
      console.log("Coluna customer_name adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("customer_name já existe.");
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE \`orders\` ADD COLUMN \`change_needed_for\` DECIMAL(10,2) DEFAULT NULL;`);
      console.log("Coluna change_needed_for adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("change_needed_for já existe.");
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE \`orders\` ADD COLUMN \`delivery_fee\` DECIMAL(10,2) DEFAULT 0.00;`);
      console.log("Coluna delivery_fee adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("delivery_fee já existe.");
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE \`store_settings\` ADD COLUMN \`delivery_info_text\` VARCHAR(255) DEFAULT 'Entregas apenas depois das 14:00';`);
      console.log("Coluna delivery_info_text adicionada.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("delivery_info_text já existe.");
      else throw e;
    }

    console.log("Migração concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Falha na migração de configurações:", error);
    process.exit(1);
  }
}

run();
