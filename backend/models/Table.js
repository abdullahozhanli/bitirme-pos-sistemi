const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "Masa 1"
  capacity: { type: Number, default: 4 },
  status: {
    type: String,
    enum: ['bos', 'dolu', 'rezerve', 'odeme_bekliyor'],
    default: 'bos'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false, // Migration için opsiyonel, sonra required yapılabilir
  }
}, { timestamps: true });

// İndeksler
tableSchema.index({ branchId: 1 });
tableSchema.index({ branchId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Table', tableSchema);
