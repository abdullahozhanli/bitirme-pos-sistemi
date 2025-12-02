const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  tableNumber: {
    type: String,
    required: true,
    unique: true,
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('QRCode', qrCodeSchema);












