const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Table = require('../models/Table');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { unpaidPaymentMatch } = require('../utils/orderQueries');
const { recordOrderPayment, normalizeStaffMethod, todayKey, startOfToday } = require('../utils/recordOrderPayment');
const requireStaffBranchMiddleware = require('../middleware/requireStaffBranch');
const { branchFilterForUser } = require('../utils/branchAccess');
const { emitToTables } = require('../utils/socketRooms');

router.use(auth, requireRole('kasa', 'admin', 'yetkili'));
router.use(requireStaffBranchMiddleware);

const PENDING_ORDER_STATUSES = [
  'serviste',
  'hazirlaniyor',
  'READY',
  'tamamlandi',
  'CREATED',
  'SENT_TO_KITCHEN',
  'IN_PREP',
];

function orderLineTotal(order) {
  const direct = Number(order.total ?? order.totalPrice ?? 0);
  if (direct > 0) return direct;
  const items = order.orderItems || order.items || [];
  return items.reduce((sum, line) => {
    const qty = Number(line.qty || 1);
    const price = Number(line.price ?? line.unitPrice ?? line.product?.price ?? 0);
    return sum + qty * price;
  }, 0);
}

/** Ödeme bekleyen sipariş sorgusu (masa bazlı) */
function pendingOrdersQuery(tableId, branchFilter) {
  return unpaidPaymentMatch({
    $or: [{ table: tableId }, { tableId }],
    status: { $in: PENDING_ORDER_STATUSES },
    ...branchFilter,
  });
}

async function buildCashierTableList(branchFilter) {
  const tables = await Table.find(branchFilter).sort({ name: 1 }).lean();

  return Promise.all(
    tables.map(async (table) => {
      const pendingOrders = await Order.find(pendingOrdersQuery(table._id, branchFilter)).lean();
      const hasPendingPayment = pendingOrders.length > 0;
      const totalAmount = pendingOrders.reduce((sum, o) => sum + orderLineTotal(o), 0);
      const prefersCashier = pendingOrders.some((o) => o.paymentMethod === 'cashier');

      return {
        ...table,
        orders: pendingOrders,
        orderCount: pendingOrders.length,
        totalAmount,
        hasPendingPayment,
        prefersCashier,
        paymentMethods: [...new Set(pendingOrders.map((o) => o.paymentMethod).filter(Boolean))],
      };
    })
  );
}

function sortCashierTables(list) {
  return [...list].sort((a, b) => {
    if (a.hasPendingPayment !== b.hasPendingPayment) {
      return a.hasPendingPayment ? -1 : 1;
    }
    if (a.prefersCashier !== b.prefersCashier) {
      return a.prefersCashier ? -1 : 1;
    }
    if ((b.totalAmount || 0) !== (a.totalAmount || 0)) {
      return (b.totalAmount || 0) - (a.totalAmount || 0);
    }
    return String(a.name || '').localeCompare(String(b.name || ''), 'tr', { numeric: true });
  });
}

/** Tüm masalar + ödeme bekleyen işareti */
router.get('/tables', async (req, res) => {
  try {
    const branchFilter = branchFilterForUser(req.user);
    const list = sortCashierTables(await buildCashierTableList(branchFilter));
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Masalar yüklenemedi', error: error.message });
  }
});

/** Geriye uyumluluk: yalnızca ödeme bekleyen masalar */
router.get('/pending', async (req, res) => {
  try {
    const branchFilter = branchFilterForUser(req.user);
    const list = sortCashierTables(await buildCashierTableList(branchFilter)).filter(
      (t) => t.hasPendingPayment
    );
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Masalar yüklenemedi', error: error.message });
  }
});

/**
 * Gün özeti — bugünkü Payment kayıtları + özet metrikler
 */
router.get('/summary', async (req, res) => {
  try {
    const branchFilter = branchFilterForUser(req.user);
    const since = startOfToday();
    const date = todayKey();

    const paymentQuery = {
      status: 'PAID',
      paidAt: { $gte: since },
      ...branchFilter,
    };

    const payments = await Payment.find(paymentQuery).lean();

    let cashTotal = 0;
    let cardTotal = 0;
    payments.forEach((p) => {
      const amt = Number(p.amount || 0);
      if (p.method === 'card') cardTotal += amt;
      else cashTotal += amt;
    });

    const allTables = await buildCashierTableList(branchFilter);

    let pendingTableCount = 0;
    let pendingOrderCount = 0;
    let pendingAmount = 0;

    for (const table of allTables) {
      if (table.hasPendingPayment) {
        pendingTableCount += 1;
        pendingOrderCount += table.orderCount || 0;
        pendingAmount += table.totalAmount || 0;
      }
    }

    res.json({
      date,
      paymentCount: payments.length,
      cashTotal,
      cardTotal,
      totalCollected: cashTotal + cardTotal,
      tableCount: allTables.length,
      pendingTableCount,
      pendingOrderCount,
      pendingAmount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Özet yüklenemedi', error: error.message });
  }
});

router.post('/checkout/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    const method = normalizeStaffMethod(req.body?.method);
    const branchFilter = branchFilterForUser(req.user);

    const table = await Table.findOne({ _id: tableId, ...branchFilter });
    if (!table) {
      return res.status(404).json({ message: 'Masa bulunamadı veya yetkiniz yok' });
    }

    const orders = await Order.find(pendingOrdersQuery(tableId, branchFilter));

    if (orders.length === 0) {
      return res.status(400).json({ message: 'Bu masada ödeme bekleyen sipariş yok' });
    }

    const io = req.app.get('io');
    const results = [];
    let totalAmount = 0;

    for (const order of orders) {
      const { payment, order: updated } = await recordOrderPayment({
        order,
        actorId: req.user.id,
        method,
        io,
        channel: 'cashier_checkout',
      });
      results.push({ orderId: updated._id, paymentId: payment._id, amount: payment.amount });
      totalAmount += payment.amount;
    }

    await Table.findByIdAndUpdate(tableId, { status: 'bos' });

    if (io) {
      emitToTables(io, table.branchId || req.user.branchId, 'table:status:changed', {
        tableId,
        status: 'bos',
        table: { ...table.toObject(), status: 'bos' },
      });
    }

    res.json({
      message: 'Ödeme alındı, masa boşaltıldı',
      method,
      paidCount: results.length,
      totalAmount,
      payments: results,
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Ödeme işlemi başarısız',
    });
  }
});

module.exports = router;
