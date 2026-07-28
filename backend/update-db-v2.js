import db from './db.js';

async function run() {
  try {
    console.log("Iniciando migração V2 (Cupons e Loja Aberta/Fechada)...");

    // 1. Criar tabela coupons
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`coupons\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(50) NOT NULL UNIQUE,
        \`type\` ENUM('fixed', 'percentage', 'free_shipping') NOT NULL DEFAULT 'fixed',
        \`value\` DECIMAL(10,2) DEFAULT 0.00,
        \`is_active\` TINYINT DEFAULT 1,
        \`usage_count\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Tabela coupons verificada/criada.");

    // 2. Adicionar coluna is_open em store_settings
    try {
      await db.query(`ALTER TABLE \`store_settings\` ADD COLUMN \`is_open\` TINYINT DEFAULT 1;`);
      console.log("Coluna is_open adicionada em store_settings.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("is_open já existe em store_settings.");
      else throw e;
    }

    // 3. Adicionar colunas de cupom em orders
    try {
      await db.query(`ALTER TABLE \`orders\` ADD COLUMN \`coupon_id\` INT DEFAULT NULL;`);
      console.log("Coluna coupon_id adicionada em orders.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("coupon_id já existe em orders.");
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE \`orders\` ADD COLUMN \`discount_amount\` DECIMAL(10,2) DEFAULT 0.00;`);
      console.log("Coluna discount_amount adicionada em orders.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("discount_amount já existe em orders.");
      else throw e;
    }

    try {
      await db.query(`ALTER TABLE \`coupons\` ADD COLUMN \`usage_count\` INT DEFAULT 0;`);
      console.log("Coluna usage_count adicionada em coupons.");
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log("usage_count já existe em coupons.");
      else throw e;
    }

    // 4. Criar tabela push_subscriptions
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`customer_cpf\` VARCHAR(20) NOT NULL,
        \`endpoint\` TEXT NOT NULL,
        \`p256dh\` VARCHAR(150) NOT NULL,
        \`auth\` VARCHAR(100) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (\`customer_cpf\`, \`auth\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Tabela push_subscriptions verificada/criada.");

    console.log("Migração V2 concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Falha na migração V2:", error);
    process.exit(1);
  }
}

run();
