const mongoose = require('mongoose');
const Order = require('../models/Order');
const Table = require('../models/Table');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const OrderEvent = require('../models/OrderEvent');
const {
  CANCEL_ORDER_STATUS,
  PAYMENT_STATUS,
  isOrderPaid,
} = require('./orderPayment');
const { emitCustomerOrderUpdate } = require('./customerOrderNotify');

const EARLY_FULFILLMENT_STATUSES = new Set([
  'hazirlaniyor',
  'CREATED',
  'SENT_TO_KITCHEN',
  'pending',
]);

const PREP_ITEM_STATUSES = new Set(['STARTED', 'IN_PREP']);

function canCancelOrder(order) {
  if (!order) return { ok: false, message: 'Sipariş bulunamadı' };

  const status = String(order.status || '');
  if (status === CANCEL_ORDER_STATUS || status === 'CANCELED' || status === 'iptal') {
    return { ok: false, message: 'Sipariş zaten iptal edilmiş' };
  }

  if (!EARLY_FULFILLMENT_STATUSES.has(status)) {
    return {
      ok: false,
      message: 'Sipariş mutfağa iletildi veya hazırlanıyor; iptal edilemez',
    };
  }

  const lines = [...(order.orderItems || []), ...(order.items || [])];
  for (const line of lines) {
    if (line?.status && PREP_ITEM_STATUSES.has(String(line.status))) {
      return { ok: false, message: 'Hazırlık başladığı için sipariş iptal edilemez' };
    }
  }

  return { ok: true };
}

async function restoreStockForOrder(order, session) {
  const productIds = (order.items || [])
    .map((line) => line.menuItem || line.product)
    .filter(Boolean);
  if (!productIds.length) return;

  const products = await Product.find({
    _id: { $in: productIds },
  }).session(session);

  for (const line of order.items || []) {
    const pid = line.menuItem || line.product;
    if (!pid) continue;
    const product = products.find((p) => String(p._id) === String(pid));
    if (!product) continue;
    const qty = Number(line.qty) || 1;
    await Product.updateOne({ _id: product._id }, { $inc: { countInStock: qty } }).session(
      session
    );
    await StockMovement.create(
      [
        {
          productId: product._id,
          delta: qty,
          reason: 'order_cancel',
          refId: order._id,
          actorId: null,
        },
      ],
      { session }
    );
  }
}

async function freeTableIfNoActiveOrders(tableId, io) {
  if (!tableId) return;
  const activeCount = await Order.countDocuments({
    table: tableId,
    status: { $nin: [CANCEL_ORDER_STATUS, 'CANCELED', 'iptal', 'ödendi', 'PAID'] },
    paymentStatus: { $nin: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] },
    paidAt: { $in: [null, undefined] },
  });

  if (activeCount > 0) return;

  const table = await Table.findByIdAndUpdate(tableId, { status: 'bos' }, { new: true });
  if (table && io) {
    io.to('tables').emit('table:status:changed', {
      tableId: table._id,
      status: table.status,
      table: table.toObject(),
    });
  }
}

/**
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.actorId
 * @param {string} [params.reason]
 * @param {object} [params.io]
 * @param {object} [params.branchFilter] mongoose filter for branch scope
 */
async function cancelOrder({ orderId, actorId, reason, io, branchFilter = {} }) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const err = new Error('Geçersiz sipariş id');
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findOne({ _id: orderId, ...branchFilter });
  if (!order) {
    const err = new Error('Sipariş bulunamadı');
    err.statusCode = 404;
    throw err;
  }

  const gate = canCancelOrder(order);
  if (!gate.ok) {
    const err = new Error(gate.message);
    err.statusCode = 409;
    throw err;
  }

  const wasPaid = isOrderPaid(order);
  const previousStatus = order.status;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await restoreStockForOrder(order, session);

      order.status = CANCEL_ORDER_STATUS;
      order.cancelReason = reason || '';
      if (wasPaid && order.paymentMethod === 'online') {
        order.paymentStatus = PAYMENT_STATUS.REFUNDED;
      } else if (wasPaid) {
        order.paymentStatus = PAYMENT_STATUS.REFUNDED;
        order.paidAt = undefined;
      } else {
        order.paymentStatus = PAYMENT_STATUS.UNPAID;
      }
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }

  await OrderEvent.create({
    orderId: order._id,
    actorId,
    type: 'cancel',
    from: previousStatus,
    to: CANCEL_ORDER_STATUS,
    metadata: { reason: reason || '', wasPaid },
  });

  const tableId = order.table?._id || order.table;
  if (io) {
    if (tableId) {
      io.to('tables').emit('table:order:canceled', {
        tableId,
        order: order.toObject(),
      });
    }
    await freeTableIfNoActiveOrders(tableId, io);
    emitCustomerOrderUpdate(io, order);
  }

  return order;
}

module.exports = {
  canCancelOrder,
  cancelOrder,
  EARLY_FULFILLMENT_STATUSES,
};
