const axios = require("axios");
const cheerio = require("cheerio");

// build url for yahoo quote page
function buildQuoteUrl(symbl) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbl)}`;
}

async function fetchYahooPrice(symbol) {
  const url = buildQuoteUrl(symbol);
  console.log(`[yahooService] fetch ${symbol} -> ${url}`);

  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com/"
      },
      timeout: 15000
    });

    const html = res.data;
    const $ = cheerio.load(html);

    // price span on page, if yahoo changes dom this will break
    const priceText = $('[data-testid="qsp-price"]').first().text().trim();

    if (!priceText) {
      console.error(`[yahooService] price span not found for ${symbol}`);
      return null;
    }

    const price = parseFloat(priceText.replace(/,/g, ""));
    if (isNaN(price)) {
      console.error(`[yahooService] parsed price not num:`, priceText);
      return null;
    }

    return { symbol, price, price_at: new Date() };
  } catch (err) {
    console.error(`[yahooService] err fetching ${symbol}:`, err.message);
    return null;
  }
}

module.exports = { fetchYahooPrice };
