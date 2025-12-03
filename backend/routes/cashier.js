const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Table = require('../models/Table');
const Order = require('../models/Order');

router.use(auth, requireRole('kasa', 'admin', 'yetkili'));

router.get('/pending', async (req, res) => {
  const tables = await Table.find({ status: 'odeme_bekliyor' }).lean();
  res.json(tables);
});

router.post('/checkout/:tableId', async (req, res) => {
  const { tableId } = req.params;
  const orders = await Order.find({ 
    $or: [{ tableId: tableId }, { table: tableId }], 
    status: { $in: ['serviste', 'hazirlaniyor'] } 
  });
  for (const o of orders) {
    o.status = 'tamamlandi';
    await o.save();
  }
  await Table.findByIdAndUpdate(tableId, { status: 'bos' });
  res.json({ message: 'Ödeme alındı, masa boşaltıldı' });
});

module.exports = router;

