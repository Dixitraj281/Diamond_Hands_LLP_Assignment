const cheerio = require("cheerio");

function fetchPrice(html) {
  const $ = cheerio.load(html);
  const prices = $("td:nth-child(6)")
    .get()
    .map(val => $(val).text().trim());
  return prices;
}

module.exports = { fetchPrice };
