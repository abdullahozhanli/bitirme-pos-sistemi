const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const Order = require('../models/Order');
const OrderEvent = require('../models/OrderEvent');
const MenuItem = require('../models/MenuItem');
const Product = require('../models/Product');
const { branchFilterForUser, assertDocumentBranch } = require('../utils/branchAccess');
const {
  kitchenQueueOrderMatch,
  KITCHEN_WORK_STATUSES,
} = require('../utils/orderQueries');

const KITCHEN_ACTIVE_STATUSES = KITCHEN_WORK_STATUSES;

/**
 * GET /api/kitchen/queue
 * Bekleyen sipariş kalemlerini listeler
 * Query: station (hot|cold|bar|dessert)
 */
router.get('/queue', auth, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const { station } = req.query;

    const branchFilter = branchFilterForUser(req.user);
    if (branchFilter.__forbidden) {
      return res.status(403).json({ message: 'Şube atanmamış hesap bu işlemi yapamaz' });
    }
    delete branchFilter.__forbidden;

    // Tüm aktif siparişleri bul (eski ve yeni status'ları dahil)
    // Önce tüm siparişleri çek, sonra filtrele (debug için)
    // NOT: .lean() kullanmıyoruz çünkü items field'ı populate edilmesi gerekiyor
    const allOrders = await Order.find(branchFilter)
      .populate('table', 'name capacity')
      .populate('tableId', 'name capacity')
      .populate('waiter', 'name email')
      .populate('waiterId', 'name email')
      .populate('items.menuItem', 'name price category station')
      .populate('orderItems.product', 'name price station');
    
    // Aktif siparişleri filtrele
    const orders = allOrders.filter(order => {
      const status = order.status || '';
      return [
        'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', // Yeni status'lar
        'hazirlaniyor', 'serviste' // Eski status'lar
      ].includes(status);
    });

    // OrderItem'ları filtrele (hem orderItems hem items field'larını kontrol et)
    const items = [];
    
    try {
      for (const order of orders) {
        if (!order || !order._id) continue;
        
        // orderItems varsa onu kullan, yoksa items kullan
        // Mongoose document ise toObject() kullan, değilse direkt kullan
        const orderObj = order.toObject ? order.toObject() : order;
        // NOT: Boş array truthy olduğu için uzunluk kontrolü yapmalıyız
        const orderItems = (orderObj.orderItems && orderObj.orderItems.length > 0) 
          ? orderObj.orderItems 
          : (orderObj.items && orderObj.items.length > 0 ? orderObj.items : []);
        
        if (!Array.isArray(orderItems)) {
          console.warn('⚠️ Order items array değil:', order._id, typeof orderItems);
          continue;
        }
        
        if (orderItems.length === 0) {
          continue; // Boş siparişleri sessizce atla
        }
        
        // Eski siparişler için order status'undan item status'unu türet
        const orderStatus = orderObj.status || 'hazirlaniyor';
        let defaultItemStatus = 'QUEUED';
        if (orderStatus === 'hazirlaniyor' || orderStatus === 'CREATED' || orderStatus === 'SENT_TO_KITCHEN') {
          defaultItemStatus = 'QUEUED';
        } else if (orderStatus === 'IN_PREP' || orderStatus === 'serviste') {
          defaultItemStatus = 'STARTED';
        } else if (orderStatus === 'READY' || orderStatus === 'serviste') {
          defaultItemStatus = 'READY';
        }
        
        for (let idx = 0; idx < orderItems.length; idx++) {
          try {
            const item = orderItems[idx];
            if (!item) continue;
            
            // Item status'u kontrol et (yoksa order status'undan türet)
            const itemStatus = item.status || defaultItemStatus;
            
            // Sadece aktif durumdaki item'ları al
            if (itemStatus === 'QUEUED' || itemStatus === 'STARTED' || itemStatus === 'READY') {
              // Station kontrolü (yoksa 'hot' kabul et)
              const itemStation = item.station || 'hot';
              
              if (!station || itemStation === station) {
                // Item ID - yeni modelde _id var, eski modelde index kullan
                let itemId;
                if (item._id) {
                  itemId = String(item._id);
                } else {
                  itemId = `${String(orderObj._id)}-${idx}`;
                }
                
                // Masa numarasını güvenli şekilde al
                let tableNumber = 'N/A';
                try {
                  if (orderObj.tableNumber) {
                    tableNumber = String(orderObj.tableNumber);
                  } else if (orderObj.tableId) {
                    if (typeof orderObj.tableId === 'object' && orderObj.tableId !== null) {
                      tableNumber = orderObj.tableId.name ? String(orderObj.tableId.name) : 'N/A';
                    } else {
                      tableNumber = String(orderObj.tableId);
                    }
                  } else if (orderObj.table) {
                    if (typeof orderObj.table === 'object' && orderObj.table !== null) {
                      tableNumber = orderObj.table.name ? String(orderObj.table.name) : 'N/A';
                    } else {
                      tableNumber = String(orderObj.table);
                    }
                  }
                } catch (tableErr) {
                  console.warn('⚠️ Masa numarası alınırken hata:', tableErr);
                  tableNumber = 'N/A';
                }
                
                // Sipariş kaynağını belirle (QR veya Garson)
                const orderSource = (orderObj.waiterId || orderObj.waiter) ? 'garson' : 'qr';
                const waiterName = orderObj.waiterId?.name || orderObj.waiter?.name || null;
                
                items.push({
                  itemId: itemId,
                  orderId: String(order._id),
                  orderNumber: String(order._id).substring(0, 8),
                  tableNumber: tableNumber,
                  productName: item.name || 'Ürün Adı Yok',
                  qty: Number(item.qty) || 1,
                  note: String(item.note || ''),
                  orderNote: String(order.notes || ''), // Genel sipariş notu
                  station: String(itemStation),
                  status: String(itemStatus),
                  orderSource: orderSource, // 'qr' veya 'garson'
                  waiterName: waiterName,
                  createdAt: orderObj.createdAt || new Date(),
                  orderCreatedAt: orderObj.createdAt || new Date(),
                });
              }
            }
          } catch (itemErr) {
            console.warn('⚠️ Item işlenirken hata:', itemErr, 'Order ID:', order._id, 'Index:', idx);
            continue;
          }
        }
      }
    } catch (loopErr) {
      console.error('❌ Order loop hatası:', loopErr);
      throw loopErr;
    }

    // Status ve createdAt'e göre sırala (QUEUED > STARTED > READY, sonra createdAt)
    items.sort((a, b) => {
      const statusOrder = { QUEUED: 0, STARTED: 1, READY: 2, SERVED: 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.orderCreatedAt) - new Date(b.orderCreatedAt);
    });

    res.json({ items, total: items.length });
  } catch (e) {
    console.error('❌ /api/kitchen/queue hatası:', e);
    console.error('Stack:', e.stack);
    res.status(500).json({ 
      message: 'Sipariş kalemleri yüklenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
});

/**
 * POST /api/kitchen/items/:itemId/start
 * Sipariş kalemini hazırlamaya başlar
 */
router.post('/items/:itemId/start', auth, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    let order = null;
    let item = null;
    let itemArrayName = null; // 'orderItems' veya 'items'
    
    // Önce itemId formatını kontrol et (orderId-index formatı mı?)
    const parts = req.params.itemId.split('-');
    if (parts.length === 2) {
      // orderId-index formatı: direkt order'ı bul ve index ile item'ı al
      order = await Order.findById(parts[0]);
      if (order) {
        // Önce orderItems'te ara, yoksa items'te ara
        const idx = parseInt(parts[1]);
        if (order.orderItems && order.orderItems.length > idx && idx >= 0) {
          item = order.orderItems[idx];
          itemArrayName = 'orderItems';
        } else if (order.items && order.items.length > idx && idx >= 0) {
          item = order.items[idx];
          itemArrayName = 'items';
        }
        
        if (item) {
          // Eski modelde status yoksa ekle
          if (!item.status) {
            item.status = 'QUEUED';
          }
        }
      }
    }
    
    // Eğer orderId-index formatı değilse, _id ile ara
    if (!item) {
      // Önce orderItems._id ile ara (yeni model)
      order = await Order.findOne({ 'orderItems._id': req.params.itemId });
      
      if (order && order.orderItems) {
        // Mongoose subdocument ise id() kullan, değilse find kullan
        if (typeof order.orderItems.id === 'function') {
          item = order.orderItems.id(req.params.itemId);
          itemArrayName = 'orderItems';
        } else {
          // Array ise find ile ara
          item = order.orderItems.find(i => String(i._id) === String(req.params.itemId));
          if (item) itemArrayName = 'orderItems';
        }
      }
      
      // orderItems'te bulunamazsa items array'inde ara (eski model)
      if (!item && order && order.items) {
        item = order.items.find(i => String(i._id) === String(req.params.itemId));
        if (item) itemArrayName = 'items';
      }
    }
    
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });
    if (!item) return res.status(404).json({ message: 'Sipariş kalemi bulunamadı' });
    if (!assertDocumentBranch(req.user, order)) {
      return res.status(403).json({ message: 'Bu siparişe erişim yetkiniz yok' });
    }

    // QR siparişlerinde status undefined olabilir, bu durumda QUEUED olarak kabul et
    if (!item.status) {
      item.status = 'QUEUED';
    }

    if (item.status !== 'QUEUED') {
      return res.status(409).json({ message: `Kalem ${item.status} durumunda, başlatılamaz` });
    }

    const previousItemStatus = item.status || 'QUEUED';
    item.status = 'STARTED';
    
    // Sadece item'ın bulunduğu array'i markModified ile işaretle
    if (itemArrayName) {
      order.markModified(itemArrayName);
    } else {
      // Fallback: her iki array'i de işaretle
      if (order.orderItems) order.markModified('orderItems');
      if (order.items) order.markModified('items');
    }

    // Order status'unu IN_PREP yap (eğer CREATED, SENT_TO_KITCHEN veya hazirlaniyor ise)
    const previousOrderStatus = order.status;
    if (order.status === 'CREATED' || order.status === 'SENT_TO_KITCHEN' || order.status === 'hazirlaniyor') {
      order.status = 'IN_PREP';
    }

    try {
      await order.save();
    } catch (saveError) {
      console.error('❌ Order save hatası (start):', saveError);
      return res.status(500).json({ 
        message: 'Sipariş kaydedilemedi', 
        error: process.env.NODE_ENV === 'development' ? saveError.message : undefined 
      });
    }

    // OrderEvent kaydı (hata olsa bile devam et)
    try {
      await OrderEvent.create({
        orderId: order._id,
        actorId: req.user.id,
        type: 'item_status_change',
        from: previousItemStatus,
        to: 'STARTED',
        metadata: { itemId: item._id || req.params.itemId, itemName: item.name },
      });
    } catch (eventError) {
      console.warn('⚠️ OrderEvent kaydı oluşturulamadı (start):', eventError);
      // Event kaydı hatası kritik değil, devam et
    }

    if (previousOrderStatus !== order.status) {
      try {
        await OrderEvent.create({
          orderId: order._id,
          actorId: req.user.id,
          type: 'status_change',
          from: previousOrderStatus,
          to: 'IN_PREP',
        });
      } catch (eventError) {
        console.warn('⚠️ OrderEvent kaydı oluşturulamadı (status change):', eventError);
        // Event kaydı hatası kritik değil, devam et
      }
    }

    // Socket.io emit: item hazırlamaya başlandı
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      const itemStation = item.station || 'hot';
      const itemData = {
        itemId: item._id || req.params.itemId,
        orderId: order._id,
        station: itemStation,
        order: order,
      };
      // Spesifik istasyona gönder
      io.to(`kitchen.${branchId}.${itemStation}`).emit('item:started', itemData);
      // Genel mutfak room'una da gönder
      io.to(`kitchen.${branchId}`).emit('item:started', itemData);
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/kitchen/items/:itemId/ready
 * Sipariş kalemini hazır olarak işaretler
 */
router.post('/items/:itemId/ready', auth, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    console.log('🔵 /items/:itemId/ready çağrıldı:', req.params.itemId);
    let order = null;
    let item = null;
    let itemArrayName = null; // 'orderItems' veya 'items'
    
    // Önce itemId formatını kontrol et (orderId-index formatı mı?)
    const parts = req.params.itemId.split('-');
    console.log('🔵 itemId parts:', parts);
    if (parts.length === 2) {
      // orderId-index formatı: direkt order'ı bul ve index ile item'ı al
      order = await Order.findById(parts[0]);
      console.log('🔵 Order bulundu:', order ? order._id : 'bulunamadı');
      if (order) {
        // Önce orderItems'te ara, yoksa items'te ara
        const idx = parseInt(parts[1]);
        console.log('🔵 Index:', idx, 'orderItems length:', order.orderItems?.length, 'items length:', order.items?.length);
        if (order.orderItems && order.orderItems.length > idx && idx >= 0) {
          item = order.orderItems[idx];
          itemArrayName = 'orderItems';
          console.log('🔵 Item orderItems\'ten bulundu');
        } else if (order.items && order.items.length > idx && idx >= 0) {
          item = order.items[idx];
          itemArrayName = 'items';
          console.log('🔵 Item items\'ten bulundu');
        }
        
        if (item) {
          // Eski modelde status yoksa ekle
          if (!item.status) {
            item.status = 'STARTED';
            console.log('🔵 Item status STARTED olarak ayarlandı');
          }
        }
      }
    }
    
    // Eğer orderId-index formatı değilse, _id ile ara
    if (!item) {
      // Önce orderItems._id ile ara (yeni model)
      order = await Order.findOne({ 'orderItems._id': req.params.itemId });
      
      if (order && order.orderItems) {
        // Mongoose subdocument ise id() kullan, değilse find kullan
        if (typeof order.orderItems.id === 'function') {
          item = order.orderItems.id(req.params.itemId);
          itemArrayName = 'orderItems';
        } else {
          // Array ise find ile ara
          item = order.orderItems.find(i => String(i._id) === String(req.params.itemId));
          if (item) itemArrayName = 'orderItems';
        }
      }
      
      // orderItems'te bulunamazsa items array'inde ara (eski model)
      if (!item && order && order.items) {
        item = order.items.find(i => String(i._id) === String(req.params.itemId));
        if (item) itemArrayName = 'items';
      }
    }
    
    if (!order) {
      console.error('❌ Sipariş bulunamadı');
      return res.status(404).json({ message: 'Sipariş bulunamadı' });
    }
    if (!item) {
      console.error('❌ Sipariş kalemi bulunamadı');
      return res.status(404).json({ message: 'Sipariş kalemi bulunamadı' });
    }
    if (!assertDocumentBranch(req.user, order)) {
      return res.status(403).json({ message: 'Bu siparişe erişim yetkiniz yok' });
    }

    console.log('🔵 Item bulundu, status:', item.status, 'itemArrayName:', itemArrayName);

    // QR siparişlerinde status undefined olabilir, bu durumda STARTED yap ama kaydetme
    // Çünkü hemen ardından READY yapılacak, iki kez kaydetmeye gerek yok
    if (!item.status) {
      console.log('🔵 Item status yok, STARTED yapılıyor (kaydetmeden)');
      item.status = 'STARTED';
      // Status ekledik ama kaydetmiyoruz, çünkü hemen READY yapılacak
    }

    // Eğer item zaten READY veya SERVED ise, başarılı dön (idempotent)
    if (item.status === 'READY' || item.status === 'SERVED') {
      console.log('✅ Item zaten READY/SERVED durumunda, değişiklik yapılmıyor');
      // Item zaten hazır, başarılı dön
      const populated = await Order.findById(order._id)
        .populate('table', 'name capacity')
        .populate('tableId', 'name capacity')
        .populate('waiter', 'name email')
        .populate('waiterId', 'name email')
        .populate('orderItems.product', 'name price station')
        .populate('items.menuItem', 'name price category station')
        .lean();
      
      return res.json({
        message: 'Kalem zaten hazır durumda',
        order: populated,
        item: item
      });
    }

    // Sadece STARTED durumundaki item'lar READY yapılabilir
    if (item.status !== 'STARTED') {
      console.error('❌ Item status STARTED değil:', item.status);
      return res.status(409).json({ message: `Kalem ${item.status} durumunda, hazır işaretlenemez. Önce başlatılmalı.` });
    }

    const previousItemStatus = item.status || 'STARTED';
    item.status = 'READY';
    
    // QR siparişlerinde (orderId-index formatı) item status'unun doğru kaydedilmesi için
    // Hem markModified hem de item'ı direkt set et
    if (itemArrayName) {
      order.markModified(itemArrayName);
      // QR siparişlerinde item'ı direkt set et (index ile)
      if (itemArrayName === 'orderItems' && order.orderItems) {
        const idx = parseInt(req.params.itemId.split('-')[1]);
        if (idx >= 0 && idx < order.orderItems.length) {
          order.orderItems[idx].status = 'READY';
          order.markModified('orderItems');
        }
      } else if (itemArrayName === 'items' && order.items) {
        const idx = parseInt(req.params.itemId.split('-')[1]);
        if (idx >= 0 && idx < order.items.length) {
          order.items[idx].status = 'READY';
          order.markModified('items');
        }
      }
    } else {
      // Fallback: her iki array'i de işaretle
      if (order.orderItems) order.markModified('orderItems');
      if (order.items) order.markModified('items');
    }

    // Tüm kalemler READY veya SERVED ise order status'u tamamlandi yap (masa kartı silinsin)
    // Item'ın bulunduğu array'i kullan (orderItems veya items)
    const orderItems = itemArrayName === 'orderItems' 
      ? (order.orderItems || [])
      : (itemArrayName === 'items' 
          ? (order.items || [])
          : (order.orderItems || order.items || []));
    
    const previousOrderStatus = order.status;
    let statusChanged = false;
    
    // Eğer hiç item yoksa, sipariş zaten tamamlanmış sayılabilir
    if (!orderItems || orderItems.length === 0) {
      console.log('⚠️ Siparişte hiç item yok, status değiştirilmiyor');
    } else {
      console.log('🔵 Tüm item\'lar kontrol ediliyor, toplam:', orderItems.length, 'array:', itemArrayName || 'auto');
      console.log('🔵 Item status\'ları:', orderItems.map((i, idx) => ({ idx, status: i.status, name: i.name })));
      
      // Item status'larını kontrol et - sadece READY veya SERVED olanları say
      let readyCount = 0;
      let totalCount = orderItems.length;
      
      orderItems.forEach((i, idx) => {
        if (!i.status) {
          console.log(`🔵 Item ${idx} (${i.name || 'Ürün'}) status yok - READY değil`);
        } else {
          const isReady = i.status === 'READY' || i.status === 'SERVED';
          console.log(`🔵 Item ${idx} (${i.name || 'Ürün'}) status: ${i.status}, isReady: ${isReady}`);
          if (isReady) readyCount++;
        }
      });
      
      const allReadyOrServed = totalCount > 0 && readyCount === totalCount;
      console.log('🔵 Tüm item\'lar hazır mı?', allReadyOrServed, `(${readyCount}/${totalCount} hazır)`, 'Order status:', order.status);
      
      // Sadece TÜM item'lar READY veya SERVED ise ve sipariş henüz tamamlanmamışsa tamamlandi yap
      if (allReadyOrServed && totalCount > 0 && order.status !== 'SERVED' && order.status !== 'PAID' && order.status !== 'CANCELED' && order.status !== 'tamamlandi') {
        // Tüm ürünler hazır olduğunda siparişi tamamlandı olarak işaretle (masa kartı silinsin)
        console.log('🔵 Sipariş status\'u tamamlandi yapılıyor (tüm item\'lar hazır)');
        order.status = 'tamamlandi';
        statusChanged = true;
      } else {
        console.log('🔵 Sipariş status\'u değiştirilmiyor. allReadyOrServed:', allReadyOrServed, `(${readyCount}/${totalCount})`, 'mevcut status:', order.status);
      }
    }

    try {
      console.log('🔵 Order kaydediliyor (item status READY)...');
      // QR siparişlerinde item status'unun doğru kaydedilmesi için set() kullan
      if (itemArrayName === 'orderItems' && order.orderItems) {
        const idx = parseInt(req.params.itemId.split('-')[1]);
        if (!isNaN(idx) && idx >= 0 && idx < order.orderItems.length) {
          // Mongoose subdocument'ini direkt set et
          order.orderItems[idx].set('status', 'READY');
          order.markModified('orderItems');
        }
      } else if (itemArrayName === 'items' && order.items) {
        const idx = parseInt(req.params.itemId.split('-')[1]);
        if (!isNaN(idx) && idx >= 0 && idx < order.items.length) {
          order.items[idx].set('status', 'READY');
          order.markModified('items');
        }
      }
      await order.save();
      console.log('✅ Order kaydedildi');
      
      // Memory'deki order objesini kullan (fresh order okumaya gerek yok, zaten kaydettik)
      // order objesi zaten güncel, çünkü item.status = 'READY' yaptık ve save() çağırdık
      // Fresh order okumak Mongoose cache sorunlarına yol açabilir
      
      // Memory'deki order'dan item'ları al (zaten güncel)
      const currentOrderItems = itemArrayName === 'orderItems' 
        ? (order.orderItems || [])
        : (itemArrayName === 'items' 
            ? (order.items || [])
            : (order.orderItems || order.items || []));
      
      console.log('🔵 Memory\'deki order\'dan item\'lar kontrol ediliyor, toplam:', currentOrderItems.length);
      console.log('🔵 Memory order item status\'ları:', currentOrderItems.map((i, idx) => ({ idx, status: i.status, name: i.name })));
      
      // Tüm item'ların READY veya SERVED olup olmadığını kontrol et
      let readyCount = 0;
      let totalCount = currentOrderItems.length;
      
      currentOrderItems.forEach((i, idx) => {
        const isReady = i.status === 'READY' || i.status === 'SERVED';
        if (isReady) {
          readyCount++;
        }
        console.log(`🔵 Memory order Item ${idx} (${i.name || 'Ürün'}): status=${i.status}, isReady=${isReady}`);
      });
      
      const allReadyOrServed = totalCount > 0 && readyCount === totalCount;
      console.log('🔵 Memory order - Tüm item\'lar hazır mı?', allReadyOrServed, `(${readyCount}/${totalCount} hazır)`);
      
      // Eğer tüm item'lar hazırsa, order status'unu tamamlandi yap
      if (allReadyOrServed && totalCount > 0 && order.status !== 'SERVED' && order.status !== 'PAID' && order.status !== 'CANCELED' && order.status !== 'tamamlandi') {
        console.log('🔵 Memory order - Sipariş status\'u tamamlandi yapılıyor');
        order.status = 'tamamlandi';
        statusChanged = true;
        await order.save();
        console.log('✅ Order status tamamlandi olarak kaydedildi');
      }
      
    } catch (saveError) {
      console.error('❌ Order save hatası:', saveError);
      console.error('❌ Save error details:', {
        message: saveError.message,
        name: saveError.name,
        stack: saveError.stack
      });
      return res.status(500).json({ 
        message: 'Sipariş kaydedilemedi', 
        error: process.env.NODE_ENV === 'development' ? saveError.message : undefined 
      });
    }
    
    // Sipariş durumu değiştiyse socket event'i gönder
    if (statusChanged && previousOrderStatus !== order.status) {
      const io = req.app.get('io');
      if (io) {
        const branchId = order.branchId || 'default';
        io.to(`kitchen.${branchId}`).emit('order:status:changed', {
          orderId: order._id,
          from: previousOrderStatus,
          to: order.status,
          order: order.toObject ? order.toObject() : order,
        });
        console.log(`📡 [BACKEND] order:status:changed event'i gönderildi: ${previousOrderStatus} -> ${order.status}`);
      }
    }

    // OrderEvent kaydı (hata olsa bile devam et)
    try {
      await OrderEvent.create({
        orderId: order._id,
        actorId: req.user.id,
        type: 'item_status_change',
        from: previousItemStatus,
        to: 'READY',
        metadata: { itemId: item._id || req.params.itemId, itemName: item.name },
      });

      if (statusChanged && previousOrderStatus !== order.status) {
        await OrderEvent.create({
          orderId: order._id,
          actorId: req.user.id,
          type: 'status_change',
          from: previousOrderStatus,
          to: 'tamamlandi',
        });
      }
    } catch (eventError) {
      console.warn('⚠️ OrderEvent kaydı oluşturulamadı:', eventError);
      // Event kaydı hatası kritik değil, devam et
    }

    // Socket.io emit: item hazır
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      const itemStation = item.station || 'hot';
      
      // Order'ı populate et (waiterId için)
      const populatedOrder = await Order.findById(order._id)
        .populate('waiterId', 'name email')
        .populate('waiter', 'name email')
        .populate('tableId', 'name')
        .populate('table', 'name')
        .lean();
      
      const tableName = populatedOrder.tableId?.name || populatedOrder.table?.name || populatedOrder.tableNumber || 'N/A';
      const productName = item.name || 'Ürün';
      
      const itemData = {
        itemId: item._id || req.params.itemId,
        orderId: order._id,
        station: itemStation,
        order: populatedOrder,
        table: populatedOrder.tableId || populatedOrder.table,
        tableId: populatedOrder.tableId?._id || populatedOrder.table?._id,
        tableNumber: tableName,
        productName: productName,
        qty: item.qty || 1,
      };
      
      // Mutfak ekranına bildir - hem spesifik istasyona hem genel room'a
      io.to(`kitchen.${branchId}.${itemStation}`).emit('item:ready', itemData);
      io.to(`kitchen.${branchId}`).emit('item:ready', itemData);
      
      // Garsona bildir
      const waiterId = populatedOrder.waiterId?._id || populatedOrder.waiterId || populatedOrder.waiter?._id || populatedOrder.waiter;
      if (waiterId) {
        const waiterIdString = String(waiterId._id || waiterId);
        console.log(`📡 [BACKEND] item:ready garsona gönderiliyor: waiter.${waiterIdString}`);
        io.to(`waiter.${waiterIdString}`).emit('item:ready', itemData);
      } else {
        // QR siparişi için tüm garsonlara bildir (tables room'una gönder)
        console.log(`📡 [BACKEND] QR siparişi için tüm garsonlara bildirim gönderiliyor: tables`);
        io.to('tables').emit('item:ready', itemData);
        // Ayrıca genel waiter room'una da gönder (eğer varsa)
        io.emit('item:ready', itemData);
      }
    }

    res.json(order);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/kitchen/orders
 * Aktif siparişleri listeler (mutfak ekranı)
 */
router.get('/orders', auth, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const branchFilter = branchFilterForUser(req.user);
    if (branchFilter.__forbidden) {
      return res.status(403).json({ message: 'Şube atanmamış hesap bu işlemi yapamaz' });
    }
    delete branchFilter.__forbidden;

    const orders = await Order.find(kitchenQueueOrderMatch(branchFilter))
      .populate('table', 'name capacity')
      .populate('tableId', 'name capacity')
      .populate('waiter', 'name email')
      .populate('waiterId', 'name email')
      .populate('items.menuItem', 'name price category')
      .populate('orderItems.product', 'name price station')
      .sort({ createdAt: 1 })
      .lean();

    res.json(orders);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/kitchen/orders/history
 * Geçmiş siparişleri getir (tamamlanmış siparişler)
 * Query: period (today, week, month) veya startDate, endDate
 * NOT: Bu route /orders/:id/status'ten ÖNCE tanımlanmalı (route sırası önemli)
 */
router.get('/orders/history', auth, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    
    // Tarih aralığını hesapla
    let dateFilter = {};
    if (period) {
      const now = new Date();
      const start = new Date();
      
      switch (period) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: start, $lte: now } };
          break;
        case 'week':
          start.setDate(now.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: start, $lte: now } };
          break;
        case 'month':
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: start, $lte: now } };
          break;
        default:
          // Geçersiz period, tüm geçmiş siparişleri getir
          break;
      }
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    }
    
    const branchFilter = branchFilterForUser(req.user);
    if (branchFilter.__forbidden) {
      return res.status(403).json({ message: 'Şube atanmamış hesap bu işlemi yapamaz' });
    }
    delete branchFilter.__forbidden;
    
    // Tamamlanmış siparişleri getir
    const query = {
      status: { $in: ['tamamlandi', 'PAID', 'SERVED', 'CANCELED'] },
      ...dateFilter,
      ...branchFilter
    };
    
    const orders = await Order.find(query)
      .populate('table', 'name capacity')
      .populate('tableId', 'name capacity')
      .populate('waiter', 'name email')
      .populate('waiterId', 'name email')
      .populate('items.menuItem', 'name price category')
      .populate('orderItems.product', 'name price category station')
      .sort({ createdAt: -1 }) // En yeni önce
      .lean();
    
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/kitchen/orders/:id/status
 * Sipariş durumunu güncelle
 * NOT: Bu route /orders/history'den SONRA tanımlanmalı (route sırası önemli)
 */
router.patch('/orders/:id/status', auth, requireRole('mutfak', 'admin', 'yetkili'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'PAID', 'CANCELED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Sipariş bulunamadı' });

    // BranchId kontrolü: Süper admin değilse sadece kendi şubesini güncelleyebilir
    if (req.user && req.user.role !== 'superadmin' && req.user.branchId) {
      if (String(order.branchId) !== String(req.user.branchId)) {
        return res.status(403).json({ message: 'Bu siparişe erişim yetkiniz yok' });
      }
    }

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    // Populate edilmiş order'ı döndür
    const populated = await Order.findById(order._id)
      .populate('table', 'name capacity')
      .populate('tableId', 'name capacity')
      .populate('waiter', 'name email')
      .populate('waiterId', 'name email')
      .populate('orderItems.product', 'name price station')
      .populate('items.menuItem', 'name price category station')
      .lean();

    // Socket.io emit: Sipariş durumu değişti
    const io = req.app.get('io');
    if (io) {
      const branchId = order.branchId || 'default';
      io.to(`kitchen.${branchId}`).emit('order:status:changed', {
        orderId: order._id,
        from: previousStatus,
        to: status,
        order: populated,
      });
      console.log(`📡 [BACKEND] order:status:changed event'i gönderildi: ${previousStatus} -> ${status}`);

      // Eğer sipariş tamamlandıysa, garsonlara bildirim gönder
      if (status === 'tamamlandi' || status === 'SERVED' || status === 'PAID') {
        const orderItems = populated.orderItems || populated.items || [];
        const tableName = populated.tableId?.name || populated.table?.name || populated.tableNumber || 'N/A';
        const waiterId = populated.waiterId?._id || populated.waiterId || populated.waiter?._id || populated.waiter;

        // Her bir item için garsonlara bildirim gönder
        for (const item of orderItems) {
          const productName = item.name || item.productName || item.product?.name || item.menuItem?.name || 'Ürün';
          const itemData = {
            itemId: item._id || `${order._id}-${orderItems.indexOf(item)}`,
            orderId: order._id,
            station: item.station || item.product?.station || item.menuItem?.station || 'hot',
            order: populated,
            table: populated.tableId || populated.table,
            tableId: populated.tableId?._id || populated.table?._id,
            tableNumber: tableName,
            productName: productName,
            qty: item.qty || 1,
          };

          // Garsona bildir
          if (waiterId) {
            const waiterIdString = String(waiterId._id || waiterId);
            console.log(`📡 [BACKEND] item:ready garsona gönderiliyor (tamamlandi): waiter.${waiterIdString}`);
            io.to(`waiter.${waiterIdString}`).emit('item:ready', itemData);
          } else {
            // QR siparişi için tüm garsonlara bildir
            console.log(`📡 [BACKEND] QR siparişi için tüm garsonlara bildirim gönderiliyor (tamamlandi): tables`);
            io.to('tables').emit('item:ready', itemData);
            // Ayrıca genel waiter room'una da gönder
            io.emit('item:ready', itemData);
          }
        }
      }
    }

    res.json(populated);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

