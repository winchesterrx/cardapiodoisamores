-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 10.129.76.12
-- Tempo de geração: 28/07/2026 às 23:15
-- Versão do servidor: 5.6.26-log
-- Versão do PHP: 8.0.15

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `appcardapio`
--
CREATE DATABASE IF NOT EXISTS `appcardapio` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `appcardapio`;

-- --------------------------------------------------------

--
-- Estrutura para tabela `addons`
--

CREATE TABLE `addons` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `addons`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `addon_categories`
--

CREATE TABLE `addon_categories` (
  `addon_id` varchar(50) NOT NULL DEFAULT '',
  `category_id` varchar(50) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `addon_categories`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `categories`
--

CREATE TABLE `categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `categories`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `coupons`
--

CREATE TABLE `coupons` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `type` enum('fixed','percentage','free_shipping') NOT NULL DEFAULT 'fixed',
  `value` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(4) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `usage_count` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `coupons`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `customers`
--

CREATE TABLE `customers` (
  `cpf` varchar(20) NOT NULL,
  `points` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `customers`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `loyalty_settings`
--

CREATE TABLE `loyalty_settings` (
  `id` int(11) NOT NULL DEFAULT '1',
  `active` tinyint(1) DEFAULT '0',
  `spent_amount` decimal(10,2) DEFAULT '1.00',
  `points_earned` int(11) DEFAULT '1',
  `points_for_discount` int(11) DEFAULT '10',
  `discount_amount` decimal(10,2) DEFAULT '1.00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `loyalty_settings`
--

INSERT INTO `loyalty_settings` (`id`, `active`, `spent_amount`, `points_earned`, `points_for_discount`, `discount_amount`) VALUES
(1, 1, '1.00', 1, 10, '1.00');

-- --------------------------------------------------------

--
-- Estrutura para tabela `orders`
--

CREATE TABLE `orders` (
  `id` varchar(50) NOT NULL,
  `order_number` int(11) NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `consume_type` varchar(50) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `address` text,
  `mesa` varchar(50) DEFAULT NULL,
  `customer_whatsapp` varchar(20) DEFAULT NULL,
  `customer_cpf` varchar(20) DEFAULT NULL,
  `status` enum('recebido','confirmado','preparando','pronto','despachado','entregue','cancelado') DEFAULT 'recebido',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `customer_name` varchar(100) DEFAULT NULL,
  `change_needed_for` decimal(10,2) DEFAULT NULL,
  `delivery_fee` decimal(10,2) DEFAULT '0.00',
  `coupon_id` int(11) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT '0.00',
  `courier_id` int(11) DEFAULT NULL,
  `origin` varchar(50) DEFAULT 'delivery'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `orders`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `product_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `quantity` int(11) NOT NULL DEFAULT '1',
  `notes` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `order_items`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `order_item_addons`
--

CREATE TABLE `order_item_addons` (
  `id` int(11) NOT NULL,
  `order_item_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `quantity` int(11) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `order_item_addons`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `order_timelines`
--

CREATE TABLE `order_timelines` (
  `id` int(11) NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `status` enum('recebido','confirmado','preparando','pronto','despachado','entregue','cancelado') NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `order_timelines`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `products`
--

CREATE TABLE `products` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `image` varchar(255) DEFAULT NULL,
  `category_id` varchar(50) DEFAULT NULL,
  `is_promo` tinyint(1) DEFAULT '0',
  `order_count` int(11) DEFAULT '0',
  `original_price` decimal(10,2) DEFAULT NULL,
  `promo_expiry` datetime DEFAULT NULL,
  `promo_stock` int(11) DEFAULT NULL,
  `is_made_to_order` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `products`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `product_addons`
--

CREATE TABLE `product_addons` (
  `product_id` varchar(50) NOT NULL DEFAULT '',
  `addon_id` varchar(50) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `product_addons`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `product_images`
--

CREATE TABLE `product_images` (
  `id` int(11) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `image_url` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `product_images`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int(11) NOT NULL,
  `customer_cpf` varchar(20) NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` varchar(150) NOT NULL,
  `auth` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `push_subscriptions`
--



-- --------------------------------------------------------

--
-- Estrutura para tabela `store_settings`
--

CREATE TABLE `store_settings` (
  `id` int(11) NOT NULL DEFAULT '1',
  `has_delivery` tinyint(4) DEFAULT '1',
  `has_table` tinyint(4) DEFAULT '1',
  `has_pickup` tinyint(4) DEFAULT '1',
  `accepts_pix` tinyint(4) DEFAULT '1',
  `accepts_cash` tinyint(4) DEFAULT '1',
  `accepts_card` tinyint(4) DEFAULT '1',
  `opening_time` varchar(5) DEFAULT '10:00',
  `closing_time` varchar(5) DEFAULT '22:00',
  `delivery_fee` decimal(10,2) DEFAULT '0.00',
  `delivery_info_text` varchar(255) DEFAULT 'Entregas apenas depois das 14:00',
  `is_open` tinyint(4) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `store_settings`
--

INSERT INTO `store_settings` (`id`, `has_delivery`, `has_table`, `has_pickup`, `accepts_pix`, `accepts_cash`, `accepts_card`, `opening_time`, `closing_time`, `delivery_fee`, `delivery_info_text`, `is_open`) VALUES
(1, 1, 0, 1, 1, 1, 1, '9:00', '17:50', '5.00', 'Entregas apenas depois das 14:00', 0);

-- --------------------------------------------------------

--
-- Estrutura para tabela `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','courier') NOT NULL DEFAULT 'courier',
  `delivery_fee` decimal(10,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Despejando dados para a tabela `users`
--

INSERT INTO `users` (`id`, `name`, `phone`, `password`, `role`, `delivery_fee`, `created_at`) VALUES
(1, 'Administrador', 'admin', '$2b$10$OkNKlzRHr5kbj3T/C5r.ne/SkI6CmwF.bXfzofksCQJaNMeIQAtoy', 'admin', '0.00', '2026-07-19 16:50:21'),
(2, 'Gabriel ', 'Gabriel', '$2b$10$hudxaod8KB9sveczba5.nO3j627poCTpevzen9g5UFf443NqqYmim', 'courier', '5.00', '2026-07-19 19:38:51');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `addons`
--

