import React, { useState, useEffect } from "react";
import { postReward, createUser, getUsers } from "../api/api";
import { v4 as uuidv4 } from "uuid";

const INDIAN_STOCKS = [
  "JIOFIN.NS","TCS.NS","INFY.NS","HDFCBANK.NS","ICICIBANK.NS","HINDUNILVR.NS",
  "LT.NS","SBIN.NS","BAJFINANCE.NS","BHARTIARTL.NS","KOTAKBANK.NS","AXISBANK.NS",
  "ITC.NS","MARUTI.NS","M&M.NS","SUNPHARMA.NS","TATAMOTORS.NS","ONGC.NS",
  "POWERGRID.NS","ULTRACEMCO.NS"
];

export default function AdminPortal() {
  const [form, setForm] = useState({
    user_id: "",
    stock_symbol: INDIAN_STOCKS[0],
    quantity: "1",
    rewarded_at: new Date().toISOString().slice(0, 19),
    idempotency_key: ""
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const [newUser, setNewUser] = useState({ name: "", email: "" });
  const [users, setUsers] = useState([]);

  const updateField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSubmitReward(e) {
    e.preventDefault();
    setNotice(null);

    const errs = [];
    if (!form.user_id) errs.push("User ID is required");
    if (!form.stock_symbol) errs.push("Stock symbol is required");
    if (!form.quantity || Number(form.quantity) <= 0) errs.push("Quantity must be > 0");
    if (errs.length) {
      setNotice({ type: "error", text: errs.join(", ") });
      return;
    }

    setBusy(true);
    try {
      const payload = {
        user_id: form.user_id,
        stock_symbol: form.stock_symbol,
        quantity: Number(form.quantity),
        rewarded_at: new Date(form.rewarded_at).toISOString(),
        idempotency_key: form.idempotency_key || uuidv4(),
        source: "admin_ui"
      };

      console.info("reward payload:", payload);
      const res = await postReward(payload);
      console.info("reward response:", res);
      setNotice({ type: "success", text: `Reward recorded — id: ${res.reward_id}` });
      setForm(f => ({ ...f, idempotency_key: "" }));
    } catch (err) {
      console.error("reward err:", err);
      const msg = err?.message || JSON.stringify(err);
      setNotice({ type: "error", text: `Failed: ${msg}` });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setNotice(null);

    if (!newUser.name || newUser.name.trim().length < 2) {
      setNotice({ type: "error", text: "Name is required" });
      return;
    }

    try {
      const res = await createUser(newUser);
      setNewUser({ name: "", email: "" });
      setNotice({ type: "success", text: `User created — id: ${res.user._id}` });
      loadUsers();
    } catch (err) {
      console.error("create user err:", err);
      const msg = err?.message || "unknown error";
      setNotice({ type: "error", text: `Failed: ${msg}` });
    }
  }

  async function loadUsers() {
    try {
      const res = await getUsers();
      const usrList = res.users || [];
      setUsers(usrList);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="admin-root">
      <div className="admin-card">
        <div className="admin-hero">
          <h1 className="admin-title">Admin Portal</h1>
          <p className="admin-sub">Create users and reward them with stock shares.</p>
        </div>

        <form className="admin-form" onSubmit={handleCreateUser}>
          <h3>Create New User</h3>
          <label className="label">Name</label>
          <input
            className="input"
            placeholder="Full name"
            value={newUser.name}
            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
          />
          <label className="label">Email (optional)</label>
          <input
            className="input"
            placeholder="email@example.com"
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button className="cta" type="submit">Create User</button>
            <button
              type="button"
              className="ghost"
              onClick={() => setNewUser({ name: "", email: "" })}
            >
              Clear
            </button>
          </div>
        </form>

        <section style={{ marginTop: 20 }}>
          <h3>All Users</h3>
          <div className="table-wrap">
            <table className="styled-table compact">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#777" }}>
                      No users yet
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{u._id}</td>
                      <td>{u.name}</td>
                      <td>{u.email || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => {
                            updateField("user_id", u._id);
                            setNotice({ type: "info", text: `Using ${u.name} (${u._id})` });
                          }}
                        >
                          Use in Reward Form
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form className="admin-form" onSubmit={handleSubmitReward}>
          <h3 style={{ marginTop: 24 }}>Reward a User</h3>
          <label className="label">User ID</label>
          <input
            className="input"
            placeholder="Paste user id"
            value={form.user_id}
            onChange={e => updateField("user_id", e.target.value)}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <label className="label">Stock symbol</label>
              <select
                className="select"
                value={form.stock_symbol}
                onChange={e => updateField("stock_symbol", e.target.value)}
              >
                {INDIAN_STOCKS.map(s => (
                  <option key={s} value={s}>
                    {s.replace(".NS", " (NSE)")}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: 160 }}>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="number"
                step="0.000001"
                min="0.000001"
                value={form.quantity}
                onChange={e => updateField("quantity", e.target.value)}
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Rewarded at</label>
              <input
                className="input"
                type="datetime-local"
                value={form.rewarded_at}
                onChange={e => updateField("rewarded_at", e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <button className="cta" type="submit" disabled={busy}>
              {busy ? "Rewarding…" : "Reward User"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setForm({
                  user_id: "",
                  stock_symbol: INDIAN_STOCKS[0],
                  quantity: "1",
                  rewarded_at: new Date().toISOString().slice(0, 19),
                  idempotency_key: ""
                });
                setNotice(null);
              }}
            >
              Reset
            </button>
          </div>
          {notice && (
            <div
              className={`notice ${
                notice.type === "error" ? "notice-error" : notice.type === "success" ? "notice-success" : "notice-info"
              }`}
              style={{ marginTop: 12 }}
            >
              {notice.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
