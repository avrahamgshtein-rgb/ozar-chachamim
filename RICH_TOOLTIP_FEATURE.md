# 🖱️ Rich Hover Tooltip Feature — Enhanced Sage Information

## ✅ What's New

When you **hover over a sage circle** on the geography map, you now see a rich tooltip with comprehensive information:

### Information Displayed:

1. **📛 Sage Name** (Color-coded by era)
2. **📊 Era/Period** (תקופה)
3. **📅 Birth & Death Years** (if available)
4. **🏘️ Birthplace** (נולד ב...)
5. **🌍 Migration Locations** (Main locations where they lived/worked)
6. **🎵 Spotify Link** (if available)
7. **🔗 Wikipedia Link** (if available)

---

## 🎨 Example Tooltips

### Example 1: שמעון בן שטח

```
שמעון בן שטח
תקופה: בית שני
📅 150 לפנה״ס-60 לפנה״ס
🏘️ נולד ב: ירושלים
🌍 מקומות: ירושלים
🔗 Wikipedia
```

### Example 2: פילון האלכסנדרוני

```
פילון האלכסנדרוני
תקופה: בית שני
📅 20 לפנה״ס-50 לסה״נ
🏘️ נולד ב: אלכסנדריה
🌍 מקומות: אלכסנדריה, ירושלים
🎵 Spotify
🔗 Wikipedia
```

---

## 📝 Data Structure

To add this information to a sage, update their record in `data.json`:

```json
{
  "id": "123",
  "label": "שם החכם בעברית",
  "era": "ראשונים",
  "field": "הלכה",
  "location": "ברצלונה; טבריה",
  "bio": "ביוגרפיה קצרה...",
  
  "birthplace": "ברצלונה",        // NEW: where they were born
  "birth_year": "1194",             // NEW: birth year
  "death_year": "1270",             // NEW: death year
  "spotify": "https://...",         // NEW: Spotify link
  "wikipedia": "https://...",       // NEW: Wikipedia link
  
  "era_key": "rishonim"
}
```

### Field Definitions:

| Field | Type | Example | Required |
|-------|------|---------|----------|
| `birthplace` | String | "ברצלונה" | No |
| `birth_year` | String | "1194" or "1194 לסה״נ" | No |
| `death_year` | String | "1270" or "1270 לסה״נ" | No |
| `spotify` | URL | "https://open.spotify.com/..." | No |
| `wikipedia` | URL | "https://en.wikipedia.org/..." | No |

---

## 🎯 How to Populate Data

### Option 1: Extract from Research Documents

1. Open the relevant research document (*.docx)
2. Extract:
   - Birth date and place
   - Death date and place
   - Migration locations
3. Add to data.json

### Option 2: Use Wikipedia

Many sages have Wikipedia entries with:
- Birth/death dates
- Birthplace
- Major locations where they lived
- Spotify playlists (some famous sages)

### Option 3: Standardize Existing Data

Current data has location information scattered in the `location` field:
```
"location": "ברצלונה (לידה); ספרד (עבודה); טבריה (זקנותו)"
```

Parse this and split into:
- `birthplace`: "ברצלונה"
- `location`: "ספרד; טבריה"

---

## 💾 Sample Data Added

Three sages have been enriched with sample data:

### 1. שמעון בן שטח (ID: 2)
- **Birthplace:** ירושלים
- **Birth:** 150 לפנה״ס
- **Death:** 60 לפנה״ס

### 2. פילון האלכסנדרוני (ID: 3)
- **Birthplace:** אלכסנדריה
- **Birth:** 20 לפנה״ס
- **Death:** 50 לסה״נ
- **Spotify:** https://open.spotify.com/artist/search?q=philo

### 3. רבי עקיבא בן יוסף (ID: 4)
- **Birthplace:** לוד
- **Birth:** 50 לסה״נ
- **Death:** 135 לסה״נ
- **Spotify:** https://open.spotify.com/artist/search?q=akiva

---

## 🖥️ Technical Implementation

### map.js Changes:

Added new method `createTooltipContent(sage)` that:
1. Checks for each data field
2. Formats the information in Hebrew RTL
3. Adds icons/emojis for visual clarity
4. Creates clickable links for Spotify/Wikipedia

### CSS Styling:

Added `.sage-tooltip-rich` class with:
- White background with subtle shadow
- RTL text direction
- Proper line-height for readability
- Hover effects on links

### Tooltip Binding:

```javascript
.bindTooltip(this.createTooltipContent(sage), {
  permanent: false,
  direction: 'top',
  className: 'sage-tooltip-rich'
})
```

---

## 🔄 Graceful Degradation

The tooltip handles missing data gracefully:

- **No birthplace?** → Skips that line
- **No dates?** → Shows only era
- **No Spotify?** → Shows only Wikipedia
- **No links?** → Shows just name, era, location

Example (minimal data):
```
שם החכם
תקופה: ראשונים
🌍 מקומות: ירושלים
```

---

## 🚀 Next Steps to Complete

To fully implement this feature for all 364 sages:

### Priority 1: Core Data (Top 50 sages)
1. Extract birth/death dates from research documents
2. Identify birthplaces
3. Parse migration locations
4. Add Wikipedia links

### Priority 2: Extended Data (Remaining 314 sages)
1. Use Wikipedia for dates
2. Extract birthplace information
3. Standardize location formats
4. Find Spotify links for notable sages

### Priority 3: Enrichment
1. Add `core_concept` field for all sages
2. Add `dates` field (currently in bio)
3. Add migration path information
4. Link to academic papers/sources

---

## 📊 Data Entry Template

Use this template to add information to multiple sages:

```json
{
  "id": "XXX",
  "label": "שם החכם בעברית",
  "era": "תקופה",
  "field": "תחום",
  "location": "מקום 1; מקום 2; מקום 3",
  "bio": "ביוגרפיה קצרה...",
  "birthplace": "מקום הלידה",
  "birth_year": "שנת לידה",
  "death_year": "שנת מוות",
  "dates": "תאריכים מלאים (אופציונלי)",
  "core_concept": "עיקר התרומה או הגישה",
  "wikipedia": "https://en.wikipedia.org/wiki/...",
  "spotify": "https://open.spotify.com/...",
  "era_key": "english-era-name"
}
```

---

## ✨ User Experience

### On Desktop:
```
Move mouse over circle
  ↓
Tooltip appears above circle (0.3s)
  ↓
Shows name, dates, birthplace, locations
  ↓
Click Spotify/Wikipedia links to open
```

### On Mobile:
```
Tap circle
  ↓
Popup shows detailed info
  ↓
Tooltip also shows on long-press
```

---

## 🎉 Benefits

✅ **Richer Context:** Users see biographical information without clicking
✅ **Visual Exploration:** Colors and emojis make information scannable
✅ **Direct Links:** One-click access to Spotify/Wikipedia
✅ **Mobile Friendly:** Responsive tooltip sizing
✅ **Graceful:** Works with partial data

---

## 📈 Estimated Data Entry Time

| Task | Sages | Time | Method |
|------|-------|------|--------|
| Top 50 sages (complete) | 50 | 8-10 hours | Research + Wiki |
| Intermediate 150 sages | 150 | 12-15 hours | Wikipedia API |
| Remaining 164 sages | 164 | 10-12 hours | Auto-fill + Manual |
| **Total** | **364** | **30-37 hours** | **Mixed** |

---

## 💡 Spotify Integration

For famous sages and musical/poetic traditions:
- Look for Spotify playlists with their name
- Link to traditional liturgical music
- Link to modern retellings or interpretations
- Examples: Rambam, Baal Shem Tov, Vilna Gaon

---

## 🚀 Deploy the Feature

All code is ready. To deploy:

```bash
git add data.json map.js index.html
git commit -m "✨ Rich Hover Tooltip: Enhanced sage information on map"
git push origin main
```

The feature is **backward compatible** — sages without the new fields display gracefully.

---

**Ready to enhance your sage exploration!** 🌟
