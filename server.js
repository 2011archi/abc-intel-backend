// advisor.js — Real Claude AI financial advisor with live market data
const axios = require("axios");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function callClaude(systemPrompt, userPrompt, maxTokens = 1500) {
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-haiku-20240307",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    },
    {
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 30000,
    }
  );
  return res.data.content?.[0]?.text || "";
}

// ── DAILY BRIEFING ────────────────────────────────────────────────────────────
async function generateDailyBriefing(bhaveshData, prices, date) {
  const { netWorth, investable, babyTotal, surplus, savRate, holdings, totalIncome, totalExp } = bhaveshData;

  // Build portfolio performance summary
  const portfolioMovers = Object.entries(prices)
    .map(([t, d]) => ({ ticker: t, changePct: d.changePct, price: d.price, name: d.name }))
    .sort((a, b) => b.changePct - a.changePct);

  const topGainers = portfolioMovers.slice(0, 3);
  const topLosers  = portfolioMovers.slice(-3).reverse();

  const system = `You are ABC Intel — Bhavesh's personal AI financial advisor. 
He is 40, retiring at 60, needs $4M. Baby Patel arriving 2027, $1M goal by age 18.
He owns 20% of Instacare Pharmacy (compounding lab launching soon in Columbia MD).
He works night shifts (8PM-8AM), alternating 7 nights on / 7 nights off.
His wife Archana owns 41% of the same pharmacy.
Write like a sharp, caring financial advisor texting a close friend. Be specific. Be direct. No fluff.
Use dollar amounts. Reference his actual holdings. Keep under 400 words.`;

  const user = `Today is ${date}. Here is Bhavesh's complete financial picture:

NET WORTH: $${(netWorth/1e6).toFixed(2)}M
Investable assets: $${(investable/1e3).toFixed(0)}K
Baby Patel fund: $${(babyTotal/1e3).toFixed(0)}K
Monthly surplus: $${surplus.toLocaleString()}
Savings rate: ${savRate.toFixed(1)}%

TODAY'S MARKET MOVERS:
Top Gainers: ${topGainers.map(g=>`${g.ticker} ${g.changePct>0?"+":""}${g.changePct.toFixed(2)}%`).join(", ")}
Top Losers: ${topLosers.map(l=>`${l.ticker} ${l.changePct.toFixed(2)}%`).join(", ")}

HIS HOLDINGS (accounts with live prices):
401K ($${(bhaveshData.k401/1e3).toFixed(0)}K at Lincoln Financial): ${(holdings.k401||[]).map(h=>`${h.ticker} ${h.pct}%`).join(", ")}
IRA ($${(bhaveshData.ira/1e3).toFixed(0)}K at Vanguard): ${(holdings.ira||[]).map(h=>`${h.ticker} ${h.pct}%`).join(", ")}
Brokerage ($${(bhaveshData.stocks/1e3).toFixed(0)}K): ${(holdings.brokerage||[]).map(h=>`${h.ticker} ${h.pct}%`).join(", ")}

Write his 8AM daily briefing:
1. Good morning greeting with today's date
2. Market overview — what happened overnight/pre-market
3. His portfolio impact — which of HIS holdings moved and what it means
4. One specific action recommendation for today (buy/sell/hold/rebalance — be specific with ticker and amount)
5. Quick Baby Patel check
6. One sentence motivation`;

  return callClaude(system, user, 600);
}

// ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
async function generateWeeklyReport(bhaveshData, prices, weeklyChanges) {
  const system = `You are ABC Intel — Bhavesh's personal AI financial advisor and wealth manager.
Write a comprehensive weekly wealth report. Be specific with numbers, percentages, and actionable steps.
Format with clear sections. Think like a CFP + CFA combined. Under 800 words.`;

  const netWorth = bhaveshData.netWorth || 0;
  const retireGoal = 4000000;
  const babyGoal = 1000000;

  const user = `Weekly Report for Bhavesh Patel — Week ending ${new Date().toDateString()}

WEALTH SNAPSHOT:
- Net Worth: $${(netWorth/1e6).toFixed(3)}M (Goal: $4M by age 60, ${20} years left)
- Investable: $${(bhaveshData.investable/1e3).toFixed(0)}K
- Baby Patel Fund: $${(bhaveshData.babyTotal/1e3).toFixed(0)}K (Goal: $1M by 2045)
- Monthly investing: $${bhaveshData.totalInv?.toLocaleString()}/mo
- Savings rate: ${bhaveshData.savRate?.toFixed(1)}%
- Monthly surplus: $${bhaveshData.surplus?.toLocaleString()}

PORTFOLIO THIS WEEK:
${Object.entries(prices).slice(0,10).map(([t,d])=>`${t}: $${d.price} (${d.changePct>0?"+":""}${d.changePct.toFixed(2)}%)`).join("\n")}

PHARMACY UPDATE:
- 20% stake valued at $${(bhaveshData.pharmacy/1e3).toFixed(0)}K
- Compounding lab launching soon — this is the biggest value-creation event coming

Write the weekly report with these sections:
1. WEEK IN REVIEW — what happened to his portfolio
2. PERFORMANCE — which holdings won/lost, what it means for his goals  
3. BUY / SELL / HOLD SIGNALS — specific tickers with reasoning based on current prices
4. REBALANCING CHECK — is his allocation still right for his $4M goal?
5. BABY PATEL UPDATE — on track, behind, what to do
6. PHARMACY MILESTONE — remind about compounding launch opportunity
7. THIS WEEK'S ONE ACTION — the single most important move he should make
8. 20-YEAR PROJECTION — quick update on $4M retirement goal progress`;

  return callClaude(system, user, 1000);
}

// ── BUY/SELL/HOLD SIGNALS ─────────────────────────────────────────────────────
async function generateBuySellSignals(prices, holdings) {
  const system = `You are a professional portfolio manager analyzing stocks for a 40-year-old aggressive investor 
targeting $4M retirement in 20 years. Give specific, actionable buy/sell/hold signals.
For each signal: state the ticker, action, price target, reasoning, and confidence level.
Be direct. Reference technical levels and fundamentals briefly. No disclaimers.`;

  const holdingTickers = Object.values(holdings).flat().map(h => h.ticker).filter(Boolean);
  const relevantPrices = Object.entries(prices)
    .filter(([t]) => holdingTickers.includes(t) || ["NVDA","VOO","QQQ","BTC-USD","ETH-USD"].includes(t))
    .map(([t, d]) => `${t}: $${d.price} (${d.changePct > 0 ? "+" : ""}${d.changePct.toFixed(2)}% today)`)
    .join("\n");

  const user = `Current market prices:
${relevantPrices}

Bhavesh's holdings:
401K: ${(holdings.k401||[]).map(h=>`${h.ticker} ${h.pct}%`).join(", ")}
IRA: ${(holdings.ira||[]).map(h=>`${h.ticker} ${h.pct}%`).join(", ")}
Brokerage: ${(holdings.brokerage||[]).map(h=>`${h.ticker} ${h.pct}%`).join(", ")}

Generate buy/sell/hold signals for his specific holdings and top opportunities.
Format each as: [TICKER] — [BUY/SELL/HOLD] — [Price] — [Reasoning] — [Confidence: High/Medium/Low]`;

  return callClaude(system, user, 800);
}

// ── DROP ALERT MESSAGE ────────────────────────────────────────────────────────
async function generateDropAlertMessage(dropAlerts, bhaveshData) {
  const system = `You are ABC Intel sending an urgent financial alert to Bhavesh. 
Be direct, calm, and give a specific action. Under 200 words.`;

  const user = `URGENT: These holdings just dropped significantly:
${dropAlerts.map(a => `${a.ticker} (${a.name}): ${a.changePct.toFixed(2)}% drop`).join("\n")}

Bhavesh's context: 40 years old, $4M retirement goal, aggressive strategy.
Write a brief alert explaining what happened and exactly what he should do right now (hold, buy more on dip, or trim).`;

  return callClaude(system, user, 300);
}

// ── MILESTONE CELEBRATION ─────────────────────────────────────────────────────
async function generateMilestoneMessage(milestone, currentValue, goal) {
  const system = `You are ABC Intel celebrating a financial milestone with Bhavesh. 
Be enthusiastic but also give the next concrete step. Under 150 words.`;

  const user = `Bhavesh just hit a milestone: ${milestone}
Current value: $${(currentValue/1e3).toFixed(0)}K
Goal: $${(goal/1e3).toFixed(0)}K
Write a short congratulations and the next milestone to aim for.`;

  return callClaude(system, user, 200);
}

module.exports = {
  generateDailyBriefing,
  generateWeeklyReport,
  generateBuySellSignals,
  generateDropAlertMessage,
  generateMilestoneMessage,
};
