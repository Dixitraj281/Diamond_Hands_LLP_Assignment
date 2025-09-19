const mongoose = require('mongoose');
const rewardSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stock_symbol: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 0 },
  rewarded_at: { type: Date, required: true },
  source: String,
  idempotency_key: { type: String, unique: true, sparse: true }
}, { timestamps: true });
module.exports = mongoose.model('Reward', rewardSchema);
