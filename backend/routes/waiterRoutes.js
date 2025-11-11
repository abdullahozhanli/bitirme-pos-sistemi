const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Table = require('../models/Table');
const OrderEvent = require('../models/OrderEvent');
const StockMovement = require('../models/StockMovement');

/**
 * POST /api/waiter/orders
 * Garson sipariş oluşturur
 * Body: { tableId?, tableNumber?, items: [{ productId, qty, note? }], notes? }
 */
router.post('/orders', authMiddleware, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
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
      const totalPrice = orderItems.reduce((sum, item) => sum + item.qty * item.price, 0);

      // Order oluştur
      [created] = await Order.create([{
        orderItems,
        tableId: tableId || null,
        tableNumber: tableNumber || null,
        waiterId,
        notes: notes || '',
        totalPrice,
        status: 'CREATED',
      }], { session });

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
        to: 'CREATED',
        metadata: { itemsCount: orderItems.length },
      }], { session });
    });

    const populated = await Order.findById(created._id)
      .populate('orderItems.product', 'name price station')
      .populate('waiterId', 'name email')
      .populate('tableId', 'name capacity');

    // Socket.io emit: yeni sipariş oluşturuldu
    const io = req.app.get('io');
    if (io) {
      io.emit('order:created', populated);
    }

    res.status(201).json(populated);
  } catch (e) {
    next(e);
  } finally {
    session.endSession();
  }
});

/**
 * POST /api/waiter/orders/:id/send
 * Siparişi mutfağa gönderir
 */
router.post('/orders/:id/send', authMiddleware, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
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
      for (const item of order.orderItems) {
        io.to(`kitchen.${branchId}.${item.station}`).emit('item:queued', {
          itemId: item._id,
          orderId: order._id,
          station: item.station,
          order: order,
        });
      }
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
router.post('/items/:itemId/served', authMiddleware, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
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
router.post('/payments', authMiddleware, requireRole('garson', 'admin', 'yetkili'), async (req, res, next) => {
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
    }

    res.status(201).json(payment);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

