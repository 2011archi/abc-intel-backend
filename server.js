// server.js — ABC Intel Backend: Express + Cron + All Automation
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const cron    = require("node-cron");

const market  = require("./market");
const advisor = require("./advisor");
const email   = require("./email");
const alerts  = require("./alerts");
const store   = require("./store");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  const data    = store.load();
  const derived = store.computeDerivedValues(data);
  res.json({
    status:      "ABC Intel Backend — LIVE",
    version:     "1.0.0",
    netWorth:    derived.netWorth,
    lastUpdated: data.lastUpdated,
    timestamp:   new Date().toISOString(),
  });
});

// ── LIVE PRICES ───────────────────────────────────────────────────────────────
// Frontend calls this every 60s to get real prices
app.get("/api/prices", async (req, res) => {
  try {
    const tickers = req.query.tickers
      ? req.query.tickers.split(",")
      : market.ALL_TICKERS;
    const prices = await market.fetchAllPrices(tickers);
    res.json({ success: true, prices, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("Price fetch error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SINGLE TICKER ─────────────────────────────────────────────────────────────
app.get("/api/prices/:ticker", async (req, res) => {
  try {
    const quote = await market.fetchQuote(req.params.ticker.toUpperCase());
    if (!quote) return res.status(404).json({ success: false, error: "Ticker not found" });
    res.json({ success: true, quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PORTFOLIO VALUE (live prices applied to holdings) ─────────────────────────
app.get("/api/portfolio", async (req, res) => {
  try {
    const data      = store.load();
    const derived   = store.computeDerivedValues(data);
    const { portfolio, prices } = await market.calculatePortfolioValue(data.holdings || {});
    res.json({
      success:   true,
      netWorth:  derived.netWorth,
      investable: derived.investable,
      babyTotal: derived.babyTotal,
      surplus:   derived.surplus,
      savRate:   derived.savRate,
      portfolio,
      prices,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET/UPDATE FINANCIAL DATA ─────────────────────────────────────────────────
app.get("/api/data", (req, res) => {
  const data    = store.load();
  const derived = store.computeDerivedValues(data);
  res.json({ success: true, data, derived });
});

app.post("/api/data", (req, res) => {
  try {
    const updated = store.update(req.body);
    const derived = store.computeDerivedValues(updated);
    res.json({ success: true, data: updated, derived });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI ADVISOR (on-demand) ────────────────────────────────────────────────────
app.post("/api/advisor/analyze", async (req, res) => {
  try {
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();
    const analysis = await advisor.generateDailyBriefing(
      { ...data, ...derived },
      prices,
      new Date().toDateString()
    );
    res.json({ success: true, analysis, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/advisor/signals", async (req, res) => {
  try {
    const data   = store.load();
    const prices = await market.fetchAllPrices();
    const signals = await advisor.generateBuySellSignals(prices, data.holdings || {});
    res.json({ success: true, signals, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/advisor/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, error: "question required" });
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();

    const Anthropic = require("@anthropic-ai/sdk").default ||
                      require("@anthropic-ai/sdk");
    // Use direct Claude call for Q&A
    const axios   = require("axios");
    const context = `Bhavesh is 40, wants $4M by 60. Net worth: $${(derived.netWorth/1e6).toFixed(2)}M. 
Investable: $${(derived.investable/1e3).toFixed(0)}K. Baby Patel: $${(derived.babyTotal/1e3).toFixed(0)}K. 
Monthly surplus: $${derived.surplus}. Savings rate: ${derived.savRate.toFixed(1)}%.
Holdings: 401K in MDIZX/VIIIX/VBTIX, IRA in VTI/VGT/VXUS, Brokerage in VOO.`;

    const r = await axios.post("https://api.anthropic.com/v1/messages",
      { model: "claude-sonnet-4-20250514", max_tokens: 500,
        system: `You are ABC Intel, Bhavesh's AI financial advisor. Context: ${context}. Answer concisely and specifically.`,
        messages: [{ role: "user", content: question }] },
      { headers: { "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01", "content-type": "application/json" } }
    );
    const answer = r.data.content?.[0]?.text || "Unable to generate response";
    res.json({ success: true, answer, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── MANUAL TRIGGERS (for testing) ────────────────────────────────────────────
app.post("/api/trigger/daily-briefing", async (req, res) => {
  try {
    await runDailyBriefing();
    res.json({ success: true, message: "Daily briefing triggered" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/trigger/weekly-report", async (req, res) => {
  try {
    await runWeeklyReport();
    res.json({ success: true, message: "Weekly report triggered" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/trigger/alerts", async (req, res) => {
  try {
    await alerts.runAllAlertChecks();
    res.json({ success: true, message: "Alert checks triggered" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/trigger/signals", async (req, res) => {
  try {
    await runBuySellSignals();
    res.json({ success: true, message: "Buy/sell signals triggered" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AUTOMATION FUNCTIONS ──────────────────────────────────────────────────────
async function runDailyBriefing() {
  console.log(`[CRON] Daily briefing — ${new Date().toISOString()}`);
  try {
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();
    const content = await advisor.generateDailyBriefing(
      { ...data, ...derived },
      prices,
      new Date().toDateString()
    );
    await email.sendDailyBriefing(content);
    console.log("[CRON] Daily briefing sent ✅");
  } catch (err) {
    console.error("[CRON] Daily briefing failed:", err.message);
  }
}

async function runWeeklyReport() {
  console.log(`[CRON] Weekly report — ${new Date().toISOString()}`);
  try {
    const data    = store.load();
    const derived = store.computeDerivedValues(data);
    const prices  = await market.fetchAllPrices();
    const content = await advisor.generateWeeklyReport(
      { ...data, ...derived },
      prices,
      {}
    );
    await email.sendWeeklyReport(content);
    console.log("[CRON] Weekly report sent ✅");
  } catch (err) {
    console.error("[CRON] Weekly report failed:", err.message);
  }
}

async function runBuySellSignals() {
  console.log(`[CRON] Buy/sell signals — ${new Date().toISOString()}`);
  try {
    const data    = store.load();
    const prices  = await market.fetchAllPrices();
    const signals = await advisor.generateBuySellSignals(prices, data.holdings || {});
    await email.sendBuySellSignals(signals);
    console.log("[CRON] Buy/sell signals sent ✅");
  } catch (err) {
    console.error("[CRON] Buy/sell signals failed:", err.message);
  }
}

// ── CRON SCHEDULE ─────────────────────────────────────────────────────────────
// All times in EST (UTC-5). Railway runs in UTC so we adjust.

// 🌅 Daily briefing — 8:00 AM EST = 13:00 UTC
cron.schedule("0 13 * * *", runDailyBriefing, { timezone: "America/New_York" });

// 📈 Buy/sell signals — Mon-Fri 9:30 AM EST (market open)
cron.schedule("30 9 * * 1-5", runBuySellSignals, { timezone: "America/New_York" });

// 📊 Weekly report — Every Sunday 9:00 AM EST
cron.schedule("0 9 * * 0", runWeeklyReport, { timezone: "America/New_York" });

// 🔔 Hourly alert checks — every hour 6AM-10PM EST
cron.schedule("0 6-22 * * *", alerts.runAllAlertChecks, { timezone: "America/New_York" });

// 📉 Market drop check — every 15 min during market hours Mon-Fri 9:30AM-4PM EST
cron.schedule("*/15 9-16 * * 1-5", async () => {
  try {
    const prices = await market.fetchAllPrices();
    const drops  = market.checkDropAlerts(prices, {});
    if (drops.length > 0) {
      console.log(`[CRON] Drop check: ${drops.length} alerts found`);
      await alerts.runAllAlertChecks();
    }
  } catch (err) {
    console.error("[CRON] Drop check failed:", err.message);
  }
}, { timezone: "America/New_York" });

// ── START SERVER ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           ◈ ABC INTEL BACKEND — LIVE on :${PORT}           ║
╠══════════════════════════════════════════════════════════╣
║  🌅  Daily Briefing    → 8:00 AM EST every day           ║
║  📈  Buy/Sell Signals  → 9:30 AM EST Mon-Fri             ║
║  📊  Weekly Report     → 9:00 AM EST every Sunday        ║
║  🔔  Alert Checks      → Every hour 6AM-10PM EST         ║
║  📉  Drop Checks       → Every 15min during market hours ║
╠══════════════════════════════════════════════════════════╣
║  GET  /api/prices          → Live market prices          ║
║  GET  /api/portfolio       → Live portfolio value        ║
║  GET  /api/data            → Bhavesh's financial data    ║
║  POST /api/data            → Update financial data       ║
║  POST /api/advisor/analyze → On-demand AI analysis       ║
║  POST /api/advisor/signals → Buy/sell/hold signals       ║
║  POST /api/advisor/ask     → Ask AI a question           ║
║  POST /api/trigger/*       → Manual trigger any job      ║
╚══════════════════════════════════════════════════════════╝
  `);
});
