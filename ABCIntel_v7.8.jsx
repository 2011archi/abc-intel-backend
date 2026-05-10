import { useState, useEffect, useRef } from "react";

// ── BACKEND CONFIG ────────────────────────────────────────────────────────────
// Replace with your Railway backend URL after deployment
// e.g. "https://abc-intel-backend.up.railway.app"
const BACKEND_URL = ""; // leave empty to use simulated prices (fallback)

const RETIRE_GOAL = 4_000_000;
const BABY_GOAL   = 1_000_000;
const ALERT_EMAIL = "abcintel012525@gmail.com";

// ── SHIFT SCHEDULE ENGINE ─────────────────────────────────────────────────────
// Bhavesh works Mon–Sun nights (8PM–8AM), then has Mon–Sun off, then works again
// Cycle = 14 days: days 0–6 = WORK week, days 7–13 = OFF week
// Anchor: May 11, 2025 (Monday) = first day of WORK week
const SHIFT_ANCHOR = new Date(2025, 4, 11); // May 11 2025
const CYCLE_DAYS = 14; // 7 work + 7 off

function getShiftStatus(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const anchor = new Date(SHIFT_ANCHOR.getFullYear(), SHIFT_ANCHOR.getMonth(), SHIFT_ANCHOR.getDate());
  const diffDays = Math.round((d - anchor) / 86400000);
  const pos = ((diffDays % CYCLE_DAYS) + CYCLE_DAYS) % CYCLE_DAYS;
  return pos < 7 ? "work" : "off";
}

function getWeekLabel(date) {
  const status = getShiftStatus(date);
  const dow = date.getDay(); // 0=Sun,1=Mon
  if (status === "work") {
    if (dow === 1) return "🌙 Work Week Starts";
    if (dow === 0) return "🌙 Last Work Night";
    return "🌙 Night Shift";
  }
  if (dow === 1) return "✅ Off Week Starts";
  if (dow === 0) return "✅ Last Off Day";
  return "✅ Day Off";
}

// ── ACCOUNTS ─────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { id:"k401",     icon:"🏛️", label:"401K — Lincoln Financial", color:"#34d399",
    suggestedFunds:[
      {ticker:"VIIIX",name:"Vanguard Inst Index",er:"0.02%",rec:"⭐ BEST"},
      {ticker:"MDIZX",name:"Mid-Cap Index Fund", er:"0.75%",rec:"⚠ HIGH FEE"},
      {ticker:"VBTIX",name:"Vanguard Bond Index",er:"0.03%",rec:""},
      {ticker:"Other",name:"Other / Custom",     er:"",     rec:""},
    ]},
  { id:"ira",      icon:"💼", label:"IRA — Vanguard",           color:"#60a5fa",
    suggestedFunds:[
      {ticker:"VTI", name:"Total Stock Market ETF",er:"0.03%",rec:"⭐ BEST"},
      {ticker:"VGT", name:"Info Technology ETF",   er:"0.10%",rec:"⭐ BEST"},
      {ticker:"VXUS",name:"Total Intl Stock ETF",  er:"0.07%",rec:"⭐ BEST"},
      {ticker:"Other",name:"Other / Custom",        er:"",     rec:""},
    ]},
  { id:"brokerage",icon:"📊", label:"Brokerage — Fidelity",     color:"#fb923c",
    suggestedFunds:[
      {ticker:"VOO", name:"S&P 500 ETF",  er:"0.03%",rec:""},
      {ticker:"NVDA",name:"Nvidia",       er:"",     rec:""},
      {ticker:"QQQ", name:"Nasdaq 100",   er:"0.20%",rec:""},
      {ticker:"Other",name:"Other/Custom",er:"",     rec:""},
    ]},
  { id:"babyUtma", icon:"📈", label:"Baby UTMA — Fidelity",     color:"#f472b6",
    suggestedFunds:[{ticker:"VTI",name:"Total Market ETF",er:"0.03%",rec:"⭐ BEST"},{ticker:"Other",name:"Other",er:"",rec:""}]},
  { id:"babyIndex",icon:"📊", label:"Baby Index — Fidelity",    color:"#fb923c",
    suggestedFunds:[{ticker:"FSKAX",name:"Fidelity Total Market",er:"0.015%",rec:"⭐ BEST"},{ticker:"Other",name:"Other",er:"",rec:""}]},
  { id:"baby529",  icon:"🎓", label:"Baby 529 — Maryland",      color:"#34d399",
    suggestedFunds:[{ticker:"AGE",name:"Age-Based Portfolio",er:"0.10%",rec:"⭐ BEST"},{ticker:"Other",name:"Other",er:"",rec:""}]},
];

const DEFAULT_HOLDINGS = {
  k401:[
    {ticker:"MDIZX",name:"Mid-Cap Index Fund",          pct:60,value:226800,er:"0.75%",flag:"high_fee"},
    {ticker:"VIIIX",name:"Vanguard Inst Index (S&P500)",pct:30,value:113400,er:"0.02%",flag:""},
    {ticker:"VBTIX",name:"Vanguard Bond Index",          pct:10,value:37800, er:"0.03%",flag:""},
  ],
  ira:[
    {ticker:"VTI", name:"Total Stock Market ETF",pct:50,value:19000,er:"0.03%",flag:""},
    {ticker:"VGT", name:"Info Technology ETF",   pct:30,value:11400,er:"0.10%",flag:""},
    {ticker:"VXUS",name:"Total Intl Stock ETF",  pct:20,value:7600, er:"0.07%",flag:""},
  ],
  brokerage:[{ticker:"VOO",name:"S&P 500 ETF",pct:100,value:25000,er:"0.03%",flag:""}],
  babyUtma: [{ticker:"VTI",name:"Total Market ETF",pct:100,value:8000,er:"0.03%",flag:""}],
  babyIndex:[{ticker:"FSKAX",name:"Fidelity Total Market",pct:100,value:7000,er:"0.015%",flag:""}],
  baby529:  [{ticker:"AGE",name:"Age-Based Portfolio",pct:100,value:5000,er:"0.10%",flag:""}],
};

const DEFAULTS = {
  k401:378000,ira:38000,pharmacy:400000,home:225000,resort:25000,
  stocks:25000,india1:660000,india2:1200000,cars:50000,cash:10000,
  baby529:5000,babyUtma:8000,babyIndex:7000,babyBtc:0,babyEth:0,
  baseSalary:7000,overtimeAvg:0,pharmacyDist:0,otherIncome:0,
  mortgage:2200,utilities:300,groceries:600,dining:300,transport:400,
  insurance:350,subscriptions:100,entertainment:200,clothing:150,
  medical:100,childcare:0,otherExp:300,
  inv401k:1500,invIra:583,invBrokerage:500,invBaby:500,invSavings:417,invExtra:0,
  lastUpdated:null,updateHistory:[],
  holdings:DEFAULT_HOLDINGS,
  holdingNotes:{k401:"",ira:"",brokerage:"",babyUtma:"",babyIndex:"",baby529:""},
  customItems:[], // [{id,label,icon,color,value,group,note}]
};

const ASSET_FIELDS = [
  {key:"k401",     icon:"🏛️",label:"401K — Lincoln Financial",color:"#34d399",group:"Investments"},
  {key:"ira",      icon:"💼",label:"IRA — Vanguard",          color:"#60a5fa",group:"Investments"},
  {key:"pharmacy", icon:"💊",label:"Pharmacy Stake (20%)",    color:"#f59e0b",group:"Investments"},
  {key:"stocks",   icon:"📈",label:"Stock Options",           color:"#a78bfa",group:"Investments"},
  {key:"cash",     icon:"💵",label:"Bank / Cash",             color:"#4ade80",group:"Investments"},
  {key:"home",     icon:"🏠",label:"Home Equity",             color:"#fb923c",group:"Real Estate"},
  {key:"resort",   icon:"🏖️",label:"Resort Investment",      color:"#f472b6",group:"Real Estate"},
  {key:"india1",   icon:"🇮🇳",label:"India Home (₹→USD)",   color:"#fbbf24",group:"Real Estate"},
  {key:"india2",   icon:"🌏",label:"India Land (₹→USD)",     color:"#f59e0b",group:"Real Estate"},
  {key:"cars",     icon:"🚗",label:"Cars",                    color:"#94a3b8",group:"Other"},
  {key:"baby529",  icon:"🎓",label:"Baby — 529 Plan",         color:"#34d399",group:"Baby Patel 👑"},
  {key:"babyUtma", icon:"📈",label:"Baby — UTMA",             color:"#60a5fa",group:"Baby Patel 👑"},
  {key:"babyIndex",icon:"📊",label:"Baby — Index Fund",       color:"#fb923c",group:"Baby Patel 👑"},
  {key:"babyBtc",  icon:"₿", label:"Baby — Bitcoin",          color:"#f59e0b",group:"Baby Patel 👑"},
  {key:"babyEth",  icon:"⟠", label:"Baby — Ethereum",         color:"#a78bfa",group:"Baby Patel 👑"},
];
const INCOME_FIELDS = [
  {key:"baseSalary",  icon:"💼",label:"Base Monthly Salary",  color:"#34d399",note:"After tax take-home"},
  {key:"overtimeAvg", icon:"⚡",label:"Overtime (avg/month)", color:"#fbbf24",note:"Average overtime income"},
  {key:"pharmacyDist",icon:"💊",label:"Pharmacy Distribution",color:"#f59e0b",note:"Monthly profit distribution"},
  {key:"otherIncome", icon:"💰",label:"Other Income",         color:"#a78bfa",note:"Freelance, rental, etc."},
];
const EXPENSE_FIELDS = [
  {key:"mortgage",     icon:"🏠",label:"Mortgage/Rent",      color:"#fb923c"},
  {key:"utilities",    icon:"💡",label:"Utilities",          color:"#fbbf24"},
  {key:"groceries",    icon:"🛒",label:"Groceries",          color:"#34d399"},
  {key:"dining",       icon:"🍽️",label:"Dining Out",        color:"#f472b6"},
  {key:"transport",    icon:"🚗",label:"Transportation",     color:"#60a5fa"},
  {key:"insurance",    icon:"🛡️",label:"Insurance",         color:"#a78bfa"},
  {key:"subscriptions",icon:"📱",label:"Subscriptions",      color:"#94a3b8"},
  {key:"entertainment",icon:"🎬",label:"Entertainment",      color:"#f59e0b"},
  {key:"clothing",     icon:"👕",label:"Clothing",           color:"#fb923c"},
  {key:"medical",      icon:"⚕️",label:"Medical",           color:"#4ade80"},
  {key:"childcare",    icon:"👶",label:"Childcare (Baby)",   color:"#f472b6"},
  {key:"otherExp",     icon:"📦",label:"Other Expenses",     color:"#94a3b8"},
];
const INV_FIELDS = [
  {key:"inv401k",     icon:"🏛️",label:"401K Contribution", color:"#34d399"},
  {key:"invIra",      icon:"💼",label:"Vanguard IRA",       color:"#60a5fa"},
  {key:"invBrokerage",icon:"📊",label:"Taxable Brokerage", color:"#fb923c"},
  {key:"invBaby",     icon:"👑",label:"Baby Patel Fund",    color:"#f472b6"},
  {key:"invSavings",  icon:"🏦",label:"Emergency Savings",  color:"#4ade80"},
  {key:"invExtra",    icon:"⚡",label:"Extra (Overtime)",   color:"#fbbf24"},
];
const GROUPS = [...new Set(ASSET_FIELDS.map(a=>a.group))];

const WATCHLIST = [
  {s:"NVDA",n:"Nvidia",      cat:"AI & Tech",   base:1050,  vol:0.004},
  {s:"MSFT",n:"Microsoft",   cat:"AI & Tech",   base:420,   vol:0.003},
  {s:"META",n:"Meta",        cat:"AI & Tech",   base:520,   vol:0.003},
  {s:"GOOGL",n:"Alphabet",   cat:"AI & Tech",   base:175,   vol:0.003},
  {s:"AMD", n:"AMD",         cat:"AI & Tech",   base:170,   vol:0.004},
  {s:"AAPL",n:"Apple",       cat:"AI & Tech",   base:212,   vol:0.002},
  {s:"PLTR",n:"Palantir",    cat:"AI & Tech",   base:25,    vol:0.006},
  {s:"TSLA",n:"Tesla",       cat:"EV & Future", base:178,   vol:0.006},
  {s:"JPM", n:"JPMorgan",    cat:"Finance",     base:205,   vol:0.003},
  {s:"V",   n:"Visa",        cat:"Finance",     base:280,   vol:0.002},
  {s:"AMZN",n:"Amazon",      cat:"Consumer",    base:190,   vol:0.003},
  {s:"QQQ", n:"Nasdaq 100",  cat:"ETFs",        base:480,   vol:0.002},
  {s:"VOO", n:"S&P 500",     cat:"ETFs",        base:530,   vol:0.002},
  {s:"VTI", n:"Total Market",cat:"ETFs",        base:250,   vol:0.002},
  {s:"SCHD",n:"Dividend",    cat:"ETFs",        base:82,    vol:0.002},
  {s:"GLD", n:"Gold ETF",    cat:"ETFs",        base:230,   vol:0.002},
  {s:"BTC", n:"Bitcoin",     cat:"Crypto",      base:62400, vol:0.008},
  {s:"ETH", n:"Ethereum",    cat:"Crypto",      base:3180,  vol:0.009},
  {s:"SOL", n:"Solana",      cat:"Crypto",      base:148,   vol:0.010},
  {s:"XRP", n:"XRP",         cat:"Crypto",      base:0.52,  vol:0.010},
];
const WCATS = ["All",...new Set(WATCHLIST.map(a=>a.cat))];

const SIM_STOCKS = [
  {s:"NVDA",n:"Nvidia",      rate:0.35,risk:"High",     color:"#00ff9d"},
  {s:"MSFT",n:"Microsoft",   rate:0.15,risk:"Low",      color:"#60a5fa"},
  {s:"VOO", n:"S&P 500 ETF", rate:0.10,risk:"Low",      color:"#34d399"},
  {s:"QQQ", n:"Nasdaq 100",  rate:0.13,risk:"Med",      color:"#60a5fa"},
  {s:"PLTR",n:"Palantir",    rate:0.40,risk:"High",     color:"#f472b6"},
  {s:"AMD", n:"AMD",         rate:0.22,risk:"Med",      color:"#fb923c"},
  {s:"TSLA",n:"Tesla",       rate:0.20,risk:"High",     color:"#f59e0b"},
  {s:"BTC", n:"Bitcoin",     rate:0.20,risk:"Very High",color:"#f59e0b"},
  {s:"ETH", n:"Ethereum",    rate:0.18,risk:"Very High",color:"#a78bfa"},
  {s:"SCHD",n:"Dividend ETF",rate:0.09,risk:"Low",      color:"#4ade80"},
];

const EVENT_CATS = [
  {key:"finance",  label:"Finance",    color:"#34d399", icon:"💰"},
  {key:"pharmacy", label:"Pharmacy",   color:"#f59e0b", icon:"💊"},
  {key:"invest",   label:"Investment", color:"#60a5fa", icon:"📈"},
  {key:"baby",     label:"Baby Patel", color:"#f472b6", icon:"👑"},
  {key:"overtime", label:"Overtime",   color:"#fbbf24", icon:"⚡"},
  {key:"personal", label:"Personal",   color:"#a78bfa", icon:"👤"},
  {key:"health",   label:"Health",     color:"#4ade80", icon:"🏥"},
  {key:"reminder", label:"Reminder",   color:"#fb923c", icon:"🔔"},
];

const ALERT_RULES = [
  {icon:"🔴",priority:"CRITICAL",rule:"Any holding drops 10%+",          action:`Instant email → ${ALERT_EMAIL}`,     color:"#ff4560"},
  {icon:"📉",priority:"CRITICAL",rule:"Net worth drops $50K+ in a month", action:"Immediate email + AI analysis",      color:"#ff4560"},
  {icon:"💸",priority:"CRITICAL",rule:"Expenses exceed income",            action:"Budget emergency alert",             color:"#ff4560"},
  {icon:"🎯",priority:"CRITICAL",rule:"Savings rate falls below 20%",      action:"Immediate budget correction alert",  color:"#ff4560"},
  {icon:"🌅",priority:"DAILY",   rule:"Morning market briefing",           action:`8:00 AM every day → ${ALERT_EMAIL}`,color:"#fbbf24"},
  {icon:"⚡",priority:"DAILY",   rule:"Overtime income logged",            action:"Auto-reminder: invest entire amount",color:"#fbbf24"},
  {icon:"📊",priority:"WEEKLY",  rule:"Net worth + portfolio summary",     action:"Every Sunday 9:00 AM",              color:"#60a5fa"},
  {icon:"📈",priority:"MONTHLY", rule:"Portfolio rebalance check",         action:"1st of each month",                 color:"#a78bfa"},
  {icon:"👑",priority:"MILESTONE",rule:"Baby Patel hits $100K/$250K/$500K/$1M",action:"Celebration email + plan",     color:"#f472b6"},
  {icon:"🏆",priority:"MILESTONE",rule:"Retirement savings hits each $500K",  action:"Milestone email + projection",  color:"#34d399"},
  {icon:"💊",priority:"MONTHLY", rule:"Pharmacy valuation reminder",       action:"Quarterly: update stake value",     color:"#f59e0b"},
  {icon:"✏️",priority:"REMINDER",rule:"No update in 30 days",             action:"Stale data warning email",          color:"#94a3b8"},
];


const NEWS = [
  {ticker:"NVDA", headline:"Blackwell GPU demand surges 40% quarter over quarter",            sentiment:"bullish", time:"2m ago",  rec:"Strong Buy"},
  {ticker:"AAPL", headline:"Apple Intelligence driving iPhone 17 pre-orders up 22%",          sentiment:"bullish", time:"18m ago", rec:"Buy"},
  {ticker:"TSLA", headline:"Q3 deliveries beat analyst estimates by 8%",                      sentiment:"bullish", time:"35m ago", rec:"Buy"},
  {ticker:"META", headline:"AI ad targeting boosts revenue 28% year over year",               sentiment:"bullish", time:"1h ago",  rec:"Strong Buy"},
  {ticker:"INTC", headline:"Intel loses data center market share to AMD and NVDA",            sentiment:"bearish", time:"1h ago",  rec:"Sell"},
  {ticker:"BTC",  headline:"Bitcoin ETF inflows hit $500M in a single trading day",           sentiment:"bullish", time:"2h ago",  rec:"Strong Buy"},
  {ticker:"GOOGL",headline:"Gemini AI adoption accelerating across Google Workspace",          sentiment:"bullish", time:"2h ago",  rec:"Buy"},
  {ticker:"PLTR", headline:"Palantir wins $400M US Army AI contract",                         sentiment:"bullish", time:"3h ago",  rec:"Strong Buy"},
  {ticker:"NIO",  headline:"NIO Q3 delivery numbers miss estimates by 12%",                   sentiment:"bearish", time:"3h ago",  rec:"Hold"},
  {ticker:"ETH",  headline:"Ethereum staking yields rise to 5.2% APY",                        sentiment:"bullish", time:"4h ago",  rec:"Buy"},
  {ticker:"AMD",  headline:"MI300X AI chip demand continues to outpace supply",               sentiment:"bullish", time:"4h ago",  rec:"Strong Buy"},
  {ticker:"AMZN", headline:"AWS revenue growth accelerates to 19%",                           sentiment:"bullish", time:"5h ago",  rec:"Buy"},
];

const fv  = (i,m,r,y)=>{if(y<=0)return i;const R=r/12,n=y*12;return i*Math.pow(1+R,n)+(m>0?m*((Math.pow(1+R,n)-1)/R):0);};
const fmt = v=>{if(v>=1e9)return`$${(v/1e9).toFixed(2)}B`;if(v>=1e6)return`$${(v/1e6).toFixed(2)}M`;if(v>=1e3)return`$${(v/1e3).toFixed(0)}K`;return`$${Math.round(v).toLocaleString()}`;};
const fmtP= p=>p>=1000?p.toFixed(0):p<1?p.toFixed(4):p.toFixed(2);
const pc  = n=>(n>=0?"+":"")+n.toFixed(2)+"%";
const tickP=(p,v)=>Math.max(p*(1+(Math.random()-0.49)*v),0.01);
const sig = c=>c>1?{s:"STRONG BUY",c:"#00ff9d"}:c>0.2?{s:"BUY",c:"#4ade80"}:c<-1?{s:"SELL",c:"#ff4560"}:c<-0.2?{s:"WATCH",c:"#fbbf24"}:{s:"HOLD",c:"#475569"};
const ago = ts=>{if(!ts)return"Never";const d=Math.floor((Date.now()-new Date(ts))/86400000);return d===0?"Today":d===1?"Yesterday":`${d}d ago`;};
const rc  = r=>r==="Low"?"#34d399":r==="Med"?"#fbbf24":r==="High"?"#fb923c":"#ff4560";
const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dateKey=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

function Bar({p,color,h=6}){
  const pct=Math.min(p,100);
  return <div style={{height:h,borderRadius:h/2,background:"rgba(255,255,255,0.07)",overflow:"hidden",marginTop:4}}>
    <div style={{height:"100%",width:`${pct}%`,borderRadius:h/2,transition:"width 0.8s ease",
      background:pct>=100?"#4ade80":pct>=75?color:pct>=50?`${color}cc`:`${color}88`,boxShadow:`0 0 8px ${color}55`}}/>
  </div>;
}

function generateAdvice(data,holdings,notes,totalIncome,totalInv,surplus,savRate,netWorth,investable,babyTotal,retireProj,question){
  const k401h=holdings.k401||[];
  const hasMDIZX=k401h.some(h=>h.ticker==="MDIZX"&&Number(h.pct)>5);
  const hasVIIIX=k401h.some(h=>h.ticker==="VIIIX"&&Number(h.pct)>0);
  const k401Note=(notes.k401||"").toLowerCase();
  const movedOut=k401Note.includes("moved")||k401Note.includes("switched")||(!hasMDIZX&&hasVIIIX);
  const babyProj=fv(babyTotal,1000,0.12,18);
  const babyOnTrack=babyProj>=BABY_GOAL;
  const retireOnTrack=retireProj>=RETIRE_GOAL;
  if(question){
    const q=question.toLowerCase();
    if(q.includes("401")||q.includes("mdizx")||q.includes("fix")){
      return movedOut
        ?`✅ 401K Fee Issue — ALREADY FIXED\n\nVIIIX is in place. Saving ~$${Math.round(0.0073*data.k401).toLocaleString()}/year.\n\n🎯 NEXT: Move $${Math.round(surplus*0.5).toLocaleString()} surplus into VOO in brokerage.`
        :`🔴 401K Fix STILL NEEDED\n\nMDIZX still present.\n\n1. lincolnfinancial.com\n2. Change Allocation → move all MDIZX → VIIIX\n3. Log change in Holdings tab\n\nSaves $${Math.round(0.0073*data.k401).toLocaleString()}/year.`;
    }
    if(q.includes("baby")||q.includes("patel")){
      return `👑 Baby Patel\n\n${babyOnTrack?"✅ ON TRACK":"⚠️ NEEDS BOOST"}\n\nSaved: ${fmt(babyTotal)}\nProjected at 18: ${fmt(babyProj)}\nGoal: $1,000,000`;
    }
    if(q.includes("surplus")||q.includes("overtime")){
      return surplus<=0?`🔴 No surplus — check Budget tab.`
        :`💡 Deploy $${surplus.toLocaleString()} Surplus\n\n1. $${Math.round(surplus*0.4).toLocaleString()} → 401K top-up\n2. $${Math.round(surplus*0.4).toLocaleString()} → Brokerage VOO\n3. $${Math.round(surplus*0.2).toLocaleString()} → Baby Patel\n\nOvertime income: invest 100% immediately.`;
    }
    if(q.includes("retire")||q.includes("4m")){
      return `🏆 Retirement\n\n${retireOnTrack?"✅ ON TRACK":"⚠️ NEEDS WORK"}\n\nCurrent: ${fmt(investable)}\nProjected at 60: ${fmt(retireProj)}\nGoal: $4,000,000\n\nTop levers:\n1. Max 401K: $1,917/mo\n2. Max IRA: $583/mo\n3. Pharmacy distributions at Columbia launch`;
    }
  }
  const wins=[],issues=[],actions=[];
  if(movedOut) wins.push("✅ 401K fees fixed — in VIIIX");
  else if(hasMDIZX){issues.push(`🔴 MDIZX in 401K — costs $${Math.round(0.0073*data.k401).toLocaleString()}/yr extra`);actions.push("1️⃣ lincolnfinancial.com → move MDIZX → VIIIX");}
  if(savRate>=30) wins.push(`✅ Savings rate ${savRate.toFixed(0)}% — on target`);
  else{issues.push(`⚠️ Savings rate ${savRate.toFixed(0)}% below 30%`);actions.push(`2️⃣ Invest $${Math.round(totalIncome*0.30-totalInv).toLocaleString()}/mo more`);}
  if(data.inv401k<1917){issues.push(`⚠️ 401K not maxed ($${data.inv401k}/mo vs $1,917)`);actions.push(`3️⃣ Increase 401K by $${1917-data.inv401k}/mo`);}
  if(surplus>500){issues.push(`⚠️ $${surplus.toLocaleString()}/mo unallocated`);actions.push(`4️⃣ Redirect surplus to VOO + Baby Patel`);}
  return [`◈ BHAVESH HEALTH CHECK`,`Net Worth: ${fmt(netWorth)}  |  Retire: ${fmt(retireProj)}  |  ${retireOnTrack?"✅":"⚠️"}`,``,
    `📊 WINS`,wins.length?wins.join("\n"):"Keep logging changes in Holdings",``,
    `⚠️ ISSUES`,issues.length?issues.join("\n"):"✅ No critical issues!",``,
    `🎯 ACTIONS`,actions.length?actions.join("\n"):"Great shape!",``,
    `👑 BABY PATEL`,`${babyOnTrack?"✅":"⚠️"} Projecting ${fmt(babyProj)} by age 18`,``,
    `💡 Update Holdings after any change — advisor adjusts automatically.`
  ].join("\n");
}

function HoldingsEditor({account,holdings,totalValue,onSave,onClose}){
  const [rows,setRows]=useState(holdings.length>0?holdings.map(h=>({...h})):[{ticker:"",name:"",pct:100,value:0,er:"",flag:""}]);
  const [note,setNote]=useState("");
  // Add fund panel state - shows inline form at top
  const [adding,setAdding]=useState(false);
  const [newTicker,setNewTicker]=useState("");
  const [newName,setNewName]=useState("");
  const [newPct,setNewPct]=useState("");
  const [newValue,setNewValue]=useState("");
  const [newEr,setNewEr]=useState("");
  const G="#00ff9d",R="#ff4560",GOLD="#fbbf24";
  const totalPct=rows.reduce((s,r)=>s+(Number(r.pct)||0),0);
  const upd=(i,f,v)=>setRows(r=>r.map((x,j)=>j===i?{...x,[f]:v}:x));

  function confirmAddFund(){
    if(!newTicker.trim())return;
    const er=newEr.trim();
    setRows(r=>[...r,{
      ticker:newTicker.trim().toUpperCase(),
      name:newName.trim()||newTicker.trim().toUpperCase(),
      pct:parseFloat(newPct)||0,
      value:parseFloat(newValue)||0,
      er:er,
      flag:er&&parseFloat(er)>0.5?"high_fee":"",
    }]);
    setNewTicker("");setNewName("");setNewPct("");setNewValue("");setNewEr("");
    setAdding(false);
  }

  function cancelAdd(){
    setNewTicker("");setNewName("");setNewPct("");setNewValue("");setNewEr("");
    setAdding(false);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:2000,overflowY:"auto",padding:"20px 13px 40px"}}>
      <div style={{maxWidth:640,margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:account.color}}>{account.icon} {account.label}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Balance: {fmt(totalValue)} · {rows.length} holding{rows.length!==1?"s":""}</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"8px 14px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>✕ Close</button>
        </div>

        {/* ── ADD NEW FUND PANEL ── */}
        {!adding?(
          <button onClick={()=>setAdding(true)}
            style={{width:"100%",marginBottom:14,padding:"14px",borderRadius:13,
              border:"2px solid rgba(0,255,157,0.5)",background:"rgba(0,255,157,0.06)",
              color:G,cursor:"pointer",fontFamily:"inherit",fontWeight:900,fontSize:15,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            ➕ Add New Fund / Stock / ETF
          </button>
        ):(
          <div style={{background:"rgba(0,255,157,0.06)",border:"2px solid rgba(0,255,157,0.4)",borderRadius:16,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:G,marginBottom:12}}>➕ New Fund Details</div>
            {/* Ticker + Name row */}
            <div style={{display:"grid",gridTemplateColumns:"100px 1fr",gap:8,marginBottom:10}}>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:4,letterSpacing:1}}>TICKER *</div>
                <input
                  autoFocus
                  value={newTicker}
                  onChange={e=>setNewTicker(e.target.value.toUpperCase())}
                  placeholder="NVDA"
                  onKeyDown={e=>e.key==="Enter"&&confirmAddFund()}
                  style={{background:"rgba(0,0,0,0.4)",border:"2px solid rgba(0,255,157,0.5)",color:G,
                    padding:"10px 10px",borderRadius:9,fontSize:16,fontWeight:900,outline:"none",
                    width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:4,letterSpacing:1}}>FUND / STOCK NAME</div>
                <input
                  value={newName}
                  onChange={e=>setNewName(e.target.value)}
                  placeholder="e.g. Nvidia Corp, Vanguard S&P 500..."
                  onKeyDown={e=>e.key==="Enter"&&confirmAddFund()}
                  style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.15)",color:"#e2e8f0",
                    padding:"10px 10px",borderRadius:9,fontSize:12,outline:"none",
                    width:"100%",fontFamily:"inherit"}}/>
              </div>
            </div>
            {/* Alloc + Value + ER row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 90px",gap:8,marginBottom:12}}>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:4,letterSpacing:1}}>ALLOCATION %</div>
                <input type="number" value={newPct} onChange={e=>setNewPct(e.target.value)} placeholder="e.g. 25"
                  style={{background:"rgba(0,0,0,0.3)",border:`1px solid ${account.color}55`,color:account.color,
                    padding:"10px 10px",borderRadius:9,fontSize:15,fontWeight:900,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:4,letterSpacing:1}}>VALUE ($)</div>
                <input type="number" value={newValue} onChange={e=>setNewValue(e.target.value)} placeholder="e.g. 5000"
                  style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(251,191,36,0.4)",color:GOLD,
                    padding:"10px 10px",borderRadius:9,fontSize:13,fontWeight:700,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:4,letterSpacing:1}}>EXP RATIO</div>
                <input value={newEr} onChange={e=>setNewEr(e.target.value)} placeholder="0.03%"
                  style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.6)",
                    padding:"10px 8px",borderRadius:9,fontSize:12,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
            </div>
            {/* Confirm / Cancel */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={cancelAdd}
                style={{padding:"12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",
                  background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",
                  cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13}}>
                Cancel
              </button>
              <button onClick={confirmAddFund} disabled={!newTicker.trim()}
                style={{padding:"12px",borderRadius:10,border:"none",
                  background:newTicker.trim()?"linear-gradient(135deg,#00ff9d,#22d3ee)":"rgba(255,255,255,0.08)",
                  color:newTicker.trim()?"#000":"rgba(255,255,255,0.2)",
                  cursor:newTicker.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontWeight:900,fontSize:14}}>
                ✓ Add Fund
              </button>
            </div>
          </div>
        )}

        {/* Quick-add chips */}
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:12,marginBottom:14}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>⚡ Quick-add suggested</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {account.suggestedFunds.map(f=>(
              <button key={f.ticker} onClick={()=>{if(!rows.find(r=>r.ticker===f.ticker))setRows(r=>[...r,{ticker:f.ticker,name:f.name,pct:0,value:0,er:f.er,flag:parseFloat(f.er)>0.5?"high_fee":""}]);}}
                style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,
                  border:`1px solid ${f.rec.includes("⭐")?"rgba(0,255,157,0.35)":f.rec.includes("⚠")?"rgba(255,69,96,0.35)":"rgba(255,255,255,0.1)"}`,
                  background:f.rec.includes("⭐")?"rgba(0,255,157,0.08)":f.rec.includes("⚠")?"rgba(255,69,96,0.08)":"rgba(255,255,255,0.04)",
                  color:f.rec.includes("⭐")?G:f.rec.includes("⚠")?R:"rgba(255,255,255,0.6)"}}>
                {f.ticker}{f.rec.includes("⭐")?" ⭐":f.rec.includes("⚠")?" ⚠️":""}
              </button>
            ))}
          </div>
        </div>

        {/* Existing fund rows */}
        <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
          Current Holdings ({rows.length})
        </div>
        {rows.map((row,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${row.flag==="high_fee"?"rgba(255,69,96,0.35)":account.color+"22"}`,borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:700,letterSpacing:1}}>
                {row.ticker||`FUND #${i+1}`}
              </div>
              <button onClick={()=>setRows(r=>r.filter((_,j)=>j!==i))}
                style={{display:"flex",alignItems:"center",gap:4,background:"rgba(255,69,96,0.12)",border:"1px solid rgba(255,69,96,0.35)",
                  borderRadius:8,padding:"5px 12px",color:R,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:800}}>
                🗑 Delete
              </button>
            </div>
            {row.flag==="high_fee"&&<div style={{background:"rgba(255,69,96,0.1)",border:"1px solid rgba(255,69,96,0.3)",borderRadius:8,padding:"6px 10px",marginBottom:10,fontSize:11,color:R}}>⚠️ High expense ratio ({row.er}) — consider switching</div>}
            <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:8,marginBottom:10}}>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>TICKER</div>
                <input value={row.ticker} onChange={e=>upd(i,"ticker",e.target.value.toUpperCase())}
                  placeholder="VIIIX"
                  style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${account.color}44`,color:account.color,
                    padding:"9px 10px",borderRadius:9,fontSize:14,fontWeight:900,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>FUND NAME</div>
                <input value={row.name} onChange={e=>upd(i,"name",e.target.value)}
                  placeholder="Fund name"
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e2e8f0",
                    padding:"9px 10px",borderRadius:9,fontSize:12,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 90px",gap:8}}>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>ALLOC %</div>
                <input type="number" value={row.pct} min={0} max={100} onChange={e=>upd(i,"pct",e.target.value)}
                  style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${account.color}44`,color:account.color,
                    padding:"9px 10px",borderRadius:9,fontSize:15,fontWeight:900,outline:"none",width:"100%",fontFamily:"inherit"}}/>
                <Bar p={Number(row.pct)} color={account.color} h={4}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>VALUE ($)</div>
                <input type="number" value={row.value} onChange={e=>upd(i,"value",e.target.value)}
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(251,191,36,0.3)",color:GOLD,
                    padding:"9px 10px",borderRadius:9,fontSize:13,fontWeight:800,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>EXP RATIO</div>
                <input value={row.er} onChange={e=>upd(i,"er",e.target.value)} placeholder="0.03%"
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.55)",
                    padding:"9px 8px",borderRadius:9,fontSize:12,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
            </div>
          </div>
        ))}

        {/* Totals */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:14,textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>TOTAL ALLOCATION</div>
            <div style={{fontSize:26,fontWeight:900,color:Math.abs(totalPct-100)<2?G:R}}>{totalPct.toFixed(0)}%</div>
            {Math.abs(totalPct-100)>=2&&<div style={{fontSize:9,color:R,marginTop:2}}>Should add up to 100%</div>}
          </div>
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:14,textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4,letterSpacing:1}}>ACCOUNT BALANCE</div>
            <div style={{fontSize:26,fontWeight:900,color:GOLD}}>{fmt(totalValue)}</div>
          </div>
        </div>

        {/* Auto-calc */}
        <button onClick={()=>setRows(r=>r.map(row=>({...row,value:Math.round((Number(row.pct)/100)*totalValue)})))}
          style={{width:"100%",marginBottom:14,padding:"13px",borderRadius:12,
            border:"2px solid rgba(251,191,36,0.4)",background:"rgba(251,191,36,0.08)",
            color:GOLD,cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:14}}>
          ⚡ Auto-calculate Values from % Allocation
        </button>

        {/* Note */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Note — AI Advisor reads this</div>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
            placeholder="e.g. Moved MDIZX to VIIIX on May 9 — AI will not repeat that alert"
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(167,139,250,0.2)",color:"#e2e8f0",
              padding:"10px 12px",borderRadius:10,fontSize:12,outline:"none",fontFamily:"inherit",resize:"none",lineHeight:1.6}}/>
        </div>

        {/* Save */}
        <button onClick={()=>onSave(rows,note)}
          style={{width:"100%",padding:"16px",borderRadius:13,border:"none",
            background:"linear-gradient(135deg,#00ff9d,#22d3ee)",color:"#000",
            fontWeight:900,fontSize:16,cursor:"pointer",fontFamily:"inherit"}}>
          💾 Save Holdings
        </button>
      </div>
    </div>
  );
}

function HoldingsSummaryCard({account,holdings,note,totalValue,onEdit}){
  const G="#00ff9d",R="#ff4560",GOLD="#fbbf24";
  const hasHighFee=holdings.some(h=>h.flag==="high_fee");
  return(
    <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${hasHighFee?"rgba(255,69,96,0.3)":account.color+"22"}`,borderRadius:16,padding:14,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div><div style={{fontSize:13,fontWeight:800,color:account.color}}>{account.icon} {account.label}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{fmt(totalValue)}</div></div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {hasHighFee&&<div style={{fontSize:9,padding:"3px 7px",borderRadius:6,background:"rgba(255,69,96,0.12)",color:R,border:"1px solid rgba(255,69,96,0.3)",fontWeight:700}}>⚠ HIGH FEE</div>}
          <button onClick={onEdit} style={{fontSize:10,padding:"5px 12px",borderRadius:8,border:`1px solid ${account.color}44`,background:`${account.color}11`,color:account.color,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Edit</button>
        </div>
      </div>
      {holdings.length===0?<div style={{textAlign:"center",padding:"10px 0",fontSize:11,color:"rgba(255,255,255,0.2)"}}>No holdings logged — tap Edit</div>
        :holdings.map((h,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:12,fontWeight:800,color:h.flag==="high_fee"?R:"rgba(255,255,255,0.85)"}}>{h.ticker}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{h.name}</span>
              </div>
              <Bar p={Number(h.pct)} color={h.flag==="high_fee"?R:account.color} h={3}/>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:GOLD}}>{fmt(Number(h.value))}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{h.pct}%{h.er?` · ${h.er}`:""}</div>
            </div>
          </div>
        ))
      }
      {note&&<div style={{marginTop:8,padding:"6px 10px",background:"rgba(255,255,255,0.04)",borderRadius:8,fontSize:10,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>📝 {note}</div>}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]       = useState("calendar");
  const [data,setData]     = useState(()=>{try{const s=localStorage.getItem("bhavesh_v7");return s?{...DEFAULTS,...JSON.parse(s)}:DEFAULTS;}catch{return DEFAULTS;}});
  const [editData,setED]   = useState({});
  const [editing,setEditing]= useState(false);
  const [editSection,setES]= useState("assets");
  const [saved,setSaved]   = useState(false);
  const [returnTab,setRT]  = useState("budget");
  const [editingAccount,setEditingAccount] = useState(null);
  const [aiAdvice,setAiAdvice]   = useState("");
  const [aiLoading,setAiLoading] = useState(false);
  const [aiQuestion,setAiQuestion] = useState("");
  const [aiHistory,setAiHistory] = useState([]);
  const [prices,setPrices] = useState(()=>Object.fromEntries(WATCHLIST.map(a=>[a.s,a.base])));
  const [changes,setChanges]= useState({});
  const [liveAlerts,setLiveAlerts]= useState([]);
  const [wSearch,setWSearch]= useState("");
  const [wCat,setWCat]     = useState("All");
  const [simPicks,setSimPicks]=useState([{stock:"NVDA",monthly:500,initial:5000,years:10}]);
  const [showCustomForm,setShowCustomForm]=useState(false);
  const [customForm,setCustomForm]=useState({label:"",icon:"💼",value:"",group:"Other",note:"",_editId:null});
  const CUSTOM_GROUPS=["Investments","Real Estate","Other","Baby Patel 👑"];
  const CUSTOM_ICONS=["💼","🏠","🚗","💰","📈","🏦","💎","🌍","🎯","⚡","🏆","💊","🎓","₿","⟠"];
  // Extra rows for Income, Expenses, Investments that Bhavesh can add/delete
  const [extraIncome,setExtraIncome]=useState(()=>{try{const s=localStorage.getItem("bhavesh_extraIncome");return s?JSON.parse(s):[]}catch{return []}});
  const [extraExpenses,setExtraExpenses]=useState(()=>{try{const s=localStorage.getItem("bhavesh_extraExpenses");return s?JSON.parse(s):[]}catch{return []}});
  const [extraInvestments,setExtraInvestments]=useState(()=>{try{const s=localStorage.getItem("bhavesh_extraInvestments");return s?JSON.parse(s):[]}catch{return []}});
  useEffect(()=>{try{localStorage.setItem("bhavesh_extraIncome",JSON.stringify(extraIncome))}catch{}},[extraIncome]);
  useEffect(()=>{try{localStorage.setItem("bhavesh_extraExpenses",JSON.stringify(extraExpenses))}catch{}},[extraExpenses]);
  useEffect(()=>{try{localStorage.setItem("bhavesh_extraInvestments",JSON.stringify(extraInvestments))}catch{}},[extraInvestments]);
  const [addingSection,setAddingSection]=useState(null); // "income"|"expenses"|"investments"|null
  const [addingLabel,setAddingLabel]=useState("");
  function confirmAddRow(){
    if(!addingLabel.trim()||!addingSection)return;
    addExtraRow(addingSection,addingLabel);
    setAddingLabel("");setAddingSection(null);
  }
  function addExtraRow(type,label){
    if(!label.trim())return;
    const id=Date.now();
    const row={id,label,value:0};
    if(type==="income") setExtraIncome(r=>[...r,row]);
    else if(type==="expenses") setExtraExpenses(r=>[...r,row]);
    else setExtraInvestments(r=>[...r,row]);
  }
  function deleteExtraRow(type,id){
    if(type==="income") setExtraIncome(r=>r.filter(x=>x.id!==id));
    else if(type==="expenses") setExtraExpenses(r=>r.filter(x=>x.id!==id));
    else setExtraInvestments(r=>r.filter(x=>x.id!==id));
  }
  function updateExtraRow(type,id,val){
    const fn=r=>r.map(x=>x.id===id?{...x,value:parseFloat(val)||0}:x);
    if(type==="income") setExtraIncome(fn);
    else if(type==="expenses") setExtraExpenses(fn);
    else setExtraInvestments(fn);
  }
  function addCustomItem(){
    if(!customForm.label.trim())return;
    if(customForm._editId){
      // Editing existing
      setData(d=>({...d,customItems:(d.customItems||[]).map(c=>c.id===customForm._editId?{...c,label:customForm.label,icon:customForm.icon,value:parseFloat(customForm.value)||0,group:customForm.group,note:customForm.note}:c)}));
    } else {
      // Adding new
      const item={id:Date.now(),label:customForm.label,icon:customForm.icon,value:parseFloat(customForm.value)||0,group:customForm.group,note:customForm.note,color:"#94a3b8"};
      setData(d=>({...d,customItems:[...(d.customItems||[]),item]}));
    }
    setCustomForm({label:"",icon:"💼",value:"",group:"Other",note:"",_editId:null});
    setShowCustomForm(false);
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  }
  function removeCustomItem(id){setData(d=>({...d,customItems:(d.customItems||[]).filter(c=>c.id!==id)}));}
  function updateCustomValue(id,val){setData(d=>({...d,customItems:(d.customItems||[]).map(c=>c.id===id?{...c,value:parseFloat(val)||0}:c)}));}

  // ── Calendar ──
  const todayObj = new Date();
  const [calYear,setCalYear]   = useState(todayObj.getFullYear());
  const [calMonth,setCalMonth] = useState(todayObj.getMonth());
  const [calEvents,setCalEvents]= useState(()=>{try{const s=localStorage.getItem("bhavesh_cal");return s?JSON.parse(s):[];}catch{return [];}});
  const [showEventForm,setShowEventForm]= useState(false);
  const [selectedDay,setSelectedDay]   = useState(null);
  const [editingEvent,setEditingEvent] = useState(null);
  const [eventForm,setEventForm]= useState({title:"",category:"finance",note:"",done:false});
  const [showDayDetail,setShowDayDetail]= useState(null); // day number for detail view
  const [calView,setCalView] = useState("month"); // "month" | "schedule"

  useEffect(()=>{try{localStorage.setItem("bhavesh_v7",JSON.stringify(data));}catch{}},[data]);
  useEffect(()=>{try{localStorage.setItem("bhavesh_cal",JSON.stringify(calEvents));}catch{}},[calEvents]);

  // ── PRICE FETCHER — real backend or simulated fallback ──────────────────────
  const fetchPrices = async () => {
    if (BACKEND_URL) {
      try {
        const res  = await fetch(`${BACKEND_URL}/api/prices`);
        const json = await res.json();
        if (json.success && json.prices) {
          const next = {}, chg = {};
          WATCHLIST.forEach(a => {
            const q = json.prices[a.s] || json.prices[a.s + "-USD"];
            if (q) {
              next[a.s] = q.price;
              chg[a.s]  = q.changePct;
              if (q.changePct <= -5) {
                setLiveAlerts(al => [{s:a.s, n:a.n, chg:q.changePct, time:new Date().toLocaleTimeString()}, ...al].slice(0,20));
              }
            } else {
              next[a.s] = prices[a.s] || a.base;
              chg[a.s]  = 0;
            }
          });
          setPrices(next);
          setChanges(chg);
          return;
        }
      } catch(err) {
        console.warn("Backend unavailable, using simulated prices:", err.message);
      }
    }
    // Fallback: simulate prices
    setPrices(prev => {
      const next = {...prev}, chg = {};
      WATCHLIST.forEach(a => {
        next[a.s] = tickP(prev[a.s] || a.base, a.vol);
        chg[a.s]  = (next[a.s] / (prev[a.s] || a.base) - 1) * 100;
        if (chg[a.s] < -0.7) setLiveAlerts(al => [{s:a.s, n:a.n, chg:chg[a.s], time:new Date().toLocaleTimeString()}, ...al].slice(0,20));
      });
      setChanges(chg);
      return next;
    });
  };

  useEffect(() => {
    fetchPrices(); // fetch immediately on load
    const id = setInterval(fetchPrices, BACKEND_URL ? 60000 : 5000); // 60s real, 5s simulated
    return () => clearInterval(id);
  }, []);

  const customTotal =(data.customItems||[]).reduce((s,c)=>s+(c.value||0),0);
  const netWorth   =ASSET_FIELDS.reduce((s,a)=>s+(data[a.key]||0),0)+customTotal;
  const investable =["k401","ira","stocks","cash"].reduce((s,k)=>s+(data[k]||0),0);
  const babyTotal  =["baby529","babyUtma","babyIndex","babyBtc","babyEth"].reduce((s,k)=>s+(data[k]||0),0);
  const retireProj =fv(investable,data.inv401k+data.invIra+data.invBrokerage,0.10,20);
  const totalIncome=INCOME_FIELDS.reduce((s,f)=>s+(data[f.key]||0),0)+extraIncome.reduce((s,r)=>s+r.value,0);
  const totalExp   =EXPENSE_FIELDS.reduce((s,f)=>s+(data[f.key]||0),0)+extraExpenses.reduce((s,r)=>s+r.value,0);
  const totalInv   =INV_FIELDS.reduce((s,f)=>s+(data[f.key]||0),0)+extraInvestments.reduce((s,r)=>s+r.value,0);
  const surplus    =totalIncome-totalExp-totalInv;
  const savRate    =totalIncome>0?(totalInv/totalIncome*100):0;
  const G="#00ff9d",R="#ff4560",GOLD="#fbbf24";

  const sorted=[...WATCHLIST].map(a=>({...a,price:prices[a.s]||a.base,chg:changes[a.s]||0})).sort((a,b)=>b.chg-a.chg);
  const gainers=sorted.slice(0,5),losers=[...sorted].reverse().slice(0,5);
  const filtered=WATCHLIST.filter(a=>(wCat==="All"||a.cat===wCat)&&(wSearch===""||a.s.toLowerCase().includes(wSearch.toLowerCase())||a.n.toLowerCase().includes(wSearch.toLowerCase())));

  function startEdit(section){
    const e={};[...ASSET_FIELDS,{key:"baseSalary"},{key:"overtimeAvg"},{key:"pharmacyDist"},{key:"otherIncome"},...EXPENSE_FIELDS,...INV_FIELDS].forEach(f=>{e[f.key]=String(data[f.key]||0);});
    setRT(tab);setED(e);setES(section||"assets");setEditing(true);setTab("update");
  }
  function saveUpdate(){
    const u={};Object.keys(editData).forEach(k=>{u[k]=parseFloat(editData[k])||0;});
    const now=new Date().toISOString(),nw=ASSET_FIELDS.reduce((s,a)=>s+(u[a.key]||0),0);
    setData(d=>({...d,...u,lastUpdated:now,updateHistory:[{date:now,netWorth:nw,change:nw-netWorth},...(d.updateHistory||[])].slice(0,24)}));
    setEditing(false);setSaved(true);setTab(returnTab);setTimeout(()=>setSaved(false),3000);
  }
  function saveHoldings(accountId,rows,note){
    setData(d=>({...d,holdings:{...(d.holdings||DEFAULT_HOLDINGS),[accountId]:rows},holdingNotes:{...(d.holdingNotes||{}),[accountId]:note}}));
    setEditingAccount(null);setSaved(true);setTimeout(()=>setSaved(false),2000);
  }
  async function runAdvisor(question){
    setAiLoading(true); setAiAdvice("");
    // Try real backend first
    if (BACKEND_URL) {
      try {
        const endpoint = question ? "/api/advisor/ask" : "/api/advisor/analyze";
        const res  = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(question ? { question } : {}),
        });
        const json = await res.json();
        if (json.success) {
          const advice = json.analysis || json.answer || "";
          setAiAdvice(advice);
          if (question) {
            setAiHistory(h=>[{q:question, a:advice, time:new Date().toLocaleTimeString()}, ...h].slice(0,8));
            setAiQuestion("");
          }
          setAiLoading(false);
          return;
        }
      } catch(err) {
        console.warn("Backend AI unavailable, using built-in:", err.message);
      }
    }
    // Fallback: built-in rule-based advisor
    setTimeout(()=>{
      const advice=generateAdvice(data,data.holdings||DEFAULT_HOLDINGS,data.holdingNotes||{},totalIncome,totalInv,surplus,savRate,netWorth,investable,babyTotal,retireProj,question||null);
      setAiAdvice(advice);
      if(question){setAiHistory(h=>[{q:question,a:advice,time:new Date().toLocaleTimeString()},...h].slice(0,8));setAiQuestion("");}
      setAiLoading(false);
    },700);
  }

  // Calendar helpers
  function dkForDay(day){return dateKey(calYear,calMonth,day);}
  function eventsForDay(day){const dk=dkForDay(day);return calEvents.filter(e=>e.date===dk);}
  function eventsForMonth(){const p=`${calYear}-${String(calMonth+1).padStart(2,"0")}`;return calEvents.filter(e=>e.date.startsWith(p));}
  function openAdd(day){setSelectedDay(day);setEditingEvent(null);setEventForm({title:"",category:"finance",note:"",done:false});setShowEventForm(true);setShowDayDetail(null);}
  function openEdit(ev,day){setSelectedDay(day);setEditingEvent(ev.id);setEventForm({title:ev.title,category:ev.category,note:ev.note||"",done:ev.done||false});setShowEventForm(true);}
  function saveEvent(){
    if(!eventForm.title.trim())return;
    const dk=dkForDay(selectedDay);
    if(editingEvent){setCalEvents(evs=>evs.map(e=>e.id===editingEvent?{...e,...eventForm,date:dk}:e));}
    else{setCalEvents(evs=>[...evs,{id:Date.now(),date:dk,...eventForm}]);}
    setShowEventForm(false);
  }
  function deleteEvent(id){setCalEvents(evs=>evs.filter(e=>e.id!==id));setShowEventForm(false);}
  function toggleDone(id){setCalEvents(evs=>evs.map(e=>e.id===id?{...e,done:!e.done}:e));}

  const todayStr=dateKey(todayObj.getFullYear(),todayObj.getMonth(),todayObj.getDate());
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const monthEvents=eventsForMonth();

  // Get upcoming work/off periods for schedule view
  function getMonthSchedule(){
    const days=[];
    for(let d=1;d<=daysInMonth;d++){
      const date=new Date(calYear,calMonth,d);
      const status=getShiftStatus(date);
      days.push({day:d,date,status,dow:date.getDay()});
    }
    return days;
  }

  const TABS=[
    {key:"dashboard",icon:"🏠",label:"Home"},
    {key:"calendar", icon:"📅",label:"Cal"},
    {key:"holdings", icon:"📂",label:"Hold"},
    {key:"budget",   icon:"💰",label:"Budget"},
    {key:"update",   icon:"✏️",label:"Update"},
    {key:"advisor",  icon:"🤖",label:"AI"},
    {key:"sim",      icon:"🎮",label:"Sim"},
    {key:"watchlist",icon:"👁", label:"Watch"},
    {key:"news",     icon:"📰",label:"News"},
    {key:"alerts",   icon:"🔔",label:"Alerts"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#060910,#0a1020,#060910)",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#e2e8f0",padding:"18px 13px 80px",maxWidth:640,margin:"0 auto"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp 0.3s ease}
        .dot{width:7px;height:7px;border-radius:50%;background:#00ff9d;display:inline-block;animation:pulse 1.2s infinite}
        .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:16px;margin-bottom:12px}
        input.num{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:700;outline:none;width:100%;font-family:inherit}
        input.num:focus{border-color:#00ff9d66}
        input.srch{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#e2e8f0;padding:8px 12px;border-radius:10px;font-size:11px;outline:none;width:100%;margin-bottom:10px;font-family:inherit}
        button.sec{cursor:pointer;flex:1;padding:8px 4px;border-radius:8px;border:none;font-family:inherit;font-size:10px;font-weight:700;transition:all 0.2s}
        button.cat{cursor:pointer;font-size:10px;padding:4px 10px;border-radius:8px;font-family:inherit;transition:all 0.15s;border:none}
        .spinner{width:18px;height:18px;border:2px solid rgba(167,139,250,0.2);border-top-color:#a78bfa;border-radius:50%;animation:spin 0.8s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
        .ai-text{font-size:12px;line-height:1.9;color:rgba(255,255,255,0.85);white-space:pre-wrap;font-family:'DM Sans','Segoe UI',sans-serif}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}
        input[type=range]{accent-color:#a78bfa}
        textarea{font-family:inherit}
        .day-cell{border-radius:10px;cursor:pointer;transition:all 0.15s;position:relative;}
        .day-cell:hover{transform:scale(1.05);}
      `}</style>

      {editingAccount&&<HoldingsEditor account={ACCOUNTS.find(a=>a.id===editingAccount)} holdings={(data.holdings||DEFAULT_HOLDINGS)[editingAccount]||[]} totalValue={data[editingAccount]||0} onSave={(rows,note)=>saveHoldings(editingAccount,rows,note)} onClose={()=>setEditingAccount(null)}/>}

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:3,fontFamily:"monospace",background:"linear-gradient(135deg,#fbbf24,#f87171,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>◈ ABC INTEL</div>
          <div style={{fontSize:8,color:"#4a6fa5",letterSpacing:2,marginTop:1}}>Updated: <span style={{color:data.lastUpdated?"#34d399":R}}>{ago(data.lastUpdated)}</span>{"  "}·{"  "}AGGRESSIVE STRATEGY</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {saved&&<div style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:"#00ff9d22",border:"1px solid #00ff9d44",color:G}}>✓ SAVED</div>}
          {liveAlerts.length>0&&<div style={{fontSize:9,padding:"3px 8px",borderRadius:6,background:"#ff456011",border:"1px solid #ff456044",color:R}}>⚠ {liveAlerts.length}</div>}
          <span className="dot"/><span style={{fontSize:9,color:G}}>LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:14,padding:4,marginBottom:18,gap:2,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>{if(t.key==="update")setEditing(false);setTab(t.key);}} style={{flexShrink:0,padding:"8px 7px",borderRadius:10,border:"none",cursor:"pointer",fontSize:9,fontWeight:700,whiteSpace:"nowrap",
            background:tab===t.key
              ?t.key==="calendar"?"linear-gradient(135deg,#34d399,#fbbf24)"
              :t.key==="holdings"?"linear-gradient(135deg,#fbbf24,#fb923c)"
              :t.key==="advisor"?"linear-gradient(135deg,#a78bfa,#60a5fa)"
              :t.key==="budget"?"linear-gradient(135deg,#34d399,#60a5fa)"
              :t.key==="update"?"linear-gradient(135deg,#00ff9d,#22d3ee)"
              :t.key==="alerts"?"linear-gradient(135deg,#ff4560,#f59e0b)"
              :t.key==="news"?"linear-gradient(135deg,#60a5fa,#a78bfa)"
              :t.key==="sim"?"linear-gradient(135deg,#a78bfa,#f472b6)"
              :"linear-gradient(135deg,#fbbf24,#f87171)"
              :"transparent",
            color:tab===t.key?"#000":"rgba(255,255,255,0.3)",transition:"all 0.2s",
          }}>{t.icon} {t.label}{t.key==="alerts"&&liveAlerts.length>0?` (${liveAlerts.length})`:""}</button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {tab==="dashboard"&&<div className="fade">
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          {[
            {l:"Net Worth",   v:fmt(netWorth),  c:GOLD,      to:"update"},
            {l:"Retire Proj.",v:fmt(retireProj),c:"#34d399", to:"update"},
            {l:"Baby Patel", v:fmt(fv(babyTotal,1000,0.12,18)),c:"#f472b6",to:"holdings"},
            {l:"Monthly Save",v:fmt(totalInv),  c:G,         to:"budget"},
            {l:"Surplus",    v:fmt(Math.max(0,surplus)),c:surplus>0?G:R,to:"budget"},
            {l:"Schedule",   v:(()=>{const s=getShiftStatus(todayObj);return s==="work"?"🌙 Working":"✅ Day Off";})(),c:(()=>getShiftStatus(todayObj)==="work"?"#60a5fa":"#34d399")(),to:"calendar"},
          ].map(s=>(
            <div key={s.l} onClick={()=>setTab(s.to)} style={{textAlign:"center",padding:"12px 8px",cursor:"pointer",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:18,transition:"all 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
              <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:1,marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>Goal Progress</div>
          {[
            {label:"Retirement Savings",val:investable,goal:RETIRE_GOAL,color:"#34d399"},
            {label:"Baby Patel Fund",   val:babyTotal, goal:BABY_GOAL,  color:"#f472b6"},
            {label:"Net Worth $5M",    val:netWorth,  goal:5000000,    color:GOLD},
          ].map(g=>{const p=Math.min(g.val/g.goal*100,100);return(
            <div key={g.label} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:700}}>{g.label}</span><span style={{fontSize:12,fontWeight:800,color:g.color}}>{fmt(g.val)} <span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>/ {fmt(g.goal)}</span></span></div>
              <Bar p={p} color={g.color} h={9}/>
              <div style={{textAlign:"right",marginTop:3}}><span style={{fontSize:10,fontWeight:800,color:p>=50?g.color:"rgba(255,255,255,0.4)"}}>{p.toFixed(1)}%</span></div>
            </div>
          );})}
        </div>
        {/* Wealth mission card */}
        <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.08),rgba(167,139,250,0.06))",border:"1px solid rgba(251,191,36,0.2)",borderRadius:18,padding:16,marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:800,color:"#fbbf24",marginBottom:8}}>🎯 Bhavesh Wealth Mission</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {l:"Retire by 60",v:"$4M goal",c:"#34d399",to:"update"},
              {l:"Baby Patel",  v:"$1M by 18",c:"#f472b6",to:"holdings"},
              {l:"Today",       v:getShiftStatus(todayObj)==="work"?"🌙 Working":"✅ Day Off",c:getShiftStatus(todayObj)==="work"?"#60a5fa":"#34d399",to:"calendar"},
              {l:"AI Advisor",  v:"Get advice →",c:"#a78bfa",to:"advisor"},
            ].map(s=>(
              <div key={s.l} onClick={()=>setTab(s.to)} style={{padding:"10px 12px",background:"rgba(255,255,255,0.04)",borderRadius:12,cursor:"pointer",border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginBottom:2}}>{s.l}</div>
                <div style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[{title:"🚀 Gainers",data:gainers,c:G},{title:"📉 Losers",data:losers,c:R}].map(({title,data:d,c})=>(
            <div key={title} className="card" style={{marginBottom:0}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:10}}>{title}</div>
              {d.map(a=><div key={a.s} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:11}}><span style={{fontWeight:700}}>{a.s}</span><span style={{color:c,fontWeight:700}}>{pc(a.chg)}</span></div>)}
            </div>
          ))}
        </div>
      </div>}

      {/* ══ CALENDAR ══ */}
      {tab==="calendar"&&<div className="fade">

        {/* Event form overlay */}
        {showEventForm&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,overflowY:"auto",padding:"20px 13px 40px"}}>
            <div style={{maxWidth:640,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div style={{fontSize:15,fontWeight:900,color:"#34d399"}}>{editingEvent?"✏️ Edit Event":"📅 Add Event"}</div>
                <button onClick={()=>setShowEventForm(false)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"8px 14px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>✕</button>
              </div>
              {/* Show shift status for selected day */}
              {selectedDay&&(()=>{
                const selDate=new Date(calYear,calMonth,selectedDay);
                const status=getShiftStatus(selDate);
                return(
                  <div style={{background:status==="work"?"rgba(96,165,250,0.1)":"rgba(52,211,153,0.1)",border:`1px solid ${status==="work"?"rgba(96,165,250,0.3)":"rgba(52,211,153,0.3)"}`,borderRadius:14,padding:12,marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:status==="work"?"#60a5fa":"#34d399"}}>
                      {MONTH_NAMES[calMonth]} {selectedDay} — {status==="work"?"🌙 Night Shift (8PM–8AM)":"✅ Day Off"}
                    </div>
                    {status==="off"&&<div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Available for overtime or personal events</div>}
                  </div>
                );
              })()}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Title *</div>
                <input value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Review 401K, Doctor appt, Pay bills"
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e2e8f0",padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:700,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>Category</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {EVENT_CATS.map(c=>(
                    <button key={c.key} onClick={()=>setEventForm(f=>({...f,category:c.key}))} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${eventForm.category===c.key?c.color+"66":"rgba(255,255,255,0.1)"}`,background:eventForm.category===c.key?`${c.color}22`:"rgba(255,255,255,0.04)",color:eventForm.category===c.key?c.color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6,letterSpacing:1,textTransform:"uppercase"}}>Notes</div>
                <textarea value={eventForm.note} onChange={e=>setEventForm(f=>({...f,note:e.target.value}))} rows={3} placeholder="Add details or reminders..."
                  style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",padding:"10px 12px",borderRadius:10,fontSize:12,outline:"none",lineHeight:1.6,resize:"none"}}/>
              </div>
              {editingEvent&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"10px 14px",background:"rgba(255,255,255,0.04)",borderRadius:10}}>
                <input type="checkbox" checked={eventForm.done} onChange={e=>setEventForm(f=>({...f,done:e.target.checked}))} style={{width:18,height:18,cursor:"pointer"}}/>
                <span style={{fontSize:13,fontWeight:700,color:eventForm.done?"#34d399":"rgba(255,255,255,0.6)"}}>Mark as completed</span>
              </div>}
              <div style={{display:"grid",gridTemplateColumns:editingEvent?"1fr 1fr 1fr":"1fr 1fr",gap:8}}>
                <button onClick={()=>setShowEventForm(false)} style={{padding:"13px",borderRadius:11,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Cancel</button>
                {editingEvent&&<button onClick={()=>deleteEvent(editingEvent)} style={{padding:"13px",borderRadius:11,border:"1px solid rgba(255,69,96,0.3)",background:"rgba(255,69,96,0.1)",color:R,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Delete</button>}
                <button onClick={saveEvent} style={{padding:"13px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#34d399,#fbbf24)",color:"#000",cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>💾 Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Month nav */}
        <div style={{background:"linear-gradient(135deg,rgba(52,211,153,0.1),rgba(251,191,36,0.06))",border:"1px solid rgba(52,211,153,0.25)",borderRadius:20,padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"6px 16px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:"inherit",fontSize:18,fontWeight:700}}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:900,color:"#34d399"}}>{MONTH_NAMES[calMonth]}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{calYear}</div>
            </div>
            <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"6px 16px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:"inherit",fontSize:18,fontWeight:700}}>›</button>
          </div>
          {/* Month summary stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {[
              {label:"Work Nights",value:getMonthSchedule().filter(d=>d.status==="work").length,color:"#60a5fa",icon:"🌙"},
              {label:"Days Off",   value:getMonthSchedule().filter(d=>d.status==="off").length, color:"#34d399",icon:"✅"},
              {label:"Events",     value:monthEvents.length,                                     color:"#fbbf24",icon:"📅"},
              {label:"Pending",    value:monthEvents.filter(e=>!e.done).length,                  color:monthEvents.filter(e=>!e.done).length>0?"#ff4560":"#34d399",icon:"⏳"},
            ].map(s=>(
              <div key={s.label} style={{textAlign:"center",background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"8px 4px"}}>
                <div style={{fontSize:14}}>{s.icon}</div>
                <div style={{fontSize:16,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[{k:"month",l:"📅 Calendar"},{k:"schedule",l:"🌙 Schedule"}].map(v=>(
            <button key={v.k} onClick={()=>setCalView(v.k)} style={{flex:1,padding:"9px",borderRadius:10,border:`1px solid ${calView===v.k?"rgba(52,211,153,0.4)":"rgba(255,255,255,0.08)"}`,background:calView===v.k?"rgba(52,211,153,0.12)":"rgba(255,255,255,0.03)",color:calView===v.k?"#34d399":"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12}}>
              {v.l}
            </button>
          ))}
          <button onClick={()=>openAdd(todayObj.getDate())} style={{padding:"9px 14px",borderRadius:10,border:"1px solid rgba(52,211,153,0.3)",background:"rgba(52,211,153,0.1)",color:"#34d399",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12}}>+ Add</button>
        </div>

        {/* ── MONTH CALENDAR VIEW ── */}
        {calView==="month"&&<>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
            {DAY_NAMES.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:700,padding:"4px 0"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:14}}>
            {Array(firstDay).fill(null).map((_,i)=><div key={"e"+i}/>)}
            {Array(daysInMonth).fill(null).map((_,i)=>{
              const day=i+1;
              const dayDate=new Date(calYear,calMonth,day);
              const shiftStatus=getShiftStatus(dayDate);
              const dayEvts=eventsForDay(day);
              const dk=dkForDay(day);
              const isToday=dk===todayStr;
              const hasPending=dayEvts.some(e=>!e.done);
              const isWork=shiftStatus==="work";
              const isOff=shiftStatus==="off";

              return(
                <div key={day} className="day-cell"
                  onClick={()=>openAdd(day)}
                  style={{
                    minHeight:58,padding:"4px 3px",textAlign:"center",
                    background:isToday?"rgba(52,211,153,0.2)":isWork?"rgba(96,165,250,0.08)":"rgba(52,211,153,0.05)",
                    border:`1px solid ${isToday?"rgba(52,211,153,0.6)":isWork?"rgba(96,165,250,0.2)":"rgba(52,211,153,0.12)"}`,
                  }}>
                  <div style={{fontSize:11,fontWeight:isToday?900:600,color:isToday?"#34d399":isWork?"#60a5fa":"rgba(52,211,153,0.8)"}}>{day}</div>
                  {isToday&&<div style={{fontSize:6,color:"#34d399",fontWeight:800,letterSpacing:0.5}}>TODAY</div>}
                  {/* Shift indicator */}
                  <div style={{fontSize:8,marginTop:1,color:isWork?"#60a5fa":"rgba(52,211,153,0.6)"}}>
                    {isWork?"🌙":"✅"}
                  </div>
                  {/* Event dots */}
                  {dayEvts.length>0&&(
                    <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:2,flexWrap:"wrap"}}>
                      {dayEvts.slice(0,3).map((ev,ei)=>{
                        const cat=EVENT_CATS.find(c=>c.key===ev.category)||EVENT_CATS[0];
                        return <div key={ei} style={{width:5,height:5,borderRadius:"50%",background:ev.done?"rgba(52,211,153,0.5)":cat.color}}/>;
                      })}
                      {dayEvts.length>3&&<div style={{fontSize:6,color:"rgba(255,255,255,0.3)"}}>{`+${dayEvts.length-3}`}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:14,padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:12}}>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(255,255,255,0.5)"}}><span>🌙</span> Night shift (8PM–8AM)</div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(255,255,255,0.5)"}}><span>✅</span> Day off</div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(255,255,255,0.5)"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#34d399"}}/> Event done</div>
            <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"rgba(255,255,255,0.5)"}}><div style={{width:8,height:8,borderRadius:"50%",background:"#fbbf24"}}/> Event pending</div>
          </div>
        </>}

        {/* ── SCHEDULE / LIST VIEW ── */}
        {calView==="schedule"&&(()=>{
          const schedule=getMonthSchedule();
          // Group into work/off blocks
          let blocks=[],curr=null;
          schedule.forEach(d=>{
            if(!curr||curr.status!==d.status){curr={status:d.status,days:[d]};blocks.push(curr);}
            else curr.days.push(d);
          });
          return(
            <div>
              {/* Current status banner */}
              {(()=>{
                const s=getShiftStatus(todayObj);
                const isCurrentMonth=calYear===todayObj.getFullYear()&&calMonth===todayObj.getMonth();
                if(!isCurrentMonth)return null;
                return(
                  <div style={{background:s==="work"?"rgba(96,165,250,0.12)":"rgba(52,211,153,0.12)",border:`1px solid ${s==="work"?"rgba(96,165,250,0.3)":"rgba(52,211,153,0.3)"}`,borderRadius:14,padding:14,marginBottom:14,textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{s==="work"?"🌙":"✅"}</div>
                    <div style={{fontSize:16,fontWeight:900,color:s==="work"?"#60a5fa":"#34d399"}}>{s==="work"?"Currently on Night Shift":"Currently Off Duty"}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>{s==="work"?"8:00 PM – 8:00 AM shift":"Available for overtime or personal time"}</div>
                  </div>
                );
              })()}

              {blocks.map((block,bi)=>{
                const startDay=block.days[0].day;
                const endDay=block.days[block.days.length-1].day;
                const isWork=block.status==="work";
                const blockEvts=block.days.flatMap(d=>eventsForDay(d.day));
                return(
                  <div key={bi} style={{background:isWork?"rgba(96,165,250,0.06)":"rgba(52,211,153,0.04)",border:`1px solid ${isWork?"rgba(96,165,250,0.2)":"rgba(52,211,153,0.15)"}`,borderRadius:16,padding:14,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:800,color:isWork?"#60a5fa":"#34d399"}}>
                          {isWork?"🌙 Work Week":"✅ Off Week"}
                        </div>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>
                          {MONTH_NAMES[calMonth].slice(0,3)} {startDay}
                          {startDay!==endDay?` – ${MONTH_NAMES[calMonth].slice(0,3)} ${endDay}`:""}
                          {isWork?" · Night shift 8PM–8AM":" · Available for overtime"}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:900,color:isWork?"#60a5fa":"#34d399"}}>{block.days.length}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>days</div>
                      </div>
                    </div>
                    {/* Day chips */}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:blockEvts.length>0?10:0}}>
                      {block.days.map(d=>{
                        const dk=dkForDay(d.day);
                        const isT=dk===todayStr;
                        const evts=eventsForDay(d.day);
                        return(
                          <div key={d.day} onClick={()=>openAdd(d.day)} style={{
                            padding:"4px 8px",borderRadius:7,cursor:"pointer",
                            background:isT?"rgba(52,211,153,0.3)":evts.length>0?`${isWork?"rgba(96,165,250,0.2)":"rgba(52,211,153,0.15)"}`:"rgba(255,255,255,0.04)",
                            border:`1px solid ${isT?"rgba(52,211,153,0.6)":evts.length>0?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.06)"}`,
                            fontSize:11,fontWeight:isT?900:600,
                            color:isT?"#34d399":evts.length>0?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.45)",
                          }}>
                            {DAY_NAMES[d.dow].slice(0,2)} {d.day}{evts.length>0?` ·${evts.length}`:""}
                          </div>
                        );
                      })}
                    </div>
                    {/* Events in this block */}
                    {blockEvts.length>0&&blockEvts.map((ev,ei)=>{
                      const cat=EVENT_CATS.find(c=>c.key===ev.category)||EVENT_CATS[0];
                      const d=parseInt(ev.date.split("-")[2]);
                      return(
                        <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                          <button onClick={()=>toggleDone(ev.id)} style={{width:16,height:16,borderRadius:4,border:`2px solid ${ev.done?"#34d399":cat.color}`,background:ev.done?"#34d399":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {ev.done&&<span style={{color:"#000",fontSize:9,fontWeight:900}}>✓</span>}
                          </button>
                          <span style={{fontSize:11,fontWeight:ev.done?400:700,color:ev.done?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.85)",textDecoration:ev.done?"line-through":"none",flex:1}}>{ev.title}</span>
                          <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:`${cat.color}22`,color:cat.color,fontWeight:700}}>{cat.icon}</span>
                          <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",minWidth:30,textAlign:"right"}}>{d}</span>
                          <button onClick={()=>openEdit(ev,d)} style={{background:"rgba(255,255,255,0.05)",border:"none",borderRadius:5,padding:"3px 7px",color:"rgba(255,255,255,0.3)",cursor:"pointer",fontFamily:"inherit",fontSize:10}}>✏️</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* All events this month */}
        {monthEvents.length>0&&calView==="month"&&(
          <div className="card">
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>{MONTH_NAMES[calMonth]} Events ({monthEvents.length})</div>
            {monthEvents.sort((a,b)=>a.date.localeCompare(b.date)).map((ev,i)=>{
              const cat=EVENT_CATS.find(c=>c.key===ev.category)||EVENT_CATS[0];
              const d=parseInt(ev.date.split("-")[2]);
              const dayDate=new Date(calYear,calMonth,d);
              const shiftSt=getShiftStatus(dayDate);
              return(
                <div key={ev.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:i<monthEvents.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <button onClick={()=>toggleDone(ev.id)} style={{flexShrink:0,marginTop:1,width:18,height:18,borderRadius:5,border:`2px solid ${ev.done?"#34d399":cat.color}`,background:ev.done?"#34d399":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {ev.done&&<span style={{color:"#000",fontSize:11,fontWeight:900}}>✓</span>}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:ev.done?400:700,color:ev.done?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.85)",textDecoration:ev.done?"line-through":"none"}}>{ev.title}</span>
                      <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:`${cat.color}22`,color:cat.color,fontWeight:700}}>{cat.icon} {cat.label}</span>
                      <span style={{fontSize:9,padding:"2px 6px",borderRadius:5,background:shiftSt==="work"?"rgba(96,165,250,0.12)":"rgba(52,211,153,0.12)",color:shiftSt==="work"?"#60a5fa":"#34d399",fontWeight:700}}>{shiftSt==="work"?"🌙":"✅"}</span>
                    </div>
                    {ev.note&&<div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{ev.note}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:700,color:cat.color}}>{d}</div><div style={{fontSize:8,color:"rgba(255,255,255,0.25)"}}>{DAY_NAMES[dayDate.getDay()]}</div></div>
                    <button onClick={()=>openEdit(ev,d)} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:6,padding:"4px 8px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit",fontSize:11}}>✏️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming pending events */}
        {(()=>{
          const upcoming=calEvents.filter(e=>!e.done&&e.date>=todayStr).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
          if(!upcoming.length)return null;
          return(
            <div className="card">
              <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>⏳ Upcoming ({upcoming.length})</div>
              {upcoming.map((ev,i)=>{
                const cat=EVENT_CATS.find(c=>c.key===ev.category)||EVENT_CATS[0];
                const [y,m,d]=ev.date.split("-");
                const dayDate=new Date(parseInt(y),parseInt(m)-1,parseInt(d));
                const shiftSt=getShiftStatus(dayDate);
                const isUrgent=ev.date===todayStr;
                return(
                  <div key={ev.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<upcoming.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",minWidth:0}}>
                      <div style={{width:8,height:8,borderRadius:4,background:cat.color,flexShrink:0}}/>
                      <div><div style={{fontSize:12,fontWeight:700}}>{ev.title}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>{cat.icon} {cat.label} · {shiftSt==="work"?"🌙 Work night":"✅ Off day"}</div></div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                      <div style={{fontSize:11,fontWeight:800,color:isUrgent?R:cat.color}}>{isUrgent?"TODAY":`${MONTH_NAMES[parseInt(m)-1].slice(0,3)} ${parseInt(d)}`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Quick-add category buttons */}
        <div className="card">
          <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Quick Add for Today</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {EVENT_CATS.map(c=>(
              <button key={c.key} onClick={()=>{openAdd(todayObj.getDate());setTimeout(()=>setEventForm(f=>({...f,category:c.key})),30);}} style={{padding:"7px 12px",borderRadius:9,border:`1px solid ${c.color}33`,background:`${c.color}11`,color:c.color,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* ══ HOLDINGS ══ */}
      {tab==="holdings"&&<div className="fade">
        <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.05))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:18,marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:900,color:GOLD,marginBottom:4}}>📂 Holdings by Account</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.7}}>Log what is inside each account. AI Advisor reads these — log a change and it stops repeating that alert.</div>
        </div>
        {ACCOUNTS.map(acc=><HoldingsSummaryCard key={acc.id} account={acc} holdings={(data.holdings||DEFAULT_HOLDINGS)[acc.id]||[]} note={(data.holdingNotes||{})[acc.id]||""} totalValue={data[acc.id]||0} onEdit={()=>setEditingAccount(acc.id)}/>)}
      </div>}

      {/* ══ BUDGET ══ */}
      {tab==="budget"&&<div className="fade">
        <div style={{background:"linear-gradient(135deg,rgba(52,211,153,0.1),rgba(96,165,250,0.1))",border:"1px solid rgba(52,211,153,0.25)",borderRadius:22,padding:20,marginBottom:14}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>Monthly Picture</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[{l:"Income",v:fmt(totalIncome),c:"#34d399"},{l:"Expenses",v:fmt(totalExp),c:R},{l:"Investing",v:fmt(totalInv),c:"#60a5fa"},{l:"Surplus",v:fmt(Math.abs(surplus)),c:surplus>=0?GOLD:R,prefix:surplus<0?"⚠ ":""}].map(s=>(
              <div key={s.l} style={{textAlign:"center",background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"10px 6px"}}>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",marginBottom:3}}>{s.l}</div>
                <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.prefix||""}{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}><span>Savings Rate</span><span style={{color:savRate>=30?G:savRate>=20?GOLD:R,fontWeight:700}}>{savRate.toFixed(1)}% {savRate>=30?"✅":savRate>=20?"⚠":"❌"}</span></div>
            <Bar p={savRate} color={savRate>=30?G:savRate>=20?GOLD:R} h={8}/>
          </div>
        </div>
        {[
          {title:"💼 Income",fields:INCOME_FIELDS,total:totalIncome,totalLabel:"Total Income",totalColor:"#34d399",section:"income",c:G,bg:"rgba(0,255,157,0.1)",border:"rgba(0,255,157,0.3)"},
          {title:"💸 Expenses",fields:EXPENSE_FIELDS,total:totalExp,totalLabel:"Total Expenses",totalColor:R,section:"expenses",c:R,bg:"rgba(255,69,96,0.1)",border:"rgba(255,69,96,0.3)"},
          {title:"📈 Investments",fields:INV_FIELDS,total:totalInv,totalLabel:"Total Investing",totalColor:"#60a5fa",section:"investments",c:"#60a5fa",bg:"rgba(96,165,250,0.1)",border:"rgba(96,165,250,0.3)"},
        ].map(sec=>(
          <div key={sec.title} className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase"}}>{sec.title}</div>
              <button onClick={()=>startEdit(sec.section)} style={{fontSize:9,color:sec.c,background:sec.bg,border:`1px solid ${sec.border}`,borderRadius:6,padding:"3px 10px",cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
            </div>
            {sec.fields.map(f=><div key={f.key} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12}}><span style={{color:"rgba(255,255,255,0.65)"}}>{f.icon} {f.label}</span><span style={{fontWeight:800,color:f.color}}>${(data[f.key]||0).toLocaleString()}/mo</span></div>)}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.08)"}}><span style={{fontWeight:800}}>{sec.totalLabel}</span><span style={{fontWeight:900,fontSize:16,color:sec.totalColor}}>${sec.total.toLocaleString()}/mo</span></div>
          </div>
        ))}
      </div>}

      {/* ══ UPDATE ══ */}
      {tab==="update"&&<div className="fade">

        {/* ── Custom item add/edit form overlay ── */}
        {showCustomForm&&(
          <div ref={containerRef} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:2000,overflowY:"auto",padding:"20px 13px 40px"}}>
            <div style={{maxWidth:560,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <div style={{fontSize:15,fontWeight:900,color:"#a78bfa"}}>{customForm._editId?"✏️ Edit Item":"➕ Add Custom Item"}</div>
                <button onClick={()=>setShowCustomForm(false)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"8px 14px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>✕</button>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Label *</div>
                <input value={customForm.label} onChange={e=>setCustomForm(f=>({...f,label:e.target.value}))} placeholder="e.g. Gold bars, Side business, Rental deposit..."
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e2e8f0",padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:700,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Current Value ($)</div>
                <input type="number" value={customForm.value} onChange={e=>setCustomForm(f=>({...f,value:e.target.value}))} placeholder="0"
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#fbbf24",padding:"10px 14px",borderRadius:10,fontSize:16,fontWeight:900,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Category</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["Investments","Real Estate","Baby Patel 👑","Other"].map(g=>(
                    <button key={g} onClick={()=>setCustomForm(f=>({...f,group:g}))} style={{padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,border:`1px solid ${customForm.group===g?"rgba(167,139,250,0.5)":"rgba(255,255,255,0.1)"}`,background:customForm.group===g?"rgba(167,139,250,0.15)":"rgba(255,255,255,0.04)",color:customForm.group===g?"#a78bfa":"rgba(255,255,255,0.5)"}}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Icon</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {["💼","🏠","🚗","💰","📈","🏦","💎","🌍","🎯","⚡","🏆","💊","🎓","₿","⟠","🪙","🏭","🎨","🛢️","💍"].map(icon=>(
                    <button key={icon} onClick={()=>setCustomForm(f=>({...f,icon}))} style={{width:38,height:38,borderRadius:9,border:`2px solid ${customForm.icon===icon?"rgba(167,139,250,0.6)":"rgba(255,255,255,0.08)"}`,background:customForm.icon===icon?"rgba(167,139,250,0.2)":"rgba(255,255,255,0.03)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Note (optional)</div>
                <input value={customForm.note} onChange={e=>setCustomForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Vanguard account, physical gold..."
                  style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"#e2e8f0",padding:"10px 14px",borderRadius:10,fontSize:12,outline:"none",width:"100%",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:customForm._editId?"1fr 1fr 1fr":"1fr 1fr",gap:8}}>
                <button onClick={()=>setShowCustomForm(false)} style={{padding:"13px",borderRadius:11,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Cancel</button>
                {customForm._editId&&<button onClick={()=>{removeCustomItem(customForm._editId);setShowCustomForm(false);}} style={{padding:"13px",borderRadius:11,border:"1px solid rgba(255,69,96,0.3)",background:"rgba(255,69,96,0.1)",color:"#ff4560",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Delete</button>}
                <button onClick={addCustomItem} style={{padding:"13px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#a78bfa,#60a5fa)",color:"#000",cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>{customForm._editId?"💾 Save":"➕ Add"}</button>
              </div>
            </div>
          </div>
        )}

        {!editing?(<>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,rgba(0,255,157,0.08),rgba(34,211,238,0.08))",border:"1px solid rgba(0,255,157,0.25)",borderRadius:20,padding:18,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:800,color:G,marginBottom:4}}>✏️ Update Your Numbers</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.7}}>Tap any section to edit values. Use <span style={{color:"#a78bfa"}}>+ Add Custom</span> to track anything not listed.</div>
            {data.lastUpdated&&<div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,0.35)"}}>Last updated: <span style={{color:G}}>{ago(data.lastUpdated)}</span></div>}
          </div>

          {/* Quick section buttons */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[
              {s:"assets",     icon:"💎",label:"Assets & Net Worth", color:"#fbbf24"},
              {s:"income",     icon:"💼",label:"Monthly Income",      color:"#34d399"},
              {s:"expenses",   icon:"💸",label:"Monthly Expenses",    color:R},
              {s:"investments",icon:"📈",label:"Monthly Investments", color:"#60a5fa"},
            ].map(b=>(
              <button key={b.s} onClick={()=>startEdit(b.s)} style={{background:`${b.color}11`,border:`1px solid ${b.color}33`,borderRadius:14,padding:"14px",color:b.color,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=`${b.color}22`}
                onMouseLeave={e=>e.currentTarget.style.background=`${b.color}11`}>
                <div style={{fontSize:22,marginBottom:4}}>{b.icon}</div>{b.label}
                <div style={{fontSize:9,color:`${b.color}99`,marginTop:3}}>Tap to edit →</div>
              </button>
            ))}
          </div>

          {/* Net Worth Snapshot — each item editable inline */}
          {GROUPS.map(group=>(
            <div key={group} className="card" style={{marginBottom:10}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{group}</span>
                <span style={{color:"rgba(255,255,255,0.2)",fontWeight:400,fontSize:9}}>{ASSET_FIELDS.filter(a=>a.group===group).length} items</span>
              </div>
              {ASSET_FIELDS.filter(a=>a.group===group).map(a=>(
                <div key={a.key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{a.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>{a.label}</div>
                  </div>
                  <div style={{position:"relative",width:130,flexShrink:0}}>
                    <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.35)",fontSize:13,fontWeight:700}}>$</span>
                    <input type="number" value={data[a.key]||0}
                      onChange={e=>setData(d=>({...d,[a.key]:parseFloat(e.target.value)||0}))}
                      style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${a.color}44`,color:a.color,padding:"7px 10px 7px 22px",borderRadius:9,fontSize:13,fontWeight:800,outline:"none",width:"100%",fontFamily:"inherit"}}
                      onFocus={e=>e.target.style.borderColor=a.color}
                      onBlur={e=>{e.target.style.borderColor=`${a.color}44`;setData(d=>({...d,lastUpdated:new Date().toISOString()}));}}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Custom Items */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase"}}>➕ Custom Assets</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:2}}>Track anything not in the list above</div>
              </div>
              <button onClick={()=>{setCustomForm({label:"",icon:"💼",value:"",group:"Other",note:"",_editId:null});setShowCustomForm(true);}}
                style={{fontSize:11,color:"#a78bfa",background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.35)",borderRadius:9,padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontWeight:800}}>
                + Add Custom
              </button>
            </div>
            {(data.customItems||[]).length===0
              ?(
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:28,marginBottom:8}}>📦</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:4}}>No custom items yet</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>Add gold, side business, crypto wallet, any other asset</div>
                </div>
              )
              :(data.customItems||[]).map((c,i)=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<(data.customItems||[]).length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{c.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)"}}>{c.label}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{c.group}{c.note?` · ${c.note}`:""}</div>
                  </div>
                  <div style={{position:"relative",width:120,flexShrink:0}}>
                    <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.35)",fontSize:12}}>$</span>
                    <input type="number" value={c.value}
                      onChange={e=>updateCustomValue(c.id,e.target.value)}
                      style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(167,139,250,0.3)",color:"#fbbf24",padding:"7px 8px 7px 20px",borderRadius:9,fontSize:13,fontWeight:800,outline:"none",width:"100%",fontFamily:"inherit"}}/>
                  </div>
                  <button onClick={()=>{setCustomForm({label:c.label,icon:c.icon,value:String(c.value),group:c.group,note:c.note||"",_editId:c.id});setShowCustomForm(true);}}
                    style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",borderRadius:7,padding:"5px 9px",color:"#a78bfa",cursor:"pointer",fontFamily:"inherit",fontSize:12,flexShrink:0}}>✏️</button>
                </div>
              ))
            }
            {customTotal>0&&(
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                <span style={{fontWeight:700,fontSize:12,color:"rgba(255,255,255,0.6)"}}>Custom Total</span>
                <span style={{fontWeight:900,fontSize:14,color:"#a78bfa"}}>{fmt(customTotal)}</span>
              </div>
            )}
          </div>

          {/* Monthly trackers — income, expenses, investments with add/delete */}
          {(()=>{
            const sections=[
              {title:"💼 Monthly Income",    fields:INCOME_FIELDS,  extra:extraIncome,     type:"income",      color:"#34d399", addLabel:"Add Income Source"},
              {title:"💸 Monthly Expenses",  fields:EXPENSE_FIELDS, extra:extraExpenses,   type:"expenses",    color:"#ff4560", addLabel:"Add Expense"},
              {title:"📈 Monthly Investments",fields:INV_FIELDS,    extra:extraInvestments,type:"investments", color:"#60a5fa", addLabel:"Add Investment"},
            ];
            return sections.map(sec=>{
              const baseTotal=sec.fields.reduce((s,f)=>s+(data[f.key]||0),0);
              const extraTotal=sec.extra.reduce((s,r)=>s+r.value,0);
              const total=baseTotal+extraTotal;
              return(
                <div key={sec.title} className="card" style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{sec.title}</span>
                    <span style={{color:sec.color,fontWeight:900,fontSize:13}}>${total.toLocaleString()}/mo</span>
                  </div>
                  {/* Built-in fields */}
                  {sec.fields.map(f=>(
                    <div key={f.key} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:15,flexShrink:0}}>{f.icon}</span>
                      <div style={{flex:1,fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{f.label}</div>
                      <div style={{position:"relative",width:110,flexShrink:0}}>
                        <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)",fontSize:12}}>$</span>
                        <input type="number" value={data[f.key]||0}
                          onChange={e=>setData(d=>({...d,[f.key]:parseFloat(e.target.value)||0}))}
                          style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${f.color}33`,color:f.color,padding:"6px 7px 6px 18px",borderRadius:9,fontSize:12,fontWeight:800,outline:"none",width:"100%",fontFamily:"inherit"}}
                          onFocus={e=>e.target.style.borderColor=f.color}
                          onBlur={e=>e.target.style.borderColor=`${f.color}33`}
                        />
                      </div>
                    </div>
                  ))}
                  {/* Extra custom rows */}
                  {sec.extra.map(row=>(
                    <div key={row.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:15,flexShrink:0}}>➕</span>
                      <div style={{flex:1,fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)"}}>{row.label}</div>
                      <div style={{position:"relative",width:110,flexShrink:0}}>
                        <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.3)",fontSize:12}}>$</span>
                        <input type="number" value={row.value}
                          onChange={e=>updateExtraRow(sec.type,row.id,e.target.value)}
                          style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${sec.color}33`,color:sec.color,padding:"6px 7px 6px 18px",borderRadius:9,fontSize:12,fontWeight:800,outline:"none",width:"100%",fontFamily:"inherit"}}
                          onFocus={e=>e.target.style.borderColor=sec.color}
                          onBlur={e=>e.target.style.borderColor=`${sec.color}33`}
                        />
                      </div>
                      <button onClick={()=>deleteExtraRow(sec.type,row.id)}
                        style={{background:"rgba(255,69,96,0.12)",border:"1px solid rgba(255,69,96,0.25)",borderRadius:7,padding:"5px 8px",color:"#ff4560",cursor:"pointer",fontFamily:"inherit",fontSize:11,flexShrink:0}}>🗑</button>
                    </div>
                  ))}
                  {/* Add new row */}
                  {addingSection===sec.type?(
                    <div style={{display:"flex",gap:8,alignItems:"center",paddingTop:10,marginTop:4,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                      <input value={addingLabel} onChange={e=>setAddingLabel(e.target.value)}
                        placeholder={sec.type==="income"?"e.g. Freelance, Rental income...":sec.type==="expenses"?"e.g. Gym, Streaming service...":"e.g. Crypto, ETF, Savings..."}
                        onKeyDown={e=>{if(e.key==="Enter")confirmAddRow();if(e.key==="Escape"){setAddingSection(null);setAddingLabel("");}}}
                        style={{flex:1,background:"rgba(255,255,255,0.06)",border:`1px solid ${sec.color}55`,color:"#e2e8f0",padding:"7px 12px",borderRadius:9,fontSize:12,outline:"none",fontFamily:"inherit"}}
                        autoFocus/>
                      <button onClick={confirmAddRow}
                        style={{background:`${sec.color}22`,border:`1px solid ${sec.color}55`,borderRadius:8,padding:"7px 14px",color:sec.color,cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:12,flexShrink:0}}>Add</button>
                      <button onClick={()=>{setAddingSection(null);setAddingLabel("");}}
                        style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"7px 10px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit",fontSize:12,flexShrink:0}}>✕</button>
                    </div>
                  ):(
                    <button onClick={()=>{setAddingSection(sec.type);setAddingLabel("");}}
                      style={{width:"100%",marginTop:10,padding:"9px",borderRadius:9,border:`1px dashed ${sec.color}44`,background:"transparent",color:sec.color,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:11}}>
                      + {sec.addLabel}
                    </button>
                  )}
                </div>
              );
            });
          })()}

          {/* Net Worth Total */}
          <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.1),rgba(251,191,36,0.05))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:16,padding:18,marginBottom:14,textAlign:"center"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:1,marginBottom:6}}>TOTAL NET WORTH</div>
            <div style={{fontSize:42,fontWeight:900,color:GOLD}}>{fmt(netWorth)}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:4}}>All changes save automatically as you type</div>
          </div>

          {/* Update history */}
          {data.updateHistory?.length>0&&(
            <div className="card">
              <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>Update History</div>
              {data.updateHistory.slice(0,6).map((h,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:11}}>
                  <div><div style={{fontWeight:700}}>{fmt(h.netWorth)}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{new Date(h.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div></div>
                  <span style={{color:h.change>=0?G:R,fontWeight:700}}>{h.change>=0?"+":""}{fmt(h.change)}</span>
                </div>
              ))}
            </div>
          )}
        </>):(
          /* ── Editing form (used by Budget tab Edit buttons) ── */
          <div>
            <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:4}}>
              {[{s:"assets",l:"Assets"},{s:"income",l:"Income"},{s:"expenses",l:"Expenses"},{s:"investments",l:"Invest"}].map(b=>(
                <button key={b.s} className="sec" onClick={()=>setES(b.s)} style={{background:editSection===b.s?"rgba(0,255,157,0.2)":"transparent",color:editSection===b.s?G:"rgba(255,255,255,0.35)",border:editSection===b.s?"1px solid rgba(0,255,157,0.4)":"1px solid transparent"}}>{b.l}</button>
              ))}
            </div>
            {editSection==="assets"&&GROUPS.map(group=>(
              <div key={group} className="card">
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,marginBottom:12,textTransform:"uppercase"}}>{group}</div>
                {ASSET_FIELDS.filter(a=>a.group===group).map(a=>(
                  <div key={a.key} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:700}}>{a.icon} {a.label}</span><span style={{fontSize:11,color:a.color,fontWeight:700}}>{fmt(parseFloat(editData[a.key])||0)}</span></div>
                    <div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13,fontWeight:700}}>$</span><input className="num" type="number" value={editData[a.key]||""} style={{paddingLeft:24}} onChange={e=>setED(d=>({...d,[a.key]:e.target.value}))}/></div>
                  </div>
                ))}
              </div>
            ))}
            {editSection==="income"&&<div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,textTransform:"uppercase"}}>Income</div>
                <button onClick={()=>setAddingSection(addingSection==="income"?null:"income")} style={{fontSize:10,color:"#34d399",background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>+ Add</button>
              </div>
              {INCOME_FIELDS.map(f=><div key={f.key} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:700}}>{f.icon} {f.label}</span><span style={{fontSize:11,color:f.color,fontWeight:700}}>${(parseFloat(editData[f.key])||0).toLocaleString()}/mo</span></div><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>$</span><input className="num" type="number" value={editData[f.key]||""} style={{paddingLeft:24}} onChange={e=>setED(d=>({...d,[f.key]:e.target.value}))}/></div></div>)}
              {extraIncome.map(row=><div key={row.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><div style={{flex:1,position:"relative"}}><span style={{fontSize:12,fontWeight:700,display:"block",marginBottom:4}}>{row.label}</span><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>$</span><input className="num" type="number" value={row.value} style={{paddingLeft:24}} onChange={e=>updateExtraRow("income",row.id,e.target.value)}/></div></div><button onClick={()=>deleteExtraRow("income",row.id)} style={{background:"rgba(255,69,96,0.12)",border:"1px solid rgba(255,69,96,0.3)",borderRadius:7,padding:"6px 10px",color:"#ff4560",cursor:"pointer",fontFamily:"inherit",fontSize:13,marginTop:22,flexShrink:0}}>🗑</button></div>)}
              {addingSection==="income"&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}><input value={addingLabel} onChange={e=>setAddingLabel(e.target.value)} placeholder="e.g. Rental income, Freelance..." onKeyDown={e=>{if(e.key==="Enter")confirmAddRow();if(e.key==="Escape"){setAddingSection(null);setAddingLabel("");}}} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(52,211,153,0.4)",color:"#e2e8f0",padding:"8px 12px",borderRadius:9,fontSize:12,outline:"none",fontFamily:"inherit"}} autoFocus/><button onClick={confirmAddRow} style={{background:"rgba(52,211,153,0.2)",border:"1px solid rgba(52,211,153,0.4)",borderRadius:8,padding:"8px 12px",color:"#34d399",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Add</button><button onClick={()=>{setAddingSection(null);setAddingLabel("");}} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit"}}>✕</button></div>}
            </div>}
            {editSection==="expenses"&&<div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,textTransform:"uppercase"}}>Expenses</div>
                <button onClick={()=>setAddingSection(addingSection==="expenses"?null:"expenses")} style={{fontSize:10,color:"#ff4560",background:"rgba(255,69,96,0.1)",border:"1px solid rgba(255,69,96,0.3)",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>+ Add</button>
              </div>
              {EXPENSE_FIELDS.map(f=><div key={f.key} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:700}}>{f.icon} {f.label}</span><span style={{fontSize:11,color:f.color,fontWeight:700}}>${(parseFloat(editData[f.key])||0).toLocaleString()}/mo</span></div><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>$</span><input className="num" type="number" value={editData[f.key]||""} style={{paddingLeft:24}} onChange={e=>setED(d=>({...d,[f.key]:e.target.value}))}/></div></div></div>)}
              {extraExpenses.map(row=><div key={row.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><div style={{flex:1}}><span style={{fontSize:12,fontWeight:700,display:"block",marginBottom:4}}>{row.label}</span><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>$</span><input className="num" type="number" value={row.value} style={{paddingLeft:24}} onChange={e=>updateExtraRow("expenses",row.id,e.target.value)}/></div></div><button onClick={()=>deleteExtraRow("expenses",row.id)} style={{background:"rgba(255,69,96,0.12)",border:"1px solid rgba(255,69,96,0.3)",borderRadius:7,padding:"6px 10px",color:"#ff4560",cursor:"pointer",fontFamily:"inherit",fontSize:13,marginTop:22,flexShrink:0}}>🗑</button></div>)}
              {addingSection==="expenses"&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}><input value={addingLabel} onChange={e=>setAddingLabel(e.target.value)} placeholder="e.g. Gym, Streaming, Pet care..." onKeyDown={e=>{if(e.key==="Enter")confirmAddRow();if(e.key==="Escape"){setAddingSection(null);setAddingLabel("");}}} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,69,96,0.4)",color:"#e2e8f0",padding:"8px 12px",borderRadius:9,fontSize:12,outline:"none",fontFamily:"inherit"}} autoFocus/><button onClick={confirmAddRow} style={{background:"rgba(255,69,96,0.2)",border:"1px solid rgba(255,69,96,0.4)",borderRadius:8,padding:"8px 12px",color:"#ff4560",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Add</button><button onClick={()=>{setAddingSection(null);setAddingLabel("");}} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit"}}>✕</button></div>}
            </div>}
            {editSection==="investments"&&<div className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,textTransform:"uppercase"}}>Investments</div>
                <button onClick={()=>setAddingSection(addingSection==="investments"?null:"investments")} style={{fontSize:10,color:"#60a5fa",background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.3)",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>+ Add</button>
              </div>
              {INV_FIELDS.map(f=><div key={f.key} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,fontWeight:700}}>{f.icon} {f.label}</span><span style={{fontSize:11,color:f.color,fontWeight:700}}>${(parseFloat(editData[f.key])||0).toLocaleString()}/mo</span></div><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>$</span><input className="num" type="number" value={editData[f.key]||""} style={{paddingLeft:24}} onChange={e=>setED(d=>({...d,[f.key]:e.target.value}))}/></div></div>)}
              {extraInvestments.map(row=><div key={row.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><div style={{flex:1}}><span style={{fontSize:12,fontWeight:700,display:"block",marginBottom:4}}>{row.label}</span><div style={{position:"relative"}}><span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.4)",fontSize:13}}>$</span><input className="num" type="number" value={row.value} style={{paddingLeft:24}} onChange={e=>updateExtraRow("investments",row.id,e.target.value)}/></div></div><button onClick={()=>deleteExtraRow("investments",row.id)} style={{background:"rgba(255,69,96,0.12)",border:"1px solid rgba(255,69,96,0.3)",borderRadius:7,padding:"6px 10px",color:"#ff4560",cursor:"pointer",fontFamily:"inherit",fontSize:13,marginTop:22,flexShrink:0}}>🗑</button></div>)}
              {addingSection==="investments"&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:8}}><input value={addingLabel} onChange={e=>setAddingLabel(e.target.value)} placeholder="e.g. Crypto, Real estate fund..." onKeyDown={e=>{if(e.key==="Enter")confirmAddRow();if(e.key==="Escape"){setAddingSection(null);setAddingLabel("");}}} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(96,165,250,0.4)",color:"#e2e8f0",padding:"8px 12px",borderRadius:9,fontSize:12,outline:"none",fontFamily:"inherit"}} autoFocus/><button onClick={confirmAddRow} style={{background:"rgba(96,165,250,0.2)",border:"1px solid rgba(96,165,250,0.4)",borderRadius:8,padding:"8px 12px",color:"#60a5fa",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Add</button><button onClick={()=>{setAddingSection(null);setAddingLabel("");}} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"8px 10px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"inherit"}}>✕</button></div>}
            </div>}
            <div style={{background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:14,padding:16,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:4}}>NET WORTH PREVIEW</div>
              <div style={{fontSize:36,fontWeight:900,color:GOLD}}>{fmt(ASSET_FIELDS.reduce((s,a)=>s+(parseFloat(editData[a.key])||0),0)+customTotal)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <button onClick={()=>{setEditing(false);setTab(returnTab);}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:12,padding:"14px",color:"rgba(255,255,255,0.6)",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={saveUpdate} style={{background:"linear-gradient(135deg,#00ff9d,#22d3ee)",border:"none",borderRadius:12,padding:"14px",color:"#000",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>💾 Save</button>
            </div>
          </div>
        )}
      </div>}

      {/* ══ AI ADVISOR ══ */}
      {tab==="advisor"&&<div className="fade">
        <div style={{background:"linear-gradient(135deg,rgba(167,139,250,0.12),rgba(96,165,250,0.08))",border:"1px solid rgba(167,139,250,0.3)",borderRadius:22,padding:20,marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:900,color:"#a78bfa",marginBottom:6}}>🤖 AI Financial Advisor {BACKEND_URL?"· 🟢 LIVE":"· 🟡 Built-in"}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.7,marginBottom:14}}>{BACKEND_URL?"Connected to Railway backend — using real Claude AI with live market data.":"Deploy backend to Railway to enable real AI with live market data."}</div>
          <button onClick={()=>runAdvisor(null)} disabled={aiLoading} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",cursor:aiLoading?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:800,fontSize:14,background:aiLoading?"rgba(167,139,250,0.2)":"linear-gradient(135deg,#a78bfa,#60a5fa)",color:aiLoading?"rgba(255,255,255,0.4)":"#000"}}>
            {aiLoading?<><span className="spinner"/>Analyzing…</>:"⚡ Run Full Financial Health Check"}
          </button>
        </div>
        {aiLoading&&<div style={{textAlign:"center",padding:"40px 20px",color:"#a78bfa"}}><div style={{width:36,height:36,border:"3px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/><div style={{fontSize:13,fontWeight:700}}>Reading all accounts…</div></div>}
        {aiAdvice&&!aiLoading&&<div style={{background:"linear-gradient(135deg,rgba(167,139,250,0.08),rgba(96,165,250,0.05))",border:"1px solid rgba(167,139,250,0.25)",borderRadius:20,padding:20,marginBottom:16}}>
          <div style={{fontSize:10,color:"#a78bfa",fontWeight:800,letterSpacing:1,marginBottom:12}}>🤖 ADVISOR ANALYSIS</div>
          <div className="ai-text">{aiAdvice}</div>
        </div>}
        <div className="card">
          <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,marginBottom:10,textTransform:"uppercase"}}>💬 Ask a Question</div>
          <textarea value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} rows={3}
            placeholder="e.g. Did I already fix my 401K? Is Baby Patel on track? What to do with my surplus?"
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",padding:"10px 12px",borderRadius:10,fontSize:12,outline:"none",lineHeight:1.6,resize:"none"}}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,marginBottom:10}}>
            {["Did I fix my 401K?","Baby Patel on track?","What to do with surplus?","Retirement projection?"].map(q=>(
              <button key={q} onClick={()=>setAiQuestion(q)} style={{fontSize:10,padding:"5px 10px",borderRadius:8,border:"1px solid rgba(167,139,250,0.3)",background:"rgba(167,139,250,0.08)",color:"#a78bfa",cursor:"pointer",fontFamily:"inherit"}}>{q}</button>
            ))}
          </div>
          <button onClick={()=>{if(aiQuestion.trim())runAdvisor(aiQuestion.trim());}} disabled={!aiQuestion.trim()||aiLoading} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",fontFamily:"inherit",fontWeight:800,fontSize:13,cursor:"pointer",background:(!aiQuestion.trim()||aiLoading)?"rgba(167,139,250,0.15)":"linear-gradient(135deg,#a78bfa,#60a5fa)",color:(!aiQuestion.trim()||aiLoading)?"rgba(255,255,255,0.3)":"#000"}}>Ask Advisor →</button>
        </div>
        {aiHistory.length>0&&<div className="card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",fontWeight:800,marginBottom:12,textTransform:"uppercase"}}>Previous Questions</div>{aiHistory.map((h,i)=><div key={i} style={{marginBottom:12,paddingBottom:12,borderBottom:i<aiHistory.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}><div style={{fontSize:11,color:"#a78bfa",fontWeight:700,marginBottom:4}}>Q: {h.q}</div><div className="ai-text" style={{fontSize:11}}>{h.a.slice(0,250)}{h.a.length>250?"…":""}</div></div>)}</div>}
      </div>}

      {/* ══ SIMULATE ══ */}
      {tab==="sim"&&<div className="fade">
        <div style={{background:"linear-gradient(135deg,rgba(168,85,247,0.1),rgba(96,165,250,0.1))",border:"1px solid rgba(168,85,247,0.25)",borderRadius:20,padding:18,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:800,color:"#a78bfa",marginBottom:4}}>🎮 Investment Simulator</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Compare up to 4 investments side by side.</div>
        </div>
        {simPicks.map((p,i)=>{
          const st=SIM_STOCKS.find(s=>s.s===p.stock)||SIM_STOCKS[0];
          const val=fv(Number(p.initial),Number(p.monthly),st.rate,Number(p.years));
          const invested=Number(p.initial)+Number(p.monthly)*12*Number(p.years);
          const milestones=[1,2,5,10,15,20].filter(y=>y<=Number(p.years)).map(y=>({y,v:fv(Number(p.initial),Number(p.monthly),st.rate,y)}));
          return(
            <div key={i} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${st.color}33`,borderRadius:18,padding:16,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:800,color:st.color}}>#{i+1} {st.n}</div>
                {simPicks.length>1&&<button onClick={()=>setSimPicks(p=>p.filter((_,j)=>j!==i))} style={{background:"rgba(255,69,96,0.15)",border:"1px solid rgba(255,69,96,0.3)",color:R,borderRadius:8,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Remove</button>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
                {SIM_STOCKS.map(s=><button key={s.s} onClick={()=>setSimPicks(prev=>prev.map((x,j)=>j===i?{...x,stock:s.s}:x))} style={{padding:"3px 8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",background:p.stock===s.s?`${s.color}33`:"rgba(255,255,255,0.05)",color:p.stock===s.s?s.color:"rgba(255,255,255,0.4)"}}>{s.s}</button>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                {[{label:"Start $",key:"initial",min:0,max:500000,step:1000},{label:"Monthly $",key:"monthly",min:0,max:5000,step:100},{label:"Years",key:"years",min:1,max:30,step:1}].map(f=>(
                  <div key={f.key}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:4}}>{f.label}</div>
                    <div style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${st.color}33`,borderRadius:10,padding:"8px",textAlign:"center"}}>
                      <div style={{fontSize:14,fontWeight:800,color:st.color}}>{f.key==="years"?p[f.key]+"yr":`$${Number(p[f.key]).toLocaleString()}`}</div>
                      <input type="range" min={f.min} max={f.max} step={f.step} value={p[f.key]} onChange={e=>setSimPicks(prev=>prev.map((x,j)=>j===i?{...x,[f.key]:Number(e.target.value)}:x))} style={{width:"100%",accentColor:st.color,marginTop:4}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{background:`${st.color}0d`,border:`1px solid ${st.color}33`,borderRadius:14,padding:16,textAlign:"center",marginBottom:12}}>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:4}}>After {p.years} years → {new Date().getFullYear()+Number(p.years)}</div>
                <div style={{fontSize:40,fontWeight:900,color:st.color}}>{fmt(val)}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
                  <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>You Invest</div><div style={{fontSize:14,fontWeight:800,color:"#60a5fa"}}>{fmt(invested)}</div></div>
                  <div style={{background:"rgba(255,255,255,0.05)",borderRadius:8,padding:"8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>Pure Gain</div><div style={{fontSize:14,fontWeight:800,color:G}}>{fmt(val-invested)}</div></div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {milestones.map(m=><div key={m.y} style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${st.color}22`,borderRadius:8,padding:"5px 10px",textAlign:"center",minWidth:55}}><div style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>yr {m.y}</div><div style={{fontSize:11,fontWeight:700,color:st.color}}>{fmt(m.v)}</div></div>)}
              </div>
            </div>
          );
        })}
        {simPicks.length<4&&<button onClick={()=>setSimPicks(p=>[...p,{stock:"VOO",monthly:300,initial:0,years:10}])} style={{width:"100%",padding:"12px",borderRadius:14,background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.3)",color:"#a78bfa",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:12,fontFamily:"inherit"}}>+ Add Another Stock</button>}
      </div>}

      {/* ══ WATCHLIST ══ */}
      {tab==="watchlist"&&<div className="fade">
        <input className="srch" placeholder="Search ticker or name..." value={wSearch} onChange={e=>setWSearch(e.target.value)}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {WCATS.map(c=><button key={c} className="cat" onClick={()=>setWCat(c)} style={{background:wCat===c?"#00ff9d22":"transparent",border:`1px solid ${wCat===c?"#00ff9d44":"rgba(255,255,255,0.08)"}`,color:wCat===c?G:"rgba(255,255,255,0.35)"}}>{c}</button>)}
        </div>
        <div className="card" style={{padding:"12px 14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"65px 1fr 85px 70px 80px",gap:6,padding:"5px 0 9px",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:1}}>
            <span>TICKER</span><span>NAME</span><span>PRICE</span><span>CHG</span><span>SIGNAL</span>
          </div>
          <div style={{maxHeight:480,overflowY:"auto"}}>
            {filtered.map(a=>{const price=prices[a.s]||a.base,chg=changes[a.s]||0,s=sig(chg);return(
              <div key={a.s+a.cat} style={{display:"grid",gridTemplateColumns:"65px 1fr 85px 70px 80px",gap:6,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.03)",fontSize:11,alignItems:"center"}}>
                <span style={{fontWeight:700,fontSize:12}}>{a.s}</span>
                <div><div style={{color:"rgba(255,255,255,0.55)",fontSize:10}}>{a.n}</div><div style={{fontSize:8,color:"rgba(255,255,255,0.2)"}}>{a.cat}</div></div>
                <span style={{fontWeight:700}}>${fmtP(price)}</span>
                <span style={{color:chg>=0?G:R,fontWeight:700}}>{pc(chg)}</span>
                <span style={{fontSize:8,color:s.c,border:`1px solid ${s.c}44`,background:`${s.c}11`,padding:"2px 4px",borderRadius:4,textAlign:"center"}}>{s.s}</span>
              </div>
            );})}
          </div>
          <div style={{paddingTop:8,fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center"}}>{filtered.length} assets · <span style={{color:G}}>LIVE</span></div>
        </div>
      </div>}

      {/* ══ ALERTS ══ */}
      {tab==="alerts"&&<div className="fade">
        <div style={{background:"linear-gradient(135deg,rgba(255,69,96,0.08),rgba(251,191,36,0.05))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:20,padding:18,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:800,color:GOLD,marginBottom:8}}>📧 All Alerts → {ALERT_EMAIL}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{icon:"🌅",label:"Daily",value:"8:00 AM",color:GOLD},{icon:"📊",label:"Weekly",value:"Sunday",color:"#60a5fa"},{icon:"🔴",label:"Critical",value:"Instant",color:R}].map(s=>(
              <div key={s.label} style={{textAlign:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"8px 4px"}}>
                <div style={{fontSize:16}}>{s.icon}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:2}}>{s.label}</div><div style={{fontSize:10,fontWeight:800,color:s.color}}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        {["CRITICAL","DAILY","WEEKLY","MONTHLY","MILESTONE","REMINDER"].map(priority=>{
          const rules=ALERT_RULES.filter(r=>r.priority===priority);
          if(!rules.length)return null;
          const pc2=priority==="CRITICAL"?R:priority==="DAILY"?GOLD:priority==="WEEKLY"?"#60a5fa":priority==="MONTHLY"?"#a78bfa":priority==="MILESTONE"?"#f472b6":"#94a3b8";
          return(
            <div key={priority} style={{marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{fontSize:8,fontWeight:800,letterSpacing:1.5,color:pc2,background:`${pc2}15`,border:`1px solid ${pc2}33`,borderRadius:6,padding:"3px 8px"}}>{priority}</div>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.05)"}}/>
              </div>
              {rules.map((a,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:"rgba(255,255,255,0.02)",border:`1px solid ${a.color}22`,borderRadius:12,padding:"12px 14px",marginBottom:6}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start",flex:1}}>
                    <span style={{fontSize:18,flexShrink:0}}>{a.icon}</span>
                    <div><div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{a.rule}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{a.action}</div></div>
                  </div>
                  <div style={{fontSize:9,padding:"3px 7px",borderRadius:6,fontWeight:700,flexShrink:0,marginLeft:8,background:`${G}15`,color:G,border:`1px solid ${G}33`}}>ON</div>
                </div>
              ))}
            </div>
          );
        })}
        <div className="card">
          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>⚡ Live Alerts ({liveAlerts.length})</div>
          {liveAlerts.length===0?<div style={{textAlign:"center",color:"rgba(255,255,255,0.2)",padding:"20px 0",fontSize:11}}>✅ All assets within range</div>
            :liveAlerts.slice(0,10).map((a,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:11}}>
              <div style={{display:"flex",gap:8}}><span style={{color:R}}>⚠</span><span style={{fontWeight:700}}>{a.s}</span></div>
              <span style={{color:R,fontWeight:700}}>{pc(a.chg)}</span>
            </div>)
          }
        </div>
        {/* Email setup info */}
        <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{color:"#fbbf24",fontWeight:800,marginBottom:8,fontSize:13}}>📧 ALERT DELIVERY — {ALERT_EMAIL}</div>
          {[
            {icon:"🌅",l:"Daily Briefing",   v:"8:00 AM every day"},
            {icon:"📊",l:"Weekly Report",     v:"Every Sunday 9AM"},
            {icon:"🔴",l:"Drop Alert",         v:"10%+ decline — instant"},
            {icon:"⚡",l:"Overtime Reminder", v:"Log overtime → invest it"},
            {icon:"👑",l:"Baby Patel Milestone",v:"$100K / $250K / $500K / $1M"},
            {icon:"✏️",l:"Stale Data Warning",v:"If no update in 30 days"},
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:11}}>
              <span style={{color:"rgba(255,255,255,0.5)"}}>{r.icon} {r.l}</span>
              <span style={{color:"#fbbf24",fontWeight:600}}>{r.v}</span>
            </div>
          ))}
          <div style={{marginTop:10,padding:"8px 12px",background:"rgba(96,165,250,0.08)",borderRadius:10,fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.7}}>
            ⚙️ <span style={{color:"#60a5fa",fontWeight:700}}>To activate real emails:</span> Deploy to Railway → Add SendGrid API key → all 12 rules fire automatically
          </div>
        </div>
      </div>}

      {/* ══ NEWS ══ */}
      {tab==="news"&&<div className="fade">
        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1,marginBottom:12}}>🤖 AI MARKET INTELLIGENCE · {NEWS.length} items · Updates hourly</div>
        {NEWS.map((n,i)=>(
          <div key={i} className="card" style={{borderColor:n.sentiment==="bullish"?"rgba(0,255,157,0.2)":"rgba(255,69,96,0.2)"}}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:800,fontSize:14,color:n.sentiment==="bullish"?G:R}}>{n.ticker}</span>
              <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,fontWeight:700,background:n.sentiment==="bullish"?"rgba(0,255,157,0.12)":"rgba(255,69,96,0.12)",color:n.sentiment==="bullish"?G:R}}>{n.sentiment.toUpperCase()}</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{n.time}</span>
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.65)",marginBottom:8,lineHeight:1.5}}>{n.headline}</div>
            <div style={{fontSize:11}}>AI Rec: <span style={{color:n.sentiment==="bullish"?G:R,fontWeight:800}}>{n.sentiment==="bullish"?"↑":"↓"} {n.rec}</span></div>
          </div>
        ))}
      </div>}

      <p style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.08)",marginTop:20,lineHeight:1.6}}>ABC Intel v7.8 · Live Backend Ready · Not financial advice</p>
    </div>
  );
}
