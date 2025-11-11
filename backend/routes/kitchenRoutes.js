const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const OrderEvent = require('../models/OrderEvent');

/**
 * GET /api/kitchen/queue
 * Bekleyen sipariş kalemlerini listeler
 * Query: station (hot|cold|bar|dessert)
 */
router.get('/queue', authMiddleware, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const { station } = req.query;

    // Status'u SENT_TO_KITCHEN, IN_PREP veya READY olan order'ları bul
    // OrderItem'ları QUEUED, STARTED veya READY olanları filtrele
    const orders = await Order.find({
      status: { $in: ['SENT_TO_KITCHEN', 'IN_PREP', 'READY'] }
    }).populate('tableId', 'name capacity').populate('waiterId', 'name email');

    // OrderItem'ları filtrele
    const items = [];
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.status === 'QUEUED' || item.status === 'STARTED' || item.status === 'READY') {
          if (!station || item.station === station) {
            items.push({
              itemId: item._id,
              orderId: order._id,
              orderNumber: order._id.toString().substring(0, 8),
              tableNumber: order.tableNumber || (order.tableId ? order.tableId.name : 'N/A'),
              productName: item.name,
              qty: item.qty,
              note: item.note || '',
              station: item.station,
              status: item.status,
              createdAt: order.createdAt,
              orderCreatedAt: order.createdAt,
            });
          }
        }
      }
    }

    // Status ve createdAt'e göre sırala (QUEUED > STARTED > READY, sonra createdAt)
    items.sort((a, b) => {
      const statusOrder = { QUEUED: 0, STARTED: 1, READY: 2, SERVED: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.orderCreatedAt) - new Date(b.orderCreatedAt);
    });

    res.json({ items, total: items.length });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/kitchen/items/:itemId/start
 * Sipariş kalemini hazırlamaya başlar
 */
router.post('/items/:itemId/start', authMiddleware, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ 'orderItems._id': req.params.itemId });
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    const item = order.orderItems.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Sipariş kalemi bulunamadı' });

    if (item.status !== 'QUEUED') {
      return res.status(409).json({ message: `Kalem ${item.status} durumunda, başlatılamaz` });
    }

    const previousItemStatus = item.status;
    item.status = 'STARTED';
    order.markModified('orderItems');

    // Order status'unu IN_PREP yap (eğer CREATED veya SENT_TO_KITCHEN ise)
    const previousOrderStatus = order.status;
    if (order.status === 'CREATED' || order.status === 'SENT_TO_KITCHEN') {
      order.status = 'IN_PREP';
    }

    await order.save();

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: order._id,
      actorId: req.user.id,
      type: 'item_status_change',
      from: previousItemStatus,
      to: 'STARTED',
      metadata: { itemId: item._id, itemName: item.name },
    });

    if (previousOrderStatus !== order.status) {
      await OrderEvent.create({
        orderId: order._id,
        actorId: req.user.id,
        type: 'status_change',
        from: previousOrderStatus,
        to: 'IN_PREP',
      });
    }

    // Socket.io emit: item hazırlamaya başlandı
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      io.to(`kitchen.${branchId}.${item.station}`).emit('item:started', {
        itemId: item._id,
        orderId: order._id,
        station: item.station,
        order: order,
      });
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/kitchen/items/:itemId/ready
 * Sipariş kalemini hazır olarak işaretler
 */
router.post('/items/:itemId/ready', authMiddleware, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const order = await Order.findOne({ 'orderItems._id': req.params.itemId });
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    const item = order.orderItems.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Sipariş kalemi bulunamadı' });

    if (item.status !== 'STARTED') {
      return res.status(409).json({ message: `Kalem ${item.status} durumunda, hazır işaretlenemez` });
    }

    const previousItemStatus = item.status;
    item.status = 'READY';
    order.markModified('orderItems');

    // Tüm kalemler READY veya SERVED ise order status'u READY yap
    const allReadyOrServed = order.orderItems.every(i => i.status === 'READY' || i.status === 'SERVED');
    const previousOrderStatus = order.status;
    if (allReadyOrServed && order.status !== 'SERVED' && order.status !== 'PAID' && order.status !== 'CANCELED') {
      order.status = 'READY';
    }

    await order.save();

    // OrderEvent kaydı
    await OrderEvent.create({
      orderId: order._id,
      actorId: req.user.id,
      type: 'item_status_change',
      from: previousItemStatus,
      to: 'READY',
      metadata: { itemId: item._id, itemName: item.name },
    });

    if (allReadyOrServed && previousOrderStatus !== order.status) {
      await OrderEvent.create({
        orderId: order._id,
        actorId: req.user.id,
        type: 'status_change',
        from: previousOrderStatus,
        to: 'READY',
      });
    }

    // Socket.io emit: item hazır
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      // Mutfak ekranına bildir
      io.to(`kitchen.${branchId}.${item.station}`).emit('item:ready', {
        itemId: item._id,
        orderId: order._id,
        station: item.station,
        order: order,
      });
      // Garsona bildir
      if (order.waiterId) {
        io.to(`waiter.${order.waiterId}`).emit('item:ready', {
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

module.exports = router;

