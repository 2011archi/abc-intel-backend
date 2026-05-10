# ABC Intel — Complete Setup Guide
## From zero to 24/7 automated wealth tracking in ~45 minutes

---

## WHAT YOU'RE DEPLOYING

```
ABC Intel Frontend (React)          ABC Intel Backend (Node.js on Railway)
─────────────────────────           ──────────────────────────────────────
GitHub → Claude.ai artifact    +    Railway server running 24/7
                                    │
                                    ├── Yahoo Finance → Real prices every 60s
                                    ├── Claude AI → Daily briefing 8AM
                                    ├── Claude AI → Buy/Sell signals 9:30AM
                                    ├── Claude AI → Weekly report Sunday 9AM
                                    ├── SendGrid → All email alerts
                                    └── Drop alerts every 15min market hours
```

---

## STEP 1 — Get Your Free API Keys (15 min)

### A. SendGrid (free — 100 emails/day)
1. Go to https://sendgrid.com → Sign up free
2. Go to Settings → API Keys → Create API Key
3. Choose "Full Access" → Copy the key (starts with SG.)
4. Go to Settings → Sender Authentication → Verify a Single Sender
   - Use your email address as the sender
   - Click the verification link in your email
5. **IMPORTANT**: Update `FROM_EMAIL` in email.js to your verified sender email

### B. Anthropic API (you already have this)
1. Go to https://console.anthropic.com
2. API Keys → copy your key (starts with sk-ant-)
3. Make sure you have credits loaded ($5 lasts weeks for daily emails)

---

## STEP 2 — Deploy Backend to Railway (15 min)

### A. Push backend to GitHub
```bash
# On your computer, create a new folder "abc-intel-backend"
# Copy all these files into it:
#   server.js, market.js, advisor.js, email.js, alerts.js, store.js
#   package.json, railway.json

cd abc-intel-backend
git init
git add .
git commit -m "ABC Intel backend v1.0"
# Create a new repo on github.com called "abc-intel-backend"
git remote add origin https://github.com/YOUR_USERNAME/abc-intel-backend.git
git push -u origin main
```

### B. Deploy on Railway
1. Go to https://railway.app → Login with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select "abc-intel-backend"
4. Railway auto-detects Node.js and deploys ✅

### C. Add Environment Variables in Railway
1. Click your project → Settings → Environment Variables
2. Add these one by one:

```
SENDGRID_API_KEY    = SG.your_key_here
ANTHROPIC_API_KEY   = sk-ant-your_key_here
ALERT_EMAIL         = abcintel012525@gmail.com
```

3. Railway automatically redeploys with the new variables

### D. Get your Railway URL
1. Go to your Railway project → Settings → Domains
2. Generate a domain — looks like: abc-intel-backend.up.railway.app
3. **Copy this URL — you need it for Step 3**

### E. Test your backend
Open in browser: https://your-railway-url.up.railway.app/
You should see:
```json
{
  "status": "ABC Intel Backend — LIVE",
  "netWorth": 3030000,
  "timestamp": "..."
}
```

Test live prices: https://your-railway-url.up.railway.app/api/prices?tickers=NVDA,VOO,BTC-USD

---

## STEP 3 — Connect Frontend to Backend (5 min)

1. Open ABCIntel_v7.8.jsx
2. Find line at the top:
   ```javascript
   const BACKEND_URL = ""; // leave empty to use simulated prices
   ```
3. Replace with your Railway URL:
   ```javascript
   const BACKEND_URL = "https://abc-intel-backend.up.railway.app";
   ```
4. Upload the updated file to Claude.ai or your hosting

The AI Advisor will now show "🟢 LIVE" and all prices will be real.

---

## STEP 4 — Test Everything (10 min)

### Test daily briefing email
```
POST https://your-railway-url.up.railway.app/api/trigger/daily-briefing
```
Use a tool like Postman or just open in browser and add /api/trigger/daily-briefing

### Test weekly report
```
POST https://your-railway-url.up.railway.app/api/trigger/weekly-report
```

### Test alert checks
```
POST https://your-railway-url.up.railway.app/api/trigger/alerts
```

### Test buy/sell signals
```
POST https://your-railway-url.up.railway.app/api/trigger/signals
```

Check abcintel012525@gmail.com — you should receive test emails within 60 seconds.

---

## WHAT HAPPENS AUTOMATICALLY (24/7)

| Time | What fires | What Bhavesh gets |
|------|-----------|-------------------|
| 8:00 AM daily | Daily briefing cron | Email: market overview + his portfolio + one action |
| 9:30 AM Mon-Fri | Buy/sell signals | Email: specific tickers to buy/sell/hold today |
| Every 15 min (market hours) | Drop check | Instant email if any holding drops 5%+ |
| Every hour | All alert checks | Savings rate, milestones, stale data, overtime |
| Sunday 9:00 AM | Weekly report | Full wealth report + next week's strategy |
| 1st of month | Rebalance reminder | Portfolio rebalance checklist |

---

## RAILWAY COSTS

Railway free tier: $5/month credit
This backend uses approximately $3-4/month on Railway free tier.
Upgrade to $20/month Hobby plan if needed (very unlikely).

SendGrid free tier: 100 emails/day — more than enough.

Anthropic API costs for this usage: ~$3-8/month depending on email length.

**Total monthly cost: ~$5-10/month maximum**

---

## TROUBLESHOOTING

**Emails not sending:**
- Check SendGrid sender is verified (Settings → Sender Authentication)
- Check SENDGRID_API_KEY is set correctly in Railway
- Update FROM_EMAIL in email.js to your verified sender

**Prices not loading:**
- Check BACKEND_URL is set in the frontend (no trailing slash)
- Test: open your Railway URL + /api/prices in browser

**AI responses not working:**
- Check ANTHROPIC_API_KEY in Railway environment variables
- Check Anthropic account has credits

**Railway deploy failing:**
- Make sure package.json has "start": "node server.js"
- Check Railway build logs for errors

---

## ALPACA AUTO-SYNC (Future — Optional)

To auto-sync brokerage balance from Alpaca:
1. Add ALPACA_API_KEY and ALPACA_API_SECRET to Railway env vars
2. Add to server.js:

```javascript
app.get("/api/alpaca/portfolio", async (req, res) => {
  const res2 = await axios.get("https://api.alpaca.markets/v2/account", {
    headers: {
      "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET,
    }
  });
  res.json({ equity: res2.data.equity, cash: res2.data.cash });
});
```

---

## SUPPORT

Backend API endpoints for testing:
- GET  /                           → Health check
- GET  /api/prices                 → All live prices
- GET  /api/prices/NVDA            → Single ticker
- GET  /api/portfolio              → Live portfolio value
- GET  /api/data                   → Bhavesh's data
- POST /api/data                   → Update data
- POST /api/advisor/analyze        → Full AI analysis
- POST /api/advisor/signals        → Buy/sell/hold
- POST /api/advisor/ask            → Ask AI anything
- POST /api/trigger/daily-briefing → Test daily email
- POST /api/trigger/weekly-report  → Test weekly email
- POST /api/trigger/alerts         → Test alert checks
- POST /api/trigger/signals        → Test signals email
