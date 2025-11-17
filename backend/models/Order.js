const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  waiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String }
  }],
  total: { type: Number, required: true },
  notes: { type: String }, // Genel sipariş notu (müşteri notu)
  status: {
    type: String,
    enum: ['hazirlaniyor', 'serviste', 'tamamlandi', 'iptal', 'PAID', 'CREATED', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELED'],
    default: 'hazirlaniyor'
  },
  paidAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
