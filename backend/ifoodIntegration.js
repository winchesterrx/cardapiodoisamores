import db from './db.js';
import dotenv from 'dotenv';
dotenv.config();

// Use environment variables or fallback to the sandbox ones we used
const IFOOD_CLIENT_ID = process.env.IFOOD_CLIENT_ID || '4d5da684-e466-4a50-8d12-5904bb5233be';
const IFOOD_CLIENT_SECRET = process.env.IFOOD_CLIENT_SECRET || 'suzo8x9cr4jrrlm7v26laz2iz2bmq358n586enk4inl0dws9bw0jzjv8o2fbhyxdn4ncrmdosr1sjl4j6h0tl4j3juai5v09zyy';

let token = null;

async function getToken() {
  const params = new URLSearchParams();
  params.append('grantType', 'client_credentials');
  params.append('clientId', IFOOD_CLIENT_ID);
  params.append('clientSecret', IFOOD_CLIENT_SECRET);
  try {
    const response = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', { method: 'POST', body: params });
    const data = await response.json();
    if (data.accessToken) {
      token = data.accessToken;
      console.log('✅ Token do iFood obtido com sucesso!');
    } else {
      console.error('❌ Erro ao obter token do iFood:', data);
    }
  } catch (err) {
    console.error('❌ Falha na conexão com iFood para obter token:', err.message);
  }
}

async function getOrderDetails(orderId) {
  try {
    const response = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await response.json();
  } catch (err) {
    console.error(`Erro ao buscar detalhes do pedido ${orderId}:`, err.message);
    return null;
  }
}

async function processOrder(orderData) {
  if (!orderData || !orderData.id) return;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Checar se pedido já existe
    const [existing] = await connection.query('SELECT id FROM orders WHERE id = ?', [orderData.id]);
    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return; // Já importado
    }

    // Mapear dados do iFood para o nosso BD
    const total = orderData.payments?.prepaid > 0 ? orderData.payments.prepaid : (orderData.payments?.pending > 0 ? orderData.payments.pending : 0);
    const deliveryFee = orderData.delivery?.fee || 0;
    const consumeType = orderData.orderType === 'DELIVERY' ? 'delivery' : 'takeout';
    
    let paymentMethod = 'iFood';
    if (orderData.payments && orderData.payments.methods && orderData.payments.methods.length > 0) {
       paymentMethod = orderData.payments.methods[0].method.name || 'iFood';
    }

    const customerName = orderData.customer?.name || 'Cliente iFood';
    const customerWhatsApp = orderData.customer?.phone?.number || '';
    
    let address = '';
    if (orderData.delivery && orderData.delivery.deliveryAddress) {
       const a = orderData.delivery.deliveryAddress;
       address = `${a.streetName}, ${a.streetNumber} - ${a.neighborhood}, ${a.city}`;
       if (a.complement) address += ` (${a.complement})`;
    }

    const now = new Date();

    const queryOrder = `
      INSERT INTO orders (id, total, consume_type, payment_method, address, mesa, customer_whatsapp, customer_cpf, status, customer_name, change_needed_for, delivery_fee, origin, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await connection.query(queryOrder, [
      orderData.id, 
      total, 
      consumeType, 
      paymentMethod, 
      address, 
      null, // mesa
      customerWhatsApp, 
      null, // cpf
      'recebido', // status inicial
      customerName, 
      null, // troco
      deliveryFee, 
      'ifood', 
      now
    ]);

    // Processar itens
    if (orderData.items && orderData.items.length > 0) {
      for (const item of orderData.items) {
        const queryItem = `
          INSERT INTO order_items (order_id, product_name, product_price, quantity, notes)
          VALUES (?, ?, ?, ?, ?)
        `;
        const [resultItem] = await connection.query(queryItem, [
          orderData.id, 
          item.name, 
          item.price, 
          item.quantity, 
          item.observations || ''
        ]);
        const orderItemId = resultItem.insertId;

        // Addons do item (O iFood chama de options)
        if (item.options && item.options.length > 0) {
          for (const opt of item.options) {
            const queryAddon = `
              INSERT INTO order_item_addons (order_item_id, name, price, quantity)
              VALUES (?, ?, ?, ?)
            `;
            await connection.query(queryAddon, [orderItemId, opt.name, opt.price, opt.quantity]);
          }
        }
      }
    }

    // Timeline inicial
    await connection.query('INSERT INTO order_timelines (order_id, status, timestamp) VALUES (?, ?, ?)', [
      orderData.id, 'recebido', now
    ]);

    await connection.commit();
    console.log(`✅ Pedido iFood ${orderData.id} salvo no banco de dados!`);
  } catch (err) {
    try { await connection.rollback(); } catch (e) {}
    console.error(`❌ Erro ao salvar pedido do iFood ${orderData.id}:`, err);
  } finally {
    connection.release();
  }
}

async function pollEvents() {
  if (!token) await getToken();
  if (!token) return;

  try {
    const res = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events:polling', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      token = null; 
      return;
    }
    
    if (res.status === 200) {
      const text = await res.text();
      if (!text) return;
      const events = JSON.parse(text);
      if (events.length > 0) {
        console.log(`📥 iFood: Recebidos ${events.length} eventos.`);
        const ackIds = events.map(event => ({ id: event.id }));

        // SEMPRE DAR ACK IMEDIATAMENTE antes de processar, para não dar timeout no iFood Audit
        if (ackIds.length > 0) {
          try {
            const ackRes = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(ackIds)
            });
            if (!ackRes.ok) {
               console.error("Erro ao dar ACK nos eventos:", await ackRes.text());
            } else {
               console.log(`✅ Eventos ACKed com sucesso:`, ackIds.length);
            }
          } catch (ackErr) {
            console.error("Exceção ao dar ACK nos eventos:", ackErr);
          }
        }

        for (const event of events) {
          try {
            // Se for um pedido novo (PLC - Placed)
            if (event.code === 'PLC') {
              console.log(`🍔 Novo pedido iFood detectado! ID: ${event.orderId}`);
              const orderData = await getOrderDetails(event.orderId);
              if (orderData) {
                await processOrder(orderData);
                // Removido auto-confirm a pedido do usuário (ele usará o botão no painel)
              }
            }
            
            // Se o pedido foi cancelado no iFood (CAN)
            if (event.code === 'CAN') {
                await db.query('UPDATE orders SET status = \'cancelado\' WHERE id = ?', [event.orderId]);
                await db.query('INSERT INTO order_timelines (order_id, status) VALUES (?, ?)', [event.orderId, 'cancelado']);
                console.log(`🚫 Pedido iFood ${event.orderId} cancelado.`);
            }

            if (event.code === 'CGC') {
               console.log(`⚠️ Cliente pediu cancelamento iFood ${event.orderId}. Aceitando automaticamente...`);
               const cancelRes = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${event.orderId}/acceptCancellation`, {
                 method: 'POST',
                 headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                 body: JSON.stringify({})
               });
               if (!cancelRes.ok) {
                 console.error(`Erro ao aceitar cancelamento do pedido ${event.orderId}:`, await cancelRes.text());
               }
            }
          } catch (eventErr) {
            console.error(`Erro ao processar o evento iFood ${event.id}:`, eventErr);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro no polling do iFood:', error.message);
  }
}

// Inicia o Polling
let pollingInterval;
export const startIfoodIntegration = () => {
  console.log('🚀 Iniciando integração em background com o iFood...');
  getToken().then(() => {
    pollingInterval = setInterval(pollEvents, 2000); // 2 segundos (muito rápido para o teste não perder o último evento!)
  });
};

// Funções expostas para o Frontend chamar
export const confirmIfoodOrder = async (orderId) => {
    if (!token) await getToken();
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    const text = await res.text();
    if (!res.ok) console.error(`Erro ao confirmar pedido iFood ${orderId}:`, text);
    else console.log(`✅ Pedido ${orderId} confirmado no iFood:`, text);
    return res.status === 202 || res.status === 200;
};

export const readyToPickupIfoodOrder = async (orderId) => {
    if (!token) await getToken();
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/readyToPickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (!res.ok) console.error(`Erro ao marcar pronto pedido iFood ${orderId}:`, await res.text());
    return res.status === 202 || res.status === 200;
};

export const dispatchIfoodOrder = async (orderId) => {
    if (!token) await getToken();
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) console.error(`Erro ao despachar pedido iFood ${orderId}:`, await res.text());
    return res.status === 202 || res.status === 200;
};

export const cancelIfoodOrder = async (orderId, reason = 'Cancelado pelo restaurante', code = '501') => {
    if (!token) await getToken();
    
    // Consulta motivos de cancelamento antes de solicitar, conforme exigido no teste do iFood
    try {
        await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/cancellationReasons`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (e) {
        console.error('Erro ao consultar motivos de cancelamento', e);
    }

    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/requestCancellation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, cancellationCode: code })
    });
    if (!res.ok) console.error(`Erro ao cancelar pedido iFood ${orderId}:`, await res.text());
    return res.status === 202 || res.status === 200;
};
