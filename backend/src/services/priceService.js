const Stock = require("../models/Stock");
const StockPrice = require("../models/StockPrice");
const { fetchYahooPrice } = require("./yahooService");

async function updatePrices() {
  try {
    const stocks = await Stock.find({ active: true }); // grab only active ones

    for (const stk of stocks) {
      let priceInfo = null;

      if (process.env.PRICE_SOURCE === "yahoo") {
        priceInfo = await fetchYahooPrice(stk.symbol);
        await new Promise(r => setTimeout(r, 2000)); // delay ~2s to avoid ban (politness)
      } else {
        // fallback fake price gen, dev/test only
        priceInfo = {
          symbol: stk.symbol,
          price: (Math.random() * 1000 + 500).toFixed(2),
          price_at: new Date()
        };
      }

      if (priceInfo) {
        await StockPrice.create({
          stock_symbol: priceInfo.symbol,
          price_inr: priceInfo.price,
          price_at: priceInfo.price_at,
          source: process.env.PRICE_SOURCE
        });
        console.log(`saved ${stk.symbol} -> ₹${priceInfo.price}`);
      }
    }
  } catch (err) {
    console.error("price update fail:", err.message);
  }
}

module.exports = { updatePrices };
