// frontend/src/api/api.js
const ROOT =
  (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// If no env provided (local dev), fall back to same-origin
const ORIGIN = ROOT || (typeof window !== "undefined" ? window.location.origin : "");

// Always talk to /api on that origin
const API_BASE = `${ORIGIN}/api`;

async function jsonOrThrow(res) {
  const text = await res.text();
  try {
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw data || { message: res.statusText };
    return data;
  } catch (err) {
    if (!res.ok) throw { message: text || res.statusText };
    return null;
  }
}

export async function createUser(payload) {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export async function getUsers() {
  const res = await fetch(`${API_BASE}/users`);
  return jsonOrThrow(res);
}

export async function postReward(payload) {
  const res = await fetch(`${API_BASE}/reward`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export async function getPortfolio(userId) {
  const res = await fetch(`${API_BASE}/portfolio/${encodeURIComponent(userId)}`);
  return jsonOrThrow(res);
}

export async function getTodayStocks(userId) {
  const res = await fetch(`${API_BASE}/today-stocks/${encodeURIComponent(userId)}`);
  return jsonOrThrow(res);
}

export async function getStats(userId) {
  const res = await fetch(`${API_BASE}/stats/${encodeURIComponent(userId)}`);
  return jsonOrThrow(res);
}

export async function getHistoricalINR(userId) {
  const res = await fetch(`${API_BASE}/historical-inr/${encodeURIComponent(userId)}`);
  return jsonOrThrow(res);
}
