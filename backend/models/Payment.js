const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Sipariş ID zorunludur'],
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'online'],
      required: [true, 'Ödeme yöntemi zorunludur'],
    },
    amount: {
      type: Number,
      required: [true, 'Ödeme tutarı zorunludur'],
      min: [0, 'Tutar negatif olamaz'],
    },
    status: {
      type: String,
      enum: ['UNPAID', 'PAID'],
      default: 'UNPAID',
      required: true,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// İndeksler
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

