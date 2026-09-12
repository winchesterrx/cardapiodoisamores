import db from './db.js';
import dotenv from 'dotenv';
import webpush from 'web-push';
dotenv.config();

// Credenciais de PRODUÇÃO (via variáveis de ambiente - nunca usar fallback em produção!)
const IFOOD_CLIENT_ID = process.env.IFOOD_CLIENT_ID;
const IFOOD_CLIENT_SECRET = process.env.IFOOD_CLIENT_SECRET;

if (!IFOOD_CLIENT_ID || !IFOOD_CLIENT_SECRET) {
  console.error('🔴 ATENÇÃO: IFOOD_CLIENT_ID ou IFOOD_CLIENT_SECRET não estão definidos nas variáveis de ambiente!');
  console.error('🔴 Os pedidos do iFood NÃO serão recebidos até que essas variáveis sejam configuradas no Render.');
} else {
  console.log(`✅ iFood: Usando clientId = ${IFOOD_CLIENT_ID.substring(0, 8)}... (produção)`);
}

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails('mailto:contato@exemplo.com', publicVapidKey, privateVapidKey);
}

// ── Estado da Integração ──
let token = null;
let tokenExpiresAt = null;
let merchantIds = []; // IDs dos merchants vinculados
let _pollCount = 0;
let _lastPollTime = null;
let _lastEventTime = null;
let _lastError = null;
let _ordersReceived = 0;
let _integrationStartedAt = null;

// ── Exporta status para rota de diagnóstico ──
export const getIfoodStatus = () => ({
  active: !!token && !!IFOOD_CLIENT_ID,
  hasCredentials: !!IFOOD_CLIENT_ID && !!IFOOD_CLIENT_SECRET,
  tokenValid: !!token && (!tokenExpiresAt || Date.now() < tokenExpiresAt),
  tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt).toISOString() : null,
  merchantIds,
  pollCount: _pollCount,
  lastPollTime: _lastPollTime,
  lastEventTime: _lastEventTime,
  lastError: _lastError,
  ordersReceived: _ordersReceived,
  integrationStartedAt: _integrationStartedAt,
  pollingIntervalMs: 30000
});

// ── Autenticação ──
async function getToken() {
  const params = new URLSearchParams();
  params.append('grantType', 'client_credentials');
  params.append('clientId', IFOOD_CLIENT_ID);
  params.append('clientSecret', IFOOD_CLIENT_SECRET);
  try {
    console.log('🔑 iFood: Solicitando token de acesso...');
    const response = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params 
    });
    const data = await response.json();
    if (data.accessToken) {
      token = data.accessToken;
      // Token do iFood expira em ~1 hora (3600s). Renovamos com margem de 5 min.
      const expiresIn = data.expiresIn || 3600;
      tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;
      console.log(`✅ iFood: Token obtido com sucesso! Expira em ${expiresIn}s`);
      _lastError = null;
    } else {
      console.error('❌ iFood: Erro ao obter token:', JSON.stringify(data));
      _lastError = `Token error: ${JSON.stringify(data)}`;
    }
  } catch (err) {
    console.error('❌ iFood: Falha na conexão para obter token:', err.message);
    _lastError = `Token connection error: ${err.message}`;
  }
}

// ── Verifica e renova token se expirado ──
async function ensureToken() {
  if (!token || (tokenExpiresAt && Date.now() >= tokenExpiresAt)) {
    console.log('🔄 iFood: Token expirado ou ausente. Renovando...');
    await getToken();
  }
  return !!token;
}

// ── Busca Merchant IDs ──
async function fetchMerchantIds() {
  if (!token) return;
  try {
    console.log('🏪 iFood: Buscando Merchant IDs vinculados...');
    const response = await fetch('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.warn(`⚠️ iFood: Módulo Merchant não disponível (${response.status}). Polling funcionará sem filtro de merchant.`);
      console.warn(`⚠️ Isso é normal se o módulo 'Merchant' não foi habilitado no app do iFood.`);
      return;
    }
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      merchantIds = data.map(m => m.id);
      console.log(`✅ iFood: ${merchantIds.length} merchant(s) encontrado(s):`);
      data.forEach(m => console.log(`   📍 ${m.name || 'Sem nome'} → ID: ${m.id}`));
    } else {
      console.warn('⚠️ iFood: Nenhum merchant encontrado vinculado a este token.');
      console.warn('⚠️ Verifique se a loja autorizou o aplicativo no Portal do Parceiro iFood.');
      _lastError = 'No merchants found';
    }
  } catch (err) {
    console.error('❌ iFood: Erro ao buscar merchants:', err.message);
    _lastError = `Merchant fetch exception: ${err.message}`;
  }
}

// ── Busca detalhes de um pedido ──
async function getOrderDetails(orderId) {
  try {
    await ensureToken();
    const response = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ iFood: Erro ${response.status} ao buscar detalhes do pedido ${orderId}: ${errText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.id) {
      console.error(`❌ iFood: Resposta inválida para pedido ${orderId}:`, JSON.stringify(data).substring(0, 500));
      return null;
    }
    
    console.log(`📋 iFood: Detalhes do pedido ${orderId} obtidos. Items: ${data.items?.length || 0}`);
    return data;
  } catch (err) {
    console.error(`❌ iFood: Erro ao buscar detalhes do pedido ${orderId}:`, err.message);
    return null;
  }
}

// ── Processa e salva pedido no BD ──
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
      console.log(`ℹ️ iFood: Pedido ${orderData.id} já existe no banco. Pulando.`);
      return;
    }

    // ── Mapeamento robusto de dados do iFood ──
    
    // Total (Valor Bruto sem descontos): O cliente pediu para ignorar os descontos no total salvo, 
    // pois o iFood reembolsa cupons (Clube iFood, etc). Usamos subTotal + deliveryFee.
    let total = 0;
    if (orderData.total && orderData.total.subTotal !== undefined) {
      // Prioridade 1: Valor Bruto (Subtotal + Entrega + Taxas Adicionais)
      const sub = orderData.total.subTotal || 0;
      const fee = orderData.total.deliveryFee || 0;
      const add = orderData.total.additionalFees || 0;
      total = sub + fee + add;
    } else if (orderData.total && orderData.total.orderAmount !== undefined) {
      // Prioridade 2: Valor pago pelo cliente (Fallback)
      total = orderData.total.orderAmount;
    } else if (orderData.payments) {
      // Fallback para o formato antigo
      total = orderData.payments.prepaid > 0 ? orderData.payments.prepaid : (orderData.payments.pending > 0 ? orderData.payments.pending : 0);
    }
    
    // Delivery fee
    let deliveryFee = 0;
    if (orderData.total && orderData.total.deliveryFee !== undefined) {
      deliveryFee = orderData.total.deliveryFee;
    } else if (orderData.delivery && orderData.delivery.deliveryFee !== undefined) {
      deliveryFee = orderData.delivery.deliveryFee;
    } else if (orderData.delivery && orderData.delivery.fee !== undefined) {
      deliveryFee = orderData.delivery.fee;
    }
    
    // Tipo de consumo
    const consumeType = orderData.orderType === 'DELIVERY' ? 'delivery' : 'takeout';
    
    // Pagamento
    let paymentMethod = 'iFood';
    if (orderData.payments && orderData.payments.methods && orderData.payments.methods.length > 0) {
      const method = orderData.payments.methods[0];
      paymentMethod = method.method?.name || method.name || method.type || 'iFood';
    }

    // Cliente
    let customerName = orderData.customer?.name || 'Cliente iFood';
    const customerWhatsApp = orderData.customer?.phone?.number || orderData.customer?.phone || '';

    // Se o cliente pagou um valor menor (com desconto), adicionamos um aviso no nome dele 
    // para aparecer no painel, já que a receita bruta foi para a variável 'total'.
    if (orderData.total && orderData.total.orderAmount !== undefined && orderData.total.orderAmount < total) {
      customerName += ` (Pagou R$ ${orderData.total.orderAmount.toFixed(2).replace('.', ',')})`;
    }
    
    // Endereço
    let address = '';
    if (orderData.delivery && orderData.delivery.deliveryAddress) {
      const a = orderData.delivery.deliveryAddress;
      address = `${a.streetName || ''}, ${a.streetNumber || 'S/N'} - ${a.neighborhood || ''}, ${a.city || ''}`;
      if (a.complement) address += ` (${a.complement})`;
      if (a.reference) address += ` - Ref: ${a.reference}`;
    }

    const now = new Date();

    console.log(`💾 iFood: Salvando pedido ${orderData.id} | Total: R$${total} | Tipo: ${consumeType} | Cliente: ${customerName}`);

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
      'confirmado', // status inicial (auto-confirm)
      customerName, 
      null, // troco
      deliveryFee, 
      'ifood', 
      now
    ]);

    // Processar itens
    if (orderData.items && orderData.items.length > 0) {
      for (const item of orderData.items) {
        // O iFood pode enviar price como unitPrice ou price
        const itemPrice = item.unitPrice || item.price || 0;
        const itemName = item.name || 'Item sem nome';
        const itemQty = item.quantity || 1;
        const itemNotes = item.observations || item.note || '';
        
        const queryItem = `
          INSERT INTO order_items (order_id, product_name, product_price, quantity, notes)
          VALUES (?, ?, ?, ?, ?)
        `;
        const [resultItem] = await connection.query(queryItem, [
          orderData.id, 
          itemName, 
          itemPrice, 
          itemQty, 
          itemNotes
        ]);
        const orderItemId = resultItem.insertId;

        // Addons do item (O iFood chama de options ou subItems)
        const options = item.options || item.subItems || [];
        if (options.length > 0) {
          for (const opt of options) {
            const queryAddon = `
              INSERT INTO order_item_addons (order_item_id, name, price, quantity)
              VALUES (?, ?, ?, ?)
            `;
            await connection.query(queryAddon, [
              orderItemId, 
              opt.name || 'Adicional', 
              opt.unitPrice || opt.price || 0, 
              opt.quantity || 1
            ]);
          }
        }
      }
    }

    // Timeline inicial
    await connection.query('INSERT INTO order_timelines (order_id, status, timestamp) VALUES (?, ?, ?)', [
      orderData.id, 'confirmado', now
    ]);

    await connection.commit();
    
    // Confirma no iFood imediatamente
    try {
      await confirmIfoodOrder(orderData.id);
      console.log(`✅ iFood: Pedido ${orderData.id} auto-confirmado na plataforma iFood!`);
    } catch (e) {
      console.error(`❌ iFood: Falha ao auto-confirmar pedido ${orderData.id} na plataforma:`, e.message);
    }

    // Disparar Push Notification para os Administradores
    if (publicVapidKey) {
      try {
        const [adminSubs] = await db.query('SELECT * FROM admin_push_subscriptions');
        const payload = JSON.stringify({
          title: 'Novo Pedido iFood!',
          body: `Pedido #${orderData.displayId || orderData.id.substring(0,6)} de ${customerName || 'Cliente'}. Total: R$ ${Number(total).toFixed(2).replace('.', ',')}`,
          url: '/admin'
        });
        for (const sub of adminSubs) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          try {
            await webpush.sendNotification(pushSubscription, payload);
          } catch (pushSendErr) {}
        }
      } catch (pushErr) {
        console.error('Erro ao buscar admin subs no iFood:', pushErr);
      }
    }

    _ordersReceived++;
    _lastEventTime = new Date().toISOString();
    console.log(`✅ iFood: Pedido ${orderData.id} salvo no banco de dados! (Total recebidos: ${_ordersReceived})`);
  } catch (err) {
    try { await connection.rollback(); } catch (e) {}
    console.error(`❌ iFood: Erro ao salvar pedido ${orderData.id}:`, err.message);
    _lastError = `Order save error: ${err.message}`;
  } finally {
    connection.release();
  }
}

// ── Polling de Eventos ──
async function pollEvents() {
  if (!IFOOD_CLIENT_ID || !IFOOD_CLIENT_SECRET) return;
  
  const hasToken = await ensureToken();
  if (!hasToken) return;

  try {
    // Monta headers - inclui x-polling-merchants se temos merchant IDs
    const headers = { Authorization: `Bearer ${token}` };
    if (merchantIds.length > 0) {
      headers['x-polling-merchants'] = merchantIds.join(',');
    }

    // ENDPOINT CORRETO: /events:polling
    const res = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events:polling', {
      headers
    });
    
    _pollCount++;
    _lastPollTime = new Date().toISOString();
    
    // Log periódico a cada 10 polls (~5min) para monitoramento
    if (_pollCount % 10 === 0) {
      console.log(`🔄 iFood: Polling ativo. Ciclo #${_pollCount} | Pedidos recebidos: ${_ordersReceived} | Status: ${res.status} | Merchants: ${merchantIds.length}`);
    }

    if (res.status === 401) {
      console.warn('⚠️ iFood: Token expirado (401). Renovando...');
      token = null;
      tokenExpiresAt = null;
      await getToken();
      return;
    }

    if (res.status === 403) {
      const body = await res.text();
      console.error(`🔴 iFood: Acesso negado (403). Verifique credenciais e autorizações. Resposta: ${body}`);
      _lastError = `403 Forbidden: ${body}`;
      token = null;
      return;
    }

    if (res.status === 204) {
      // 204 = Sem eventos no momento (normal)
      return;
    }
    
    if (res.status === 200) {
      const text = await res.text();
      if (!text || text.trim() === '' || text.trim() === '[]') return;
      
      let events;
      try {
        events = JSON.parse(text);
      } catch (parseErr) {
        console.error('❌ iFood: Erro ao parsear eventos JSON:', text.substring(0, 500));
        _lastError = `JSON parse error: ${text.substring(0, 100)}`;
        return;
      }

      if (!Array.isArray(events) || events.length === 0) return;

      console.log(`📥 iFood: Recebidos ${events.length} evento(s): ${events.map(e => `${e.code}(${e.orderId?.substring(0, 8)}...)`).join(', ')}`);
      
      // SEMPRE DAR ACK IMEDIATAMENTE antes de processar
      const ackIds = events.map(event => ({ id: event.id }));
      if (ackIds.length > 0) {
        try {
          const ackRes = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(ackIds)
          });
          if (!ackRes.ok) {
            console.error(`❌ iFood: Erro ao dar ACK nos eventos (${ackRes.status}):`, await ackRes.text());
          } else {
            console.log(`✅ iFood: ACK enviado para ${ackIds.length} evento(s).`);
          }
        } catch (ackErr) {
          console.error('❌ iFood: Exceção ao dar ACK nos eventos:', ackErr.message);
        }
      }

      // Processa cada evento
      for (const event of events) {
        try {
          console.log(`📌 iFood: Processando evento: code=${event.code}, orderId=${event.orderId}, fullCode=${event.fullCode || 'N/A'}`);
          
          // ══ EVENTO: NOVO PEDIDO ══
          // A API moderna usa "PLACED", mas mantemos compatibilidade com "PLC" caso o iFood alterne
          if (event.code === 'PLACED' || event.code === 'PLC') {
            console.log(`🍔 iFood: NOVO PEDIDO! ID: ${event.orderId}. Buscando detalhes...`);
            const orderData = await getOrderDetails(event.orderId);
            if (orderData) {
              await processOrder(orderData);
            } else {
              console.error(`❌ iFood: Não foi possível obter detalhes do pedido ${event.orderId}`);
              _lastError = `Failed to get order details: ${event.orderId}`;
            }
          }
          
          // ══ EVENTO: PEDIDO CONFIRMADO ══
          if (event.code === 'CONFIRMED' || event.code === 'CFM') {
            console.log(`✅ iFood: Pedido ${event.orderId} confirmado na plataforma.`);
          }
          
          // ══ EVENTO: PEDIDO CANCELADO ══
          if (event.code === 'CANCELLED' || event.code === 'CAN') {
            console.log(`🚫 iFood: Pedido ${event.orderId} cancelado.`);
            try {
              await db.query('UPDATE orders SET status = \'cancelado\' WHERE id = ?', [event.orderId]);
              await db.query('INSERT INTO order_timelines (order_id, status) VALUES (?, ?)', [event.orderId, 'cancelado']);
            } catch (dbErr) {
              console.error(`❌ iFood: Erro ao atualizar cancelamento no BD:`, dbErr.message);
            }
          }

          // ══ EVENTO: PEDIDO PRONTO ══
          if (event.code === 'READY_TO_PICKUP' || event.code === 'RTP') {
            console.log(`📦 iFood: Pedido ${event.orderId} marcado como pronto para retirada.`);
          }

          // ══ EVENTO: PEDIDO DESPACHADO ══
          if (event.code === 'DISPATCHED' || event.code === 'DSP') {
            console.log(`🛵 iFood: Pedido ${event.orderId} foi despachado para entrega.`);
          }

          // ══ EVENTO: PEDIDO CONCLUÍDO ══
          if (event.code === 'CONCLUDED' || event.code === 'CON') {
            console.log(`🎉 iFood: Pedido ${event.orderId} concluído com sucesso.`);
            try {
              await db.query('UPDATE orders SET status = \'entregue\' WHERE id = ?', [event.orderId]);
              await db.query('INSERT INTO order_timelines (order_id, status) VALUES (?, ?)', [event.orderId, 'entregue']);
            } catch (dbErr) {
              console.error(`❌ iFood: Erro ao atualizar conclusão no BD:`, dbErr.message);
            }
          }

          // ══ EVENTO: SOLICITAÇÃO DE CANCELAMENTO DO CLIENTE ══
          if (event.code === 'CANCELLATION_REQUESTED' || event.code === 'CGC' || event.code === 'CRC') {
            console.log(`⚠️ iFood: Cliente pediu cancelamento do pedido ${event.orderId}. Aceitando automaticamente...`);
            try {
              const cancelRes = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${event.orderId}/acceptCancellation`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              if (!cancelRes.ok) {
                console.error(`❌ iFood: Erro ao aceitar cancelamento ${event.orderId}:`, await cancelRes.text());
              } else {
                console.log(`✅ iFood: Cancelamento do pedido ${event.orderId} aceito.`);
              }
            } catch (cancelErr) {
              console.error(`❌ iFood: Exceção ao aceitar cancelamento:`, cancelErr.message);
            }
          }
          
        } catch (eventErr) {
          console.error(`❌ iFood: Erro ao processar evento ${event.id} (${event.code}):`, eventErr.message);
          _lastError = `Event processing error: ${event.code} - ${eventErr.message}`;
        }
      }
    } else {
      const body = await res.text();
      console.error(`⚠️ iFood: Polling status inesperado ${res.status}. Resposta: ${body}`);
      _lastError = `Unexpected polling status ${res.status}: ${body}`;
    }
  } catch (error) {
    console.error('❌ iFood: Erro no polling:', error.message);
    _lastError = `Polling exception: ${error.message}`;
  }
}

// ── Inicia o Polling ──
let pollingInterval;
export const startIfoodIntegration = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 INICIANDO INTEGRAÇÃO IFOOD');
  console.log('═══════════════════════════════════════════════');
  
  _integrationStartedAt = new Date().toISOString();
  
  if (!IFOOD_CLIENT_ID || !IFOOD_CLIENT_SECRET) {
    console.error('🔴 iFood: Integração DESATIVADA - credenciais não configuradas.');
    console.error('🔴 Configure IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET nas variáveis de ambiente.');
    return;
  }
  
  // 1. Obter token
  await getToken();
  if (!token) {
    console.error('🔴 iFood: Não foi possível obter token. Tentando novamente em 60s...');
    setTimeout(startIfoodIntegration, 60000);
    return;
  }
  
  // 2. Buscar Merchant IDs
  await fetchMerchantIds();
  
  // 3. Iniciar polling a cada 30 segundos (conforme documentação oficial do iFood)
  console.log('');
  console.log(`✅ iFood: Polling iniciado! Intervalo: 30 segundos`);
  console.log(`✅ iFood: Merchants monitorados: ${merchantIds.length > 0 ? merchantIds.join(', ') : 'TODOS (nenhum filtro)'}`);
  console.log('═══════════════════════════════════════════════');
  console.log('');
  
  pollingInterval = setInterval(pollEvents, 30000); // 30 segundos conforme documentação
  
  // Faz o primeiro poll imediatamente
  pollEvents();
};

// ── Funções expostas para o Frontend chamar ──
export const confirmIfoodOrder = async (orderId) => {
    await ensureToken();
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    const text = await res.text();
    if (!res.ok) console.error(`❌ iFood: Erro ao confirmar pedido ${orderId}:`, text);
    else console.log(`✅ iFood: Pedido ${orderId} confirmado!`);
    return res.status === 202 || res.status === 200;
};

export const readyToPickupIfoodOrder = async (orderId) => {
    await ensureToken();
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/readyToPickup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (!res.ok) console.error(`❌ iFood: Erro ao marcar pronto pedido ${orderId}:`, await res.text());
    return res.status === 202 || res.status === 200;
};

export const dispatchIfoodOrder = async (orderId) => {
    await ensureToken();
    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/dispatch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) console.error(`❌ iFood: Erro ao despachar pedido ${orderId}:`, await res.text());
    return res.status === 202 || res.status === 200;
};

export const cancelIfoodOrder = async (orderId, reason = 'Cancelado pelo restaurante', code = '501') => {
    await ensureToken();
    
    // Consulta motivos de cancelamento antes de solicitar
    try {
        await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/cancellationReasons`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (e) {
        console.error('⚠️ iFood: Erro ao consultar motivos de cancelamento:', e.message);
    }

    const res = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/requestCancellation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, cancellationCode: code })
    });
    if (!res.ok) console.error(`❌ iFood: Erro ao cancelar pedido ${orderId}:`, await res.text());
    return res.status === 202 || res.status === 200;
};

// ── Teste de conexão ──
export const testIfoodConnection = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  // Passo 1: Obter token
  try {
    const params = new URLSearchParams();
    params.append('grantType', 'client_credentials');
    params.append('clientId', IFOOD_CLIENT_ID);
    params.append('clientSecret', IFOOD_CLIENT_SECRET);
    
    const tokenRes = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const tokenData = await tokenRes.json();
    
    if (tokenData.accessToken) {
      results.steps.push({ step: 'Token', status: 'OK', message: `Token obtido (expira em ${tokenData.expiresIn}s)` });
      
      const testToken = tokenData.accessToken;
      
      // Passo 2: Listar merchants
      const merchantRes = await fetch('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
        headers: { Authorization: `Bearer ${testToken}` }
      });
      
      if (merchantRes.ok) {
        const merchants = await merchantRes.json();
        results.steps.push({ 
          step: 'Merchants', 
          status: 'OK', 
          message: `${merchants.length} merchant(s) encontrado(s)`,
          data: merchants.map(m => ({ id: m.id, name: m.name }))
        });
        
        // Passo 3: Testar polling
        const pollHeaders = { Authorization: `Bearer ${testToken}` };
        if (merchants.length > 0) {
          pollHeaders['x-polling-merchants'] = merchants.map(m => m.id).join(',');
        }
        
        const pollRes = await fetch('https://merchant-api.ifood.com.br/order/v1.0/events:polling', {
          headers: pollHeaders
        });
        
        results.steps.push({ 
          step: 'Polling', 
          status: pollRes.status === 200 || pollRes.status === 204 ? 'OK' : 'ERRO',
          message: `Status ${pollRes.status} (${pollRes.status === 204 ? 'sem eventos pendentes' : pollRes.status === 200 ? 'eventos encontrados!' : 'erro'})` 
        });
        
      } else {
        const errText = await merchantRes.text();
        results.steps.push({ step: 'Merchants', status: 'ERRO', message: `Status ${merchantRes.status}: ${errText}` });
      }
      
    } else {
      results.steps.push({ step: 'Token', status: 'ERRO', message: JSON.stringify(tokenData) });
    }
  } catch (err) {
    results.steps.push({ step: 'Conexão', status: 'ERRO', message: err.message });
  }
  
  results.allOk = results.steps.every(s => s.status === 'OK');
  return results;
};
