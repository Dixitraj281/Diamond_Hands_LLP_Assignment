require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const usersRouter = require("./routes/users");
const rewardsRouter = require("./routes/rewards");
const statsRouter = require("./routes/stats");

const { updatePrices } = require("./services/priceService");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : "*"
  })
);


app.get("/health", (req, res) => res.json({ status: "ok" }));


app.use("/api", rewardsRouter);
app.use("/api", statsRouter);
app.use("/api", usersRouter);

app.get("/api", (req, res) => {
  res.json({ message: "API running. Try /api/users or /api/health" });
});


const PORT = process.env.PORT || 8000;

(async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`server up at http://localhost:${PORT}`);
    });

    try {
      await updatePrices();
    } catch (err) {
      console.error("updatePrices on boot err:", err.message);
    }

    // periodic updater every 1hr
    setInterval(() => {
      updatePrices().catch(e => console.error("price updater err:", e.message));
    }, 1000 * 60 * 60);

  } catch (err) {
    console.error("server start fail:", err);
    process.exit(1);
  }
})();
