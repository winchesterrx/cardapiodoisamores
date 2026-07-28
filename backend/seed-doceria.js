import db from './db.js';

async function seedDoceria() {
  console.log('Iniciando migração do banco de dados para Doceria Gourmet...');
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Limpar relações antigas
    console.log('Limpando dados antigos...');
    await connection.query('DELETE FROM product_addons');
    await connection.query('DELETE FROM addon_categories');
    await connection.query('DELETE FROM products');
    await connection.query('DELETE FROM addons');
    await connection.query('DELETE FROM categories');

    // 2. Inserir Categorias
    console.log('Inserindo categorias...');
    const categories = [
      ['docinhos', 'Docinhos Gourmet', 'ice-cream'],
      ['bolos', 'Bolos & Tortas', 'cake-slice'],
      ['copos', 'Copos da Felicidade', 'crown'],
      ['bebidas', 'Cafés & Bebidas', 'coffee']
    ];
    for (const cat of categories) {
      await connection.query('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)', cat);
    }

    // 3. Inserir Adicionais (Addons)
    console.log('Inserindo adicionais...');
    const addons = [
      ['nutella', 'Nutella Extra', 4.00],
      ['morango', 'Morango Extra', 3.00],
      ['leite-ninho', 'Leite Ninho Extra', 2.00],
      ['kinder-bueno', 'Kinder Bueno Extra', 5.00],
      ['calda-caramelo', 'Calda de Caramelo', 1.50]
    ];
    for (const addon of addons) {
      await connection.query('INSERT INTO addons (id, name, price) VALUES (?, ?, ?)', addon);
    }

    // 4. Inserir Mapeamento Adicional <-> Categoria (addon_categories)
    console.log('Inserindo relações adicionais-categorias...');
    const addonCategories = [
      ['nutella', 'docinhos'], ['nutella', 'bolos'], ['nutella', 'copos'],
      ['morango', 'docinhos'], ['morango', 'bolos'], ['morango', 'copos'],
      ['leite-ninho', 'docinhos'], ['leite-ninho', 'bolos'], ['leite-ninho', 'copos'],
      ['kinder-bueno', 'bolos'], ['kinder-bueno', 'copos'],
      ['calda-caramelo', 'bolos'], ['calda-caramelo', 'copos'], ['calda-caramelo', 'bebidas']
    ];
    for (const rel of addonCategories) {
      await connection.query('INSERT INTO addon_categories (addon_id, category_id) VALUES (?, ?)', rel);
    }

    // 5. Inserir Produtos
    console.log('Inserindo produtos...');
    const products = [
      ['1', 'Brigadeiro Gourmet Belga', 'Brigadeiro tradicional feito com cacau belga 54% e granulado nobre', 4.50, '1', 'docinhos', 1, 412],
      ['2', 'Beijinho Trufado', 'Doce de coco com textura cremosa e cobertura de coco ralado fino', 4.50, '2', 'docinhos', 0, 289],
      ['3', 'Coxinha de Morango', 'Morango inteiro fresco envolto em brigadeiro gourmet de leite ninho', 8.00, '3', 'docinhos', 1, 384],
      ['4', 'Bolo no Pote Ninho com Nutella', 'Camadas de bolo de chocolate molhadinho com creme de leite Ninho e Nutella pura', 15.00, '4', 'bolos', 1, 512],
      ['5', 'Bolo no Pote Cenoura com Brigadeiro', 'Bolo de cenoura fofinho com uma cobertura generosa de brigadeiro gourmet cremoso', 15.00, '5', 'bolos', 0, 265],
      ['6', 'Copo da Felicidade Supremo', 'Copo repleto de brigadeiro belga, creme de Ninho, morangos frescos e pedaços de Kinder Bueno', 18.00, '6', 'copos', 1, 689],
      ['7', 'Croissant de Nutella e Morango', 'Croissant folhado super crocante recheado com creme de avelã e fatias de morango', 16.50, '7', 'bolos', 0, 145],
      ['8', 'Capuccino Cream', 'Espresso curto servido com leite vaporizado cremoso, chantilly e raspas de chocolate belga', 12.00, '8', 'bebidas', 0, 320],
      ['9', 'Pink Lemonade', 'Bebida refrescante com limão siciliano, água com gás e xarope de frutas vermelhas caseiro', 10.00, '9', 'bebidas', 0, 245],
      ['10', 'Espresso Italiano', 'Café espresso tradicional tirado na hora com grãos selecionados', 6.00, '10', 'bebidas', 0, 189]
    ];
    for (const prod of products) {
      await connection.query(
        'INSERT INTO products (id, name, description, price, image, category_id, is_promo, order_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        prod
      );
    }

    // 6. Inserir Mapeamento Produto <-> Adicional (product_addons)
    console.log('Inserindo relações produtos-adicionais...');
    const productAddons = [
      ['1', 'nutella'], ['1', 'morango'], ['1', 'leite-ninho'],
      ['2', 'nutella'], ['2', 'morango'], ['2', 'leite-ninho'],
      ['3', 'nutella'], ['3', 'morango'], ['3', 'leite-ninho'],
      ['4', 'nutella'], ['4', 'morango'], ['4', 'leite-ninho'], ['4', 'kinder-bueno'], ['4', 'calda-caramelo'],
      ['5', 'nutella'], ['5', 'morango'], ['5', 'leite-ninho'], ['5', 'kinder-bueno'], ['5', 'calda-caramelo'],
      ['6', 'nutella'], ['6', 'morango'], ['6', 'leite-ninho'], ['6', 'kinder-bueno'], ['6', 'calda-caramelo'],
      ['7', 'nutella'], ['7', 'morango'], ['7', 'leite-ninho'],
      ['8', 'calda-caramelo']
    ];
    for (const rel of productAddons) {
      await connection.query('INSERT INTO product_addons (product_id, addon_id) VALUES (?, ?)', rel);
    }

    await connection.commit();
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    await connection.rollback();
    console.error('Erro durante a migração:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

seedDoceria();
