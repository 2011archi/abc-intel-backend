// alerts.js — Checks all 12 alert conditions every hour
const { fetchAllPrices, checkDropAlerts } = require("./market");
const {
  generateDropAlertMessage,
  generateMilestoneMessage,
} = require("./advisor");
const {
  sendDropAlert,
  sendSavingsRateAlert,
  sendMilestoneAlert,
  sendStaleDataAlert,
  sendOvertimeReminder,
  sendMonthlyRebalanceReminder,
} = require("./email");
const store = require("./store");

const RETIRE_GOAL = 4_000_000;
const BABY_GOAL   = 1_000_000;

// Milestones to track (retirement savings)
const RETIRE_MILESTONES = [500000, 1000000, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000];
const BABY_MILESTONES   = [100000, 250000, 500000, 750000, 1000000];

// Cooldown: don't send same drop alert more than once per 4 hours
const DROP_COOLDOWN_MS  = 4 * 60 * 60 * 1000;
// Don't send stale data more than once per 7 days
const STALE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function runAllAlertChecks() {
  console.log(`\n[${new Date().toISOString()}] Running alert checks...`);
  const data = store.load();
  const derived = store.computeDerivedValues(data);
  const { netWorth, investable, babyTotal, surplus, savRate, totalIncome } = derived;

  let priceData = {};
  try {
    priceData = await fetchAllPrices();
    console.log(`  Fetched ${Object.keys(priceData).length} prices`);
  } catch (err) {
    console.error("  Failed to fetch prices:", err.message);
  }

  const now = Date.now();
  const alerts = data.lastAlerts || {};

  // ── 1. DROP ALERTS (10%+ decline) ─────────────────────────────────────────
  if (Object.keys(priceData).length > 0) {
    const drops = checkDropAlerts(priceData, {});
    for (const drop of drops) {
      const lastSent = alerts.dropAlerts?.[drop.ticker] || 0;
      if (now - lastSent > DROP_COOLDOWN_MS) {
        console.log(`  ⚠️ Drop alert: ${drop.ticker} ${drop.changePct.toFixed(2)}%`);
        try {
          const msg = await generateDropAlertMessage([drop], data);
          await sendDropAlert(drop.ticker, drop.changePct, msg);
          if (!alerts.dropAlerts) alerts.dropAlerts = {};
          alerts.dropAlerts[drop.ticker] = now;
        } catch (err) {
          console.error(`  Failed drop alert for ${drop.ticker}:`, err.message);
        }
      }
    }
  }

  // ── 2. SAVINGS RATE BELOW 20% ──────────────────────────────────────────────
  if (savRate < 20 && totalIncome > 0) {
    const lastSent = alerts.savingsRateSent || 0;
    if (now - lastSent > 24 * 60 * 60 * 1000) { // once per day max
      console.log(`  ⚠️ Savings rate low: ${savRate.toFixed(1)}%`);
      const action = surplus > 0
        ? `You have $${surplus.toLocaleString()} unallocated. Move it to investments immediately.`
        : `Expenses exceed investable surplus. Review your budget in ABC Intel.`;
      await sendSavingsRateAlert(savRate, 30, surplus, action);
      alerts.savingsRateSent = now;
    }
  }

  // ── 3. RETIREMENT MILESTONES ───────────────────────────────────────────────
  for (const milestone of RETIRE_MILESTONES) {
    if (investable >= milestone) {
      const key = `retire_${milestone}`;
      if (!alerts.milestones?.[key]) {
        console.log(`  🏆 Retirement milestone: $${(milestone/1e3).toFixed(0)}K!`);
        try {
          const msg = await generateMilestoneMessage(
            `Retirement Savings Hit $${(milestone/1e3).toFixed(0)}K!`,
            investable,
            RETIRE_GOAL
          );
          await sendMilestoneAlert(`Retirement Savings: $${(milestone/1e3).toFixed(0)}K`, msg);
          if (!alerts.milestones) alerts.milestones = {};
          alerts.milestones[key] = now;
        } catch (err) {
          console.error("  Milestone alert failed:", err.message);
        }
      }
    }
  }

  // ── 4. BABY PATEL MILESTONES ───────────────────────────────────────────────
  for (const milestone of BABY_MILESTONES) {
    if (babyTotal >= milestone) {
      const key = `baby_${milestone}`;
      if (!alerts.milestones?.[key]) {
        console.log(`  👑 Baby Patel milestone: $${(milestone/1e3).toFixed(0)}K!`);
        try {
          const msg = await generateMilestoneMessage(
            `Baby Patel Fund Hit $${(milestone/1e3).toFixed(0)}K!`,
            babyTotal,
            BABY_GOAL
          );
          await sendMilestoneAlert(`👑 Baby Patel: $${(milestone/1e3).toFixed(0)}K`, msg);
          if (!alerts.milestones) alerts.milestones = {};
          alerts.milestones[key] = now;
        } catch (err) {
          console.error("  Baby milestone alert failed:", err.message);
        }
      }
    }
  }

  // ── 5. STALE DATA (30+ days since update) ─────────────────────────────────
  if (data.lastUpdated) {
    const daysSince = Math.floor((now - new Date(data.lastUpdated)) / (1000 * 60 * 60 * 24));
    if (daysSince >= 30) {
      const lastSent = alerts.staleDataSent || 0;
      if (now - lastSent > STALE_COOLDOWN_MS) {
        console.log(`  📭 Stale data: ${daysSince} days`);
        await sendStaleDataAlert(daysSince);
        alerts.staleDataSent = now;
      }
    }
  }

  // ── 6. OVERTIME REMINDER (if overtime logged but not invested) ────────────
  if (data.overtimeAvg > 0) {
    const lastSent = alerts.overtimeSent || 0;
    if (now - lastSent > 7 * 24 * 60 * 60 * 1000) { // once per week
      console.log(`  ⚡ Overtime reminder: $${data.overtimeAvg}`);
      await sendOvertimeReminder(data.overtimeAvg);
      alerts.overtimeSent = now;
    }
  }

  // ── 7. MONTHLY REBALANCE (1st of month) ───────────────────────────────────
  const today = new Date();
  if (today.getDate() === 1) {
    const monthKey = `rebalance_${today.getFullYear()}_${today.getMonth()}`;
    if (!alerts.milestones?.[monthKey]) {
      console.log("  📈 Monthly rebalance reminder");
      await sendMonthlyRebalanceReminder(data.holdings || {}, priceData);
      if (!alerts.milestones) alerts.milestones = {};
      alerts.milestones[monthKey] = now;
    }
  }

  // Save updated alert state
  store.save({ ...data, lastAlerts: alerts });
  console.log("  ✅ Alert checks complete\n");
}

module.exports = { runAllAlertChecks };
