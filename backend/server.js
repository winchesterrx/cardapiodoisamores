import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails('mailto:contato@exemplo.com', publicVapidKey, privateVapidKey);
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Helper para salvar imagem base64
const saveBase64Image = async (base64Str) => {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str; // Já é URL ou inválido
  
  const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

  if (IMGBB_API_KEY) {
    try {
      const base64Data = base64Str.split(',')[1];
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ image: base64Data })
      });
      const result = await response.json();
      if (result.success) {
        return result.data.url;
      }
      console.error('ImgBB Upload Error:', result);
    } catch (err) {
      console.error('Falha no upload para o ImgBB:', err);
    }
  }

  // Fallback para upload local (se não tiver chave do ImgBB)
  const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return base64Str;
  
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const data = Buffer.from(matches[2], 'base64');
  const filename = `img_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
  
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
  fs.writeFileSync(path.join('uploads', filename), data);
  
  return `/uploads/${filename}`;
};

// ── Categories ──
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { id, name, icon } = req.body;
  try {
    await db.query('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)', [id, name, icon]);
    res.status(201).json({ id, name, icon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  const { name, icon } = req.body;
  try {
    await db.query('UPDATE categories SET name = ?, icon = ? WHERE id = ?', [name, icon, req.params.id]);
    res.json({ message: 'Atualizado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deletado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// ── Addons ──
app.get('/api/addons', async (req, res) => {
  try {
    const [addons] = await db.query('SELECT * FROM addons');
    const [relations] = await db.query('SELECT * FROM addon_categories');

    const formattedAddons = addons.map(addon => {
      const categoryIds = relations
        .filter(r => r.addon_id === addon.id)
        .map(r => r.category_id);
      return { ...addon, categoryIds, price: Number(addon.price) };
    });

    res.json(formattedAddons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar adicionais' });
  }
});

app.post('/api/addons', async (req, res) => {
  const { id, name, price, categoryIds } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('INSERT INTO addons (id, name, price) VALUES (?, ?, ?)', [id, name, price]);
    if (categoryIds && categoryIds.length > 0) {
      for (const cid of categoryIds) {
        await connection.query('INSERT INTO addon_categories (addon_id, category_id) VALUES (?, ?)', [id, cid]);
      }
    }
    await connection.commit();
    res.status(201).json({ message: 'Adicional criado com sucesso' });
  } catch (error) {
    try { await connection.rollback(); } catch (err) {}
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar adicional' });
  } finally {
    connection.release();
  }
});

app.put('/api/addons/:id', async (req, res) => {
  const { name, price, categoryIds } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('UPDATE addons SET name = ?, price = ? WHERE id = ?', [name, price, req.params.id]);
    await connection.query('DELETE FROM addon_categories WHERE addon_id = ?', [req.params.id]);
    if (categoryIds && categoryIds.length > 0) {
      for (const cid of categoryIds) {
        await connection.query('INSERT INTO addon_categories (addon_id, category_id) VALUES (?, ?)', [req.params.id, cid]);
      }
    }
    await connection.commit();
    res.json({ message: 'Atualizado com sucesso' });
  } catch (error) {
    try { await connection.rollback(); } catch (err) {}
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar adicional' });
  } finally {
    connection.release();
  }
});

app.delete('/api/addons/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM addons WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deletado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar adicional' });
  }
});

// ── Products ──
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
    `);

    const [productAddonsRows] = await db.query(`
      SELECT pa.product_id, a.* 
      FROM product_addons pa
      JOIN addons a ON pa.addon_id = a.id
    `);

    const [productImagesRows] = await db.query(`
      SELECT * FROM product_images
    `);

    const formattedProducts = products.map(p => {
      const addons = productAddonsRows
        .filter(pa => pa.product_id === p.id)
        .map(a => ({
          id: a.id,
          name: a.name,
          price: Number(a.price)
        }));

      const images = productImagesRows
        .filter(img => img.product_id === p.id)
        .map(img => img.image_url);

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        image: p.image,
        images: images.length ? images : (p.image ? [p.image] : []),
        category: p.category_id,
        addons: addons,
        isPromo: Boolean(p.is_promo),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        promoExpiry: p.promo_expiry,
        promoStock: p.promo_stock,
        orderCount: p.order_count,
        isMadeToOrder: Boolean(p.is_made_to_order)
      };
    });

    res.json(formattedProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, description, price, image, images, category, isPromo, originalPrice, promoExpiry, promoStock, addons, isMadeToOrder } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Processa e salva as imagens
    const savedImages = await Promise.all((images || []).map(saveBase64Image));
    const mainImage = savedImages.length > 0 ? savedImages[0] : (image ? await saveBase64Image(image) : null);

    const formattedPromoExpiry = promoExpiry ? new Date(promoExpiry).toISOString().slice(0, 19).replace('T', ' ') : null;

    await connection.query(
      'INSERT INTO products (id, name, description, price, image, category_id, is_promo, original_price, promo_expiry, promo_stock, is_made_to_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, description, price, mainImage, category, isPromo, originalPrice || null, formattedPromoExpiry, promoStock !== undefined ? promoStock : null, isMadeToOrder || false]
    );
    
    if (savedImages && savedImages.length > 0) {
      for (const imgUrl of savedImages) {
        await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [id, imgUrl]);
      }
    }

    if (addons && addons.length > 0) {
      for (const a of addons) {
        await connection.query('INSERT INTO product_addons (product_id, addon_id) VALUES (?, ?)', [id, a.id]);
      }
    }
    await connection.commit();
    res.status(201).json({ message: 'Produto criado com sucesso' });
  } catch (error) {
    try { await connection.rollback(); } catch (err) {}
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  } finally {
    connection.release();
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { name, description, price, image, images, category, isPromo, originalPrice, promoExpiry, promoStock, addons, isMadeToOrder } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Processa e salva as novas imagens (mantém as que já são URLs)
    const savedImages = await Promise.all((images || []).map(saveBase64Image));
    const mainImage = savedImages.length > 0 ? savedImages[0] : (image ? await saveBase64Image(image) : null);

    const formattedPromoExpiry = promoExpiry ? new Date(promoExpiry).toISOString().slice(0, 19).replace('T', ' ') : null;

    await connection.query(
      'UPDATE products SET name = ?, description = ?, price = ?, image = ?, category_id = ?, is_promo = ?, original_price = ?, promo_expiry = ?, promo_stock = ?, is_made_to_order = ? WHERE id = ?',
      [name, description, price, mainImage, category, isPromo, originalPrice || null, formattedPromoExpiry, promoStock !== undefined ? promoStock : null, isMadeToOrder || false, req.params.id]
    );
    
    // Deleta as imagens antigas e re-insere
    await connection.query('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
    if (savedImages && savedImages.length > 0) {
      for (const imgUrl of savedImages) {
        await connection.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [req.params.id, imgUrl]);
      }
    }

    await connection.query('DELETE FROM product_addons WHERE product_id = ?', [req.params.id]);
    if (addons && addons.length > 0) {
      for (const a of addons) {
        await connection.query('INSERT INTO product_addons (product_id, addon_id) VALUES (?, ?)', [req.params.id, a.id]);
      }
    }
    await connection.commit();
    res.json({ message: 'Atualizado com sucesso' });
  } catch (error) {
    try { await connection.rollback(); } catch (err) {}
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  } finally {
    connection.release();
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deletado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// ── Loyalty ──
app.get('/api/loyalty/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM loyalty_settings WHERE id = 1');
    res.json(rows[0] || { active: 0, spent_amount: 1, points_earned: 1, points_for_discount: 10, discount_amount: 1 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao ler config de fidelidade' });
  }
});

app.put('/api/loyalty/settings', async (req, res) => {
  const { active, spent_amount, points_earned, points_for_discount, discount_amount } = req.body;
  try {
    await db.query(
      'UPDATE loyalty_settings SET active=?, spent_amount=?, points_earned=?, points_for_discount=?, discount_amount=? WHERE id=1',
      [active ? 1 : 0, spent_amount, points_earned, points_for_discount, discount_amount]
    );
    res.json({ message: 'Configurações de fidelidade atualizadas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar fidelidade' });
  }
});

app.get('/api/loyalty/customer/:cpf', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT points FROM customers WHERE cpf = ?', [req.params.cpf]);
    res.json({ points: rows.length ? rows[0].points : 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao ler saldo do cliente' });
  }
});

// ── Store Settings ──
app.get('/api/store/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM store_settings WHERE id = 1');
    res.json(rows[0] || {
      has_delivery: 1,
      has_table: 1,
      has_pickup: 1,
      accepts_pix: 1,
      accepts_cash: 1,
      accepts_card: 1,
      opening_time: "10:00",
      closing_time: "22:00",
      delivery_fee: 0.00,
      delivery_info_text: "Entregas apenas depois das 14:00",
      is_open: 1
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar configurações da loja' });
  }
});

app.put('/api/store/settings', async (req, res) => {
  const { 
    has_delivery, has_table, has_pickup, 
    accepts_pix, accepts_cash, accepts_card, 
    opening_time, closing_time, delivery_fee, delivery_info_text, is_open
  } = req.body;
  try {
    await db.query(
      `UPDATE store_settings SET 
        has_delivery = ?, has_table = ?, has_pickup = ?, 
        accepts_pix = ?, accepts_cash = ?, accepts_card = ?, 
        opening_time = ?, closing_time = ?, delivery_fee = ?, delivery_info_text = ?, is_open = ? 
       WHERE id = 1`,
      [
        has_delivery ? 1 : 0, has_table ? 1 : 0, has_pickup ? 1 : 0,
        accepts_pix ? 1 : 0, accepts_cash ? 1 : 0, accepts_card ? 1 : 0,
        opening_time, closing_time, delivery_fee, delivery_info_text || "Entregas apenas depois das 14:00",
        is_open !== undefined ? (is_open ? 1 : 0) : 1
      ]
    );
    res.json({ message: 'Configurações atualizadas com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// ── Orders ──
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, u.name as courier_name 
      FROM orders o
      LEFT JOIN users u ON o.courier_id = u.id 
      ORDER BY o.created_at DESC
    `);
    
    // Para simplificar no MVP, buscamos os itens de todos os pedidos recentes e montamos a árvore
    // Numa app real, usaríamos JOINs complexos ou carregaríamos itens por pedido.
    const orderIds = orders.map(o => o.id);
    let items = [];
    let itemAddons = [];
    let timelines = [];

    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      [items] = await db.query(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`, orderIds);
      
      const itemIds = items.map(i => i.id);
      if (itemIds.length > 0) {
        const itemPlaceholders = itemIds.map(() => '?').join(',');
        [itemAddons] = await db.query(`SELECT * FROM order_item_addons WHERE order_item_id IN (${itemPlaceholders})`, itemIds);
      }

      [timelines] = await db.query(`SELECT * FROM order_timelines WHERE order_id IN (${placeholders}) ORDER BY timestamp ASC`, orderIds);
    }

    const formattedOrders = orders.map(o => {
      const oItems = items.filter(i => i.order_id === o.id).map(i => {
        const addons = itemAddons.filter(a => a.order_item_id === i.id).map(a => ({
          name: a.name,
          price: Number(a.price),
          quantity: a.quantity
        }));
        return {
          productName: i.product_name,
          productPrice: Number(i.product_price),
          quantity: i.quantity,
          notes: i.notes || '',
          addons
        };
      });

      const oTimeline = timelines.filter(t => t.order_id === o.id).map(t => ({
        status: t.status,
        timestamp: t.timestamp
      }));

      return {
        id: o.id,
        number: o.order_number,
        total: Number(o.total),
        consumeType: o.consume_type,
        paymentMethod: o.payment_method,
        address: o.address || '',
        mesa: o.mesa || '',
        customerWhatsApp: o.customer_whatsapp || '',
        customerCPF: o.customer_cpf || '',
        status: o.status,
        createdAt: o.created_at,
        items: oItems,
        timeline: oTimeline,
        customerName: o.customer_name || '',
        changeNeededFor: o.change_needed_for ? Number(o.change_needed_for) : undefined,
        deliveryFee: o.delivery_fee ? Number(o.delivery_fee) : 0,
        couponId: o.coupon_id || null,
        discountAmount: o.discount_amount ? Number(o.discount_amount) : 0,
        courierId: o.courier_id || null,
        courierName: o.courier_name || null,
        origin: o.origin || 'delivery'
      };
    });

    res.json(formattedOrders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const orderId = req.params.id;
    
    // Deletar addons
    const [items] = await connection.query('SELECT id FROM order_items WHERE order_id = ?', [orderId]);
    const itemIds = items.map(i => i.id);
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM order_item_addons WHERE order_item_id IN (${placeholders})`, itemIds);
    }
    
    // Deletar itens
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    
    // Deletar timelines
    await connection.query('DELETE FROM order_timelines WHERE order_id = ?', [orderId]);
    
    // Deletar pedido
    await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);
    
    await connection.commit();
    res.json({ message: 'Pedido excluído com sucesso' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir pedido' });
  } finally {
    connection.release();
  }
});

app.post('/api/orders', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // extrai dados do body baseado no formato do mock (Order)
    const { 
      id, number, consumeType, paymentMethod, address, mesa, 
      customerWhatsApp, customerCPF, status, total, items, timeline,
      usedPoints, discountAmount, customerName, changeNeededFor, deliveryFee, couponId, courierId, origin
    } = req.body;

    // Verificar se a loja está aberta
    const [settingsRowsCheck] = await connection.query('SELECT is_open FROM store_settings WHERE id = 1');
    if (settingsRowsCheck[0] && settingsRowsCheck[0].is_open === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'A loja está fechada no momento.' });
    }

    const queryOrder = `
      INSERT INTO orders (id, total, consume_type, payment_method, address, mesa, customer_whatsapp, customer_cpf, status, customer_name, change_needed_for, delivery_fee, coupon_id, discount_amount, courier_id, origin, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const now = new Date();
    await connection.query(queryOrder, [
      id, total, consumeType, paymentMethod, address || null, mesa || null, customerWhatsApp, customerCPF || null, status, customerName || null, changeNeededFor || null, deliveryFee || 0, couponId || null, discountAmount || 0, courierId || null, origin || 'delivery', now
    ]);

    // Busca o order_number gerado pelo AUTO_INCREMENT
    const [[insertedOrder]] = await connection.query('SELECT order_number FROM orders WHERE id = ?', [id]);
    const generatedOrderNumber = insertedOrder ? insertedOrder.order_number : 1;

    if (couponId) {
      await connection.query('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?', [couponId]);
    }

    // itens
    for (const item of items) {
      const queryItem = `
        INSERT INTO order_items (order_id, product_name, product_price, quantity, notes)
        VALUES (?, ?, ?, ?, ?)
      `;
      const [resultItem] = await connection.query(queryItem, [
        id, item.productName, item.productPrice, item.quantity, item.notes
      ]);
      const orderItemId = resultItem.insertId;

      // addons do item
      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          const queryAddon = `
            INSERT INTO order_item_addons (order_item_id, name, price, quantity)
            VALUES (?, ?, ?, ?)
          `;
          await connection.query(queryAddon, [orderItemId, addon.name, addon.price, addon.quantity]);
        }
      }
    }

    // timeline
    if (timeline && timeline.length > 0) {
      for (const t of timeline) {
        await connection.query('INSERT INTO order_timelines (order_id, status, timestamp) VALUES (?, ?, ?)', [
          id, t.status, new Date(t.timestamp)
        ]);
      }
    } else {
       await connection.query('INSERT INTO order_timelines (order_id, status) VALUES (?, ?)', [
          id, status
        ]);
    }

    // Processamento de pontos de fidelidade
    const [settingsRows] = await connection.query('SELECT * FROM loyalty_settings WHERE id = 1');
    const settings = settingsRows[0];
    
    if (settings && Boolean(settings.active) && customerCPF) {
      // 1. Descontar pontos usados
      if (usedPoints && Number(usedPoints) > 0) {
        await connection.query(
          'UPDATE customers SET points = GREATEST(0, points - ?) WHERE cpf = ?', 
          [Number(usedPoints), customerCPF]
        );
      }
      
      // 2. Acumular novos pontos baseados no total (que já inclui o desconto)
      const spendToEarn = Number(settings.spent_amount) || 1;
      const pointsToEarnValue = Number(settings.points_earned) || 1;
      const earned = Math.floor(Number(total) / spendToEarn) * pointsToEarnValue;
      
      if (earned > 0) {
        await connection.query(
          'INSERT INTO customers (cpf, points) VALUES (?, ?) ON DUPLICATE KEY UPDATE points = points + ?', 
          [customerCPF, earned, earned]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Pedido criado com sucesso', orderNumber: generatedOrderNumber });
  } catch (error) {
    try { await connection.rollback(); } catch (err) {}
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar pedido', details: error.message });
  } finally {
    connection.release();
  }
});
app.post('/api/push/subscribe', async (req, res) => {
  const { customerCpf, subscription } = req.body;
  
  if (!customerCpf || !subscription) {
    return res.status(400).json({ error: 'Faltando CPF ou Inscrição' });
  }

  try {
    await db.query(`
      INSERT INTO push_subscriptions (customer_cpf, endpoint, p256dh, auth) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE endpoint = ?, p256dh = ?
    `, [
      customerCpf, 
      subscription.endpoint, 
      subscription.keys.p256dh, 
      subscription.keys.auth,
      subscription.endpoint, 
      subscription.keys.p256dh
    ]);
    res.status(201).json({ message: 'Inscrição salva com sucesso' });
  } catch (err) {
    console.error('Erro ao salvar push subscription:', err);
    res.status(500).json({ error: 'Erro interno ao salvar inscrição' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, courierId } = req.body;
  try {
    if (courierId) {
      await db.query('UPDATE orders SET status = ?, courier_id = ? WHERE id = ?', [status, courierId, id]);
    } else {
      await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }
    await db.query('INSERT INTO order_timelines (order_id, status) VALUES (?, ?)', [id, status]);
    
    // Tenta disparar o web-push se configurado
    if (publicVapidKey) {
      try {
        const [orderRows] = await db.query(`
          SELECT o.customer_cpf, o.customer_whatsapp, u.name as driver_name 
          FROM orders o 
          LEFT JOIN users u ON o.courier_id = u.id 
          WHERE o.id = ?
        `, [id]);
        if (orderRows.length > 0) {
          const order = orderRows[0];
          // O frontend usa a busca única pra salvar (que pode ser cpf ou whatsapp)
          const searchKeys = [order.customer_cpf, order.customer_whatsapp].filter(Boolean);
          
          if (searchKeys.length > 0) {
            const placeholders = searchKeys.map(() => '?').join(',');
            const [subs] = await db.query(`SELECT * FROM push_subscriptions WHERE customer_cpf IN (${placeholders})`, searchKeys);
            
            for (const sub of subs) {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
              };
              
              let bodyText = `Seu pedido passou para o status: ${status.toUpperCase()}`;
              if (status === 'recebido') bodyText = 'Oba! Recebemos o seu pedido e já vamos prepará-lo. 😋';
              if (status === 'preparando') bodyText = 'Hummm... Seu pedido está sendo preparado com muito carinho! 🧑‍🍳';
              if (status === 'pronto') bodyText = 'Tudo pronto! Seu pedido está prontinho e embalado. 🛍️';
              if (status === 'despachado') {
                if (order.driver_name) {
                  bodyText = `O entregador ${order.driver_name} acabou de sair com o seu pedido! Está a caminho. 🛵`;
                } else {
                  bodyText = 'Seu pedido acabou de sair para entrega! Está a caminho. 🛵';
                }
              }
              if (status === 'entregue') bodyText = 'Pedido entregue! Aproveite seu doce e volte sempre! ❤️';
              
              const payload = JSON.stringify({
                title: 'Atualização do seu Pedido',
                body: bodyText,
                icon: '/icon-192x192.png',
                badge: '/icon-192x192.png'
              });

              try {
                await webpush.sendNotification(pushSubscription, payload);
              } catch (pushErr) {
                console.error('Erro ao enviar push pro endpoint:', sub.endpoint, pushErr);
                // Pode deletar a sub se o erro for de expirado (410, 404)
                if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                  await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Falha ao processar notificações push no update de status:', err);
      }
    }

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});
// Auto-inicialização da tabela de store_settings
const initDbSettings = async () => {
  try {
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
    await db.query(`
      INSERT IGNORE INTO \`store_settings\` (id, has_delivery, has_table, has_pickup, accepts_pix, accepts_cash, accepts_card, opening_time, closing_time, delivery_fee, delivery_info_text)
      VALUES (1, 1, 1, 1, 1, 1, 1, '10:00', '22:00', 0.00, 'Entregas apenas depois das 14:00');
    `);
    console.log("Banco de dados e tabela store_settings inicializados.");
  } catch (err) {
    console.error("Falha ao auto-inicializar tabela store_settings:", err);
  }
};
initDbSettings();

// ── Coupons ──
app.get('/api/coupons', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar cupons' });
  }
});

app.post('/api/coupons', async (req, res) => {
  const { code, type, value, is_active } = req.body;
  try {
    await db.query('INSERT INTO coupons (code, type, value, is_active) VALUES (?, ?, ?, ?)', [
      code.toUpperCase(), type, value || 0, is_active ? 1 : 0
    ]);
    res.status(201).json({ message: 'Cupom criado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Código de cupom já existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar cupom' });
  }
});

app.put('/api/coupons/:id', async (req, res) => {
  const { code, type, value, is_active } = req.body;
  try {
    await db.query('UPDATE coupons SET code = ?, type = ?, value = ?, is_active = ? WHERE id = ?', [
      code.toUpperCase(), type, value || 0, is_active ? 1 : 0, req.params.id
    ]);
    res.json({ message: 'Cupom atualizado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Código de cupom já existe' });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar cupom' });
  }
});

app.delete('/api/coupons/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cupom deletado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar cupom' });
  }
});

app.post('/api/coupons/validate', async (req, res) => {
  const { code } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM coupons WHERE code = ?', [code.toUpperCase()]);
    const coupon = rows[0];
    if (!coupon) return res.status(404).json({ error: 'Cupom não encontrado' });
    if (!coupon.is_active) return res.status(400).json({ error: 'Cupom inativo' });
    res.json(coupon);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao validar cupom' });
  }
});

// ── Users and Auth ──
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE phone = ?', [phone]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, phone: user.phone, delivery_fee: user.delivery_fee } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no login', details: error.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, phone, role, delivery_fee, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode criar usuários' });
  const { name, phone, password, role, delivery_fee } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, phone, password, role, delivery_fee) VALUES (?, ?, ?, ?, ?)',
      [name, phone, hashedPassword, role || 'courier', delivery_fee || 0]
    );
    res.status(201).json({ id: result.insertId, name, phone, role: role || 'courier', delivery_fee: delivery_fee || 0 });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Telefone já cadastrado' });
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode editar usuários' });
  const { name, phone, password, role, delivery_fee } = req.body;
  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET name=?, phone=?, password=?, role=?, delivery_fee=? WHERE id=?',
        [name, phone, hashedPassword, role, delivery_fee, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE users SET name=?, phone=?, role=?, delivery_fee=? WHERE id=?',
        [name, phone, role, delivery_fee, req.params.id]
      );
    }
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Telefone já cadastrado' });
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode excluir usuários' });
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});


const runMigrations = async () => {
  try {
    console.log("Executando migrações automáticas de banco de dados no server.js...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`phone\` VARCHAR(50) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(20) DEFAULT 'courier',
        \`delivery_fee\` DECIMAL(10,2) DEFAULT 0.00,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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

    const alters = [
      "ALTER TABLE `store_settings` ADD COLUMN `is_open` TINYINT DEFAULT 1",
      "ALTER TABLE `orders` ADD COLUMN `coupon_id` INT DEFAULT NULL",
      "ALTER TABLE `orders` ADD COLUMN `discount_amount` DECIMAL(10,2) DEFAULT 0.00",
      "ALTER TABLE `coupons` ADD COLUMN `usage_count` INT DEFAULT 0"
    ];

    for (const q of alters) {
      try {
        await db.query(q);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          console.error("Erro no alter table:", e);
        }
      }
    }

    // Seed default admin se não houver admin
    const [adminCheck] = await db.query("SELECT * FROM users WHERE phone = 'admin'");
    if (adminCheck.length === 0) {
      const bcrypt = await import('bcrypt');
      const hashed = await bcrypt.hash('123', 10);
      await db.query(
        "INSERT INTO users (name, phone, password, role) VALUES ('Admin', 'admin', ?, 'admin')",
        [hashed]
      );
      console.log("Usuário admin padrão criado (admin / 123)");
    }

    console.log("Migrações concluídas!");
  } catch (error) {
    console.error("Erro fatal ao rodar migrações:", error);
  }
};

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
});
