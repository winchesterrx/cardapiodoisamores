-- Banco de Dados: appcardapio
CREATE DATABASE IF NOT EXISTS `appcardapio` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `appcardapio`;

-- Tabela: categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `icon` VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: addons
CREATE TABLE IF NOT EXISTS `addons` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: addon_categories (Mapeamento entre Adicionais e Categorias)
CREATE TABLE IF NOT EXISTS `addon_categories` (
  `addon_id` VARCHAR(50),
  `category_id` VARCHAR(50),
  PRIMARY KEY (`addon_id`, `category_id`),
  FOREIGN KEY (`addon_id`) REFERENCES `addons`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: products
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `image` VARCHAR(255) DEFAULT NULL,
  `category_id` VARCHAR(50) DEFAULT NULL,
  `is_promo` BOOLEAN DEFAULT FALSE,
  `original_price` DECIMAL(10,2) DEFAULT NULL,
  `promo_expiry` DATETIME DEFAULT NULL,
  `promo_stock` INT DEFAULT NULL,
  `order_count` INT DEFAULT 0,
  `is_made_to_order` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: product_images
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tabela: product_addons (Mapeamento de quais adicionais um produto específico pode ter)
CREATE TABLE IF NOT EXISTS `product_addons` (
  `product_id` VARCHAR(50),
  `addon_id` VARCHAR(50),
  PRIMARY KEY (`product_id`, `addon_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`addon_id`) REFERENCES `addons`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `order_number` INT NOT NULL AUTO_INCREMENT,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `consume_type` VARCHAR(50) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `address` TEXT,
  `mesa` VARCHAR(50),
  `customer_whatsapp` VARCHAR(20),
  `customer_cpf` VARCHAR(20),
  `status` ENUM('recebido', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado') DEFAULT 'recebido',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: order_items
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL,
  `product_name` VARCHAR(100) NOT NULL,
  `product_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 1,
  `notes` TEXT,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: order_item_addons
CREATE TABLE IF NOT EXISTS `order_item_addons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_item_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 1,
  FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela: order_timelines
CREATE TABLE IF NOT EXISTS `order_timelines` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL,
  `status` ENUM('recebido', 'confirmado', 'preparando', 'pronto', 'entregue', 'cancelado') NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- DADOS INICIAIS (Opcional - para testes)
-- ==========================================

INSERT IGNORE INTO `categories` (`id`, `name`, `icon`) VALUES
('frango', 'Frango', 'drumstick'),
('hamburguer', 'Hambúrguer', 'beef'),
('especiais', 'Especiais', 'crown'),
('refrigerantes', 'Refrigerantes', 'cup-soda'),
('porcoes', 'Porções', 'container'),
('sobremesas', 'Sobremesas', 'cake-slice');

INSERT IGNORE INTO `addons` (`id`, `name`, `price`) VALUES
('bacon', 'Bacon', 4.00),
('queijo-extra', 'Queijo Extra', 3.00),
('ovo', 'Ovo', 2.50),
('cheddar', 'Cheddar', 3.50),
('salada', 'Salada Extra', 2.00),
('molho-alho', 'Molho de Alho', 1.50),
('molho-picante', 'Molho Picante', 1.50);

INSERT IGNORE INTO `addon_categories` (`addon_id`, `category_id`) VALUES
('bacon', 'frango'), ('bacon', 'hamburguer'), ('bacon', 'especiais'),
('queijo-extra', 'frango'), ('queijo-extra', 'hamburguer'), ('queijo-extra', 'especiais'),
('ovo', 'frango'), ('ovo', 'hamburguer'), ('ovo', 'especiais'),
('cheddar', 'frango'), ('cheddar', 'hamburguer'), ('cheddar', 'especiais'), ('cheddar', 'porcoes'),
('salada', 'frango'), ('salada', 'hamburguer'), ('salada', 'especiais'),
('molho-alho', 'porcoes'), ('molho-picante', 'porcoes');

INSERT IGNORE INTO `products` (`id`, `name`, `description`, `price`, `image`, `category_id`, `is_promo`, `order_count`) VALUES
('1', 'Frango Crocante', 'Filé de frango empanado crocante com temperos especiais', 22.90, '1', 'frango', 1, 156),
('2', 'Frango Grelhado', 'Peito de frango grelhado com ervas finas', 24.90, '2', 'frango', 0, 89),
('3', 'X-Burguer Clássico', 'Hambúrguer artesanal com queijo, alface e tomate', 28.90, '3', 'hamburguer', 1, 234),
('4', 'X-Bacon', 'Hambúrguer duplo com bacon crocante e cheddar', 34.90, '4', 'hamburguer', 0, 198),
('5', 'Combo Especial da Casa', 'Hambúrguer especial + batata + refrigerante', 45.90, '5', 'especiais', 1, 312),
('6', 'Wrap Premium', 'Wrap com frango desfiado, cream cheese e rúcula', 26.90, '6', 'especiais', 0, 67),
('7', 'Coca-Cola 350ml', 'Refrigerante gelado', 6.90, '7', 'refrigerantes', 0, 445),
('8', 'Guaraná Antarctica 350ml', 'Refrigerante gelado', 6.90, '8', 'refrigerantes', 0, 210),
('9', 'Brownie com Sorvete', 'Brownie de chocolate com sorvete de baunilha', 18.90, '9', 'sobremesas', 1, 178),
('10', 'Pudim Tradicional', 'Pudim de leite condensado caseiro', 12.90, '10', 'sobremesas', 0, 95),
('11', 'Batata Frita Rustica', 'Porção de batatas rústicas com tempero da casa', 15.90, NULL, 'porcoes', 0, 150),
('12', 'Batata Cheddar e Bacon', 'Deliciosa porção de batata frita com muito cheddar e bacon', 25.90, NULL, 'porcoes', 1, 300),
('13', 'Onion Rings', 'Anéis de cebola empanados crocantes', 18.90, NULL, 'porcoes', 0, 120);

INSERT IGNORE INTO `product_addons` (`product_id`, `addon_id`) VALUES
('1', 'bacon'), ('1', 'queijo-extra'), ('1', 'ovo'),
('2', 'bacon'), ('2', 'queijo-extra'),
('3', 'bacon'), ('3', 'queijo-extra'), ('3', 'ovo'), ('3', 'cheddar'), ('3', 'salada'),
('4', 'bacon'), ('4', 'queijo-extra'), ('4', 'ovo'), ('4', 'cheddar'), ('4', 'salada'),
('5', 'bacon'), ('5', 'queijo-extra'), ('5', 'ovo'), ('5', 'cheddar'),
('6', 'bacon'), ('6', 'queijo-extra'), ('6', 'ovo'),
('11', 'bacon'), ('11', 'cheddar'), ('11', 'molho-alho'),
('12', 'bacon'), ('12', 'cheddar'), ('12', 'molho-picante'),
('13', 'molho-alho'), ('13', 'molho-picante');
