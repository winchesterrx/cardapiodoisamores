const db = require('./backend/db.cjs');

async function checkOrders() {
  try {
    const [orders] = await db.query('SELECT * FROM orders');
    console.log('Total de pedidos:', orders.length);
    console.log(orders);
    
    const [items] = await db.query('SELECT * FROM order_items');
    console.log('Total de itens:', items.length);
    console.log(items);
    
    const [addons] = await db.query('SELECT * FROM order_item_addons');
    console.log('Total de adicionais em itens:', addons.length);
    console.log(addons);
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao verificar pedidos:', error);
    process.exit(1);
  }
}

checkOrders();
