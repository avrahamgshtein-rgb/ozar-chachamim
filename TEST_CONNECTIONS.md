# 🧪 Connection Visibility Test Guide

## Quick Test

1. **Open:** http://localhost:8080
2. **Wait:** Graph loads (check console for "Rendering 24 links")
3. **Look:** You should see colored lines connecting circles
4. **Expected:** Clear, bright connections in 8 different styles

---

## Detailed Tests

### Test 1: See All 8 Connection Types ✓

**What to do:**
- Look at the left sidebar, scroll to bottom
- Find section: **סוגי קשרים** (Connection Types)
- Compare colors in legend with connections in graph

**What you should see:**

| Legend | Color | Graph Should Show |
|--------|-------|-------------------|
| ▬ תלמיד | Blue | Blue lines between sages |
| ▬ מורה/רב | Red | Red lines between sages |
| ▬ השפעה | Green | Green dashed lines |
| ▬ התנגדות | Orange | Orange dotted lines |
| ▬ עמית | Purple | Purple solid lines |
| ▬ קדמון | Gold | Gold spaced-dot lines |
| ▬ בן זמן | Cyan | Cyan custom-dash lines |
| ▬ משפחה | Pink | Pink long-dash lines |

**Expected Count:** 24 total connections (3 per type)

---

### Test 2: Connections are NOT Faded ✓

**Before fix:** Connections had 30-70% opacity (very faint)
**After fix:** Connections have 60-100% opacity (bright)

**Test:**
1. Look at graph without selecting anything
2. Connections should be **clearly visible**
3. They should NOT be ghosted or faint
4. Colors should be **vibrant**

**If you see faint lines:**
- Clear browser cache (Ctrl+Shift+Del)
- Refresh page (F5)
- Check console (F12) for errors

---

### Test 3: Connections are NOT Too Thin ✓

**Before fix:** Stroke width was 1.5-4.4 pixels (thin)
**After fix:** Stroke width is 2.0-4.7 pixels (thicker)

**Test:**
1. Look at any connection line
2. It should be **easy to see** and not hair-thin
3. Different types should have **slightly different thickness**
4. Thickest: student & teacher lines (3.2+ px)
5. Standard: others (2.5+ px)

**If lines are still too thin:**
- The data might not be loading properly
- Check console (F12 → Network tab) for errors

---

### Test 4: Hover Effect ✓

**Before:** When you hover on a node, other connections faded to 45% opacity
**After:** Other connections fade to 65% opacity (more visible)

**Test:**
1. Find a sage with connections (e.g., "הרמב״ם")
2. Hover over their circle
3. Their connections should **brighten**
4. Other connections should **fade but still be visible**

**Expected:** You can easily see who they're connected to

---

### Test 5: Connection Labels (if present)

**Test:**
1. Hover over a connection line
2. A label might appear showing the connection type
3. Should be readable and not too faint

---

## Specific Connections to Check

If you want to verify specific connections exist, look for:

### Student (תלמיד) - Blue Solid Lines:
- "הר״ן" → "הרמב״ם"
- "רבי יוסף בכור שור" → "מנחם מנדל לפין"
- "רבי עובדיה מברטנורא" → "רבי אברהם אבולעפיה"

### Teacher (מורה) - Red Solid Lines:
- "הרמב״ם" → "הר״ן"
- "מנחם מנדל לפין" → "רבי יוסף בכור שור"
- "רבי אברהם אבולעפיה" → "רבי עובדיה מברטנורא"

### Influence (השפעה) - Green Dashed:
- "המהרש״א" → "רבי שלום שבזי"
- "הרב שמואל מוהליבר" → "הרב יוסף חיים מבגדאד"
- "חכם ציון חביב ברכה" → (מישהו בID 185)

### All Others:
- Check legend for color/pattern
- Look for matching lines in graph

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **No connections visible** | 1. Clear cache (Ctrl+Shift+Del)<br>2. Refresh (F5)<br>3. Check F12 Console for errors<br>4. Make sure data.json loaded |
| **Connections too faint** | Same as above |
| **Connections too thin** | Same as above |
| **Wrong colors** | Check browser console, data might not match |
| **Legend doesn't match graph** | Reload page completely |

---

## Console Checks

Open F12 (Developer Tools) → Console tab.

**You should see:**
```
🔗 [Graph] Rendering 24 links as link-groups: 24 groups created
```

**If you see:**
```
🔗 [Graph] Rendering 0 links
```
Then data.json isn't loading properly.

**If you see errors** like:
```
Uncaught TypeError: ...
```
Then something broke in the code.

---

## Success Criteria ✅

You pass the test if you see:

- ✅ 24 connections visible in the graph
- ✅ 8 different colors matching the legend
- ✅ 8 different line patterns (solid, dashed, dotted)
- ✅ Lines are thick enough to see clearly
- ✅ Lines are bright (not faded)
- ✅ When you hover on a node, connections highlight
- ✅ No JavaScript errors in console
- ✅ Legend matches what you see in the graph

---

## Browser Compatibility

Should work in:
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

If having issues:
1. Try a different browser
2. Clear all cache
3. Disable extensions
4. Check console (F12) for errors

---

## Next Steps

After testing, if all connections are visible:
1. ✅ Commit changes to git
2. ✅ Deploy to production
3. ✅ Share with users!

If connections are still not visible:
1. Check data.json loads properly
2. Verify graph.js has no syntax errors
3. Check browser console for specific errors
4. May need to debug further

---

**Ready to test? Go to http://localhost:8080 now!** 🚀
