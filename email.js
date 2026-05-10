// email.js — SendGrid email sender with beautiful HTML templates
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const ALERT_EMAIL = process.env.ALERT_EMAIL || "abcintel012525@gmail.com";
const FROM_EMAIL  = "abcintel@yourdomain.com"; // update with your verified SendGrid sender

// ── HTML EMAIL WRAPPER ────────────────────────────────────────────────────────
function wrapHtml(title, body, accentColor = "#00ff9d") {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#060910;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:22px;font-weight:900;letter-spacing:4px;color:${accentColor};">◈ ABC INTEL</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:2px;margin-top:4px;">AUTOMATED WEALTH INTELLIGENCE</div>
    </div>

    <!-- Title -->
    <div style="padding:20px 0 8px;">
      <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;">${title}</h1>
      <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:4px;">${new Date().toLocaleString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
    </div>

    <!-- Body -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px;margin:12px 0;white-space:pre-wrap;line-height:1.8;font-size:14px;color:rgba(255,255,255,0.85);">
${body}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px 0;font-size:10px;color:rgba(255,255,255,0.2);">
      ABC Intel · Automated Financial Intelligence · Not financial advice<br>
      For Bhavesh Patel · Retire by 60 · $4M Goal · Baby Patel $1M
    </div>
  </div>
</body>
</html>`;
}

// ── SEND FUNCTIONS ────────────────────────────────────────────────────────────

async function sendDailyBriefing(content) {
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `🌅 ABC Intel Daily Briefing — ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}`,
    html: wrapHtml("📊 Your Daily Financial Briefing", content, "#fbbf24"),
    text: content,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Daily briefing sent");
    return true;
  } catch (err) {
    console.error("❌ Daily briefing failed:", err.response?.body || err.message);
    return false;
  }
}

async function sendWeeklyReport(content) {
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `📊 ABC Intel Weekly Wealth Report — Week of ${new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"})}`,
    html: wrapHtml("📊 Weekly Wealth Report", content, "#a78bfa"),
    text: content,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Weekly report sent");
    return true;
  } catch (err) {
    console.error("❌ Weekly report failed:", err.response?.body || err.message);
    return false;
  }
}

async function sendDropAlert(ticker, changePct, aiMessage) {
  const severity = changePct <= -10 ? "🔴 CRITICAL" : "⚠️ WARNING";
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `${severity}: ${ticker} dropped ${Math.abs(changePct).toFixed(1)}% — Action Required`,
    html: wrapHtml(
      `${severity}: ${ticker} Dropped ${Math.abs(changePct).toFixed(1)}%`,
      `📉 ${ticker} is down ${Math.abs(changePct).toFixed(2)}% today.\n\n${aiMessage}`,
      "#ff4560"
    ),
    text: `${ticker} dropped ${changePct.toFixed(2)}%\n\n${aiMessage}`,
  };
  try {
    await sgMail.send(msg);
    console.log(`✅ Drop alert sent for ${ticker}`);
    return true;
  } catch (err) {
    console.error("❌ Drop alert failed:", err.message);
    return false;
  }
}

async function sendSavingsRateAlert(currentRate, targetRate, surplus, action) {
  const content = `⚠️ Your savings rate has dropped to ${currentRate.toFixed(1)}%\n\nTarget: ${targetRate}%+\nYou have $${surplus.toLocaleString()}/month unallocated.\n\n${action}`;
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `⚠️ ABC Intel: Savings Rate Alert — ${currentRate.toFixed(1)}% (Target: ${targetRate}%+)`,
    html: wrapHtml("⚠️ Savings Rate Below Target", content, "#fbbf24"),
    text: content,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Savings rate alert sent");
  } catch (err) {
    console.error("❌ Savings rate alert failed:", err.message);
  }
}

async function sendMilestoneAlert(milestone, message) {
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `🏆 ABC Intel: Milestone Achieved — ${milestone}`,
    html: wrapHtml(`🏆 ${milestone}`, message, "#34d399"),
    text: message,
  };
  try {
    await sgMail.send(msg);
    console.log(`✅ Milestone alert sent: ${milestone}`);
  } catch (err) {
    console.error("❌ Milestone alert failed:", err.message);
  }
}

async function sendStaleDataAlert(daysSinceUpdate) {
  const content = `📭 It has been ${daysSinceUpdate} days since you last updated your portfolio data in ABC Intel.\n\nYour AI advisor is working with outdated numbers. Please open ABC Intel and update your balances for accurate analysis and alerts.\n\n→ Update Assets\n→ Update Holdings\n→ Review Budget`;
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `📭 ABC Intel: Portfolio data is ${daysSinceUpdate} days old — Please update`,
    html: wrapHtml("📭 Data Update Reminder", content, "#94a3b8"),
    text: content,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Stale data alert sent");
  } catch (err) {
    console.error("❌ Stale data alert failed:", err.message);
  }
}

async function sendBuySellSignals(signals) {
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `📈 ABC Intel: Buy/Sell/Hold Signals — ${new Date().toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}`,
    html: wrapHtml("📈 AI Buy/Sell/Hold Signals", signals, "#60a5fa"),
    text: signals,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Buy/sell signals sent");
  } catch (err) {
    console.error("❌ Buy/sell signals failed:", err.message);
  }
}

async function sendOvertimeReminder(overtimeAmount) {
  const content = `⚡ Overtime income detected: $${overtimeAmount.toLocaleString()}\n\nABC Intel Rule: 100% of overtime goes directly to investments.\n\nRecommended allocation:\n→ $${Math.round(overtimeAmount*0.5).toLocaleString()} → Brokerage (VOO)\n→ $${Math.round(overtimeAmount*0.3).toLocaleString()} → 401K top-up\n→ $${Math.round(overtimeAmount*0.2).toLocaleString()} → Baby Patel fund\n\nDo NOT spend overtime. Invest it immediately.`;
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `⚡ ABC Intel: Invest Your Overtime — $${overtimeAmount.toLocaleString()}`,
    html: wrapHtml("⚡ Overtime Investment Reminder", content, "#fbbf24"),
    text: content,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Overtime reminder sent");
  } catch (err) {
    console.error("❌ Overtime reminder failed:", err.message);
  }
}

async function sendMonthlyRebalanceReminder(holdings, prices) {
  const content = `📈 Monthly Portfolio Rebalance Check\n\nIt's the 1st of the month — time to review your allocation.\n\nYour current holdings:\n${Object.entries(holdings).map(([acc, funds]) => `${acc}: ${funds.map(f=>`${f.ticker} ${f.pct}%`).join(", ")}`).join("\n")}\n\nLog in to ABC Intel → Holdings tab to update values and check allocation percentages.\n\nTarget: 401K in VIIIX, IRA diversified (VTI/VGT/VXUS), Brokerage in VOO + growth picks.`;
  const msg = {
    to: ALERT_EMAIL,
    from: FROM_EMAIL,
    subject: `📈 ABC Intel: Monthly Rebalance Reminder — ${new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}`,
    html: wrapHtml("📈 Monthly Portfolio Rebalance", content, "#a78bfa"),
    text: content,
  };
  try {
    await sgMail.send(msg);
    console.log("✅ Monthly rebalance reminder sent");
  } catch (err) {
    console.error("❌ Rebalance reminder failed:", err.message);
  }
}

module.exports = {
  sendDailyBriefing,
  sendWeeklyReport,
  sendDropAlert,
  sendSavingsRateAlert,
  sendMilestoneAlert,
  sendStaleDataAlert,
  sendBuySellSignals,
  sendOvertimeReminder,
  sendMonthlyRebalanceReminder,
};
