const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

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
router.post('/', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { tableNumber, items, notes } = req.body;
    
    if (!tableNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Eksik veri' });
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

    // Stok kontrolü ve düşürme için Product'ları session ile güncelle
    const StockMovement = require('../models/StockMovement');
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Product'ları tekrar çek (stok kontrolü için)
        const productIdsForStock = items
          .map(i => i.menuItemId || i.productId)
          .filter(id => productsMap[String(id)]);
        
        if (productIdsForStock.length > 0) {
          const productsForStock = await Product.find({ 
            _id: { $in: productIdsForStock } 
          }).session(session);
          
          // Stok kontrolü ve düşürme
          for (const item of items) {
            const itemId = item.menuItemId || item.productId;
            const product = productsForStock.find(p => String(p._id) === String(itemId));
            
            if (product) {
              const qty = Number(item.qty) || 1;
              
              // Stok kontrolü
              if (product.countInStock < qty) {
                throw new Error(`Yetersiz stok: ${product.name} (Stok: ${product.countInStock}, İstenen: ${qty})`);
              }
              
              // Stok düşür
              const updateResult = await Product.updateOne(
                { _id: product._id, countInStock: { $gte: qty } },
                { $inc: { countInStock: -qty } }
              ).session(session);
              
              if (updateResult.modifiedCount === 0) {
                throw new Error(`Yetersiz stok: ${product.name}`);
              }
              
              // StockMovement kaydı
              await StockMovement.create([{
                productId: product._id,
                delta: -qty,
                reason: 'order',
                refId: null, // Order ID henüz yok, sonra güncellenecek
                actorId: null, // Müşteri siparişi
              }], { session });
            }
          }
        }
      });
    } catch (stockError) {
      await session.endSession();
      return res.status(400).json({ message: stockError.message || 'Stok kontrolü başarısız' });
    }
    
    await session.endSession();

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

    // Debug log'ları kaldırıldı

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

    // BranchId'yi belirle: Önce request'ten, yoksa masadan, yoksa null
    const finalBranchId = requestBranchId || table.branchId || null;

    let customerId = null;
    if (req.user && req.user.id) {
      const u = await User.findById(req.user.id).select('role');
      if (u && u.role === 'musteri') customerId = u._id;
    }

    // Sipariş oluştur
    const order = await Order.create({
      table: table._id,
      items: orderItems,
      total: Number(total),
      notes: notes || '', // Genel sipariş notu
      status: 'hazirlaniyor',
      branchId: finalBranchId,
      ...(customerId ? { customer: customerId } : {}),
    });

    let pointsEarned = 0;
    let customerLoyaltyPoints = null;
    if (customerId) {
      pointsEarned = Math.max(1, Math.floor(Number(total) / 10));
      const updatedUser = await User.findByIdAndUpdate(
        customerId,
        { $inc: { loyaltyPoints: pointsEarned } },
        { new: true }
      ).select('loyaltyPoints');
      if (updatedUser) customerLoyaltyPoints = updatedUser.loyaltyPoints;
    }
    
    // StockMovement kayıtlarını order ID ile güncelle
    const productIdsForStock = items
      .map(i => i.menuItemId || i.productId)
      .filter(id => productsMap[String(id)]);
    
    if (productIdsForStock.length > 0) {
      await StockMovement.updateMany(
        { 
          productId: { $in: productIdsForStock },
          reason: 'order',
          refId: null
        },
        { $set: { refId: order._id } }
      );
      
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
    if (pointsEarned > 0 && customerLoyaltyPoints != null) {
      orderJson.pointsEarned = pointsEarned;
      orderJson.customerLoyaltyPoints = customerLoyaltyPoints;
    }
    res.status(201).json(orderJson);
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
