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
const Table = require('../models/Table');

/**
 * GET /api/admin/stats/today
 * Bugünün dashboard istatistiklerini döner (önceki dönem karşılaştırmaları ile)
 */
router.get('/stats/today', auth, requireRole('admin'), async (req, res, next) => {
  try {
    // Bugünün başlangıcı (local timezone'da bugünün 00:00:00'ı)
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = now.getMonth();
    const localDate = now.getDate();
    
    // Local timezone'da bugünün başlangıcı (00:00:00 local time)
    const localToday = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
    
    // MongoDB UTC kullanıyor, bu yüzden local timezone'daki bugünün başlangıcını UTC'ye çevir
    // localToday zaten Date objesi olarak UTC timestamp'i içeriyor
    // localToday.toISOString() çağrıldığında UTC'ye çevrilmiş değeri gösterir
    // Yani localToday zaten UTC'de doğru değeri temsil ediyor, ekstra dönüşüm gerekmez
    // Örnek: Local timezone GMT+3, bugün 2025-11-16 00:00:00 local = 2025-11-15 21:00:00 UTC
    // localToday.toISOString() = "2025-11-15T21:00:00.000Z" (doğru!)
    const today = localToday; // localToday zaten UTC'de doğru değeri temsil ediyor
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Debug log'ları kaldırıldı

    // Dünün tarihleri
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

    // Bu haftanın başlangıcı (Pazartesi)
    const thisWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Pazartesi'ye ayarla
    thisWeekStart.setDate(diff);
    thisWeekStart.setHours(0, 0, 0, 0);

    // Geçen haftanın başlangıcı ve bitişi
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    // Bugünün verileri - Bugün ödenen tüm siparişler (paidAt'e göre)
    // Local timezone'da bugün ödenen siparişleri bul
    // Debug log'ları kaldırıldı
    
    const revenueData = await Order.aggregate([
      {
        $match: {
          status: 'PAID'
        }
      },
      {
        $addFields: {
          // paidAt varsa onu kullan, yoksa createdAt'i kullan
          paymentDate: { $ifNull: ['$paidAt', '$createdAt'] }
        }
      },
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$total', '$totalPrice', 0] } },
          count: { $sum: 1 }
        }
      }
    ]);
    // Debug log'ları kaldırıldı
    const revenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    const orders = await Order.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'CANCELED' }
    });

    const pending = await Order.countDocuments({
      status: { $in: ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'] }
    });

    const canceled = await Order.countDocuments({
      status: 'CANCELED',
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Dünün verileri - Dün ödenen tüm siparişler (paidAt'e göre)
    const yesterdayRevenueData = await Order.aggregate([
      {
        $match: {
          status: 'PAID'
        }
      },
      {
        $addFields: {
          // paidAt varsa onu kullan, yoksa createdAt'i kullan
          paymentDate: { $ifNull: ['$paidAt', '$createdAt'] }
        }
      },
      {
        $match: {
          paymentDate: { $gte: yesterday, $lt: yesterdayEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$total', '$totalPrice', 0] } }
        }
      }
    ]);
    const yesterdayRevenue = yesterdayRevenueData.length > 0 ? yesterdayRevenueData[0].totalRevenue : 0;

    const yesterdayOrders = await Order.countDocuments({
      createdAt: { $gte: yesterday, $lt: yesterdayEnd },
      status: { $ne: 'CANCELED' }
    });

    const yesterdayCanceled = await Order.countDocuments({
      status: 'CANCELED',
      createdAt: { $gte: yesterday, $lt: yesterdayEnd }
    });

    // Bu haftanın sipariş sayısı
    const thisWeekOrders = await Order.countDocuments({
      createdAt: { $gte: thisWeekStart, $lt: tomorrow },
      status: { $ne: 'CANCELED' }
    });

    // Geçen haftanın sipariş sayısı
    const lastWeekOrders = await Order.countDocuments({
      createdAt: { $gte: lastWeekStart, $lt: lastWeekEnd },
      status: { $ne: 'CANCELED' }
    });

    const responseData = {
      today: {
        revenue,
        orders,
        pending,
        canceled,
      },
      yesterday: {
        revenue: yesterdayRevenue,
        orders: yesterdayOrders,
        canceled: yesterdayCanceled,
      },
      lastWeek: {
        orders: lastWeekOrders,
      },
      thisWeek: {
        orders: thisWeekOrders,
      },
      date: today.toISOString().split('T')[0],
    };
    
    // Debug log'ları kaldırıldı
    res.json(responseData);
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

    // Socket.io emit: Sipariş durumu değişti
    const io = req.app.get('io');
    if (io) {
      const tableId = order.tableId?._id || order.tableId || order.table?._id || order.table;
      if (tableId) {
        io.to('tables').emit('table:order:status:changed', {
          tableId: tableId,
          orderId: order._id,
          status: status,
          previousStatus: order.status,
          order: order.toObject(),
        });
      }
    }

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

    if (order.status === 'PAID' || order.status === 'tamamlandi') {
      return res.status(409).json({ message: 'Sipariş zaten ödendi' });
    }

    // Önceki durumu sakla
    const previousStatus = order.status;
    
    // Sipariş durumunu 'PAID' yap ve paidAt'i kaydet
    const paidAtDate = new Date();
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      { 
        status: 'PAID',
        paidAt: paidAtDate
      },
      { new: true, runValidators: true }
    );
    
    // Debug: paidAt'in kaydedildiğini kontrol et
    console.log('✅ Sipariş ödendi - paidAt:', updatedOrder.paidAt, 'status:', updatedOrder.status, 'total:', updatedOrder.total);

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: updatedOrder._id,
      actorId: req.user.id,
      type: 'payment',
      from: previousStatus,
      to: 'PAID',
      metadata: { method: 'admin', amount: updatedOrder.total || updatedOrder.totalPrice || 0 },
    });

    // Socket.io emit: Ödeme yapıldı
    const io = req.app.get('io');
    if (io) {
      const tableId = updatedOrder.table?._id || updatedOrder.table;
      if (tableId) {
        // Masa durumunu kontrol et - tüm siparişler ödendiyse müsait yap
        const Table = require('../models/Table');
        const activeOrders = await Order.countDocuments({
          table: tableId,
          status: { $nin: ['PAID', 'tamamlandi', 'CANCELED', 'iptal'] }
        });
        
        if (activeOrders === 0) {
          const table = await Table.findByIdAndUpdate(tableId, { status: 'bos' }, { new: true });
          if (table) {
            io.to('tables').emit('table:status:changed', {
              tableId: table._id,
              status: table.status,
              table: table.toObject(),
            });
          }
        }
        
        io.to('tables').emit('table:payment:completed', {
          tableId: tableId,
          order: updatedOrder.toObject(),
        });
      }
    }

    res.json(updatedOrder);
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
    const order = await Order.findById(req.params.id).populate('table', '_id name');
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
    
    // Socket.io emit: Sipariş iptal edildi
    const io = req.app.get('io');
    if (io) {
      const tableId = order.tableId?._id || order.tableId || order.table?._id || order.table;
      if (tableId) {
        io.to('tables').emit('table:order:canceled', {
          tableId: tableId,
          order: order.toObject(),
        });
        
        // Masa durumunu kontrol et - aktif sipariş kaldı mı?
        const Table = require('../models/Table');
        const activeOrders = await Order.countDocuments({
          table: tableId,
          status: { $nin: ['PAID', 'tamamlandi', 'CANCELED', 'iptal'] }
        });
        
        if (activeOrders === 0) {
          const table = await Table.findByIdAndUpdate(tableId, { status: 'bos' }, { new: true });
          if (table) {
            io.to('tables').emit('table:status:changed', {
              tableId: table._id,
              status: table.status,
              table: table.toObject(),
            });
          }
        }
      }
    }

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
 * Kategori sil (admin) - Cascade delete: Ürün kontrolü ile
 */
router.delete('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    
    // Kategori var mı kontrol et
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    // Bu kategoriye ait ürün var mı kontrol et
    const productsCount = await Product.countDocuments({ category: categoryId });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: `Bu kategoriye ait ${productsCount} ürün bulunmaktadır. Kategoriyi silmek için önce ürünleri silin veya başka bir kategoriye taşıyın.`,
        productsCount,
        categoryName: category.name
      });
    }
    
    // Ürün yoksa kategoriyi sil
    await Category.findByIdAndDelete(categoryId);
    res.json({ message: 'Kategori silindi', id: categoryId });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/tables
 * Tüm masaları listele (admin) - sipariş bilgileriyle
 */
router.get('/tables', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ name: 1 }).lean();
    
    // Her masa için aktif siparişleri ve toplam tutarı hesapla
    const tablesWithOrders = await Promise.all(
      tables.map(async (table) => {
        // Aktif siparişleri kontrol et (hem table hem tableId field'larını kontrol et)
        const activeOrders = await Order.find({
          $or: [
            { table: table._id },
            { tableId: table._id }
          ],
          status: { $nin: ['tamamlandi', 'PAID', 'SERVED', 'CANCELED', 'iptal'] }
        }).lean();
        
        // Sadece gerçekten aktif olan siparişleri filtrele
        const trulyActiveOrders = activeOrders;
        
        const totalAmount = trulyActiveOrders.reduce((sum, order) => sum + (order.totalPrice || order.total || 0), 0);
        const orderCount = trulyActiveOrders.length;
        
        // Masa durumunu aktif siparişlere göre güncelle
        const correctStatus = orderCount > 0 ? 'dolu' : 'bos';
        if (table.status !== correctStatus) {
          // Durum yanlışsa güncelle
          await Table.findByIdAndUpdate(table._id, { status: correctStatus });
          table.status = correctStatus;
          
          // Socket event gönder
          const io = req.app.get('io');
          if (io) {
            io.to('tables').emit('table:status:changed', {
              tableId: table._id,
              status: correctStatus,
              table: { ...table, status: correctStatus },
            });
          }
        }
        
        return {
          ...table,
          status: correctStatus,
          activeOrderCount: orderCount,
          totalAmount: totalAmount,
          hasActiveOrder: orderCount > 0
        };
      })
    );
    
    res.json(tablesWithOrders);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/tables/:id
 * Tek masa detayı (admin)
 */
router.get('/tables/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id).lean();
    if (!table) return res.status(404).json({ message: 'Masa bulunamadı' });
    
    // Masa siparişlerini getir
    const orders = await Order.find({ table: table._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    const activeOrders = orders.filter(o => 
      ['hazirlaniyor', 'serviste', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'].includes(o.status)
    );
    
    res.json({
      ...table,
      orders: orders,
      activeOrders: activeOrders,
      activeOrderCount: activeOrders.length,
      totalAmount: activeOrders.reduce((sum, o) => sum + (o.totalPrice || o.total || 0), 0)
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/tables/:id/orders
 * Masa siparişlerini getir (admin)
 */
router.get('/tables/:id/orders', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = { table: req.params.id };
    if (status) filter.status = status;
    
    const orders = await Order.find(filter)
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/tables
 * Yeni masa oluştur (admin)
 */
router.post('/tables', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, capacity, status } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Masa adı gereklidir' });
    }
    
    // Aynı isimde masa var mı kontrol et
    const existing = await Table.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Bu isimde bir masa zaten mevcut' });
    }
    
    const table = new Table({
      name,
      capacity: capacity || 4,
      status: status || 'bos'
    });
    
    await table.save();
    
    // Socket.io emit: Yeni masa oluşturuldu
    const io = req.app.get('io');
    if (io) {
      io.to('tables').emit('table:updated', {
        type: 'created',
        table: table.toObject(),
      });
    }
    
    res.status(201).json(table);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/tables/:id
 * Masa güncelle (admin)
 */
router.put('/tables/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, capacity, status } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (status) updateData.status = status;
    
    // İsim değişiyorsa, aynı isimde başka masa var mı kontrol et
    if (name) {
      const existing = await Table.findOne({ name, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ message: 'Bu isimde bir masa zaten mevcut' });
      }
    }
    
    const updated = await Table.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Masa bulunamadı' });
    
    // Socket.io emit: Masa güncellendi
    const io = req.app.get('io');
    if (io) {
      io.to('tables').emit('table:updated', {
        type: 'updated',
        table: updated.toObject(),
      });
      
      // Durum değiştiyse ayrı event
      if (status) {
        io.to('tables').emit('table:status:changed', {
          tableId: updated._id,
          status: updated.status,
          table: updated.toObject(),
        });
      }
    }
    
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/tables/:id
 * Masa sil (admin)
 */
router.delete('/tables/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    // Masa üzerinde aktif sipariş var mı kontrol et
    const activeOrders = await Order.countDocuments({
      table: req.params.id,
      status: { $in: ['hazirlaniyor', 'serviste', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'] }
    });
    
    if (activeOrders > 0) {
      return res.status(400).json({ 
        message: 'Bu masa üzerinde aktif sipariş bulunuyor. Önce siparişleri tamamlayın.' 
      });
    }
    
    const deleted = await Table.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Masa bulunamadı' });
    
    // Socket.io emit: Masa silindi
    const io = req.app.get('io');
    if (io) {
      io.to('tables').emit('table:deleted', {
        tableId: deleted._id,
      });
    }
    
    res.json({ message: 'Masa silindi', id: deleted._id });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/qr
 * QR kodları listele (admin)
 */
router.get('/qr', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const QRCode = require('../models/QRCode');
    const qrCodes = await QRCode.find()
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(qrCodes);
  } catch (error) {
    console.error('QR kodları listeleme hatası:', error);
    next(error);
  }
});

/**
 * POST /api/admin/qr
 * QR kod oluştur (admin)
 * Body: { tableNumber: string }
 */
router.post('/qr', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const QRCode = require('../models/QRCode');
    const QRCodeLib = require('qrcode');
    const { tableNumber } = req.body;
    
    if (!tableNumber || !tableNumber.trim()) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    const tableNum = String(tableNumber).trim();

    // QR kod zaten var mı kontrol et
    const existingQR = await QRCode.findOne({ tableNumber: tableNum });
    if (existingQR) {
      return res.status(400).json({ message: 'Bu masa numarası için QR kod zaten mevcut' });
    }

    // Masa var mı kontrol et
    let table = await Table.findOne({ name: tableNum });
    
    if (!table) {
      // Masa yoksa oluştur
      table = await Table.create({
        name: tableNum,
        capacity: 4,
        status: 'bos'
      });
    }

    // Frontend URL'ini oluştur - dinamik olarak request'ten al
    let frontendOrigin = process.env.FRONTEND_ORIGIN;
    
    // Eğer referer header'ı varsa, ondan frontend URL'ini çıkar
    if (req.headers.referer) {
      try {
        const refererUrl = new URL(req.headers.referer);
        frontendOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      } catch (e) {
        // Referer parse edilemezse devam et
      }
    }
    
    // Eğer hala yoksa, request hostname'inden oluştur (backend port'undan frontend port'una)
    if (!frontendOrigin) {
      const host = req.headers.host || 'localhost:5001';
      const hostname = host.split(':')[0];
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      frontendOrigin = isLocalhost 
        ? 'http://localhost:5173' 
        : `http://${hostname}:5173`;
    }
    
    const qrUrl = `${frontendOrigin}/order?table=${tableNum}`;

    // QR kod oluştur (base64 data URL)
    const qrCodeDataURL = await QRCodeLib.toDataURL(qrUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    // QRCode kaydet
    const qrCodeDoc = await QRCode.create({
      tableNumber: tableNum,
      qrUrl,
      qrCode: qrCodeDataURL,
      tableId: table._id,
      createdBy: req.user.id
    });

    // Populate ile döndür
    const populated = await QRCode.findById(qrCodeDoc._id)
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .lean();

    res.status(201).json(populated);
  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bu masa numarası için QR kod zaten mevcut' });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/qr/:id
 * QR kod sil (admin)
 */
router.delete('/qr/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const QRCode = require('../models/QRCode');
    const { id } = req.params;

    // QRCode'u bul
    const qrCode = await QRCode.findById(id);
    if (!qrCode) {
      return res.status(404).json({ message: 'QR kod bulunamadı' });
    }

    // İlgili masayı bul
    const table = await Table.findById(qrCode.tableId);
    if (!table) {
      // Masa yoksa sadece QR kod'u sil
      await QRCode.findByIdAndDelete(id);
      return res.json({ message: 'QR kod silindi (masa zaten yoktu)' });
    }

    // Masada aktif sipariş var mı kontrol et
    const activeOrders = await Order.find({
      table: table._id,
      status: {
        $in: ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'hazirlaniyor', 'serviste']
      }
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({ 
        message: 'Masada aktif sipariş var, önce siparişleri tamamlayın',
        activeOrdersCount: activeOrders.length
      });
    }

    // QRCode ve Table'ı sil
    await QRCode.findByIdAndDelete(id);
    await Table.findByIdAndDelete(table._id);

    res.json({ 
      message: 'QR kod ve masa başarıyla silindi',
      deletedQR: id,
      deletedTable: table._id
    });
  } catch (error) {
    console.error('QR kod silme hatası:', error);
    next(error);
  }
});

module.exports = router;



