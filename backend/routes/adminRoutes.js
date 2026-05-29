const express = require('express');
const { emitCustomerOrderUpdate } = require('../utils/customerOrderNotify');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const branchAccess = require('../middleware/branchAccess');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Campaign = require('../models/Campaign');
const { formatProductPricing } = require('../utils/pricing');
const Category = require('../models/Category');
const DailyAggregate = require('../models/DailyAggregate');
const OrderEvent = require('../models/OrderEvent');
const Table = require('../models/Table');
const { applyPaidToOrder, isOrderPaid } = require('../utils/orderPayment');
const { cancelOrder } = require('../utils/orderCancel');

const NUTRITION_NUMERIC_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'servingGram'];
const NUTRITION_CONFIDENCE = ['low', 'medium', 'high'];
const NUTRITION_SOURCE = ['manual', 'ai_estimate', 'api_estimate'];
const NUTRITION_STATUS = ['none', 'pending', 'estimated', 'approved'];

function normalizeStringArray(value) {
  if (value == null) return undefined;
  const list = Array.isArray(value)
    ? value
    : String(value).split(',');
  const cleaned = list.map((s) => String(s).trim()).filter(Boolean);
  return cleaned;
}

/**
 * Gövdeden gelen nutrition objesini doğrular ve temizler.
 * Dönüş: { error } | { nutrition } (nutrition, anlamlı veri yoksa undefined olabilir)
 */
function buildNutrition(input) {
  if (input == null) return { nutrition: undefined };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Geçersiz besin değeri formatı' };
  }

  const out = {};

  for (const field of NUTRITION_NUMERIC_FIELDS) {
    const raw = input[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      return { error: `Geçersiz besin değeri (negatif olamaz): ${field}` };
    }
    out[field] = num;
  }

  if (input.portionUnit != null && String(input.portionUnit).trim() !== '') {
    out.portionUnit = String(input.portionUnit).trim();
  }
  if (input.nutritionNote != null && String(input.nutritionNote).trim() !== '') {
    out.nutritionNote = String(input.nutritionNote).trim();
  }

  const allergens = normalizeStringArray(input.allergens);
  if (allergens && allergens.length) out.allergens = allergens;
  const ingredients = normalizeStringArray(input.ingredients);
  if (ingredients && ingredients.length) out.ingredients = ingredients;

  if (input.confidence != null && input.confidence !== '') {
    if (!NUTRITION_CONFIDENCE.includes(input.confidence)) {
      return { error: 'Geçersiz confidence (low/medium/high)' };
    }
    out.confidence = input.confidence;
  }

  // source enum doğrulaması yapılır ama tek başına "anlamlı veri" sayılmaz.
  if (input.source != null && input.source !== '') {
    if (!NUTRITION_SOURCE.includes(input.source)) {
      return { error: 'Geçersiz source (manual/ai_estimate/api_estimate)' };
    }
  }

  // source ve isNutritionVisibleToCustomer dışında anlamlı alan yoksa nutrition oluşturma.
  if (Object.keys(out).length === 0) return { nutrition: undefined };

  if (input.source != null && input.source !== '') {
    out.source = input.source;
  }
  if (input.isNutritionVisibleToCustomer !== undefined) {
    out.isNutritionVisibleToCustomer = Boolean(input.isNutritionVisibleToCustomer);
  }
  out.updatedAt = new Date();
  return { nutrition: out };
}

function validateNutritionStatus(status) {
  if (status === undefined || status === null || status === '') return null;
  if (!NUTRITION_STATUS.includes(status)) {
    return 'Geçersiz nutritionStatus (none/pending/estimated/approved)';
  }
  return null;
}

function validateProductSaleFields(body, listPriceFallback) {
  const list = body.price != null ? Number(body.price) : Number(listPriceFallback);
  if (body.salePrice != null && body.salePrice !== '') {
    const sale = Number(body.salePrice);
    if (!Number.isFinite(sale) || sale < 0) return 'Geçersiz indirimli fiyat';
    if (Number.isFinite(list) && sale >= list) {
      return 'İndirimli fiyat normal fiyattan düşük olmalı';
    }
  }
  if (body.saleStartsAt && body.saleEndsAt) {
    if (new Date(body.saleEndsAt) < new Date(body.saleStartsAt)) {
      return 'İndirim bitiş tarihi başlangıçtan önce olamaz';
    }
  }
  return null;
}

function validateCampaignBody(body) {
  const type = body.campaignType === 'menu' ? 'menu' : 'cart';
  if (!body.title || !String(body.title).trim()) return 'Kampanya başlığı gerekli';

  if (body.startsAt && body.endsAt && new Date(body.endsAt) < new Date(body.startsAt)) {
    return 'Bitiş tarihi başlangıçtan önce olamaz';
  }

  if (type === 'menu') {
    const bundle = Number(body.bundlePrice);
    if (!Number.isFinite(bundle) || bundle <= 0) return 'Kampanya fiyatı geçerli olmalı';
    const products = Array.isArray(body.products) ? body.products : [];
    if (products.length === 0) return 'En az bir ürün seçin';
    return null;
  }

  const min = Number(body.minCartTotal);
  if (!Number.isFinite(min) || min < 0) return 'Geçersiz minimum sepet tutarı';
  const rate = Number(body.discountRate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    return 'İndirim oranı 0 ile 1 arasında olmalı (ör. 0.10 = %10)';
  }
  return null;
}

async function resolveMenuProducts(branchId, productsInput) {
  const raw = Array.isArray(productsInput) ? productsInput : [];
  const ids = raw
    .map((p) => p?.productId || p?._id || p?.id)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)));
  if (ids.length === 0) return { error: 'Geçerli ürün seçilmedi' };

  const docs = await Product.find({
    _id: { $in: ids },
    branchId,
  }).lean();

  if (docs.length !== ids.length) {
    return { error: 'Seçilen ürünlerden bazıları bu şubeye ait değil' };
  }

  const byId = new Map(docs.map((d) => [String(d._id), d]));
  const now = new Date();
  const items = ids.map((id) => {
    const doc = byId.get(String(id));
    const pricing = formatProductPricing(doc, now);
    const fromClient = raw.find(
      (p) => String(p?.productId || p?._id || p?.id) === String(id)
    );
    return {
      productId: doc._id,
      name: doc.name,
      price: pricing.effectivePrice,
      imageUrl: doc.imageUrl || fromClient?.imageUrl || '',
    };
  });

  return { items };
}

/**
 * GET /api/admin/stats/today
 * Bugünün dashboard istatistiklerini döner (önceki dönem karşılaştırmaları ile)
 */
router.get('/stats/today', auth, requireRole('admin'), branchAccess, async (req, res, next) => {
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
    
    // Branch filtreleme için match objesi
    const branchMatch = req.branchFilter || {};
    
    const revenueData = await Order.aggregate([
      {
        $match: {
          paidAt: { $ne: null },
          ...branchMatch,
        },
      },
      {
        $match: {
          paidAt: { $gte: today, $lt: tomorrow },
        },
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
      status: { $ne: 'CANCELED' },
      ...branchMatch
    });

    const pending = await Order.countDocuments({
      status: { $in: ['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'] },
      ...branchMatch
    });

    const canceled = await Order.countDocuments({
      status: 'CANCELED',
      createdAt: { $gte: today, $lt: tomorrow },
      ...branchMatch
    });

    // Dünün verileri - Dün ödenen tüm siparişler (paidAt'e göre)
    const yesterdayRevenueData = await Order.aggregate([
      {
        $match: {
          paidAt: { $ne: null },
          ...branchMatch,
        },
      },
      {
        $match: {
          paidAt: { $gte: yesterday, $lt: yesterdayEnd },
        },
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
      status: { $ne: 'CANCELED' },
      ...branchMatch
    });

    const yesterdayCanceled = await Order.countDocuments({
      status: 'CANCELED',
      createdAt: { $gte: yesterday, $lt: yesterdayEnd },
      ...branchMatch
    });

    // Bu haftanın sipariş sayısı
    const thisWeekOrders = await Order.countDocuments({
      createdAt: { $gte: thisWeekStart, $lt: tomorrow },
      status: { $ne: 'CANCELED' },
      ...branchMatch
    });

    // Geçen haftanın sipariş sayısı
    const lastWeekOrders = await Order.countDocuments({
      createdAt: { $gte: lastWeekStart, $lt: lastWeekEnd },
      status: { $ne: 'CANCELED' },
      ...branchMatch
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
    const aggQuery = {
      date: {
        $gte: from.replace(/-/g, ''),
        $lte: to.replace(/-/g, ''),
      },
    };
    if (req.user?.branchId) {
      aggQuery.branchId = req.user.branchId;
    }

    const aggregates = await DailyAggregate.find(aggQuery).sort({ date: 1 });

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
router.get('/orders', auth, requireRole('admin', 'kasa'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const {
      page = 1,
      limit = 50,
      status,
      sort = '-createdAt',
    } = req.query;

    const filter = { branchId: req.user.branchId };
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
router.put('/orders/:id/status', auth, requireRole('admin', 'kasa'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum' });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    // Terminal durumlar kontrolü
    if (order.status === 'tamamlandi' && status !== 'tamamlandi') {
      return res.status(409).json({ message: 'Tamamlanmış sipariş durumu değiştirilemez' });
    }
    if (order.status === 'iptal' && status !== 'iptal') {
      return res.status(409).json({ message: 'İptal edilmiş sipariş durumu değiştirilemez' });
    }

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      const tableId = order.table?._id || order.table;
      if (tableId) {
        io.to('tables').emit('table:order:status:changed', {
          tableId: tableId,
          orderId: order._id,
          status: status,
          previousStatus,
          order: order.toObject(),
        });
      }
      emitCustomerOrderUpdate(io, order);
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
router.put('/orders/:id/pay', auth, requireRole('admin', 'kasa'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    
    const order = await Order.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    const { recordOrderPayment } = require('../utils/recordOrderPayment');
    const io = req.app.get('io');
    const { order: updatedOrder } = await recordOrderPayment({
      order,
      actorId: req.user.id,
      method: req.body?.method,
      io,
      channel: 'admin_pay',
    });

    res.json(updatedOrder);
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
});

/**
 * PUT /api/admin/orders/:id/cancel
 * Sipariş iptal et (admin)
 */
router.put('/orders/:id/cancel', auth, requireRole('admin', 'kasa'), async (req, res, next) => {
  try {
    const order = await cancelOrder({
      orderId: req.params.id,
      actorId: req.user.id,
      reason: req.body?.reason,
      io: req.app.get('io'),
      branchFilter: { branchId: req.user.branchId },
    });

    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    await DailyAggregate.findOneAndUpdate(
      { date },
      { $inc: { canceled: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );

    res.json(order);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
});

/**
 * GET /api/admin/products
 * Ürün listesi (admin) - sadece kullanıcının şubesine ait ürünler
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

    // Branch filtreleme: her admin sadece kendi şubesini görsün
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const filter = { branchId: req.user.branchId };
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

    const now = new Date();
    const itemsWithPricing = items.map((doc) => {
      const plain = doc.toObject();
      const pricing = formatProductPricing(plain, now);
      return {
        ...plain,
        effectivePrice: pricing.effectivePrice,
        isOnSale: pricing.isOnSale,
        listPrice: pricing.listPrice,
      };
    });

    res.json({
      items: itemsWithPricing,
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
 * Ürün oluştur (admin) - ürün, kullanıcının şubesine bağlanır
 */
router.post('/products', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const {
      name,
      price,
      description,
      imageUrl,
      category,
      countInStock,
      station,
      salePrice,
      saleStartsAt,
      saleEndsAt,
    } = req.body;

    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const saleErr = validateProductSaleFields(req.body);
    if (saleErr) return res.status(400).json({ message: saleErr });

    const { error: nutErr, nutrition } = buildNutrition(req.body.nutrition);
    if (nutErr) return res.status(400).json({ message: nutErr });

    const statusErr = validateNutritionStatus(req.body.nutritionStatus);
    if (statusErr) return res.status(400).json({ message: statusErr });
    const nutritionStatus = req.body.nutritionStatus || undefined;

    if (nutrition && nutritionStatus === 'approved') {
      nutrition.approvedAt = new Date();
    }

    const product = new Product({
      name,
      price,
      description,
      imageUrl,
      category,
      countInStock,
      station: station || 'hot',
      branchId: req.user.branchId,
      ...(salePrice != null && salePrice !== '' ? { salePrice: Number(salePrice) } : {}),
      ...(saleStartsAt ? { saleStartsAt: new Date(saleStartsAt) } : {}),
      ...(saleEndsAt ? { saleEndsAt: new Date(saleEndsAt) } : {}),
      ...(nutrition ? { nutrition } : {}),
      ...(nutritionStatus ? { nutritionStatus } : {}),
    });
    await product.save();
    const plain = product.toObject();
    res.status(201).json({ ...plain, ...formatProductPricing(plain) });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/products/:id
 * Ürün güncelle (admin) - sadece kendi şubesine ait ürünü güncelleyebilir
 */
router.put('/products/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const existing = await Product.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!existing) return res.status(404).json({ message: 'Ürün bulunamadı' });

    const saleErr = validateProductSaleFields(req.body, existing.price);
    if (saleErr) return res.status(400).json({ message: saleErr });

    // Not: ingredients/allergens artık nutrition.ingredients / nutrition.allergens altında
    // tutuluyor; top-level olarak kabul edilmiyor (şemada da yok).
    const allowedKeys = [
      'name',
      'description',
      'price',
      'category',
      'categoryId',
      'imageUrl',
      'isActive',
      'station',
      'salePrice',
      'saleStartsAt',
      'saleEndsAt',
    ];
    const patch = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.salePrice === '' || patch.salePrice == null) patch.salePrice = null;
    if (patch.saleStartsAt === '') patch.saleStartsAt = null;
    if (patch.saleEndsAt === '') patch.saleEndsAt = null;

    // Nutrition: yalnızca gövdede gönderildiyse güncelle (form göndermezse mevcut korunur)
    const statusErr = validateNutritionStatus(req.body.nutritionStatus);
    if (statusErr) return res.status(400).json({ message: statusErr });

    let effectiveStatus = existing.nutritionStatus;
    if (req.body.nutritionStatus !== undefined && req.body.nutritionStatus !== '') {
      patch.nutritionStatus = req.body.nutritionStatus;
      effectiveStatus = req.body.nutritionStatus;
    }

    if (req.body.nutrition !== undefined) {
      const { error: nutErr, nutrition } = buildNutrition(req.body.nutrition);
      if (nutErr) return res.status(400).json({ message: nutErr });
      if (nutrition) {
        if (effectiveStatus === 'approved') nutrition.approvedAt = new Date();
        patch.nutrition = nutrition;
      }
    }

    const updated = await Product.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      patch,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Ürün bulunamadı' });
    const plain = updated.toObject();
    res.json({ ...plain, ...formatProductPricing(plain) });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Ürün sil (admin) - sadece kendi şubesine ait ürünü silebilir
 */
router.delete('/products/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const deleted = await Product.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!deleted) return res.status(404).json({ message: 'Ürün bulunamadı' });
    res.json({ message: 'Ürün silindi', id: deleted._id });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/campaigns
 */
router.get('/campaigns', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user?.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    const items = await Campaign.find({ branchId: req.user.branchId })
      .sort({ sortOrder: 1, minCartTotal: 1 })
      .lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/campaigns
 */
router.post('/campaigns', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user?.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    const err = validateCampaignBody(req.body);
    if (err) return res.status(400).json({ message: err });

    const campaignType = req.body.campaignType === 'menu' ? 'menu' : 'cart';
    let createPayload = {
      branchId: req.user.branchId,
      campaignType,
      title: String(req.body.title).trim(),
      isActive: req.body.isActive !== false,
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined,
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : undefined,
      sortOrder: Number(req.body.sortOrder) || 0,
    };

    if (campaignType === 'menu') {
      const resolved = await resolveMenuProducts(req.user.branchId, req.body.products);
      if (resolved.error) return res.status(400).json({ message: resolved.error });
      const listTotal = resolved.items.reduce((s, p) => s + Number(p.price || 0), 0);
      const bundlePrice = Number(req.body.bundlePrice);
      createPayload = {
        ...createPayload,
        products: resolved.items,
        bundlePrice,
        minCartTotal: listTotal,
        discountRate:
          listTotal > 0 ? Math.min(1, Math.max(0, 1 - bundlePrice / listTotal)) : 0,
      };
    } else {
      createPayload = {
        ...createPayload,
        minCartTotal: Number(req.body.minCartTotal) || 0,
        discountRate: Number(req.body.discountRate),
        products: [],
      };
    }

    const campaign = await Campaign.create(createPayload);
    res.status(201).json(campaign);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/campaigns/:id
 */
router.put('/campaigns/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user?.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    if (req.body.title !== undefined && !String(req.body.title).trim()) {
      return res.status(400).json({ message: 'Kampanya başlığı gerekli' });
    }
    if (
      req.body.discountRate !== undefined ||
      req.body.minCartTotal !== undefined ||
      req.body.title !== undefined
    ) {
      const existing = await Campaign.findOne({
        _id: req.params.id,
        branchId: req.user.branchId,
      });
      if (!existing) return res.status(404).json({ message: 'Kampanya bulunamadı' });
      const merged = {
        title: req.body.title ?? existing.title,
        minCartTotal: req.body.minCartTotal ?? existing.minCartTotal,
        discountRate: req.body.discountRate ?? existing.discountRate,
        startsAt: req.body.startsAt ?? existing.startsAt,
        endsAt: req.body.endsAt ?? existing.endsAt,
      };
      const err = validateCampaignBody(merged);
      if (err) return res.status(400).json({ message: err });
    }

    const patch = { ...req.body };
    if (patch.title) patch.title = String(patch.title).trim();
    if (patch.startsAt === '') patch.startsAt = null;
    if (patch.endsAt === '') patch.endsAt = null;

    const updated = await Campaign.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      patch,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Kampanya bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/campaigns/:id
 */
router.delete('/campaigns/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user?.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    const deleted = await Campaign.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!deleted) return res.status(404).json({ message: 'Kampanya bulunamadı' });
    res.json({ message: 'Kampanya silindi', id: deleted._id });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/categories
 * Kategori listesi (admin) - sadece kullanıcının şubesine ait kategoriler
 */
router.get('/categories', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const categories = await Category.find({ branchId: req.user.branchId }).sort({ name: 1 });
    res.json(categories);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/categories
 * Kategori oluştur (admin) - kategori, kullanıcının şubesine bağlanır
 */
router.post('/categories', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    let category = await Category.findOne({ name, branchId: req.user.branchId });
    if (category) {
      return res.status(400).json({ message: 'Bu kategori zaten mevcut' });
    }
    category = new Category({ 
      name,
      branchId: req.user.branchId,
    });
    await category.save();
    res.status(201).json(category);
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/categories/:id
 * Kategori güncelle (admin) - sadece kendi şubesine ait kategoriyi güncelleyebilir
 */
router.put('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const updated = await Category.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      { name },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Kategori bulunamadı' });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Kategori sil (admin) - sadece kendi şubesine ait kategoriyi silebilir
 */
router.delete('/categories/:id', auth, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const deleted = await Category.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
    if (!deleted) return res.status(404).json({ message: 'Kategori bulunamadı' });
    res.json({ message: 'Kategori silindi', id: deleted._id });
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
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const tables = await Table.find({ branchId: req.user.branchId }).sort({ name: 1 }).lean();
    
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
        
        const totalAmount = trulyActiveOrders.reduce((sum, order) => sum + (order.total || 0), 0);
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
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    const table = await Table.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    }).lean();
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
      totalAmount: activeOrders.reduce((sum, o) => sum + (o.total || 0), 0)
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

    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

    // Önce masanın bu şubeye ait olduğundan emin ol
    const table = await Table.findOne({
      _id: req.params.id,
      branchId: req.user.branchId,
    }).lean();
    if (!table) {
      return res.status(404).json({ message: 'Masa bulunamadı' });
    }

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

    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    
    if (!name) {
      return res.status(400).json({ message: 'Masa adı gereklidir' });
    }
    
    // Aynı isimde masa var mı kontrol et
    const existing = await Table.findOne({ name, branchId: req.user.branchId });
    if (existing) {
      return res.status(400).json({ message: 'Bu isimde bir masa zaten mevcut' });
    }
    
    const table = new Table({
      name,
      capacity: capacity || 4,
      status: status || 'bos',
      branchId: req.user.branchId,
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
    
    // İsim değişiyorsa, aynı isimde başka masa var mı kontrol et (aynı şube içinde)
    if (name) {
      const existing = await Table.findOne({ 
        name, 
        branchId: req.user.branchId,
        _id: { $ne: req.params.id } 
      });
      if (existing) {
        return res.status(400).json({ message: 'Bu isimde bir masa zaten mevcut' });
      }
    }
    
    const updated = await Table.findOneAndUpdate(
      { _id: req.params.id, branchId: req.user.branchId },
      updateData,
      { new: true }
    );
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
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }

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
    
    const deleted = await Table.findOneAndDelete({
      _id: req.params.id,
      branchId: req.user.branchId,
    });
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
    const Table = require('../models/Table');

    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    
    // Önce QR kodları çek - qrCode alanının da kesin gelmesini sağla
    const qrCodes = await QRCode.find({ branchId: req.user.branchId })
      .select('tableNumber qrUrl qrCode tableId createdBy createdAt updatedAt branchId')
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    // Her QR kod için tableId'nin capacity'sini kontrol et ve gerekirse fresh data çek
    const qrCodesWithFreshData = await Promise.all(
      qrCodes.map(async (qr) => {
        if (qr.tableId && qr.tableId._id) {
          // Fresh table data çek (cache sorunlarını önlemek için)
          const freshTable = await Table.findById(qr.tableId._id).lean();
          if (freshTable) {
            qr.tableId = {
              ...qr.tableId,
              capacity: freshTable.capacity,
              name: freshTable.name,
              status: freshTable.status
            };
          }
        }
        return qr;
      })
    );
    
    // Debug: Capacity bilgilerini logla
    console.log('📋 [QR LIST] QR kodları listeleniyor:', qrCodesWithFreshData.map(qr => ({
      tableNumber: qr.tableNumber,
      tableId: qr.tableId?._id,
      capacity: qr.tableId?.capacity,
      tableIdFull: qr.tableId
    })));
    
    res.json(qrCodesWithFreshData);
  } catch (error) {
    console.error('QR kodları listeleme hatası:', error);
    next(error);
  }
});

/**
 * POST /api/admin/qr
 * QR kod oluştur (admin)
 * Body: { tableNumber: string, capacity?: number }
 */
router.post('/qr', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const QRCode = require('../models/QRCode');
    const QRCodeLib = require('qrcode');
    const { tableNumber, capacity } = req.body;

    // Her admin sadece kendi şubesine QR oluşturabilir
    if (!req.user || !req.user.branchId) {
      return res.status(400).json({ message: 'Kullanıcının bağlı olduğu bir şube bulunamadı' });
    }
    
    if (!tableNumber || !tableNumber.trim()) {
      return res.status(400).json({ message: 'Masa numarası gerekli' });
    }

    const tableNum = String(tableNumber).trim();
    // Capacity'yi kontrol et - eğer yoksa, 0 ise veya geçersizse varsayılan 4 kullan
    let tableCapacity = 4; // Varsayılan
    console.log('🔍 [QR CREATE] Request body:', { 
      tableNumber, 
      capacity, 
      capacityType: typeof capacity,
      capacityValue: capacity,
      body: req.body
    });
    
    // Capacity string, number veya undefined olabilir
    if (capacity !== undefined && capacity !== null && capacity !== '') {
      // String ise trim yap
      const capacityStr = String(capacity).trim();
      console.log('🔍 [QR CREATE] Capacity string:', capacityStr, 'length:', capacityStr.length);
      if (capacityStr !== '' && capacityStr !== 'undefined' && capacityStr !== 'null') {
        const parsedCapacity = parseInt(capacityStr, 10);
        console.log('🔍 [QR CREATE] Parsed capacity:', parsedCapacity, 'isNaN:', isNaN(parsedCapacity), 'original:', capacityStr, 'type:', typeof parsedCapacity);
        if (!isNaN(parsedCapacity) && parsedCapacity > 0) {
          tableCapacity = parsedCapacity;
          console.log('✅ [QR CREATE] Capacity parse başarılı, tableCapacity güncellendi:', tableCapacity);
        } else {
          console.warn('⚠️ [QR CREATE] Capacity parse başarısız, varsayılan 4 kullanılacak');
        }
      } else {
        console.warn('⚠️ [QR CREATE] Capacity string boş veya geçersiz, varsayılan 4 kullanılacak');
      }
    } else {
      console.warn('⚠️ [QR CREATE] Capacity undefined/null/empty, varsayılan 4 kullanılacak');
    }
    console.log('🔍 [QR CREATE] Final tableCapacity:', tableCapacity, 'type:', typeof tableCapacity);

    // QR kod zaten var mı kontrol et (aynı şube + masa numarası için)
    const existingQR = await QRCode.findOne({ 
      tableNumber: tableNum,
      branchId: req.user.branchId,
    })
      .populate('tableId', 'name capacity status')
      .populate('createdBy', 'name email')
      .lean();
    if (existingQR) {
      // Aynı QR zaten varsa hata vermek yerine mevcut kaydı başarıyla döndür
      console.log('ℹ️ [QR CREATE] Mevcut QR bulundu, yeni oluşturmak yerine geri döndürülüyor:', {
        tableNumber: existingQR.tableNumber,
        id: existingQR._id,
      });
      return res.status(200).json(existingQR);
    }

    // Masa var mı kontrol et (şube bazlı)
    let table = await Table.findOne({ 
      name: tableNum,
      branchId: req.user.branchId,
    });
    
    if (!table) {
      // Masa yoksa oluştur
      table = await Table.create({
        name: tableNum,
        capacity: tableCapacity,
        status: 'bos',
        branchId: req.user.branchId,
      });
      console.log('✅ [QR CREATE] Yeni masa oluşturuldu:', { 
        _id: table._id,
        name: table.name, 
        capacity: table.capacity,
        capacityType: typeof table.capacity
      });
    } else {
      // Masa varsa capacity'yi güncelle - findByIdAndUpdate kullan (daha güvenilir)
      console.log('🔄 [QR CREATE] Mevcut masa bulundu, capacity güncelleniyor:', { 
        _id: table._id,
        oldCapacity: table.capacity, 
        newCapacity: tableCapacity,
        oldCapacityType: typeof table.capacity
      });
      
      // findByIdAndUpdate kullan (daha güvenilir)
      table = await Table.findByIdAndUpdate(
        table._id,
        { capacity: tableCapacity },
        { new: true, runValidators: true }
      );
      
      console.log('✅ [QR CREATE] Masa capacity güncellendi (findByIdAndUpdate):', { 
        _id: table._id,
        name: table.name, 
        capacity: table.capacity,
        capacityType: typeof table.capacity
      });
      
      // Double check - veritabanından tekrar oku
      const verifyTable = await Table.findById(table._id).lean();
      console.log('🔍 [QR CREATE] Veritabanından doğrulama:', {
        _id: verifyTable._id,
        capacity: verifyTable.capacity,
        capacityType: typeof verifyTable.capacity
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
    
    // QR URL'ine hem masa numarası hem de branchId bilgisini koy
    // branchId'yi string'e çevir ve null/undefined kontrolü yap
    const branchIdStr = req.user.branchId ? String(req.user.branchId) : null;
    const qrUrl = branchIdStr 
      ? `${frontendOrigin}/order?table=${tableNum}&branch=${branchIdStr}`
      : `${frontendOrigin}/order?table=${tableNum}`;
    
    console.log('🔗 [QR CREATE] QR URL oluşturuldu:', {
      frontendOrigin,
      tableNum,
      branchId: req.user.branchId,
      branchIdStr,
      qrUrl
    });

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
      branchId: req.user.branchId,
      createdBy: req.user.id
    });

    // Populate ile döndür - tableId'yi fresh oku
    // Önce QRCode'u populate et (createdBy için)
    let populated = await QRCode.findById(qrCodeDoc._id)
      .populate('createdBy', 'name email')
      .lean();
    
    // tableId'yi manuel olarak fresh data ile doldur (populate cache sorunlarını önlemek için)
    // ÖNEMLİ: table._id kullan (güncellenmiş masa ID'si)
    console.log('🔍 [QR CREATE] Fresh table data çekiliyor, table._id:', table._id, 'tableCapacity:', tableCapacity);
    
    // Önce table'ı tekrar oku (kesinlikle fresh data için)
    const freshTable = await Table.findById(table._id).lean();
    console.log('🔍 [QR CREATE] Fresh table data (findById):', {
      _id: freshTable?._id,
      name: freshTable?.name,
      capacity: freshTable?.capacity,
      capacityType: typeof freshTable?.capacity
    });
    
    // Eğer fresh table'da capacity hala eski ise, direkt güncelle
    if (freshTable && freshTable.capacity !== tableCapacity) {
      console.warn('⚠️ [QR CREATE] Fresh table capacity yanlış! Güncelleniyor...', {
        expected: tableCapacity,
        actual: freshTable.capacity
      });
      // Tekrar güncelle
      await Table.findByIdAndUpdate(
        table._id,
        { capacity: tableCapacity },
        { new: true, runValidators: true }
      );
      // Tekrar oku
      const reReadTable = await Table.findById(table._id).lean();
      console.log('✅ [QR CREATE] Table tekrar güncellendi ve okundu:', {
        capacity: reReadTable.capacity
      });
      populated.tableId = {
        _id: reReadTable._id,
        name: reReadTable.name,
        capacity: reReadTable.capacity,
        status: reReadTable.status
      };
    } else if (freshTable) {
      populated.tableId = {
        _id: freshTable._id,
        name: freshTable.name,
        capacity: freshTable.capacity,
        status: freshTable.status
      };
      console.log('✅ [QR CREATE] populated.tableId güncellendi:', {
        _id: populated.tableId._id,
        capacity: populated.tableId.capacity,
        capacityType: typeof populated.tableId.capacity
      });
    } else {
      console.error('❌ [QR CREATE] Fresh table bulunamadı! table._id:', table._id);
      // Fallback: populate kullan
      populated = await QRCode.findById(qrCodeDoc._id)
        .populate('tableId', 'name capacity status')
        .populate('createdBy', 'name email')
        .lean();
    }
    
    console.log('📤 [QR CREATE] Response data (FINAL):', { 
      tableNumber: populated.tableNumber, 
      tableId: populated.tableId?._id, 
      capacity: populated.tableId?.capacity,
      capacityType: typeof populated.tableId?.capacity,
      expectedCapacity: tableCapacity,
      matches: populated.tableId?.capacity === tableCapacity
    });

    res.status(201).json(populated);
  } catch (error) {
    console.error('QR kod oluşturma hatası:', error);
    // Duplicate key olursa da gene üstteki mantıkla handle edilmesi gerekirdi,
    // yine de extra güvenlik için generik hata döndürelim.
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Bu masa için QR kod zaten mevcut, lütfen listeyi yenileyin.' });
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

    // QRCode'u bul (yalnızca kendi şubesinden)
    const qrCode = await QRCode.findOne({
      _id: id,
      branchId: req.user.branchId,
    });
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



