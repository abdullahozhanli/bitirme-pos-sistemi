const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const Campaign = require('../models/Campaign');
const {
  effectivePrice,
  isCampaignActive,
  campaignDiscountAmount,
} = require('../utils/pricing');
const { emitCustomerOrderUpdate } = require('../utils/customerOrderNotify');
const {
  computePointsEarned,
  computePointsRedemption,
} = require('../utils/loyaltyPoints');
const {
  buildInitialPaymentFromCheckout,
  isOrderPaid,
} = require('../utils/orderPayment');
const { cancelOrder } = require('../utils/orderCancel');

const router = express.Router();

/**
 * GET /api/orders/mine
 * Giriş yapmış müşterinin siparişleri (customer alanı)
 */
router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const actor = await User.findById(userId).select('role').lean();
    if (!actor || actor.role !== 'musteri') {
      return res.json({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const filter = { customer: new mongoose.Types.ObjectId(userId) };
    const branchQ = req.query.branchId;
    if (branchQ === '__none__') {
      filter.$or = [{ branchId: null }, { branchId: { $exists: false } }];
    } else if (branchQ && mongoose.Types.ObjectId.isValid(String(branchQ))) {
      filter.branchId = new mongoose.Types.ObjectId(String(branchQ));
    }

    const countOnly =
      req.query.countOnly === 'true' ||
      req.query.countOnly === '1' ||
      req.query.countOnly === true;

    if (countOnly) {
      const total = await Order.countDocuments(filter);
      return res.json({
        items: [],
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      });
    }

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate('table', 'name capacity')
        .populate('items.menuItem', 'name price category imageUrl')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/orders/mine/branches
 * Müşteri siparişlerinin şubelere göre özeti
 */
router.get('/mine/branches', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const actor = await User.findById(userId).select('role').lean();
    if (!actor || actor.role !== 'musteri') {
      return res.json({ branches: [] });
    }

    const oid = new mongoose.Types.ObjectId(userId);
    const agg = await Order.aggregate([
      { $match: { customer: oid } },
      {
        $group: {
          _id: '$branchId',
          orderCount: { $sum: 1 },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
      { $sort: { lastOrderAt: -1 } },
    ]);

    const objectIds = agg.map((r) => r._id).filter((id) => id != null);
    const nameById = {};
    if (objectIds.length) {
      const docs = await Branch.find({ _id: { $in: objectIds } })
        .select('name isActive')
        .lean();
      for (const b of docs) {
        nameById[String(b._id)] = b.name || 'Şube';
      }
    }

    const branches = agg.map((row) => {
      const id = row._id;
      const idStr = id == null ? null : String(id);
      const branchName =
        id == null
          ? 'Şube atanmamış'
          : nameById[idStr] || `Şube (${idStr.slice(-6)})`;
      return {
        branchId: idStr,
        branchName,
        orderCount: row.orderCount,
        lastOrderAt: row.lastOrderAt,
      };
    });

    res.json({ branches });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/orders/:id/cancel
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  requireRole('admin', 'yetkili', 'kasa', 'garson'),
  async (req, res, next) => {
    try {
      const branchFilter = {};
      if (req.user.role !== 'superadmin' && req.user.branchId) {
        branchFilter.branchId = req.user.branchId;
      }
      const order = await cancelOrder({
        orderId: req.params.id,
        actorId: req.user.id,
        reason: req.body?.reason,
        io: req.app.get('io'),
        branchFilter,
      });
      res.json(order);
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      next(e);
    }
  }
);

/**
 * GET /api/orders/:id
 * Sipariş detayı — müşteri kendi siparişini veya personel (admin/garson/kasa) görebilir
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Geçersiz sipariş id' });
    }

    const order = await Order.findById(id)
      .populate('table', 'name capacity')
      .populate('items.menuItem', 'name price category imageUrl')
      .lean();

    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    const actor = await User.findById(req.user.id).select('role branchId').lean();
    const staffRoles = ['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'superadmin'];
    const isStaff = actor && staffRoles.includes(actor.role);
    const isOwner =
      actor?.role === 'musteri' &&
      order.customer &&
      String(order.customer) === String(req.user.id);

    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: 'Bu siparişe erişim yetkiniz yok' });
    }

    if (isStaff && actor.role !== 'superadmin' && actor.branchId) {
      const orderBranch = order.branchId ? String(order.branchId) : null;
      if (orderBranch && String(actor.branchId) !== orderBranch) {
        return res.status(403).json({ message: 'Bu siparişe erişim yetkiniz yok' });
      }
    }

    res.json(order);
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
router.post('/', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const {
      tableNumber,
      items,
      notes,
      campaignId,
      useLoyaltyPoints,
      pointsDiscountTry,
      paymentMethod,
      paymentConfirmed,
    } = req.body;

    if (!tableNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Eksik veri' });
    }

    const paymentInit = buildInitialPaymentFromCheckout({ paymentMethod, paymentConfirmed });
    if (paymentInit.error) {
      return res.status(400).json({ message: paymentInit.error });
    }

    // BranchId'yi al (request body'den veya query'den)
    const { branchId: requestBranchId } = req.body;
    
    // Table kontrolü - tableNumber ve branchId'ye göre bul veya oluştur
    const Table = require('../models/Table');
    
    // Masa arama kriteri: branchId varsa hem name hem branchId ile ara, yoksa sadece name ile ara
    const tableQuery = { name: String(tableNumber) };
    if (requestBranchId) {
      tableQuery.branchId = requestBranchId;
    }
    
    let table = await Table.findOne(tableQuery);
    
    if (!table) {
      // Table yoksa oluştur - branchId varsa ekle
      const tableData = {
        name: String(tableNumber),
        capacity: 4,
        status: 'bos'
      };
      if (requestBranchId) {
        tableData.branchId = requestBranchId;
      }
      
      try {
        table = await Table.create(tableData);
      } catch (createError) {
        // Duplicate key hatası - masa zaten var, tekrar bul
        if (createError.code === 11000) {
          console.warn(`⚠️ Masa oluşturulurken duplicate key hatası, tekrar aranıyor: ${tableNumber}, branchId: ${requestBranchId}`);
          table = await Table.findOne(tableQuery);
          if (!table) {
            // Hala bulunamadıysa, branchId olmadan ara (eski masalar için)
            table = await Table.findOne({ name: String(tableNumber) });
            if (table && requestBranchId) {
              // Eski masayı bulduk, branchId ekle
              table.branchId = requestBranchId;
              await table.save();
            }
          }
        } else {
          throw createError;
        }
      }
    } else {
      // Masa varsa ama branchId yoksa ve request'te branchId varsa güncelle
      if (!table.branchId && requestBranchId) {
        table.branchId = requestBranchId;
        await table.save();
      }
    }

    // MenuItem veya Product kontrolü - hem MenuItem hem Product ID'lerini kabul et
    const MenuItem = require('../models/MenuItem');
    const Product = require('../models/Product');
    const itemIds = items.map(i => i.menuItemId || i.productId).filter(Boolean);
    
    // Debug log'ları kaldırıldı

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
    
    // Debug log'ları kaldırıldı

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
        const linePrice = effectivePrice(item);
        if (!linePrice || isNaN(linePrice)) {
          console.warn('⚠️ Product fiyatı geçersiz:', item);
          return null;
        }
        let menuItem = await MenuItem.findOne({ name: item.name });
        if (!menuItem) {
          menuItem = await MenuItem.create({
            name: item.name,
            category:
              item.category?.name ||
              (typeof item.category === 'object' ? item.category.name : item.category) ||
              '',
            price: linePrice,
            isActive: true,
          });
        }

        return {
          menuItem: menuItem._id,
          name: item.name,
          qty: Number(i.qty) || 1,
          price: linePrice,
          note: i.note || '',
        };
      }

      console.warn('⚠️ Öğe bulunamadı:', itemId);
      return null;
    });
    
    const orderItems = (await Promise.all(orderItemsPromises)).filter(Boolean);

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'Geçerli ürün bulunamadı' });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const subtotalRounded = Number(subtotal.toFixed(2));

    let discountTotal = 0;
    let appliedCampaign = null;
    if (campaignId) {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        return res.status(400).json({ message: 'Geçersiz kampanya' });
      }
      const campaign = await Campaign.findById(campaignId).lean();
      if (!campaign) {
        return res.status(400).json({ message: 'Kampanya bulunamadı' });
      }
      const campaignBranch = campaign.branchId ? String(campaign.branchId) : null;
      const orderBranch = requestBranchId ? String(requestBranchId) : null;
      if (campaignBranch && orderBranch && campaignBranch !== orderBranch) {
        return res.status(400).json({ message: 'Kampanya bu şube için geçerli değil' });
      }
      if (!isCampaignActive(campaign)) {
        return res.status(400).json({ message: 'Kampanya şu an aktif değil' });
      }
      if (subtotalRounded < Number(campaign.minCartTotal || 0)) {
        return res.status(400).json({
          message: `Kampanya için minimum sepet tutarı ${campaign.minCartTotal} TL`,
        });
      }
      discountTotal = campaignDiscountAmount(subtotalRounded, campaign);
      appliedCampaign = campaign;
    }

    let customerId = null;
    let customerLoyaltyBalance = 0;
    if (req.user && req.user.id) {
      const customerUser = await User.findById(req.user.id).select('role loyaltyPoints').lean();
      if (customerUser && customerUser.role === 'musteri') {
        customerId = customerUser._id;
        customerLoyaltyBalance = Math.max(0, Number(customerUser.loyaltyPoints) || 0);
      }
    }

    let loyaltyDiscountTry = 0;
    let pointsRedeemed = 0;
    if (useLoyaltyPoints && customerId) {
      const afterCampaign = Number(Math.max(0, subtotalRounded - discountTotal).toFixed(2));
      const redemption = computePointsRedemption({
        cartTotalAfterOtherDiscounts: afterCampaign,
        loyaltyPointsBalance: customerLoyaltyBalance,
        requestedDiscountTry: Number(pointsDiscountTry) || afterCampaign * 0.3,
      });
      if (redemption.error) {
        return res.status(400).json({ message: redemption.error });
      }
      loyaltyDiscountTry = redemption.pointsDiscountTry;
      pointsRedeemed = redemption.pointsRedeemed;
      if (pointsRedeemed > 0) {
        discountTotal = Number((discountTotal + loyaltyDiscountTry).toFixed(2));
      }
    } else if (useLoyaltyPoints && !customerId) {
      return res.status(401).json({ message: 'Puan kullanmak için giriş yapmalısınız' });
    }

    const total = Number(Math.max(0, subtotalRounded - discountTotal).toFixed(2));

    if (!table._id) {
      return res.status(400).json({ message: 'Masa ID bulunamadı' });
    }
    if (!total || isNaN(total) || total <= 0) {
      return res.status(400).json({ message: 'Geçersiz toplam tutar' });
    }
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'Sipariş kalemleri boş' });
    }

    // BranchId'yi belirle: Önce request'ten, yoksa masadan, yoksa null
    const finalBranchId = requestBranchId || table.branchId || null;

    const StockMovement = require('../models/StockMovement');
    const productIdsForStock = items
      .map((i) => i.menuItemId || i.productId)
      .filter((id) => productsMap[String(id)]);

    const session = await mongoose.startSession();
    let order;
    try {
      await session.withTransaction(async () => {
        const productsForStock =
          productIdsForStock.length > 0
            ? await Product.find({ _id: { $in: productIdsForStock } }).session(session)
            : [];

        for (const line of items) {
          const itemId = line.menuItemId || line.productId;
          const product = productsForStock.find((p) => String(p._id) === String(itemId));
          if (!product) continue;
          const qty = Number(line.qty) || 1;
          if (product.countInStock < qty) {
            throw new Error(
              `Yetersiz stok: ${product.name} (Stok: ${product.countInStock}, İstenen: ${qty})`
            );
          }
        }

        const noteParts = [notes || ''];
        if (appliedCampaign) {
          noteParts.push(`Kampanya: ${appliedCampaign.title}`);
        }
        if (pointsRedeemed > 0) {
          noteParts.push(
            `Para puan: -${loyaltyDiscountTry.toFixed(2)} TL (${pointsRedeemed} puan)`
          );
        }

        if (pointsRedeemed > 0 && customerId) {
          const deducted = await User.findOneAndUpdate(
            { _id: customerId, loyaltyPoints: { $gte: pointsRedeemed } },
            { $inc: { loyaltyPoints: -pointsRedeemed } },
            { new: true, session }
          ).select('loyaltyPoints');
          if (!deducted) {
            throw new Error('Yetersiz parapuan');
          }
        }

        const created = await Order.create(
          [
            {
              table: table._id,
              items: orderItems,
              subtotal: subtotalRounded,
              discountTotal,
              total: Number(total),
              totalPrice: Number(total),
              campaignId: appliedCampaign?._id,
              campaignTitle: appliedCampaign?.title,
              loyaltyPointsRedeemed: pointsRedeemed,
              loyaltyDiscountTry,
              notes: noteParts.filter(Boolean).join(' | '),
              status: 'hazirlaniyor',
              paymentMethod: paymentInit.paymentMethod || null,
              paymentStatus: paymentInit.paymentStatus,
              ...(paymentInit.paidAt ? { paidAt: paymentInit.paidAt } : {}),
              branchId: finalBranchId,
              ...(customerId ? { customer: customerId } : {}),
            },
          ],
          { session }
        );
        order = created[0];

        for (const line of items) {
          const itemId = line.menuItemId || line.productId;
          const product = productsForStock.find((p) => String(p._id) === String(itemId));
          if (!product) continue;
          const qty = Number(line.qty) || 1;

          const updateResult = await Product.updateOne(
            { _id: product._id, countInStock: { $gte: qty } },
            { $inc: { countInStock: -qty } }
          ).session(session);

          if (updateResult.modifiedCount === 0) {
            throw new Error(`Yetersiz stok: ${product.name}`);
          }

          await StockMovement.create(
            [
              {
                productId: product._id,
                delta: -qty,
                reason: 'order',
                refId: order._id,
                actorId: customerId || null,
              },
            ],
            { session }
          );
        }
      });
    } catch (stockError) {
      return res.status(400).json({ message: stockError.message || 'Stok veya sipariş kaydı başarısız' });
    } finally {
      await session.endSession();
    }

    let pointsEarned = 0;
    let customerLoyaltyPoints = null;
    if (customerId) {
      pointsEarned = computePointsEarned(total);
      if (pointsEarned > 0) {
        const updatedUser = await User.findByIdAndUpdate(
          customerId,
          { $inc: { loyaltyPoints: pointsEarned } },
          { new: true }
        ).select('loyaltyPoints');
        if (updatedUser) customerLoyaltyPoints = updatedUser.loyaltyPoints;
      } else {
        const current = await User.findById(customerId).select('loyaltyPoints').lean();
        customerLoyaltyPoints = current?.loyaltyPoints ?? null;
      }
    }

    if (productIdsForStock.length > 0) {
      // Real-time stok güncellemesi için socket emit
      const io = req.app.get('io');
      if (io) {
        // Güncellenmiş ürünleri çek ve gönder
        const updatedProducts = await Product.find({ 
          _id: { $in: productIdsForStock } 
        }).lean();
        
        updatedProducts.forEach(product => {
          io.emit('product:stock:updated', {
            productId: product._id,
            countInStock: product.countInStock,
            branchId: finalBranchId
          });
        });
      }
    }

    // Table status'unu güncelle
    const updatedTable = await Table.findByIdAndUpdate(table._id, { status: 'dolu' }, { new: true });

    // Populate ile döndür
    const populated = await Order.findById(order._id)
      .populate('table', 'name capacity')
      .populate('items.menuItem', 'name price category');

    // Socket.io emit: Yeni sipariş oluşturuldu ve masa durumu değişti
    try {
      const io = req.app.get('io');
      // Debug log'ları kaldırıldı
      if (io) {
        // Masa durumu değişti
        io.to('tables').emit('table:status:changed', {
          tableId: table._id,
          from: 'bos',
          to: 'dolu',
          table: updatedTable.toObject()
        });
        
        // Yeni sipariş oluşturuldu (QR siparişi)
        io.to('tables').emit('table:order:created', {
          tableId: table._id,
          order: populated.toObject(),
          table: updatedTable.toObject()
        });
        
        // Mutfağa bildir (QR siparişi için) - siparişin branchId'sini kullan
        const branchId = finalBranchId || 'default';
        // QR siparişleri eski model kullanıyor (items array'i)
        const itemsToNotify = order.items || orderItems || [];
        
        // Debug log'ları kaldırıldı
        
        // table:order:created event'ini mutfak room'una gönder (sadece bir kez)
        const kitchenRoom = `kitchen.${branchId}`;
        const roomSize = io.sockets.adapter.rooms.get(kitchenRoom)?.size || 0;
        io.to(kitchenRoom).emit('table:order:created', {
          tableId: table._id,
          order: populated.toObject(),
          table: updatedTable.toObject()
        });
        console.log(`📡 [BACKEND] table:order:created event'i gönderildi: ${kitchenRoom} (${roomSize} client dinliyor)`);
        
        // Her item için item:queued event'i gönder
        for (let idx = 0; idx < itemsToNotify.length; idx++) {
          const item = itemsToNotify[idx];
          // Eski model için station yok, default 'hot' kullan
          const station = item.station || 'hot';
          // itemId oluştur (eski model için orderId-index formatı)
          const itemId = item._id ? String(item._id) : `${String(order._id)}-${idx}`;
          const itemData = {
            itemId: itemId,
            orderId: String(order._id),
            orderNumber: String(order._id).substring(0, 8),
            station: station,
            productName: item.name || item.product?.name || 'Ürün Adı Yok',
            qty: Number(item.qty) || 1,
            note: String(item.note || ''),
            status: 'QUEUED',
            order: populated.toObject(),
            table: populated.table || updatedTable.toObject(),
            tableId: table._id,
            tableNumber: tableNumber,
            orderSource: 'qr',
            createdAt: order.createdAt || new Date(),
            orderCreatedAt: order.createdAt || new Date(),
          };
          // Spesifik istasyona gönder
          const stationRoom = `kitchen.${branchId}.${station}`;
          const generalRoom = `kitchen.${branchId}`;
          const stationRoomSize = io.sockets.adapter.rooms.get(stationRoom)?.size || 0;
          const generalRoomSize = io.sockets.adapter.rooms.get(generalRoom)?.size || 0;
          
          io.to(stationRoom).emit('item:queued', itemData);
          io.to(generalRoom).emit('item:queued', itemData);
          console.log(`📡 [BACKEND] item:queued gönderildi: ${itemId} (${station}) -> ${stationRoom} (${stationRoomSize} client) ve ${generalRoom} (${generalRoomSize} client)`);
        }
        console.log(`📡 [BACKEND] ${itemsToNotify.length} adet item:queued event'i gönderildi: kitchen.${branchId}`);
        
        // Masa güncellendi
        io.to('tables').emit('table:updated', {
          type: 'order_created',
          table: updatedTable.toObject()
        });
      } else {
        console.warn('⚠️ [BACKEND] Socket.io mevcut değil, QR siparişi event\'leri gönderilemedi');
      }
    } catch (err) {
      console.error('❌ [BACKEND] Socket.io emit hatası:', err);
    }

    const orderJson = populated.toObject ? populated.toObject() : populated;
    if (customerLoyaltyPoints != null) {
      orderJson.customerLoyaltyPoints = customerLoyaltyPoints;
    }
    if (pointsEarned > 0) orderJson.pointsEarned = pointsEarned;
    if (pointsRedeemed > 0) {
      orderJson.pointsRedeemed = pointsRedeemed;
      orderJson.loyaltyDiscountTry = loyaltyDiscountTry;
    }
    const io = req.app.get('io');
    if (io && populated?.customer) {
      emitCustomerOrderUpdate(io, populated);
    }

    res.status(201).json(orderJson);
  } catch (e) {
    console.error('Sipariş oluşturma hatası:', e);
    next(e);
  }
});

module.exports = router;
