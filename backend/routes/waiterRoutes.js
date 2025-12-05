const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Table = require('../models/Table');
const OrderEvent = require('../models/OrderEvent');
const StockMovement = require('../models/StockMovement');

/**
 * GET /api/waiter/tables
 * Tüm masaları listele (garson)
 */
router.get('/tables', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const tables = await Table.find().sort({ name: 1 }).lean();
    
    // Her masa için aktif siparişleri kontrol et ve durumları güncelle
    const updatedTables = await Promise.all(
      tables.map(async (table) => {
        // Aktif siparişleri kontrol et (hem table hem tableId field'larını kontrol et)
        const activeOrders = await Order.find({
          $or: [
            { table: table._id },
            { tableId: table._id }
          ],
          status: { $nin: ['tamamlandi', 'PAID', 'SERVED', 'CANCELED', 'iptal'] }
        }).lean();
        
        const orderCount = activeOrders.length;
        
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
          status: correctStatus
        };
      })
    );
    
    res.json(updatedTables);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/waiter/orders
 * Siparişleri listele (garson)
 * Query: tableId?, status?, limit?, page?
 */
router.get('/orders', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const { tableId, status, limit = 100, page = 1 } = req.query;
    const filter = {};
    
    if (tableId) {
      filter.table = tableId;
    }
    if (status) {
      // READY status'ü sorgulandığında, hem READY hem de tamamlandi status'ündeki siparişleri döndür
      // (mutfak ekranından tamamlanan siparişler tamamlandi durumunda)
      if (status === 'READY') {
        filter.status = { $in: ['READY', 'tamamlandi'] };
      } else {
        filter.status = status;
      }
    } else {
      // Status filtresi yoksa, tamamlanmış siparişleri hariç tut (PAID, SERVED, CANCELED hariç)
      // Ancak tamamlandi status'ündeki siparişleri dahil et (garson servis edebilir)
      filter.status = { $nin: ['PAID', 'SERVED', 'CANCELED'] };
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate('table', 'name capacity status')
        .populate('tableId', 'name capacity status')
        .populate('waiter', 'name email')
        .populate('waiterId', 'name email')
        .populate('items.menuItem', 'name price category')
        .populate('orderItems.product', 'name price category station')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
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
 * GET /api/waiter/orders/ready
 * Hazır siparişleri listele (garson)
 */
router.get('/orders/ready', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const orders = await Order.find({
      status: { $in: ['READY', 'Hazır', 'hazir'] }
    })
      .populate('table', 'name capacity')
      .populate('waiter', 'name email')
      .populate('items.menuItem', 'name price')
      .sort({ createdAt: 1 })
      .lean();
    
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/waiter/orders
 * Garson sipariş oluşturur
 * Body: { tableId?, tableNumber?, items: [{ productId, qty, note? }], notes? }
 */
router.post('/orders', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { tableId, tableNumber, items, notes } = req.body;
    const waiterId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Sepet boş' });
    }

    if (!tableId && !tableNumber) {
      return res.status(400).json({ message: 'Masa ID veya masa numarası zorunlu' });
    }

    // Eğer sadece tableNumber varsa, tableId'yi bul
    let finalTableId = tableId;
    if (!finalTableId && tableNumber) {
      const table = await Table.findOne({ name: String(tableNumber) });
      if (table) {
        finalTableId = table._id;
      } else {
        // Eğer tableNumber ile bulunamazsa, tableNumber'ı ID olarak kullanmayı dene
        try {
          if (mongoose.Types.ObjectId.isValid(tableNumber)) {
            const tableById = await Table.findById(tableNumber);
            if (tableById) {
              finalTableId = tableById._id;
            }
          }
        } catch (e) {
          // ID değilse devam et
        }
      }
    }

    // finalTableId hala yoksa ve tableNumber varsa, yeni masa oluştur veya hata ver
    if (!finalTableId) {
      if (tableNumber) {
        // TableNumber'dan table oluşturmayı dene (eğer sistem buna izin veriyorsa)
        // Ya da hata döndür
        return res.status(400).json({ message: `Masa bulunamadı: ${tableNumber}. Lütfen geçerli bir masa seçin.` });
      }
      return res.status(400).json({ message: 'Masa ID veya masa numarası zorunlu' });
    }

    let created;
    await session.withTransaction(async () => {
      // Ürünleri çek
      const productIds = items.map(i => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(session);
      const byId = Object.fromEntries(products.map(p => [String(p._id), p]));

      // OrderItems oluştur
      const orderItems = [];
      for (const item of items) {
        const product = byId[String(item.productId)];
        if (!product) {
          throw Object.assign(new Error(`Ürün bulunamadı: ${item.productId}`), { statusCode: 404 });
        }
        if (product.countInStock < item.qty) {
          throw Object.assign(new Error(`Yetersiz stok: ${product.name}`), { statusCode: 400 });
        }

        // Stok düş
        const updateResult = await Product.updateOne(
          { _id: product._id, countInStock: { $gte: item.qty } },
          { $inc: { countInStock: -item.qty } }
        ).session(session);

        if (updateResult.modifiedCount === 0) {
          throw Object.assign(new Error(`Yetersiz stok: ${product.name}`), { statusCode: 400 });
        }

        // StockMovement kaydı
        await StockMovement.create([{
          productId: product._id,
          delta: -item.qty,
          reason: 'order',
          refId: null, // Order ID henüz yok, sonra güncellenecek
          actorId: waiterId,
        }], { session });

        orderItems.push({
          name: product.name,
          qty: item.qty,
          price: product.price,
          product: product._id,
          note: item.note || '',
          station: product.station,
          status: 'QUEUED',
        });
      }

      // Toplam hesapla
      const totalPrice = orderItems.reduce((sum, item) => {
        const itemTotal = (item.qty || 0) * (item.price || 0);
        return sum + itemTotal;
      }, 0);
      
      // Toplam 0'dan büyük olmalı
      if (totalPrice <= 0) {
        throw Object.assign(new Error('Sipariş toplamı 0 olamaz'), { statusCode: 400 });
      }

      // Debug: Oluşturulacak order'ı logla
      console.log('🔍 [DEBUG] Order oluşturuluyor:', {
        finalTableId: finalTableId ? String(finalTableId) : 'NULL',
        totalPrice,
        orderItemsCount: orderItems.length,
        waiterId: waiterId ? String(waiterId) : 'NULL'
      });

      // Order oluştur - Garson siparişleri direkt mutfağa gönderilir
      const orderData = {
        orderItems,
        table: finalTableId, // Eski model için required field
        tableId: finalTableId, // Yeni model için
        tableNumber: tableNumber || null,
        waiterId,
        notes: notes || '',
        total: totalPrice, // Eski model için required field
        totalPrice: totalPrice, // Yeni model için
        status: 'SENT_TO_KITCHEN', // Garson siparişleri direkt mutfağa gönderilir
      };
      
      console.log('🔍 [DEBUG] Order data:', {
        hasTable: !!orderData.table,
        hasTotal: orderData.total !== undefined && orderData.total !== null,
        totalValue: orderData.total,
        tableValue: orderData.table ? String(orderData.table) : 'NULL'
      });

      [created] = await Order.create([orderData], { session });

      // StockMovement'lara orderId ekle
      await StockMovement.updateMany(
        { refId: null, actorId: waiterId, reason: 'order' },
        { $set: { refId: created._id } }
      ).session(session);

      // OrderEvent kaydı
      await OrderEvent.create([{
        orderId: created._id,
        actorId: waiterId,
        type: 'status_change',
        from: null,
        to: 'SENT_TO_KITCHEN',
        metadata: { itemsCount: orderItems.length },
      }], { session });
    });

    const populated = await Order.findById(created._id)
      .populate('orderItems.product', 'name price station')
      .populate('waiterId', 'name email')
      .populate('tableId', 'name capacity');

    // Socket.io emit: yeni sipariş oluşturuldu
    const io = req.app.get('io');
    // Debug log'ları kaldırıldı
    if (io) {
      const branchId = created.branchId || 'default';
      
      // Global order:created event'i
      io.emit('order:created', populated);
      console.log(`📡 [BACKEND] order:created event'i gönderildi (global)`);
      
      // Mutfağa bildir (garson siparişi için)
      // table:order:created event'ini mutfak room'una gönder
      const kitchenRoom = `kitchen.${branchId}`;
      const roomSize = io.sockets.adapter.rooms.get(kitchenRoom)?.size || 0;
      io.to(kitchenRoom).emit('table:order:created', {
        tableId: populated.tableId?._id || populated.tableId,
        order: populated.toObject(),
        table: populated.tableId,
      });
      console.log(`📡 [BACKEND] table:order:created event'i gönderildi: ${kitchenRoom} (${roomSize} client dinliyor)`);
      
      // Her item için item:queued event'i gönder (garson siparişleri direkt mutfağa gidebilir)
      if (populated.orderItems && populated.orderItems.length > 0) {
        const tableId = populated.tableId?._id || populated.tableId;
        const tableNumber = populated.tableId?.name || populated.tableNumber || 'N/A';
        
        for (const item of populated.orderItems) {
          const itemData = {
            itemId: String(item._id),
            orderId: String(created._id),
            orderNumber: String(created._id).substring(0, 8),
            station: item.station || 'hot',
            productName: item.name || 'Ürün Adı Yok',
            qty: Number(item.qty) || 1,
            note: String(item.note || ''),
            status: item.status || 'QUEUED',
            order: populated.toObject(),
            table: populated.tableId?.toObject ? populated.tableId.toObject() : populated.tableId,
            tableId: tableId,
            tableNumber: tableNumber,
            orderSource: 'garson',
            waiterName: populated.waiterId?.name || populated.waiterId?.email || '',
            orderNote: populated.notes || '',
            createdAt: item.createdAt || created.createdAt || new Date(),
            orderCreatedAt: created.createdAt || new Date(),
          };
          // Spesifik istasyona gönder
          const station = item.station || 'hot';
          const stationRoom = `kitchen.${branchId}.${station}`;
          const generalRoom = `kitchen.${branchId}`;
          const stationRoomSize = io.sockets.adapter.rooms.get(stationRoom)?.size || 0;
          const generalRoomSize = io.sockets.adapter.rooms.get(generalRoom)?.size || 0;
          
          io.to(stationRoom).emit('item:queued', itemData);
          io.to(generalRoom).emit('item:queued', itemData);
          console.log(`📡 [BACKEND] item:queued gönderildi: ${item._id} (${station}) -> ${stationRoom} (${stationRoomSize} client) ve ${generalRoom} (${generalRoomSize} client)`);
        }
        console.log(`📡 [BACKEND] ${populated.orderItems.length} adet item:queued event'i gönderildi: kitchen.${branchId}`);
        // Debug log'ları kaldırıldı
      } else {
        console.warn(`⚠️ [BACKEND] Garson siparişinde orderItems yok:`, created);
      }
      
      // Masa ile ilgili event'ler
      const tableId = populated.tableId?._id || populated.tableId;
      if (tableId) {
        // Masa durumunu güncelle (bos -> dolu)
        const Table = require('../models/Table');
        const table = await Table.findById(tableId);
        if (table && table.status === 'bos') {
          table.status = 'dolu';
          await table.save();
          
          io.to('tables').emit('table:status:changed', {
            tableId: table._id,
            status: table.status,
            table: table.toObject(),
          });
        }
        
        // Masa sipariş event'i
        io.to('tables').emit('table:order:created', {
          tableId: tableId,
          order: populated.toObject(),
        });
      }
    } else {
      console.warn('⚠️ Socket.io mevcut değil, event gönderilemedi');
    }

    res.status(201).json(populated);
  } catch (e) {
    console.error('❌ Garson siparişi oluşturulurken hata:', e);
    console.error('Hata detayları:', {
      message: e.message,
      stack: e.stack,
      statusCode: e.statusCode,
      tableId,
      tableNumber,
      itemsCount: items?.length
    });
    // Session'ı kapat
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    // Hata mesajını döndür
    const statusCode = e.statusCode || 500;
    const message = e.message || 'Sipariş oluşturulamadı';
    res.status(statusCode).json({ message });
  }
});

/**
 * POST /api/waiter/orders/:id/send
 * Siparişi mutfağa gönderir
 */
router.post('/orders/:id/send', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    if (order.status !== 'CREATED') {
      return res.status(409).json({ message: `Sipariş zaten ${order.status} durumunda` });
    }

    const previousStatus = order.status;
    order.status = 'SENT_TO_KITCHEN';
    order.orderItems.forEach(item => {
      if (item.status === 'QUEUED') {
        item.status = 'QUEUED'; // Mutfağa gönderildi, hala QUEUED
      }
    });
    order.markModified('orderItems');
    await order.save();

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: order._id,
      actorId: req.user.id,
      type: 'status_change',
      from: previousStatus,
      to: 'SENT_TO_KITCHEN',
    });

    // Socket.io emit: mutfağa gönderildi
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      // Debug log'ları kaldırıldı
      
      // table:order:created event'ini de gönder
      const kitchenRoom = `kitchen.${branchId}`;
      const roomSize = io.sockets.adapter.rooms.get(kitchenRoom)?.size || 0;
      io.to(kitchenRoom).emit('table:order:created', {
        tableId: order.tableId?._id || order.tableId,
        order: order.toObject(),
      });
      console.log(`📡 [BACKEND] table:order:created event'i gönderildi (/send): ${kitchenRoom} (${roomSize} client dinliyor)`);
      
      const tableId = order.tableId?._id || order.tableId || order.table?._id || order.table;
      const tableNumber = order.tableId?.name || order.table?.name || order.tableNumber || 'N/A';
      
      for (const item of order.orderItems) {
        const itemData = {
          itemId: String(item._id),
          orderId: String(order._id),
          orderNumber: String(order._id).substring(0, 8),
          station: item.station || 'hot',
          productName: item.name || 'Ürün Adı Yok',
          qty: Number(item.qty) || 1,
          note: String(item.note || ''),
          status: item.status || 'QUEUED',
          order: order.toObject(),
          table: order.tableId?.toObject ? order.tableId.toObject() : (order.table?.toObject ? order.table.toObject() : order.table),
          tableId: tableId,
          tableNumber: tableNumber,
          orderSource: 'garson',
          waiterName: order.waiterId?.name || order.waiter?.name || '',
          orderNote: order.notes || '',
          createdAt: item.createdAt || order.createdAt || new Date(),
          orderCreatedAt: order.createdAt || new Date(),
        };
        // Spesifik istasyona gönder
        const station = item.station || 'hot';
        const stationRoom = `kitchen.${branchId}.${station}`;
        const generalRoom = `kitchen.${branchId}`;
        const stationRoomSize = io.sockets.adapter.rooms.get(stationRoom)?.size || 0;
        const generalRoomSize = io.sockets.adapter.rooms.get(generalRoom)?.size || 0;
        
        io.to(stationRoom).emit('item:queued', itemData);
        io.to(generalRoom).emit('item:queued', itemData);
        console.log(`📡 [BACKEND] item:queued gönderildi (/send): ${item._id} (${station}) -> ${stationRoom} (${stationRoomSize} client) ve ${generalRoom} (${generalRoomSize} client)`);
      }
      console.log(`📡 [BACKEND] ${order.orderItems.length} adet item:queued event'i gönderildi: kitchen.${branchId}`);
    } else {
      console.warn('⚠️ Socket.io mevcut değil, event gönderilemedi');
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/waiter/items/:itemId/served
 * Sipariş kalemini servis edildi olarak işaretler
 */
router.post('/items/:itemId/served', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ 'orderItems._id': req.params.itemId });
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    const item = order.orderItems.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Sipariş kalemi bulunamadı' });

    if (item.status !== 'READY') {
      return res.status(409).json({ message: `Kalem ${item.status} durumunda, servis edilemez` });
    }

    const previousItemStatus = item.status;
    item.status = 'SERVED';
    order.markModified('orderItems');

    // Tüm kalemler SERVED ise order status'u SERVED yap
    const allServed = order.orderItems.every(i => i.status === 'SERVED');
    const previousOrderStatus = order.status;
    if (allServed && order.status !== 'PAID' && order.status !== 'CANCELED') {
      order.status = 'SERVED';
    }

    await order.save();

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: order._id,
      actorId: req.user.id,
      type: 'item_status_change',
      from: previousItemStatus,
      to: 'SERVED',
      metadata: { itemId: item._id, itemName: item.name },
    });

    if (allServed && previousOrderStatus !== order.status) {
      await OrderEvent.create({
        orderId: order._id,
        actorId: req.user.id,
        type: 'status_change',
        from: previousOrderStatus,
        to: 'SERVED',
      });
    }

    // Socket.io emit: item servis edildi
    const io = req.app.get('io');
    if (io) {
      io.to(`waiter.${order.waiterId}`).emit('item:served', {
        itemId: item._id,
        orderId: order._id,
        order: order,
      });
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/payments
 * Ödeme kaydı oluşturur ve order'ı PAID yapar
 */
router.post('/payments', auth, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const { orderId, method, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    if (order.status === 'PAID') {
      return res.status(409).json({ message: 'Sipariş zaten ödendi' });
    }

    if (order.status === 'CANCELED') {
      return res.status(409).json({ message: 'İptal edilmiş sipariş ödenemez' });
    }

    // Payment oluştur
    const payment = await Payment.create({
      orderId,
      method,
      amount: amount || order.totalPrice,
      status: 'PAID',
      paidAt: new Date(),
    });

    // Order'ı PAID yap
    const previousStatus = order.status;
    order.status = 'PAID';
    order.paidAt = new Date();
    await order.save();

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: order._id,
      actorId: req.user.id,
      type: 'payment',
      from: previousStatus,
      to: 'PAID',
      metadata: { paymentId: payment._id, method, amount: payment.amount },
    });

    // DailyAggregate güncelle
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const DailyAggregate = require('../models/DailyAggregate');
    await DailyAggregate.findOneAndUpdate(
      { date },
      { 
        $inc: { revenue: order.totalPrice, orders: 1 },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    );

    // Socket.io emit: ödeme yapıldı, metrikler güncellendi
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      io.to(`admin.metrics.${branchId}`).emit('metrics:updated', {
        date,
        revenue: order.totalPrice,
        orders: 1,
      });
      
      // Masa ile ilgili event'ler
      const tableId = order.tableId?._id || order.tableId || order.table?._id || order.table;
      if (tableId) {
        // Masa durumunu kontrol et - aktif sipariş var mı?
        const Table = require('../models/Table');
        const activeOrders = await Order.countDocuments({
          table: tableId,
          status: { $in: ['hazirlaniyor', 'serviste', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'] }
        });
        
        const table = await Table.findById(tableId);
        if (table) {
          // Aktif sipariş yoksa masayı müsait yap
          if (activeOrders === 0 && table.status !== 'bos') {
            table.status = 'bos';
            await table.save();
            
            io.to('tables').emit('table:status:changed', {
              tableId: table._id,
              from: table.status,
              to: 'bos',
              table: table.toObject()
            });
          }
          
          // Ödeme yapıldı event'i
          io.to('tables').emit('table:payment:completed', {
            tableId: table._id,
            orderId: order._id,
            amount: payment.amount,
            table: table.toObject()
          });
          
          // Masa güncellendi
          io.to('tables').emit('table:updated', {
            type: 'payment_completed',
            table: table.toObject()
          });
        }
      }
    }

    res.status(201).json(payment);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

