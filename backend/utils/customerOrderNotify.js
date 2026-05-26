const { isOrderPaid } = require('./orderPayment');

/**
 * Müşteri sipariş durumu Socket.io bildirimi
 */
function emitCustomerOrderUpdate(io, order) {
  if (!io || !order) return;
  const customerId = order.customer?._id || order.customer;
  if (!customerId) return;

  const payload = {
    orderId: String(order._id),
    status: order.status,
    paymentStatus: order.paymentStatus || null,
    paymentMethod: order.paymentMethod || null,
    isPaid: isOrderPaid(order),
    paidAt: order.paidAt || null,
    updatedAt: order.updatedAt || new Date(),
  };

  io.to(`customer.${customerId}`).emit('order:status:updated', payload);
}

module.exports = { emitCustomerOrderUpdate };
