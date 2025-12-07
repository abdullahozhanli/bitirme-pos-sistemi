const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false, // Migration için opsiyonel, sonra required yapılabilir
  }
}, { timestamps: true });

// İndeksler
menuItemSchema.index({ branchId: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);

