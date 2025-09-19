const mongoose = require('mongoose');
const stockPriceSchema = new mongoose.Schema({
  stock_symbol: { type: String, required: true, index: true },
  price_inr: { type: Number, required: true },
  price_at: { type: Date, default: Date.now, index: true },
  source: { type: String, default: 'mock' }
});
stockPriceSchema.index({ stock_symbol: 1, price_at: -1 });
module.exports = mongoose.model('StockPrice', stockPriceSchema);
