# Phase 5: Monitoring Dashboard & Alerts

## 📊 Vercel Analytics Dashboard

**Location:** https://vercel.com/dashboard → Select project → Analytics

### Key Metrics (Real User Monitoring)

**Web Vitals:**
- **LCP** (Largest Contentful Paint): Time to largest visible element
  - Target: < 2.5s
  - What to do if high: Optimize hero image, lazy load below-fold content
  
- **CLS** (Cumulative Layout Shift): Visual stability during load
  - Target: < 0.1
  - What to do if high: Add sizing attributes to images, avoid dynamic content insertion

- **FID** (First Input Delay): Responsiveness to user input
  - Target: < 100ms
  - What to do if high: Split large JS bundles, reduce main thread work

- **TTFB** (Time to First Byte): Server response time
  - Target: < 300ms
  - What to do if high: Check server capacity, optimize database queries

**Traffic Metrics:**
- Requests per minute
- Error rate (% of requests that fail)
- Response time distribution
- Geographic performance by region

---

## 🚨 Sentry Error Tracking

**Location:** https://sentry.io → Select project → Issues

### Setup Checklist

- [ ] **Create Project**
  - [ ] Go to sentry.io
  - [ ] Create new project (Platform: "Next.js")
  - [ ] Copy DSN

- [ ] **Environment Variable**
  - [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel
  - [ ] Verify in deployment logs

- [ ] **Alert Rules**
  - [ ] Navigate to Alerts → Create Alert Rule
  - [ ] Condition: Error count > 5 in 1 minute
  - [ ] Action: Email / Slack notification

### Key Event Types (Automatic)

| Event | Example | Severity |
|-------|---------|----------|
| **Unhandled Exception** | Network error in NetworkGraph | High |
| **Runtime Error** | TypeError in D3 simulation | High |
| **Promise Rejection** | Failed API call to Supabase | Medium |
| **Browser Error** | Out of memory in visualization | High |

### Custom Events (From Analytics)

```javascript
// These are already tracked in the app:
- sage_viewed (when user clicks a sage)
- tab_switched (when user navigates tabs)
- filter_applied (when user uses filters)
- search_query (when user searches)
- error_occurred (when D3 or fetch fails)
- pathfinder_search (when user looks for connections)
```

To view in Sentry:
1. Go to Sentry dashboard
2. Click "Events" tab
3. Filter by event name (e.g., "error_occurred")
4. See detailed event properties

---

## 📧 Alert Configuration

### Email Alerts (Sentry)

**Step 1: Set up notification email**
```
Sentry → Settings → Account → Notification Preferences
Verify your email is listed
```

**Step 2: Create alert rule**
```
Sentry → Alerts → Create Alert Rule
- Filter: Project = אוצר חכמים
- Condition: Error count is greater than 5 in the last 1 minute
- Action: Send email
- Frequency: For each new group
```

### Slack Integration (Optional)

**Step 1: Connect Slack**
```
Sentry → Settings → Integrations → Slack
Click "Add to Slack"
Select channel (#alerts or #monitoring)
```

**Step 2: Test**
```javascript
// In browser console on deployed site:
throw new Error("Test alert")
// Should see Slack message in ~30 seconds
```

---

## 📈 Performance Monitoring Checklist

### Daily (5 min)
- [ ] Check Vercel uptime status
- [ ] Verify no P0 (critical) errors in Sentry

### Weekly (15 min)
- [ ] Review error trends (Sentry → Stats)
- [ ] Check performance trends (Vercel → Analytics)
- [ ] Verify all alert rules working
- [ ] Check error rate < 1%

### Monthly (30 min)
- [ ] Run Lighthouse audit (target ≥90 all metrics)
- [ ] Review slow pages in Vercel Analytics
- [ ] Analyze error patterns (most common errors)
- [ ] Check bundle size trends

### Quarterly (1 hour)
- [ ] Review user feedback if available
- [ ] Plan performance optimizations
- [ ] Audit security (dependencies, env vars)
- [ ] Plan architecture updates

---

## 🎯 SLA (Service Level Agreement)

For production deployment, target:

| Metric | Target | Action if missed |
|--------|--------|-----------------|
| **Uptime** | 99% | Page audit + incident report |
| **Error Rate** | < 1% | Root cause analysis + fix |
| **LCP** | < 2.5s | Investigate + optimize |
| **CLS** | < 0.1 | Visual regression test |
| **Response Time** | < 500ms | Database/API audit |

---

## 🚨 Incident Response

### If Error Rate Spikes > 5%

1. **Immediate (< 5 min)**
   - Check Sentry for error pattern
   - Identify most common error
   - Check Vercel deployment logs

2. **Short-term (< 15 min)**
   - Assess severity (Does it block users?)
   - If critical: Rollback to last stable deployment
   - Notify team

3. **Medium-term (< 1 hour)**
   - Investigate root cause
   - Create fix on new branch
   - Test thoroughly before redeploy

4. **Post-incident (< 24 hours)**
   - Write incident report
   - Update monitoring rules to catch similar issues
   - Document lessons learned

### If Performance Drops > 20%

1. Check what changed
   - New deployment?
   - Increased traffic?
   - Database issues?

2. Investigate in order:
   - Vercel Analytics (see regional spikes)
   - Sentry (see if errors correlate)
   - Lighthouse audit (see detailed breakdown)

3. If deployment-related: Rollback
4. If traffic-related: No action (scale if needed)
5. If database: Check Supabase logs

---

## 📊 Dashboard Summary

**Quick links to bookmark:**
- Vercel Analytics: https://vercel.com/dashboard/[TEAM]/[PROJECT]/analytics
- Sentry Issues: https://sentry.io/organizations/[ORG]/issues/?project=[PROJECT]
- GitHub Deployments: https://github.com/[USER]/ozar-chachamim/deployments

**Daily ritual:**
```bash
# 1. Check Vercel status
# 2. Skim Sentry recent errors
# 3. Scan error emails (if high volume)
```

---

## 🔧 Troubleshooting

### Events not appearing in Sentry

**Check:**
1. DSN is correct (NEXT_PUBLIC_SENTRY_DSN env var)
2. Error is actually happening (check browser console)
3. Event type is supported by Sentry
4. Network not blocked (check Network tab in DevTools)

**Solution:**
```javascript
// Test manually in console:
import * as Sentry from "@sentry/nextjs"
Sentry.captureException(new Error("Test"))
// Should appear in Sentry in ~10 seconds
```

### Vercel Analytics not showing data

**Check:**
1. Deployment is on Vercel (not self-hosted)
2. Analytics enabled (should be automatic)
3. Wait 5+ minutes after deployment
4. Clear browser cache

**Solution:**
```bash
# Check Vercel CLI is installed
npm install -g vercel
# Verify project is configured
vercel env ls
```

### Too many alert notifications

**Solution:**
1. Go to Sentry → Alerts
2. Adjust condition threshold
3. Set frequency to "once per day" instead of "for each event"
4. Mute non-critical error groups

---

**Questions? Check:**
- Vercel docs: https://vercel.com/docs
- Sentry docs: https://docs.sentry.io
- Next.js docs: https://nextjs.org/docs
