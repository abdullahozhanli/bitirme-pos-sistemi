const mongoose = require('mongoose');
const { Schema } = mongoose;

const stockMovementSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Ürün ID zorunludur'],
    },
    delta: {
      type: Number,
      required: [true, 'Stok değişimi zorunludur'],
      // Pozitif = artış, negatif = azalış
    },
    reason: {
      type: String,
      enum: ['order', 'adjustment', 'restock', 'waste'],
      required: [true, 'Sebep zorunludur'],
    },
    refId: {
      type: Schema.Types.ObjectId,
      required: false, // orderId veya adjustmentId
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Kim yaptı (opsiyonel)
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false, // Migration için opsiyonel, sonra required yapılabilir
    },
  },
  { timestamps: true }
);

// İndeksler
stockMovementSchema.index({ productId: 1, createdAt: -1 });
stockMovementSchema.index({ reason: 1, createdAt: -1 });
stockMovementSchema.index({ refId: 1 });
stockMovementSchema.index({ branchId: 1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

module.exports = StockMovement;

