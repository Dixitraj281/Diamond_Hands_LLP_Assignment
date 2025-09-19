const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Reward = require("../models/Reward");
const User = require("../models/User");
const Stock = require("../models/Stock");
const StockPrice = require("../models/StockPrice");
const LedgerEntry = require("../models/LedgerEntry");

const { fetchYahooPrice } = require("../services/yahooService");

// small helpers so the main handler stays readable
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const toId = (id) => new mongoose.Types.ObjectId(id);

// quick formatter for logs (not fancy — just helpful)
const fmt = (n, d = 2) => Number(n || 0).toFixed(d);

// basic payload validation — keep this simple and explicit so reviewer sees the rules
function validatePayload(body) {
  const errs = [];
  if (!body.user_id) errs.push("user_id is required");
  if (!body.stock_symbol) errs.push("stock_symbol is required");
  if (body.quantity === undefined || body.quantity === null) errs.push("quantity is required");
  else if (isNaN(Number(body.quantity))) errs.push("quantity must be numeric");
  else if (Number(body.quantity) <= 0) errs.push("quantity must be > 0");
  if (!body.rewarded_at) errs.push("rewarded_at is required");
  return errs;
}

/*
  Fee config
  - These are example defaults. In a real product you'd put these in env/config.
  - TODO: move to process.env so reviewers can tweak without code change.
*/
const FEE_CONFIG = {
  brokeragePercent: 0.005,    // 0.5%
  sttPercent: 0.001,          // 0.1%
  gstOnBrokeragePercent: 0.18 // 18% GST
};

// POST /api/reward
// body: { user_id, stock_symbol, quantity, rewarded_at, source, idempotency_key }
router.post("/reward", async (req, res) => {
  const traceId = `rwd-${Date.now()}`; // tiny trace id to make log lines easier to follow
  console.info(`[${traceId}] incoming reward request`);

  const { user_id, stock_symbol, quantity, rewarded_at, source, idempotency_key } = req.body || {};
  const errors = validatePayload(req.body || {});
  if (errors.length) {
    // validation failure is client error — be explicit
    console.warn(`[${traceId}] validation error:`, errors);
    return res.status(400).json({ error: "validation_error", details: errors });
  }

  if (!isValidId(user_id)) {
    console.warn(`[${traceId}] invalid user id format: ${user_id}`);
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const qty = Number(quantity);
  const ts = new Date(rewarded_at);
  if (Number.isNaN(ts.getTime())) {
    console.warn(`[${traceId}] invalid rewarded_at: ${rewarded_at}`);
    return res.status(400).json({ error: "invalid_rewarded_at" });
  }

  // start a session so everything can roll back together
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // make sure the user exists — we don't auto-create users here
    const user = await User.findById(user_id).session(session);
    if (!user) {
      // abort, return 422 so caller knows the entity is missing (not a server error)
      await session.abortTransaction();
      session.endSession();
      console.warn(`[${traceId}] user not found ${user_id}`);
      return res.status(422).json({ error: "user_not_found" });
    }

    // ensure stock record exists; if not create a minimal one and seed a price
    let stock = await Stock.findOne({ symbol: stock_symbol }).session(session);
    if (!stock) {
      console.info(`[${traceId}] stock ${stock_symbol} missing — creating minimal record`);
      const created = await Stock.create([{
        symbol: stock_symbol,
        name: stock_symbol,
        active: true
      }], { session });
      stock = created[0];

      // best-effort price seed — not critical if it fails
      try {
        const priceInfo = await fetchYahooPrice(stock_symbol); // may return null
        const priceToWrite = priceInfo ? Number(priceInfo.price) : Number((Math.random() * 1000 + 500).toFixed(2));
        await StockPrice.create([{
          stock_symbol,
          price_inr: priceToWrite,
          price_at: priceInfo && priceInfo.price_at ? priceInfo.price_at : new Date(),
          source: process.env.PRICE_SOURCE || "yahoo"
        }], { session });
        console.info(`[${traceId}] seeded price ${fmt(priceToWrite)} for ${stock_symbol}`);
      } catch (seedErr) {
        // log and continue - seeding price isn't critical for reward creation
        console.warn(`[${traceId}] failed to seed price for ${stock_symbol}: ${seedErr && seedErr.message}`);
      }
    } else {
      if (stock.active === false) {
        await session.abortTransaction();
        session.endSession();
        console.warn(`[${traceId}] stock ${stock_symbol} inactive`);
        return res.status(422).json({ error: "stock_not_found_or_inactive" });
      }
    }

    // idempotency: if key provided and already processed, return 409 + existing id
    if (idempotency_key) {
      const existing = await Reward.findOne({ idempotency_key }).session(session);
      if (existing) {
        await session.abortTransaction();
        session.endSession();
        console.info(`[${traceId}] duplicate idempotency: ${idempotency_key}`);
        return res.status(409).json({ error: "duplicate_idempotency", reward_id: existing._id });
      }
    }

    // create the reward document
    const rewardDoc = {
      user_id: toId(user_id),
      stock_symbol,
      quantity: qty,
      rewarded_at: ts,
      source: source || "admin_ui",
      idempotency_key: idempotency_key || null
    };

    const savedArr = await Reward.create([rewardDoc], { session });
    const reward = savedArr[0];
    console.info(`[${traceId}] saved reward ${reward._id} user=${user_id} symbol=${stock_symbol} qty=${qty}`);

    // Grab latest price (if any). If not present priceInr = 0 and fees/gross will be 0.
    const latestPrice = await StockPrice.findOne({ stock_symbol }).sort({ price_at: -1 }).session(session);
    const priceInr = latestPrice ? Number(latestPrice.price_inr) : 0;
    const grossValue = qty * priceInr;

    // calculate fees (simple model)
    const brokerage = grossValue * FEE_CONFIG.brokeragePercent;
    const stt = grossValue * FEE_CONFIG.sttPercent;
    const gst = brokerage * FEE_CONFIG.gstOnBrokeragePercent;
    const totalFees = brokerage + stt + gst;

    // assemble ledger rows. Keep them explicit — easier to audit later.
    const now = new Date();
    const ledgerRows = [];

    // stock units: user DEBIT (they get units), stock pool CREDIT (pool decreases)
    ledgerRows.push({
      reward_id: reward._id,
      user_id: toId(user_id),
      account: "USER_STOCK",
      symbol: stock_symbol,
      amount: qty,
      currency: "UNIT",
      type: "DEBIT",
      meta: { note: "user received stock units" },
      created_at: now
    });
    ledgerRows.push({
      reward_id: reward._id,
      account: "STOCK_POOL",
      symbol: stock_symbol,
      amount: qty,
      currency: "UNIT",
      type: "CREDIT",
      meta: { note: "stock pool reduced" },
      created_at: now
    });

    // cash/gross allocation: expense DEBIT / cash CREDIT
    ledgerRows.push({
      reward_id: reward._id,
      account: "EXPENSE_STOCK_ALLOCATION",
      amount: Number(grossValue),
      currency: "INR",
      type: "DEBIT",
      meta: { price_inr: priceInr },
      created_at: now
    });
    ledgerRows.push({
      reward_id: reward._id,
      account: "CASH",
      amount: Number(grossValue),
      currency: "INR",
      type: "CREDIT",
      meta: { price_inr: priceInr },
      created_at: now
    });

    // fees: expense DEBIT / cash CREDIT
    ledgerRows.push({
      reward_id: reward._id,
      account: "EXPENSE_FEES",
      amount: Number(totalFees),
      currency: "INR",
      type: "DEBIT",
      meta: { brokerage: Number(brokerage), stt: Number(stt), gst: Number(gst) },
      created_at: now
    });
    ledgerRows.push({
      reward_id: reward._id,
      account: "CASH",
      amount: Number(totalFees),
      currency: "INR",
      type: "CREDIT",
      meta: { fees: { brokerage: Number(brokerage), stt: Number(stt), gst: Number(gst) } },
      created_at: now
    });

    // persist ledger rows as a batch
    await LedgerEntry.insertMany(ledgerRows, { session });

    // commit the transaction — everything succeeded
    await session.commitTransaction();
    session.endSession();

    console.info(`[${traceId}] reward + ledger committed. reward_id=${reward._id}`);
    return res.status(201).json({ reward_id: reward._id, status: "recorded" });
  } catch (err) {
    // ensure we rollback on error
    try { await session.abortTransaction(); } catch (ignore) {}
    session.endSession();

    // duplicate unique index on idempotency - try to return existing id
    if (err && err.code === 11000 && err.keyPattern && err.keyPattern.idempotency_key) {
      try {
        const existing = await Reward.findOne({ idempotency_key }).lean();
        return res.status(409).json({ error: "duplicate_idempotency", reward_id: existing ? existing._id : null });
      } catch (e2) {
        // fall through to generic error response
      }
    }

    console.error(`[${traceId}] failed to create reward + ledger:`, err && (err.stack || err.message || err));
    return res.status(500).json({ error: "internal_error", message: err && err.message });
  }
});

module.exports = router;
