const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Table = require('../models/Table');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

router.use(auth, requireRole('garson', 'admin', 'yetkili'));

router.get('/tables', async (req, res) => {
  const tables = await Table.find().lean();
  res.json(tables);
});

router.post('/orders', async (req, res) => {
  try {
    const { tableId, items } = req.body;
    if (!tableId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Eksik veri' });
    }

    const menuItems = await MenuItem.find({ _id: { $in: items.map(i => i.menuItemId) } }).lean();
    const orderItems = items.map(i => {
      const mi = menuItems.find(m => m._id.toString() === i.menuItemId);
      if (!mi) return null;
      return {
        menuItem: mi._id,
        name: mi.name,
        qty: i.qty,
        price: mi.price,
        note: i.note || ''
      };
    }).filter(Boolean);

    const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    const order = await Order.create({
      tableId: tableId,
      table: tableId, // Geriye uyumluluk için
      waiterId: req.user.id,
      waiter: req.user.id, // Geriye uyumluluk için
      orderItems: orderItems.map(item => ({
        product: item.menuItem, // menuItem → product mapping
        name: item.name,
        qty: item.qty,
        price: item.price,
        note: item.note || '',
        station: 'hot',
        status: 'QUEUED'
      })),
      items: orderItems, // Geriye uyumluluk için
      totalPrice: total,
      total: total // Geriye uyumluluk için
    });

    await Table.findByIdAndUpdate(tableId, { status: 'dolu' });

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sipariş oluşturulamadı' });
  }
});

router.patch('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz status' });
    }
    const updated = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sipariş güncellenemedi' });
  }
});

module.exports = router;

