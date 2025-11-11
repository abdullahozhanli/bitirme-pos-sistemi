const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "Masa 1"
  capacity: { type: Number, default: 4 },
  status: {
    type: String,
    enum: ['bos', 'dolu', 'rezerve', 'odeme_bekliyor'],
    default: 'bos'
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
