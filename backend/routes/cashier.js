const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Table = require('../models/Table');
const Order = require('../models/Order');

router.use(auth, requireRole('kasa', 'admin', 'yetkili'));

router.get('/pending', async (req, res) => {
  try {
    // BranchId filtresi: Süper admin değilse sadece kendi şubesini göster
    const branchFilter = {};
    if (req.user && req.user.role !== 'superadmin' && req.user.branchId) {
      branchFilter.branchId = req.user.branchId;
    }
    
    // Hem 'dolu' hem de 'odeme_bekliyor' durumundaki masaları getir
    // Çünkü garson sipariş verdiğinde masa 'dolu' oluyor
    const tables = await Table.find({ 
      status: { $in: ['odeme_bekliyor', 'dolu'] },
      ...branchFilter
    }).lean();
    
    // Her masa için ödeme bekleyen sipariş var mı kontrol et
    const tablesWithPendingOrders = await Promise.all(
      tables.map(async (table) => {
        const pendingOrders = await Order.find({
          table: table._id,
          status: {
            $in: ['serviste', 'hazirlaniyor', 'READY', 'tamamlandi', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP'],
            $nin: ['ödendi', 'PAID', 'SERVED', 'CANCELED', 'iptal']
          },
          ...branchFilter
        }).lean();
        
        // Eğer ödeme bekleyen sipariş varsa masayı döndür
        if (pendingOrders.length > 0) {
          return table;
        }
        return null;
      })
    );
    
    // Null olmayan masaları filtrele
    const validTables = tablesWithPendingOrders.filter(table => table !== null);
    
    res.json(validTables);
  } catch (error) {
    res.status(500).json({ message: 'Masalar yüklenemedi', error: error.message });
  }
});

router.post('/checkout/:tableId', async (req, res) => {
  try {
    const { tableId } = req.params;
    
    // BranchId filtresi: Süper admin değilse sadece kendi şubesini göster
    const branchFilter = {};
    if (req.user && req.user.role !== 'superadmin' && req.user.branchId) {
      branchFilter.branchId = req.user.branchId;
    }
    
    // Masanın kullanıcının şubesine ait olduğunu kontrol et
    const table = await Table.findOne({ 
      _id: tableId,
      ...branchFilter
    });
    
    if (!table) {
      return res.status(404).json({ message: 'Masa bulunamadı veya yetkiniz yok' });
    }
    
    // Ödeme bekleyen tüm aktif siparişleri bul
    const orders = await Order.find({ 
      table: tableId, 
      status: { 
        $in: [
          'serviste', 
          'hazirlaniyor', 
          'READY', 
          'tamamlandi',
          'CREATED',
          'SENT_TO_KITCHEN',
          'IN_PREP'
        ],
        $nin: ['ödendi', 'PAID', 'SERVED', 'CANCELED']
      },
      ...branchFilter
    });
    
    // Siparişleri ödendi olarak işaretle
    for (const o of orders) {
      o.status = 'ödendi';
      o.paidAt = new Date();
      await o.save();
    }
    
    // Masayı boşalt
    await Table.findByIdAndUpdate(tableId, { status: 'bos' });
    res.json({ message: 'Ödeme alındı, masa boşaltıldı' });
  } catch (error) {
    res.status(500).json({ message: 'Ödeme işlemi başarısız', error: error.message });
  }
});

module.exports = router;

