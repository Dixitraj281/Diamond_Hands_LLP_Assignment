const express = require("express");
const router = express.Router();
const Reward = require("../models/Reward");
const StockPrice = require("../models/StockPrice");
const mongoose = require("mongoose");

router.get("/portfolio/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // validate
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "invalid user id" });
    }

    // aggregate holdings for this user
    const holdings = await Reward.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$stock_symbol", total_qty: { $sum: "$quantity" } } }
    ]);

    // get latest price per stock
    const latestPrices = await StockPrice.aggregate([
      { $sort: { stock_symbol: 1, price_at: -1 } },
      { $group: { _id: "$stock_symbol", price_inr: { $first: "$price_inr" } } }
    ]);

    const priceMap = Object.fromEntries(latestPrices.map(p => [p._id, p.price_inr]));

    // build portfolio with value_inr
    const portfolio = holdings.map(h => ({
      stock_symbol: h._id,
      quantity: h.total_qty,
      price_inr: priceMap[h._id] || 0,
      value_inr: (priceMap[h._id] || 0) * h.total_qty
    }));

    res.json({ portfolio });
  } catch (err) {
    console.error("portfolio error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "invalid user id" });
    }

    // find rewards for today only
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayGroup = await Reward.aggregate([
      { 
        $match: { 
          user_id: new mongoose.Types.ObjectId(userId), 
          rewarded_at: { $gte: todayStart } 
        } 
      },
      { $group: { _id: "$stock_symbol", total_qty: { $sum: "$quantity" } } }
    ]);

    // aggregate all holdings for this user
    const holdings = await Reward.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: "$stock_symbol", total_qty: { $sum: "$quantity" } } }
    ]);

    // get latest prices
    const latestPrices = await StockPrice.aggregate([
      { $sort: { stock_symbol: 1, price_at: -1 } },
      { $group: { _id: "$stock_symbol", price_inr: { $first: "$price_inr" } } }
    ]);
    const priceMap = Object.fromEntries(latestPrices.map(p => [p._id, p.price_inr]));

    // calculate total portfolio INR
    let portfolioValue = 0;
    holdings.forEach(h => {
      const price = priceMap[h._id] || 0;
      portfolioValue += price * (h.total_qty || 0);
    });

    res.json({
      today: todayGroup.map(g => ({ stock: g._id, total_qty: g.total_qty })),
      portfolio_value_inr: portfolioValue
    });
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
