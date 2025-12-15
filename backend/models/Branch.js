const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Şube adı zorunludur'],
    trim: true,
  },
  address: {
    type: String,
    required: false,
    trim: true,
  },
  phone: {
    type: String,
    required: false,
    trim: true,
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// İndeksler
branchSchema.index({ name: 1 });
branchSchema.index({ isActive: 1 });

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;









