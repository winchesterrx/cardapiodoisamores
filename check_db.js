import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
import db from './backend/db.js';

async function checkOrders() {
  try {
    const [orders] = await db.query('SELECT * FROM orders');
    console.log('Total de pedidos:', orders.length);
    console.log(JSON.stringify(orders, null, 2));
    
    const [items] = await db.query('SELECT * FROM order_items');
    console.log('Total de itens:', items.length);
    
    const [addons] = await db.query('SELECT * FROM order_item_addons');
    console.log('Total de adicionais em itens:', addons.length);
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao verificar pedidos:', error);
    process.exit(1);
  }
}

checkOrders();
