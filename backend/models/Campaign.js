const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    minCartTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    discountRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startsAt: {
      type: Date,
      required: false,
    },
    endsAt: {
      type: Date,
      required: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    /** cart = sepet indirimi, menu = kampanyalı menü paketi */
    campaignType: {
      type: String,
      enum: ['cart', 'menu'],
      default: 'cart',
    },
    /** Menü kampanyasında sabit paket fiyatı (₺) */
    bundlePrice: {
      type: Number,
      required: false,
      min: 0,
    },
    /** Menü kampanyasındaki ürünler (anlık görüntü) */
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: { type: String, trim: true },
        price: { type: Number, min: 0 },
        imageUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

campaignSchema.index({ branchId: 1, isActive: 1 });
campaignSchema.index({ branchId: 1, sortOrder: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
