/**
 * Migration Script: Order Status ve OrderItem Status Güncelleme
 * 
 * Bu script:
 * 1. Order.status: Türkçe → İngilizce enum'a çevirir
 * 2. Order.isPaid: true → status: 'PAID' yapar
 * 3. OrderItem.kitchenStatus → status (ve enum değerlerini günceller)
 * 
 * Kullanım:
 *   node backend/scripts/migrateOrderStatus.js
 * 
 * Geri alma:
 *   node backend/scripts/migrateOrderStatus.js --rollback
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

// Status mapping
const ORDER_STATUS_MAP = {
  'Hazırlanıyor': 'IN_PREP',
  'Hazır': 'READY',
  'Servis Edildi': 'SERVED',
  'İptal Edildi': 'CANCELED',
};

const ORDER_STATUS_REVERSE_MAP = {
  'IN_PREP': 'Hazırlanıyor',
  'READY': 'Hazır',
  'SERVED': 'Servis Edildi',
  'CANCELED': 'İptal Edildi',
};

const ORDER_ITEM_STATUS_MAP = {
  'pending': 'QUEUED',
  'in_progress': 'STARTED',
  'ready': 'READY',
  'served': 'SERVED',
  'cancelled': 'SERVED', // cancelled item'ları SERVED olarak işaretle (geçmiş veri)
};

const ORDER_ITEM_STATUS_REVERSE_MAP = {
  'QUEUED': 'pending',
  'STARTED': 'in_progress',
  'READY': 'ready',
  'SERVED': 'served',
};

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    const orders = await Order.find({});
    console.log(`📦 Toplam ${orders.length} sipariş bulundu`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        let changed = false;
        const originalStatus = order.status;
        const originalIsPaid = order.isPaid;

        // 1. Order.status güncelle (Türkçe → İngilizce)
        if (ORDER_STATUS_MAP[order.status]) {
          order.status = ORDER_STATUS_MAP[order.status];
          changed = true;
        } else if (!['CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'PAID', 'CANCELED'].includes(order.status)) {
          // Bilinmeyen status, varsayılan olarak IN_PREP yap
          console.warn(`⚠️  Bilinmeyen status: ${order.status} (Order: ${order._id}), IN_PREP yapılıyor`);
          order.status = 'IN_PREP';
          changed = true;
        }

        // 2. isPaid: true → status: 'PAID'
        if (originalIsPaid === true && order.status !== 'PAID' && order.status !== 'CANCELED') {
          order.status = 'PAID';
          if (order.paidAt && !order.paidAt) {
            // paidAt yoksa createdAt'i kullan
            order.paidAt = order.createdAt || new Date();
          }
          changed = true;
        }

        // 3. OrderItem.kitchenStatus → status
        if (order.orderItems && Array.isArray(order.orderItems)) {
          for (const item of order.orderItems) {
            // Eski kitchenStatus varsa status'a çevir
            if (item.kitchenStatus && !item.status) {
              if (ORDER_ITEM_STATUS_MAP[item.kitchenStatus]) {
                item.status = ORDER_ITEM_STATUS_MAP[item.kitchenStatus];
                changed = true;
              } else {
                // Bilinmeyen kitchenStatus, QUEUED yap
                item.status = 'QUEUED';
                changed = true;
              }
              // kitchenStatus'u kaldır (artık kullanılmayacak)
              delete item.kitchenStatus;
            } else if (!item.status) {
              // Hiç status yoksa QUEUED yap
              item.status = 'QUEUED';
              changed = true;
            }

            // station yoksa varsayılan olarak 'hot' ekle
            if (!item.station) {
              item.station = 'hot';
              changed = true;
            }

            // note yoksa boş string ekle
            if (item.note === undefined) {
              item.note = '';
              changed = true;
            }
          }
        }

        if (changed) {
          // markModified ile nested array değişikliklerini bildir
          order.markModified('orderItems');
          await order.save();
          updated++;
          console.log(`✅ Order ${order._id} güncellendi: ${originalStatus} → ${order.status}`);
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
        console.error(`❌ Order ${order._id} güncellenirken hata:`, err.message);
      }
    }

    console.log('\n📊 Özet:');
    console.log(`   ✅ Güncellenen: ${updated}`);
    console.log(`   ⏭️  Atlanan: ${skipped}`);
    console.log(`   ❌ Hatalar: ${errors}`);

    await mongoose.disconnect();
    console.log('✅ Migration tamamlandı');
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

async function rollback() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB bağlantısı başarılı (ROLLBACK)');

    const orders = await Order.find({});
    console.log(`📦 Toplam ${orders.length} sipariş bulundu`);

    let updated = 0;

    for (const order of orders) {
      try {
        let changed = false;

        // Order.status geri çevir (İngilizce → Türkçe)
        if (ORDER_STATUS_REVERSE_MAP[order.status]) {
          order.status = ORDER_STATUS_REVERSE_MAP[order.status];
          changed = true;
        }

        // OrderItem.status → kitchenStatus
        if (order.orderItems && Array.isArray(order.orderItems)) {
          for (const item of order.orderItems) {
            if (item.status && !item.kitchenStatus) {
              if (ORDER_ITEM_STATUS_REVERSE_MAP[item.status]) {
                item.kitchenStatus = ORDER_ITEM_STATUS_REVERSE_MAP[item.status];
                changed = true;
              }
            }
          }
        }

        // isPaid geri ekle (PAID ise true yap)
        if (order.status === 'PAID' && !order.isPaid) {
          order.isPaid = true;
          changed = true;
        }

        if (changed) {
          order.markModified('orderItems');
          await order.save();
          updated++;
        }
      } catch (err) {
        console.error(`❌ Order ${order._id} geri alınırken hata:`, err.message);
      }
    }

    console.log(`\n✅ ${updated} sipariş geri alındı`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Rollback hatası:', error);
    process.exit(1);
  }
}

// Ana fonksiyon
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  rollback();
} else {
  migrate();
}








