const Payment = require('../models/Payment');
const OrderEvent = require('../models/OrderEvent');
const DailyAggregate = require('../models/DailyAggregate');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { applyPaidToOrder, isOrderPaid } = require('./orderPayment');
const { unpaidPaymentMatch, openOrderMatch, tableOrderScope } = require('./orderQueries');
const { emitCustomerOrderUpdate } = require('./customerOrderNotify');
const { emitToTables } = require('./socketRooms');

function normalizeStaffMethod(method) {
  return method === 'card' ? 'card' : 'cash';
}

function todayKey(d = new Date()) {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Tek sipariş tahsilatı: Payment + OrderEvent + DailyAggregate + socket.
 * @param {{ order: import('mongoose').Document, actorId: string, method?: string, amount?: number, io?: object, channel?: string }} params
 */
async function recordOrderPayment({ order, actorId, method, amount, io, channel = 'staff' }) {
  if (!order) {
    const err = new Error('Sipariş bulunamadı');
    err.status = 404;
    throw err;
  }

  if (isOrderPaid(order)) {
    const err = new Error('Sipariş zaten ödendi');
    err.status = 409;
    throw err;
  }

  if (order.status === 'CANCELED' || order.status === 'iptal') {
    const err = new Error('İptal edilmiş sipariş ödenemez');
    err.status = 409;
    throw err;
  }

  const payMethod = normalizeStaffMethod(method);
  const payAmount = Number(amount ?? order.total ?? order.totalPrice ?? 0);
  const previousStatus = order.status;

  const payment = await Payment.create({
    orderId: order._id,
    method: payMethod,
    amount: payAmount,
    status: 'PAID',
    paidAt: new Date(),
    branchId: order.branchId || undefined,
  });

  applyPaidToOrder(order, { method: payMethod });
  await order.save();

  await OrderEvent.create({
    orderId: order._id,
    actorId,
    type: 'payment',
    from: previousStatus,
    to: 'ödendi',
    metadata: {
      paymentId: payment._id,
      method: payMethod,
      amount: payAmount,
      channel,
    },
  });

  const date = todayKey();
  const aggFilter = { date };
  if (order.branchId) aggFilter.branchId = order.branchId;

  await DailyAggregate.findOneAndUpdate(
    aggFilter,
    {
      $inc: { revenue: payAmount, orders: 1 },
      $set: { updatedAt: new Date() },
    },
    { upsert: true }
  );

  if (io) {
    const branchId = order.branchId || 'default';
    io.to(`admin.metrics.${branchId}`).emit('metrics:updated', {
      date,
      revenue: payAmount,
      orders: 1,
    });

    emitCustomerOrderUpdate(io, order);

    const tableId =
      order.table?._id || order.table || order.tableId?._id || order.tableId;

    if (tableId) {
      const unpaidCount = await Order.countDocuments(
        openOrderMatch(tableOrderScope(tableId))
      );

      if (unpaidCount === 0) {
        const table = await Table.findByIdAndUpdate(tableId, { status: 'bos' }, { new: true });
        if (table) {
          emitToTables(io, order.branchId, 'table:status:changed', {
            tableId: table._id,
            status: 'bos',
            table: table.toObject(),
          });
        }
      }

      emitToTables(io, order.branchId, 'table:payment:completed', {
        tableId,
        orderId: order._id,
        amount: payAmount,
        method: payMethod,
      });

      io.to(`kitchen.${branchId}`).emit('order:status:changed', {
        orderId: order._id,
        from: previousStatus,
        to: 'ödendi',
        order: order.toObject ? order.toObject() : order,
      });
    }
  }

  return { payment, order };
}

module.exports = {
  recordOrderPayment,
  normalizeStaffMethod,
  todayKey,
  startOfToday,
};
