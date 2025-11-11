const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderEventSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Sipariş ID zorunludur'],
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Aktör ID zorunludur'],
    },
    type: {
      type: String,
      enum: ['status_change', 'item_status_change', 'payment', 'cancel'],
      required: [true, 'Olay tipi zorunludur'],
    },
    from: {
      type: String,
      required: false, // İlk durum için null olabilir
    },
    to: {
      type: String,
      required: [true, 'Yeni durum zorunludur'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false, // Ek bilgiler (itemId, reason, vs.)
    },
    at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: false } // at alanı zaten var, timestamps gereksiz
);

// İndeksler
orderEventSchema.index({ orderId: 1, at: -1 });
orderEventSchema.index({ actorId: 1, at: -1 });
orderEventSchema.index({ type: 1, at: -1 });
// TTL index: 90 gün sonra otomatik sil
orderEventSchema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const OrderEvent = mongoose.model('OrderEvent', orderEventSchema);

module.exports = OrderEvent;

