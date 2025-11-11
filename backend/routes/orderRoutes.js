const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/orders
 * Protected
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      tableNumber,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    // tableNumber yeni Order modelinde yok, table populate ile alınacak

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate('table', 'name capacity')
        .populate('waiter', 'name email role')
        .populate('items.menuItem', 'name price category')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      items,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/orders
 * Public (müşteri)
 * Body: { tableNumber, items: [{menuItemId, qty, note}], notes }
 * - Yeni Order modeline göre sipariş oluştur
 */
router.post('/', async (req, res, next) => {
  try {
    const { tableNumber, items, notes } = req.body;
    
    if (!tableNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Eksik veri' });
    }

    // Table kontrolü - tableNumber'a göre bul veya oluştur
    const Table = require('../models/Table');
    let table = await Table.findOne({ name: String(tableNumber) });
    if (!table) {
      // Table yoksa oluştur
      table = await Table.create({
        name: String(tableNumber),
        capacity: 4,
        status: 'bos'
      });
    }

    // MenuItem veya Product kontrolü - hem MenuItem hem Product ID'lerini kabul et
    const MenuItem = require('../models/MenuItem');
    const Product = require('../models/Product');
    const itemIds = items.map(i => i.menuItemId || i.productId).filter(Boolean);
    
    // Debug: Gelen veriyi logla
    console.log('🔍 Gelen sipariş verisi:', {
      tableNumber,
      itemsCount: items.length,
      itemIds: itemIds,
      items: items.map(i => ({ menuItemId: i.menuItemId, productId: i.productId, qty: i.qty }))
    });

    if (itemIds.length === 0) {
      return res.status(400).json({ message: 'Geçerli ürün ID bulunamadı' });
    }

    // Önce MenuItem'larda ara
    const menuItems = await MenuItem.find({ _id: { $in: itemIds }, isActive: true }).lean();
    const menuItemsMap = Object.fromEntries(menuItems.map(m => [String(m._id), m]));
    
    // MenuItem'da bulunamayanları Product'ta ara
    const foundMenuItemIds = menuItems.map(m => String(m._id));
    const notFoundIds = itemIds.filter(id => !foundMenuItemIds.includes(String(id)));
    const products = notFoundIds.length > 0 ? await Product.find({ _id: { $in: notFoundIds } }).lean() : [];
    const productsMap = Object.fromEntries(products.map(p => [String(p._id), p]));
    
    // Debug: Bulunan öğeleri logla
    console.log('🔍 Bulunan öğeler:', {
      menuItemsCount: menuItems.length,
      productsCount: products.length,
      menuItems: menuItems.map(m => ({ id: m._id, name: m.name, price: m.price })),
      products: products.map(p => ({ id: p._id, name: p.name, price: p.price }))
    });

    if (menuItems.length === 0 && products.length === 0) {
      return res.status(400).json({ message: 'Menü öğeleri veya ürünler bulunamadı' });
    }

    // Order items oluştur - önce MenuItem'da ara, yoksa Product'ta ara
    const orderItemsPromises = items.map(async (i) => {
      const itemId = i.menuItemId || i.productId;
      if (!itemId) return null;

      // Önce MenuItem'da ara
      let item = menuItemsMap[String(itemId)];
      if (item) {
        // MenuItem bulundu
        if (!item.price || isNaN(item.price)) {
          console.warn('⚠️ MenuItem fiyatı geçersiz:', item);
          return null;
        }
        return {
          menuItem: item._id,
          name: item.name,
          qty: Number(i.qty) || 1,
          price: Number(item.price),
          note: i.note || ''
        };
      }

      // MenuItem'da bulunamadı, Product'ta ara
      item = productsMap[String(itemId)];
      if (item) {
        // Product bulundu - Product'ı MenuItem olarak kullan
        // Önce MenuItem'da var mı kontrol et (name'e göre)
        let menuItem = await MenuItem.findOne({ name: item.name });
        if (!menuItem) {
          // MenuItem yoksa oluştur
          menuItem = await MenuItem.create({
            name: item.name,
            category: item.category?.name || (typeof item.category === 'object' ? item.category.name : item.category) || '',
            price: item.price,
            isActive: true
          });
        }
        
        if (!menuItem.price || isNaN(menuItem.price)) {
          console.warn('⚠️ MenuItem fiyatı geçersiz:', menuItem);
          return null;
        }
        return {
          menuItem: menuItem._id,
          name: menuItem.name,
          qty: Number(i.qty) || 1,
          price: Number(menuItem.price),
          note: i.note || ''
        };
      }

      console.warn('⚠️ Öğe bulunamadı:', itemId);
      return null;
    });
    
    const orderItems = (await Promise.all(orderItemsPromises)).filter(Boolean);

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'Geçerli ürün bulunamadı' });
    }

    // Total hesapla
    const total = orderItems.reduce((sum, i) => sum + (i.price * i.qty), 0);

    // Debug: Oluşturulacak sipariş verilerini logla
    console.log('🔍 Sipariş oluşturma:', {
      tableId: table._id,
      tableIdType: typeof table._id,
      itemsCount: orderItems.length,
      total: total,
      totalType: typeof total,
      orderItems: orderItems.map(i => ({ name: i.name, qty: i.qty, price: i.price }))
    });

    // Validation: table._id ve total kontrolü
    if (!table._id) {
      return res.status(400).json({ message: 'Masa ID bulunamadı' });
    }
    if (!total || isNaN(total) || total <= 0) {
      return res.status(400).json({ message: 'Geçersiz toplam tutar' });
    }
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'Sipariş kalemleri boş' });
    }

    // Sipariş oluştur
    const order = await Order.create({
      table: table._id,
      items: orderItems,
      total: Number(total),
      notes: notes || '', // Genel sipariş notu
      status: 'hazirlaniyor'
    });

    // Table status'unu güncelle
    await Table.findByIdAndUpdate(table._id, { status: 'dolu' });

    // Populate ile döndür
    const populated = await Order.findById(order._id)
      .populate('table', 'name capacity')
      .populate('items.menuItem', 'name price category');

    res.status(201).json(populated);
  } catch (e) {
    console.error('Sipariş oluşturma hatası:', e);
    next(e);
  }
});

/**
 * PUT /api/orders/:id/status
 * Protected
 * Body: { status }
 */
router.put('/:id/status', authMiddleware, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['Hazırlanıyor', 'Hazır', 'Servis Edildi', 'İptal Edildi'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }

    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Sipariş bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/orders/:id/pay
 * Protected
 * Body: {}
 */
router.put('/:id/pay', authMiddleware, async (req, res, next) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { isPaid: true, paidAt: new Date() },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Sipariş bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/orders/:id/cancel
 * Protected
 * Body: { reason }
 */
router.put('/:id/cancel', authMiddleware, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'İptal Edildi', cancelReason: reason || '' },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Sipariş bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/orders/:orderId/items/:itemIndex/kitchen-status
 * Protected (admin)
 * Body: { status: 'pending'|'in_progress'|'ready'|'served'|'cancelled' }
 */
router.put('/:orderId/items/:itemIndex/kitchen-status', authMiddleware, async (req, res, next) => {
  try {
    const { orderId, itemIndex } = req.params;
    const { status } = req.body || {};

    const allowed = ['pending', 'in_progress', 'ready', 'served', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    const idx = Number(itemIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(400).json({ message: 'Geçersiz kalem index' });
    }

    // Array'i güncelle ve Mongoose'e bildir
    order.orderItems[idx].kitchenStatus = status;
    order.markModified('orderItems');

    // Üst sipariş durumunu türet
    const statuses = order.orderItems.map(i => i.kitchenStatus);
    const allServed = statuses.every(s => s === 'served');
    const allReady = statuses.every(s => s === 'ready' || s === 'served');

    if (allServed) order.status = 'Servis Edildi';
    else if (allReady) order.status = 'Hazır';
    else order.status = 'Hazırlanıyor';

    await order.save();

    // Opsiyonel: SSE/event publish
    try { req.app.get('events')?.emit('order:update', order); } catch (_) {}

    res.json(order);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
