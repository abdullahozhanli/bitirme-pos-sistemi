const mongoose = require('mongoose');
const { Schema } = mongoose;

const dailyAggregateSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false, // Şimdilik opsiyonel
    },
    date: {
      type: String,
      required: [true, 'Tarih zorunludur (YYYYMMDD format)'],
      match: [/^\d{8}$/, 'Tarih YYYYMMDD formatında olmalı'],
    },
    revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    orders: {
      type: Number,
      default: 0,
      min: 0,
    },
    canceled: {
      type: Number,
      default: 0,
      min: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // updatedAt manuel yönetiliyor
);

// İndeksler
dailyAggregateSchema.index({ date: 1, branchId: 1 }, { unique: true });
dailyAggregateSchema.index({ branchId: 1, date: -1 });

const DailyAggregate = mongoose.model('DailyAggregate', dailyAggregateSchema);

module.exports = DailyAggregate;

