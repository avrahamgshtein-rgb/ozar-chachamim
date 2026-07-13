# Phase 5: Deployment & Monitoring Guide

## 🚀 Quick Start: Vercel Deployment

**1 minute setup:**

```bash
# 1. Push to GitHub (if not already done)
git push origin main

# 2. Go to Vercel: https://vercel.com
# 3. Click "Add New..." → "Project"
# 4. Import your repository
# 5. Environment variables (see below)
# 6. Deploy

# 6. Verify deployment
https://ozar-chachamim.vercel.app
```

---

## 📊 Monitoring Setup

### Vercel Analytics (Built-in)
✅ **Automatic** — No setup needed on Vercel deployments

Includes:
- Web Vitals (CLS, FID, LCP, TTFB)
- Real User Monitoring (RUM)
- Regional performance data
- Bot traffic detection

Access dashboard:
```
https://vercel.com/dashboard → Select project → Analytics
```

### Sentry Error Tracking

**1. Create Sentry Project**
```
1. Go to https://sentry.io (create free account if needed)
2. Create new project → Platform: "Next.js"
3. Copy DSN from settings
```

**2. Add Environment Variable**
```bash
# In Vercel dashboard → Settings → Environment Variables
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**3. Test Error Tracking**
```javascript
// In browser console on deployed site:
throw new Error("Test error")
// Should appear in Sentry dashboard in ~10 seconds
```

**4. Set Up Alerts**
```
Sentry dashboard → Alerts → Create Alert Rule:
- Condition: "Error count is greater than 5 in the last 1 minute"
- Action: Send email / Slack notification
- Frequency: Immediate
```

---

## 🎯 Key Metrics to Monitor

| Metric | Target | Tool |
|--------|--------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Vercel Analytics |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Vercel Analytics |
| **FID** (First Input Delay) | < 100ms | Vercel Analytics |
| **Error Rate** | < 1% | Sentry |
| **Response Time** | < 500ms | Vercel Analytics |
| **Uptime** | > 99% | Vercel Status Page |

---

## 📋 Pre-Deployment Checklist

- [ ] **Code Quality**
  - [ ] All tests passing (if applicable)
  - [ ] No TypeScript errors (`npm run build`)
  - [ ] No console errors in dev server
  - [ ] Performance baseline established

- [ ] **Security**
  - [ ] No secrets in git (check `.gitignore`)
  - [ ] HTTPS enforced (automatic on Vercel)
  - [ ] CORS policy set (if needed)
  - [ ] Sentry DSN is public-safe key (not secret token)

- [ ] **Configuration**
  - [ ] Environment variables set in Vercel
  - [ ] Sentry DSN configured
  - [ ] Analytics enabled
  - [ ] Error alerts configured

- [ ] **Testing**
  - [ ] All 6 tabs render correctly
  - [ ] Search functionality works
  - [ ] Filters apply correctly
  - [ ] Sage details open/close properly
  - [ ] Mobile responsive (test on phone)
  - [ ] Hebrew RTL displays correctly

- [ ] **Monitoring**
  - [ ] Vercel dashboard accessible
  - [ ] Sentry project receiving events
  - [ ] Alert notifications working
  - [ ] Analytics dashboard shows data

- [ ] **Documentation**
  - [ ] README updated with deployment info
  - [ ] Environment variables documented
  - [ ] Error handling procedures documented
  - [ ] Rollback procedure documented

---

## 🔍 Post-Deployment Verification

### Immediate (First 5 minutes)
1. ✅ Visit site: `https://ozar-chachamim.vercel.app`
2. ✅ Check all tabs load
3. ✅ Check console for errors (F12)
4. ✅ Verify structured data (F12 → Elements → head → scripts)

### Monitoring (First 24 hours)
1. ✅ Check Vercel Analytics for traffic
2. ✅ Check Sentry for errors (should be 0 initially)
3. ✅ Monitor Core Web Vitals
4. ✅ Check error alerts configuration

### Long-term (Weekly)
1. ✅ Review Vercel Analytics trends
2. ✅ Review Sentry error patterns
3. ✅ Check Lighthouse scores (monthly)
4. ✅ Monitor error rate < 1%

---

## 🚨 Troubleshooting

### Build fails with "Jest worker" error
**Solution:**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Sentry not receiving errors
**Check:**
1. DSN is correct and public (not secret token)
2. Environment variable is set in Vercel
3. Sentry project is active
4. Error type is supported (check Sentry docs)

### Slow performance on mobile
**Check:**
1. Lighthouse score (target ≥ 90)
2. Bundle size (target < 150KB JS)
3. Image optimization
4. Network throttling (DevTools)

### Locale routing issues
**Check:**
1. Vercel rewrites configured
2. Middleware executing correctly
3. Browser language preferences set

---

## 📱 Rollback Procedure

If deployment breaks production:

```bash
# Option 1: Vercel Dashboard
1. Go to Vercel → Deployments
2. Find last working deployment
3. Click "Promote to Production"

# Option 2: Git Revert
git revert HEAD
git push origin main
# Vercel auto-redeploys
```

---

## 🔄 Continuous Improvement

### Weekly Review
- Error trends (Sentry)
- Performance trends (Vercel Analytics)
- User feedback (if available)

### Monthly Optimization
- Lighthouse audit
- Bundle analysis
- Database query performance
- SEO audit

### Quarterly Planning
- Feature releases
- Architecture updates
- Dependency upgrades
- Security audits

---

## 📞 Support Resources

- **Vercel Help:** https://vercel.com/docs
- **Sentry Docs:** https://docs.sentry.io
- **Next.js Docs:** https://nextjs.org/docs
- **Web Vitals:** https://web.dev/vitals/

---

**Ready to deploy?**
```bash
git push origin main
# Vercel auto-deploys in ~2-3 minutes
```
