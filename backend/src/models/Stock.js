const mongoose = require('mongoose');
const stockSchema = new mongoose.Schema({
  symbol: { type: String, unique: true, index: true },
  name: String,
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('Stock', stockSchema);
