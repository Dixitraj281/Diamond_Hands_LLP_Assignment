const express = require("express");
const router = express.Router();
const User = require("../models/User");

// POST /api/users -> create user
router.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "name required" });
    }
    const user = await User.create({ name: name.trim(), email: email || null });
    return res.status(201).json({ user });
  } catch (err) {
    console.error("create user err:", err && (err.message || err));
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/users -> list users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    return res.json({ users });
  } catch (err) {
    console.error("get users err:", err && (err.message || err));
    return res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
