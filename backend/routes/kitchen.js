const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');

router.use(auth, requireRole('mutfak', 'admin', 'yetkili'));

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ['hazirlaniyor', 'serviste'] }
    })
      .populate('table', 'name capacity')
      .populate('items.menuItem', 'name price category')
      .sort({ createdAt: 1 })
      .lean();
    res.json(orders);
  } catch (e) {
    console.error('Mutfak siparişleri çekilirken hata:', e);
    res.status(500).json({ message: 'Siparişler yüklenemedi' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Geçersiz status' });
  }
  const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(updated);
});

module.exports = router;

