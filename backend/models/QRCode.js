const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true,
    trim: true
  },
  qrUrl: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    required: true // Base64 encoded QR kod görseli
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false, // Migration için opsiyonel, sonra required yapılabilir
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// İndeksler
qrCodeSchema.index({ branchId: 1 });
qrCodeSchema.index({ branchId: 1, tableNumber: 1 }, { unique: true });

module.exports = mongoose.model('QRCode', qrCodeSchema);












