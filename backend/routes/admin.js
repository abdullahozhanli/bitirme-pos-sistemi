/**
 * @deprecated Mount kaldırıldı (güvenlik). Kullanın: routes/adminRoutes.js
 */
const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const User = require('../models/User');
const Table = require('../models/Table');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

router.use(auth, requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  const totalRevenueAgg = await Order.aggregate([
    { $match: { status: 'tamamlandi' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  const totalRevenue = totalRevenueAgg[0]?.total || 0;

  const activeTables = await Table.countDocuments({
    status: { $in: ['dolu', 'odeme_bekliyor'] }
  });

  const openOrders = await Order.countDocuments({
    status: { $in: ['hazirlaniyor', 'serviste'] }
  });

  res.json({ totalRevenue, activeTables, openOrders });
});

router.get('/users', async (req, res) => {
  const users = await User.find().select('-passwordHash').lean();
  res.json(users);
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  const allowed = ['admin', 'yetkili', 'garson', 'mutfak', 'kasa', 'musteri'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ message: 'Geçersiz rol' });
  }
  const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-passwordHash');
  res.json(updated);
});

router.post('/menu', async (req, res) => {
  const item = await MenuItem.create(req.body);
  res.status(201).json(item);
});

router.get('/menu', async (req, res) => {
  const list = await MenuItem.find().lean();
  res.json(list);
});

router.patch('/menu/:id', async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

module.exports = router;

