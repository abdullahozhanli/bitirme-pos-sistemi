const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' }, // Yeni model için
  tableNumber: { type: String }, // Yeni model için
  waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Yeni model için
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String }
  }],
  // Yeni model için orderItems (status ve station içerir)
  orderItems: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String, default: '' },
    station: { type: String, default: 'hot' }, // hot, cold, bar, dessert
    status: { 
      type: String, 
      enum: ['QUEUED', 'STARTED', 'READY', 'SERVED'],
      default: 'QUEUED'
    }
  }],
  total: { type: Number, required: true },
  totalPrice: { type: Number }, // Yeni model için
  notes: { type: String }, // Genel sipariş notu (müşteri notu)
  status: {
    type: String,
    enum: ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal', 'PAID', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELED'],
    default: 'hazirlaniyor'
  },
  paidAt: {
    type: Date
  },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' } // Yeni model için
}, { timestamps: true, strict: false }); // strict: false - eski ve yeni field'ları destekle

// Index'ler - Performans optimizasyonu
// Sık kullanılan query'ler için index'ler
orderSchema.index({ tableId: 1 }); // Masa bazlı sorgular için
orderSchema.index({ waiterId: 1 }); // Garson bazlı sorgular için
orderSchema.index({ status: 1 }); // Status filtreleme için
orderSchema.index({ createdAt: -1 }); // Tarih sıralama için (descending)
orderSchema.index({ status: 1, createdAt: -1 }); // Composite index - Status + tarih kombinasyonu (en sık kullanılan)
orderSchema.index({ tableId: 1, status: 1 }); // Masa + status kombinasyonu
orderSchema.index({ paidAt: 1 }); // Ödeme tarihi sorguları için

module.exports = mongoose.model('Order', orderSchema);
