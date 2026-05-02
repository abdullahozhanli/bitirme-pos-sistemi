const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');

router.use(auth, requireRole('mutfak', 'admin', 'yetkili'));

router.get('/orders', async (req, res) => {
  try {
    // BranchId filtresi: Süper admin değilse sadece kendi şubesini göster
    const branchFilter = {};
    if (req.user && req.user.role !== 'superadmin' && req.user.branchId) {
      branchFilter.branchId = req.user.branchId;
    }
    
    // Tüm aktif siparişleri getir (yeni, hazırlanıyor, hazır)
    // Garson siparişleri de dahil (waiterId veya waiter field'ı olanlar)
    const orders = await Order.find({
      status: { 
        $in: [
          'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', // Yeni status'lar
          'hazirlaniyor', 'serviste', // Eski status'lar
          'tamamlandi', 'PAID', 'SERVED' // Tamamlanan siparişler (istatistik için)
        ] 
      },
      ...branchFilter
    })
      .populate('table', 'name capacity')
      .populate('tableId', 'name capacity')
      .populate('waiter', 'name email')
      .populate('waiterId', 'name email')
      .populate('items.menuItem', 'name price category')
      .populate('orderItems.product', 'name price category station')
      .sort({ createdAt: 1 });
    
    // Mongoose document'lerini plain object'lere dönüştür
    // .lean() kullanmak yerine manuel serialize ederek item status'larını doğru yükle
    const serializedOrders = orders.map(order => {
      // Önce Mongoose subdocument'lerinden status field'larını al (toObject'dan önce)
      const orderItemsStatuses = [];
      if (order.orderItems && Array.isArray(order.orderItems)) {
        order.orderItems.forEach((item, idx) => {
          // Mongoose subdocument'inden status field'ını direkt al
          orderItemsStatuses[idx] = item.status;
        });
      }
      
      const itemsStatuses = [];
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item, idx) => {
          itemsStatuses[idx] = item.status;
        });
      }
      
      // Order'ı plain object'e dönüştür
      const orderObj = order.toObject ? order.toObject({ virtuals: true, getters: true }) : order;
      
      // orderItems array'indeki item'ların status field'ını set et
      if (orderObj.orderItems && Array.isArray(orderObj.orderItems)) {
        orderObj.orderItems = orderObj.orderItems.map((item, idx) => {
          // Önceden kaydedilmiş status'u kullan
          const itemStatus = orderItemsStatuses[idx];
          return {
            ...item,
            status: itemStatus
          };
        });
      }
      
      // items array'indeki item'ların status field'ını set et
      if (orderObj.items && Array.isArray(orderObj.items)) {
        orderObj.items = orderObj.items.map((item, idx) => {
          const itemStatus = itemsStatuses[idx];
          return {
            ...item,
            status: itemStatus
          };
        });
      }
      
      return orderObj;
    });
    
    res.json(serializedOrders);
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

