require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "ABC Intel Backend — LIVE",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── LIVE PRICES ───────────────────────────────────────────────────────────────
app.get("/api/prices", async (req, res) => {
  try {
    const market = require("./market");
    const tickers = req.query.tickers ? req.query.tickers.split(",") : market.ALL_TICKERS;
    const prices = await market.fetchAllPrices(tickers);
    res.json({ success: true, prices, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Price fetch error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── TRIGGER DAILY BRIEFING ────────────────────────────────────────────────────
app.all("/api/trigger/daily-briefing", async (req, res) => {
  res.json({ success: true, message: "Daily briefing triggered" });
  try {
    const market  = require("./market");
    const advisor = require("./advisor");
    const email   = require("./email");
    const store   = require("./store");
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();
    const content = await advisor.generateDailyBriefing({ ...data, ...derived }, prices, new Date().toDateString());
    await email.sendDailyBriefing(content);
    console.log("✅ Daily briefing sent");
  } catch (err) {
    console.error("❌ Daily briefing failed:", err.message);
  }
});

// ── TRIGGER WEEKLY REPORT ─────────────────────────────────────────────────────
app.all("/api/trigger/weekly-report", async (req, res) => {
  res.json({ success: true, message: "Weekly report triggered" });
  try {
    const market  = require("./market");
    const advisor = require("./advisor");
    const email   = require("./email");
    const store   = require("./store");
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();
    const content = await advisor.generateWeeklyReport({ ...data, ...derived }, prices, {});
    await email.sendWeeklyReport(content);
    console.log("✅ Weekly report sent");
  } catch (err) {
    console.error("❌ Weekly report failed:", err.message);
  }
});

// ── TRIGGER ALERTS ────────────────────────────────────────────────────────────
app.all("/api/trigger/alerts", async (req, res) => {
  res.json({ success: true, message: "Alert checks triggered" });
  try {
    const alerts = require("./alerts");
    await alerts.runAllAlertChecks();
    console.log("✅ Alert checks complete");
  } catch (err) {
    console.error("❌ Alert checks failed:", err.message);
  }
});

// ── TRIGGER BUY/SELL SIGNALS ──────────────────────────────────────────────────
app.all("/api/trigger/signals", async (req, res) => {
  res.json({ success: true, message: "Buy/sell signals triggered" });
  try {
    const market  = require("./market");
    const advisor = require("./advisor");
    const email   = require("./email");
    const store   = require("./store");
    const data    = store.load();
    const prices  = await market.fetchAllPrices();
    const signals = await advisor.generateBuySellSignals(prices, data.holdings || {});
    await email.sendBuySellSignals(signals);
    console.log("✅ Buy/sell signals sent");
  } catch (err) {
    console.error("❌ Buy/sell signals failed:", err.message);
  }
});

// ── GET DATA ──────────────────────────────────────────────────────────────────
app.get("/api/data", (req, res) => {
  try {
    const store   = require("./store");
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    res.json({ success: true, data, derived });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── UPDATE DATA ───────────────────────────────────────────────────────────────
app.post("/api/data", (req, res) => {
  try {
    const store   = require("./store");
    const updated = store.update(req.body);
    const derived = store.computeDerivedValues(updated);
    res.json({ success: true, data: updated, derived });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI ADVISOR ────────────────────────────────────────────────────────────────
app.post("/api/advisor/analyze", async (req, res) => {
  try {
    const market  = require("./market");
    const advisor = require("./advisor");
    const store   = require("./store");
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();
    const analysis = await advisor.generateDailyBriefing({ ...data, ...derived }, prices, new Date().toDateString());
    res.json({ success: true, analysis, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/advisor/signals", async (req, res) => {
  try {
    const market  = require("./market");
    const advisor = require("./advisor");
    const store   = require("./store");
    const data    = store.load();
    const prices  = await market.fetchAllPrices();
    const signals = await advisor.generateBuySellSignals(prices, data.holdings || {});
    res.json({ success: true, signals, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`◈ ABC INTEL BACKEND — LIVE on port ${PORT}`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);

  // Start cron jobs AFTER server is up
  try {
    const cron = require("node-cron");
    // Daily briefing 8AM EST
    cron.schedule("0 13 * * *", async () => {
      try {
        const market  = require("./market");
        const advisor = require("./advisor");
        const email   = require("./email");
        const store   = require("./store");
        const data    = store.load();
        const derived = store.computeDerivedValues(data);
        const prices  = await market.fetchAllPrices();
        const content = await advisor.generateDailyBriefing({ ...data, ...derived }, prices, new Date().toDateString());
        await email.sendDailyBriefing(content);
        console.log("✅ [CRON] Daily briefing sent");
      } catch (err) { console.error("❌ [CRON] Daily briefing:", err.message); }
    }, { timezone: "America/New_York" });

    // Weekly report Sunday 9AM EST
    cron.schedule("0 9 * * 0", async () => {
      try {
        const market  = require("./market");
        const advisor = require("./advisor");
        const email   = require("./email");
        const store   = require("./store");
        const data    = store.load();
        const derived = store.computeDerivedValues(data);
        const prices  = await market.fetchAllPrices();
        const content = await advisor.generateWeeklyReport({ ...data, ...derived }, prices, {});
        await email.sendWeeklyReport(content);
        console.log("✅ [CRON] Weekly report sent");
      } catch (err) { console.error("❌ [CRON] Weekly report:", err.message); }
    }, { timezone: "America/New_York" });

    // Hourly alert checks
    cron.schedule("0 6-22 * * *", async () => {
      try {
        const alerts = require("./alerts");
        await alerts.runAllAlertChecks();
      } catch (err) { console.error("❌ [CRON] Alerts:", err.message); }
    }, { timezone: "America/New_York" });

    console.log("✅ All cron jobs scheduled");
  } catch (err) {
    console.error("❌ Cron setup failed:", err.message);
  }
});
