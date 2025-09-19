// frontend/src/pages/UserPortal.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPortfolio, getTodayStocks, getHistoricalINR, getStats } from "../api/api";

export default function UserPortal() {
  const params = useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState(params.userId || "");
  const [portfolio, setPortfolio] = useState([]);
  const [todayItems, setTodayItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState({
    portfolio: false,
    today: false,
    history: false,
    stats: false
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    loadPortfolio();
    loadStats();
    navigate(`/user/${encodeURIComponent(userId)}`, { replace: true });
  }, [userId]);

  async function loadPortfolio() {
    setError(null);
    setLoading(l => ({ ...l, portfolio: true }));
    try {
      const res = await getPortfolio(userId);
      setPortfolio(res.portfolio || []);
    } catch (e) {
      setError(e);
      setPortfolio([]);
    } finally {
      setLoading(l => ({ ...l, portfolio: false }));
    }
  }

  async function loadStats() {
    setError(null);
    setLoading(l => ({ ...l, stats: true }));
    try {
      const res = await getStats(userId);
      setStats(res);
    } catch (e) {
      setError(e);
      setStats(null);
    } finally {
      setLoading(l => ({ ...l, stats: false }));
    }
  }

  async function handleTodayClick() {
    setError(null);
    setLoading(l => ({ ...l, today: true }));
    try {
      const res = await getTodayStocks(userId);
      setTodayItems(res.items || []);
    } catch (e) {
      setError(e);
      setTodayItems([]);
    } finally {
      setLoading(l => ({ ...l, today: false }));
    }
  }

  async function handleHistoryClick() {
    setError(null);
    setLoading(l => ({ ...l, history: true }));
    try {
      const res = await getHistoricalINR(userId);
      setHistory(res.history || []);
    } catch (e) {
      setError(e);
      setHistory([]);
    } finally {
      setLoading(l => ({ ...l, history: false }));
    }
  }

  const totalValue = portfolio.reduce((s, p) => s + (Number(p.value_inr || 0)), 0);

  return (
    <div className="user-root">
      <div className="user-card">
        <header className="user-hero">
          <h1 className="user-title">User Portfolio</h1>
          <p className="user-sub">Inspect a user’s rewards and portfolio value.</p>
        </header>

        <section className="user-controls">
          <label className="label">User ID</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              placeholder="Paste user ObjectId (or use seeded id)"
              value={userId}
              onChange={e => setUserId(e.target.value)}
            />
            <button
              className="cta"
              onClick={() => { if (userId) { loadPortfolio(); loadStats(); } }}
              disabled={!userId}
            >
              Load
            </button>
            <button
              className="ghost"
              onClick={() => {
                setUserId("");
                setPortfolio([]);
                setTodayItems([]);
                setHistory([]);
                setStats(null);
                setError(null);
                navigate("/user/");
              }}
            >
              Clear
            </button>
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="ghost" onClick={handleTodayClick} disabled={!userId || loading.today}>
              {loading.today ? "Loading…" : "Show Today's Rewards"}
            </button>
            <button className="ghost" onClick={loadStats} disabled={!userId || loading.stats}>
              {loading.stats ? "Loading…" : "Show Stats"}
            </button>
            <button className="ghost" onClick={handleHistoryClick} disabled={!userId || loading.history}>
              {loading.history ? "Loading…" : "Show Historical INR"}
            </button>
            <div style={{ marginLeft: "auto", textAlign: "right", color: "#666", fontSize: 13 }}>
              Portfolio total: <strong>₹ {totalValue.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: "6px 0 12px 0" }}>Portfolio</h3>
          {loading.portfolio ? (
            <div>Loading portfolio...</div>
          ) : (
            <div className="table-wrap">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th style={{ textAlign: "right" }}>Quantity</th>
                    <th style={{ textAlign: "right" }}>Price INR</th>
                    <th style={{ textAlign: "right" }}>Value INR</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "#777" }}>No holdings</td>
                    </tr>
                  ) : (
                    portfolio.map(p => (
                      <tr key={p.stock_symbol}>
                        <td>{p.stock_symbol}</td>
                        <td style={{ textAlign: "right" }}>{Number(p.quantity).toFixed(6)}</td>
                        <td style={{ textAlign: "right" }}>{Number(p.price_inr || 0).toFixed(4)}</td>
                        <td style={{ textAlign: "right" }}>{Number(p.value_inr || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {portfolio.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>₹ {totalValue.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: "6px 0 12px 0" }}>Today's Rewards</h3>
          {loading.today ? (
            <div>Loading today's rewards...</div>
          ) : todayItems.length === 0 ? (
            <div style={{ color: "#666" }}>No rewards today</div>
          ) : (
            (() => {
              const agg = {};
              todayItems.forEach(it => {
                const key = it.stock_symbol;
                const qty = Number(it.quantity || 0);
                const price = Number(it.latest_price || 0);
                const value = Number(it.inr_value || (qty * price || 0));
                if (!agg[key]) agg[key] = { stock_symbol: key, quantity: 0, price_inr: price, value_inr: 0 };
                agg[key].quantity += qty;
                agg[key].price_inr = price || agg[key].price_inr;
                agg[key].value_inr += value;
              });
              const rows = Object.values(agg);
              const total = rows.reduce((s, r) => s + (r.value_inr || 0), 0);
              return (
                <div className="table-wrap">
                  <table className="styled-table compact">
                    <thead>
                      <tr>
                        <th>Stock</th>
                        <th style={{ textAlign: "right" }}>Quantity</th>
                        <th style={{ textAlign: "right" }}>Price (₹)</th>
                        <th style={{ textAlign: "right" }}>Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.stock_symbol}>
                          <td>{r.stock_symbol}</td>
                          <td style={{ textAlign: "right" }}>{Number(r.quantity).toFixed(6)}</td>
                          <td style={{ textAlign: "right" }}>{Number(r.price_inr || 0).toFixed(2)}</td>
                          <td style={{ textAlign: "right" }}>{Number(r.value_inr || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
                        <td></td>
                        <td></td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>₹ {total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()
          )}
        </section>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: "6px 0 12px 0" }}>Stats</h3>
          {loading.stats ? (
            <div>Loading stats...</div>
          ) : stats ? (
            <div>
              <h4 style={{ margin: "6px 0" }}>Total shares rewarded today</h4>
              {(!stats.today || stats.today.length === 0) ? (
                <div style={{ color: "#666" }}>No rewards today</div>
              ) : (
                <table className="styled-table">
                  <thead>
                    <tr>
                      <th>Stock</th>
                      <th style={{ textAlign: "right" }}>Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.today.map((item) => (
                      <tr key={item.stock}>
                        <td>{item.stock}</td>
                        <td style={{ textAlign: "right" }}>{Number(item.total_qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div style={{ color: "#666" }}>No stats available</div>
          )}
        </section>

        <section style={{ marginTop: 18 }}>
          <h3 style={{ margin: "6px 0 12px 0" }}>Historical INR (up to yesterday)</h3>
          {loading.history ? (
            <div>Loading historical...</div>
          ) : history.length === 0 ? (
            <div style={{ color: "#666" }}>No historical data</div>
          ) : (
            <table className="styled-table">
              <thead>
                <tr><th>Date</th><th style={{ textAlign: "right" }}>Total INR</th></tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.date}>
                    <td>{h.date}</td>
                    <td style={{ textAlign: "right" }}>₹ {Number(h.total_inr).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
