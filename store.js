// store.js — Simple JSON file store for Bhavesh's financial data
// In production this would be a database, but JSON file works perfectly for one user
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "bhavesh_data.json");

// Default data matching the frontend's DEFAULTS
const DEFAULT_DATA = {
  // Assets
  k401: 378000, ira: 38000, pharmacy: 400000, home: 225000, resort: 25000,
  stocks: 25000, india1: 660000, india2: 1200000, cars: 50000, cash: 10000,
  baby529: 5000, babyUtma: 8000, babyIndex: 7000, babyBtc: 0, babyEth: 0,
  // Income
  baseSalary: 7000, overtimeAvg: 0, pharmacyDist: 0, otherIncome: 0,
  // Expenses
  mortgage: 2200, utilities: 300, groceries: 600, dining: 300, transport: 400,
  insurance: 350, subscriptions: 100, entertainment: 200, clothing: 150,
  medical: 100, childcare: 0, otherExp: 300,
  // Investments
  inv401k: 1500, invIra: 583, invBrokerage: 500, invBaby: 500, invSavings: 417, invExtra: 0,
  // Holdings
  holdings: {
    k401: [
      { ticker: "MDIZX", name: "Mid-Cap Index Fund", pct: 60, value: 226800, er: "0.75%", flag: "high_fee" },
      { ticker: "VIIIX", name: "Vanguard Inst Index", pct: 30, value: 113400, er: "0.02%", flag: "" },
      { ticker: "VBTIX", name: "Vanguard Bond Index", pct: 10, value: 37800, er: "0.03%", flag: "" },
    ],
    ira: [
      { ticker: "VTI", name: "Total Stock Market ETF", pct: 50, value: 19000, er: "0.03%", flag: "" },
      { ticker: "VGT", name: "Info Technology ETF", pct: 30, value: 11400, er: "0.10%", flag: "" },
      { ticker: "VXUS", name: "Total Intl Stock ETF", pct: 20, value: 7600, er: "0.07%", flag: "" },
    ],
    brokerage: [{ ticker: "VOO", name: "S&P 500 ETF", pct: 100, value: 25000, er: "0.03%", flag: "" }],
    babyUtma:  [{ ticker: "VTI",   name: "Total Market ETF",      pct: 100, value: 8000, er: "0.03%",  flag: "" }],
    babyIndex: [{ ticker: "FSKAX", name: "Fidelity Total Market",  pct: 100, value: 7000, er: "0.015%", flag: "" }],
    baby529:   [{ ticker: "AGE",   name: "Age-Based Portfolio",    pct: 100, value: 5000, er: "0.10%",  flag: "" }],
  },
  lastUpdated: null,
  updateHistory: [],
  // Alert tracking
  lastAlerts: {
    dropAlerts: {},      // ticker -> last alert timestamp
    milestones: {},      // milestone key -> achieved timestamp
    staleDataSent: null, // last stale data alert
    overtimeSent: null,  // last overtime alert
  },
};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return { ...DEFAULT_DATA, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("Failed to load data:", err.message);
  }
  return { ...DEFAULT_DATA };
}

function save(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to save data:", err.message);
    return false;
  }
}

function update(partial) {
  const current = load();
  const updated = { ...current, ...partial, lastUpdated: new Date().toISOString() };

  // Track net worth history
  const netWorth = computeNetWorth(updated);
  const prevNetWorth = current.updateHistory?.[0]?.netWorth || 0;
  const change = netWorth - prevNetWorth;

  updated.updateHistory = [
    { date: updated.lastUpdated, netWorth, change },
    ...(current.updateHistory || []).slice(0, 23),
  ];

  save(updated);
  return updated;
}

function computeNetWorth(data) {
  const assetKeys = ["k401","ira","pharmacy","home","resort","stocks","india1","india2","cars","cash",
                     "baby529","babyUtma","babyIndex","babyBtc","babyEth"];
  return assetKeys.reduce((s, k) => s + (data[k] || 0), 0);
}

function computeDerivedValues(data) {
  const INCOME_KEYS  = ["baseSalary","overtimeAvg","pharmacyDist","otherIncome"];
  const EXPENSE_KEYS = ["mortgage","utilities","groceries","dining","transport","insurance",
                        "subscriptions","entertainment","clothing","medical","childcare","otherExp"];
  const INV_KEYS     = ["inv401k","invIra","invBrokerage","invBaby","invSavings","invExtra"];

  const totalIncome = INCOME_KEYS.reduce((s, k) => s + (data[k] || 0), 0);
  const totalExp    = EXPENSE_KEYS.reduce((s, k) => s + (data[k] || 0), 0);
  const totalInv    = INV_KEYS.reduce((s, k) => s + (data[k] || 0), 0);
  const surplus     = totalIncome - totalExp - totalInv;
  const savRate     = totalIncome > 0 ? (totalInv / totalIncome) * 100 : 0;
  const netWorth    = computeNetWorth(data);
  const investable  = (data.k401||0) + (data.ira||0) + (data.stocks||0) + (data.cash||0);
  const babyTotal   = ["baby529","babyUtma","babyIndex","babyBtc","babyEth"].reduce((s,k)=>s+(data[k]||0),0);

  return { totalIncome, totalExp, totalInv, surplus, savRate, netWorth, investable, babyTotal };
}

module.exports = { load, save, update, computeNetWorth, computeDerivedValues };
