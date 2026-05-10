// market.js — Real market data via Yahoo Finance (free, no API key)
const axios = require("axios");

const CACHE = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// All tickers Bhavesh tracks
const ALL_TICKERS = [
  // Watchlist
  "NVDA","MSFT","META","GOOGL","AMD","AAPL","AVGO","PLTR","TSM","TSLA",
  "JPM","V","AMZN","COST","QQQ","VOO","VTI","SCHD","GLD","BTC-USD","ETH-USD","SOL-USD",
  // His actual holdings
  "VIIIX","MDIZX","VBTIX","VGT","VXUS","FSKAX","FXAIX","VSMPX",
];

async function fetchQuote(ticker) {
  const now = Date.now();
  if (CACHE[ticker] && (now - CACHE[ticker].ts) < CACHE_TTL) {
    return CACHE[ticker].data;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });

    const result = res.data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    const data = {
      ticker,
      price: parseFloat(price?.toFixed(4) || 0),
      change: parseFloat(change?.toFixed(4) || 0),
      changePct: parseFloat(changePct?.toFixed(3) || 0),
      prevClose: parseFloat(prevClose?.toFixed(4) || 0),
      marketCap: meta.marketCap || null,
      name: meta.longName || meta.shortName || ticker,
      currency: meta.currency || "USD",
      timestamp: new Date().toISOString(),
    };

    CACHE[ticker] = { data, ts: now };
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${ticker}:`, err.message);
    return null;
  }
}

async function fetchAllPrices(tickers = ALL_TICKERS) {
  // Batch in groups of 5 to avoid rate limiting
  const results = {};
  const batches = [];
  for (let i = 0; i < tickers.length; i += 5) {
    batches.push(tickers.slice(i, i + 5));
  }
  for (const batch of batches) {
    const fetched = await Promise.all(batch.map(fetchQuote));
    batch.forEach((t, i) => { if (fetched[i]) results[t] = fetched[i]; });
    await new Promise(r => setTimeout(r, 300)); // small delay between batches
  }
  return results;
}

// Calculate portfolio value from holdings using live prices
async function calculatePortfolioValue(holdings) {
  // holdings = { k401: [{ticker, pct, value}], ira: [...], ... }
  const allTickers = [];
  Object.values(holdings).flat().forEach(h => {
    if (h.ticker && !allTickers.includes(h.ticker)) allTickers.push(h.ticker);
  });

  const prices = await fetchAllPrices(allTickers);
  const portfolio = {};

  for (const [accountId, funds] of Object.entries(holdings)) {
    portfolio[accountId] = funds.map(fund => {
      const quote = prices[fund.ticker];
      return {
        ...fund,
        livePrice: quote?.price || null,
        liveChangePct: quote?.changePct || null,
        isDown10: quote ? quote.changePct <= -10 : false,
      };
    });
  }

  return { portfolio, prices };
}

// Check which holdings dropped 10%+ — triggers critical alert
function checkDropAlerts(prices, prevPrices) {
  const alerts = [];
  for (const [ticker, data] of Object.entries(prices)) {
    if (data.changePct <= -10) {
      alerts.push({
        ticker,
        name: data.name,
        changePct: data.changePct,
        price: data.price,
        severity: "CRITICAL",
      });
    } else if (data.changePct <= -5) {
      alerts.push({
        ticker,
        name: data.name,
        changePct: data.changePct,
        price: data.price,
        severity: "WARNING",
      });
    }
  }
  return alerts;
}

module.exports = { fetchQuote, fetchAllPrices, calculatePortfolioValue, checkDropAlerts, ALL_TICKERS };
