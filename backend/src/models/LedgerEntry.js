const mongoose = require("mongoose");

const LedgerEntrySchema = new mongoose.Schema({
  reward_id: { type: mongoose.Schema.Types.ObjectId, ref: "Reward", required: false },

  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

  // Account name: "USER_STOCK", "STOCK_POOL", "CASH", "FEES", "EXPENSE_STOCK_ALLOCATION"
  account: { type: String, required: true },

  symbol: { type: String, required: false },

  amount: { type: Number, required: true },

  currency: { type: String, default: "INR" },

  type: { type: String, enum: ["DEBIT", "CREDIT"], required: true },

  meta: { type: Object, default: null },

  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model("LedgerEntry", LedgerEntrySchema);
