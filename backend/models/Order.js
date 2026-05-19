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
  subtotal: { type: Number },
  discountTotal: { type: Number, default: 0 },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  campaignTitle: { type: String },
  notes: { type: String }, // Genel sipariş notu (müşteri notu)
  status: {
    type: String,
    enum: ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal', 'ödendi', 'PAID', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELED'],
    default: 'hazirlaniyor'
  },
  paidAt: {
    type: Date
  },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // Yeni model için
  /** Mobil müşteri (giriş yapmış) siparişi */
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true, strict: false }); // strict: false - eski ve yeni field'ları destekle

module.exports = mongoose.model('Order', orderSchema);
