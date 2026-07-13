# Sentry Error Tracking Setup

## 🚀 Getting Started

Sentry is configured but requires a DSN (Data Source Name) to function.

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up or log in
3. Create a new project:
   - Platform: **Next.js**
   - Alert frequency: **Real-time**

### 2. Get Your DSN

After creating the project:
1. Go to **Settings** → **Projects** → [Your Project]
2. Click **Client Keys (DSN)**
3. Copy the DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### 3. Set Environment Variables

**For local development:**
```bash
# Create or edit .env.local
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@ingest.sentry.io/xxxxx
```

**For production (Vercel):**
1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   ```
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@ingest.sentry.io/xxxxx
   ```

### 4. Restart Dev Server

```bash
npm run dev
```

Sentry will now automatically:
- ✅ Capture uncaught errors
- ✅ Log page performance metrics
- ✅ Track custom events (sage views, tab switches, errors)
- ✅ Send alerts for critical errors

---

## 📊 What Sentry Tracks

### Automatic
- Unhandled JavaScript errors
- Performance metrics (page load, interaction times)
- Source maps (for readable stack traces)

### Custom Events
We send:
- **sage_viewed** — When user clicks on a sage
- **tab_switched** — When user changes tabs (with duration)
- **filter_applied** — When user applies filters
- **search_query** — When user searches (with results count)
- **error_occurred** — When D3 simulation or other errors happen
- **pathfinder_search** — When user searches for connections

---

## 🔔 Setting Up Alerts

### Email Alerts
1. Sentry dashboard → Alerts
2. Create Alert Rule:
   - Condition: `Error count > 5 per minute`
   - Action: Send email to your address
   - Frequency: Real-time

### Slack Integration (Optional)
1. Sentry Settings → Integrations → Slack
2. Connect your Slack workspace
3. Choose a channel (e.g., #alerts)
4. Sentry will post errors to Slack automatically

---

## 🧪 Testing Sentry

**In development**, to trigger a test error:

```javascript
// In browser console (F12):
throw new Error("Test error")
```

Sentry should capture it in 5-10 seconds. Check your Sentry dashboard.

---

## 📖 Docs & Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Error Tracking](https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/performance/)

---

**Questions?** Check the Sentry docs or your project settings.
