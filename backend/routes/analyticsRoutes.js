const express = require('express');
const router = express.Router();

// Güvenlik görevlimiz (Sadece Admin görebilir)
const authMiddleware = require('../middleware/authMiddleware');

// Veritabanı Modellerimiz
const Order = require('../models/Order');
const Product = require('../models/Product'); 

/**
 * @route   GET /api/analytics/summary
 * @desc    Admin Dashboard için Gelişmiş İstatistikleri hesaplar
 * @access  Private (Admin Korumalı)
 */
router.get('/summary', authMiddleware, async (req, res, next) => {
  try {
    const revenueData = await Order.aggregate([
      {
        $match: { 
          isPaid: true,
          status: { $ne: 'İptal Edildi' }
        }
      },
      {
        $group: {
          _id: null, 
          totalRevenue: { $sum: '$totalPrice' } 
        }
      }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    const totalOrders = await Order.countDocuments({ 
      status: { $ne: 'İptal Edildi' } 
    });

    const totalProducts = await Product.countDocuments({});

    const pendingOrdersList = await Order.find({ 
      status: 'Hazırlanıyor' 
    }).select('tableNumber');

    const pendingOrderTables = [...new Set(pendingOrdersList.map(order => order.tableNumber))];

    const pendingOrdersCount = await Order.countDocuments({ 
      status: 'Hazırlanıyor' 
    });

    const totalCancelledOrders = await Order.countDocuments({ 
      status: 'İptal Edildi' 
    });

    res.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      pendingOrdersCount,
      pendingOrderTables,
      totalCancelledOrders
    });

  } catch (error) {
    console.error('Analiz verisi çekilirken hata:', error.message);
    next(error);
  }
});

// (Gelecekte buraya "Günlük Rapor" API'si eklenebilir)

// Bu rotaları dışa aktarıyoruz
module.exports = router;