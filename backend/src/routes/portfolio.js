const express = require("express");
const router = express.Router();

const Reward = require("../models/Reward");
const StockPrice = require("../models/StockPrice");

// GET /portfolio/:userId
// Returns current portfolio (with latest price & value per stock)
router.get("/portfolio/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const rewards = await Reward.find({ user_id: userId });
    if (!rewards.length) return res.json({ portfolio: [] });

    const latestPrices = await StockPrice.aggregate([
      { $sort: { price_at: -1 } },
      {
        $group: {
          _id: "$stock_symbol",
          price_inr: { $first: "$price_inr" },
          price_at: { $first: "$price_at" }
        }
      }
    ]);

    const priceMap = Object.fromEntries(
      latestPrices.map(p => [p._id, { price_inr: p.price_inr, price_at: p.price_at }])
    );

    const portfolio = rewards.map(r => {
      const priceObj = priceMap[r.stock_symbol] || { price_inr: 0 };
      const value_inr = r.quantity * (priceObj.price_inr || 0);
      return {
        stock_symbol: r.stock_symbol,
        quantity: r.quantity,
        price_inr: priceObj.price_inr,
        value_inr
      };
    });

    res.json({ portfolio });
  } catch (err) {
    console.error("Error fetching portfolio:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /today-stocks/:userId
router.get("/today-stocks/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const rewards = await Reward.find({
      user_id: userId,
      rewarded_at: { $gte: todayStart }
    });

    const latestPrices = await StockPrice.aggregate([
      { $sort: { price_at: -1 } },
      {
        $group: {
          _id: "$stock_symbol",
          price_inr: { $first: "$price_inr" }
        }
      }
    ]);
    const priceMap = Object.fromEntries(latestPrices.map(p => [p._id, p.price_inr]));

    const items = rewards.map(r => ({
      reward_id: r._id,
      stock_symbol: r.stock_symbol,
      quantity: r.quantity,
      latest_price: priceMap[r.stock_symbol] || 0,
      inr_value: (priceMap[r.stock_symbol] || 0) * r.quantity
    }));

    res.json({ items });
  } catch (err) {
    console.error("Error fetching today-stocks:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /historical-inr/:userId
router.get("/historical-inr/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const rewards = await Reward.find({ user_id: userId });

    // Group by day (excluding today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const days = {};
    for (let r of rewards) {
      if (r.rewarded_at < todayStart) {
        const d = r.rewarded_at.toISOString().split("T")[0];
        if (!days[d]) days[d] = 0;

        // For simplicity, assume price_inr at reward time = stored quantity * latest known price
        // Could be improved by historical price fetch
        const latest = await StockPrice.findOne({ stock_symbol: r.stock_symbol }).sort({ price_at: -1 });
        const price = latest ? latest.price_inr : 0;
        days[d] += r.quantity * price;
      }
    }

    const history = Object.entries(days).map(([date, total_inr]) => ({ date, total_inr }));

    res.json({ history });
  } catch (err) {
    console.error("Error fetching historical-inr:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
