const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const DailyAggregate = require('../models/DailyAggregate');
const OrderEvent = require('../models/OrderEvent');

/**
 * GET /api/admin/stats/today
 * Bugünün dashboard istatistiklerini döner
 */
router.get('/stats/today', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Revenue: PAID olan order'ların toplamı
    const revenueData = await Order.aggregate([
      {
        $match: {
          status: 'PAID',
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' }
        }
      }
    ]);
    const revenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    // Toplam sipariş sayısı (bugün)
    const orders = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'CANCELED' }
    });

    // Bekleyen sipariş sayısı
    const pending = await Order.countDocuments({
      status: { $in: ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'] }
    });

    // İptal edilen sipariş sayısı (bugün)
    const canceled = await Order.countDocuments({
      status: 'CANCELED',
      createdAt: { $gte: today, $lt: tomorrow }
    });

    res.json({
      revenue,
      orders,
      pending,
      canceled,
      date: today.toISOString().split('T')[0],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/reports/daily
 * Günlük rapor (CSV format)
 * Query: from (YYYY-MM-DD), to (YYYY-MM-DD)
 */
router.get('/reports/daily', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: 'from ve to parametreleri zorunlu (YYYY-MM-DD format)' });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // DailyAggregate'lerden veri çek
    const aggregates = await DailyAggregate.find({
      date: {
        $gte: from.replace(/-/g, ''),
        $lte: to.replace(/-/g, '')
      }
    }).sort({ date: 1 });

    // CSV format
    const csvRows = ['Tarih,Gelir (TL),Sipariş Sayısı,İptal Sayısı'];
    for (const agg of aggregates) {
      const dateFormatted = `${agg.date.substring(0, 4)}-${agg.date.substring(4, 6)}-${agg.date.substring(6, 8)}`;
      csvRows.push(`${dateFormatted},${agg.revenue},${agg.orders},${agg.canceled}`);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rapor_${from}_${to}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/orders
 * Sipariş oluştur (admin)
 */
router.post('/orders', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { tableId, tableNumber, items } = req.body;
    
    if ((!tableId && !tableNumber) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Eksik veri' });
    }

    // Table kontrolü - tableId veya tableNumber'a göre bul
    const Table = require('../models/Table');
    let table;
    if (tableId) {
      table = await Table.findById(tableId);
    } else if (tableNumber) {
      // tableNumber string ise name'e göre bul veya oluştur
      table = await Table.findOne({ name: String(tableNumber) });
      if (!table) {
        // Table yoksa oluştur
        table = await Table.create({
          name: String(tableNumber),
          capacity: 4,
          status: 'bos'
        });
      }
    }
    
    if (!table) {
      return res.status(404).json({ message: 'Masa bulunamadı' });
    }

    // MenuItem kontrolü ve items hazırlama
    const MenuItem = require('../models/MenuItem');
    const menuItemIds = items.map(i => i.menuItemId).filter(Boolean);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
    const menuItemsMap = Object.fromEntries(menuItems.map(m => [String(m._id), m]));

    const orderItems = items.map(i => {
      const menuItem = menuItemsMap[String(i.menuItemId)];
      if (!menuItem) return null;
      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        qty: i.qty,
        price: menuItem.price,
        note: i.note || ''
      };
    }).filter(Boolean);

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'Geçerli ürün bulunamadı' });
    }

    // Total hesapla
    const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    // Sipariş oluştur
    const order = await Order.create({
      table: table._id,
      waiter: req.user.id,
      items: orderItems,
      total,
      status: 'hazirlaniyor'
    });

    // Table status'unu güncelle
    await Table.findByIdAndUpdate(table._id, { status: 'dolu' });

    // Populate ile döndür
    const populated = await Order.findById(order._id)
      .populate('table', 'name capacity')
      .populate('waiter', 'name email role')
      .populate('items.menuItem', 'name price category');

    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/orders
 * Sipariş listesi (admin)
 */
router.get('/orders', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (status) filter.status = status;

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
 * PUT /api/admin/orders/:id/status
 * Sipariş durumu güncelle (admin)
 */
router.put('/orders/:id/status', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    // Terminal durumlar kontrolü
    if (order.status === 'tamamlandi' && status !== 'tamamlandi') {
      return res.status(409).json({ message: 'Tamamlanmış sipariş durumu değiştirilemez' });
    }
    if (order.status === 'iptal' && status !== 'iptal') {
      return res.status(409).json({ message: 'İptal edilmiş sipariş durumu değiştirilemez' });
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/orders/:id/pay
 * Sipariş ödeme işaretle (admin)
 */
router.put('/orders/:id/pay', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    if (order.status === 'tamamlandi') {
      return res.status(409).json({ message: 'Sipariş zaten tamamlanmış' });
    }

    order.status = 'tamamlandi';
    await order.save();

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/orders/:id/cancel
 * Sipariş iptal et (admin)
 */
router.put('/orders/:id/cancel', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    if (order.status === 'PAID') {
      return res.status(409).json({ message: 'Ödenmiş sipariş iptal edilemez' });
    }

    if (order.status === 'CANCELED') {
      return res.status(409).json({ message: 'Sipariş zaten iptal edilmiş' });
    }

    const previousStatus = order.status;
    order.status = 'CANCELED';
    order.cancelReason = reason || '';
    await order.save();

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: order._id,
      actorId: req.user.id,
      type: 'cancel',
      from: previousStatus,
      to: 'CANCELED',
      metadata: { reason: order.cancelReason },
    });

    // DailyAggregate güncelle
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    await DailyAggregate.findOneAndUpdate(
      { date },
      { $inc: { canceled: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/products
 * Ürün listesi (admin)
 */
router.get('/products', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      q,
      category,
      inStock,
      sort = '-createdAt',
    } = req.query;

    const filter = {};
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (category) filter.category = category;
    if (inStock === 'true') filter.countInStock = { $gt: 0 };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
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
 * POST /api/admin/products
 * Ürün oluştur (admin)
 */
router.post('/products', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, price, description, imageUrl, category, countInStock, station } = req.body;
    const product = new Product({ name, price, description, imageUrl, category, countInStock, station: station || 'hot' });
    await product.save();
    res.status(201).json(product);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/products/:id
 * Ürün güncelle (admin)
 */
router.put('/products/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Ürün bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Ürün sil (admin)
 */
router.delete('/products/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Ürün bulunamadı' });
    res.json({ message: 'Ürün silindi', id: deleted._id });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/categories
 * Kategori listesi (admin)
 */
router.get('/categories', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/categories
 * Kategori oluştur (admin)
 */
router.post('/categories', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    let category = await Category.findOne({ name });
    if (category) {
      return res.status(400).json({ message: 'Bu kategori zaten mevcut' });
    }
    category = new Category({ name });
    await category.save();
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/categories/:id
 * Kategori güncelle (admin)
 */
router.put('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    const updated = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Kategori bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Kategori sil (admin)
 */
router.delete('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Kategori bulunamadı' });
    res.json({ message: 'Kategori silindi', id: deleted._id });
  } catch (e) {
    next(e);
  }
});

module.exports = router;



