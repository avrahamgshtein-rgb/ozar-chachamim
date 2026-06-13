# אוצר חכמים — התחלה מהירה

## 🚀 הפעלה מהירה

### דרך 1: Python HTTP Server (המומלצת)
```bash
cd C:\Users\User\Desktop\ozar-chachamim
python -m http.server 9999
```
ואז פתח את הדפדפן:
```
http://localhost:9999/
```

### דרך 2: Node.js (אם יש לך npm)
```bash
npm install
npm run dev
```

---

## 📋 מה יש באתר

### 🌐 Tab 1: רשת קשרים (Network Graph)
- **מה זה:** Visualization של 300+ חכמים מלדורות שונות
- **קשרים:** תלמיד, מורה, השפעה, התנגדות, וכו'
- **תכונות:**
  - ריחוף על חכם = הדגשה של החכמים המחוברים
  - לחיצה על חכם = פתח sidebar עם פרטים
  - חיפוש בשדה "חיפוש חכם" = סנן מיד
  - Zoom buttons בפינה = הגדל/הקטן

### 🗺️ Tab 2: מפה (Map)
- **מה זה:** Leaflet.js map עם סימנים של כל חכם
- **אזורים:** ירושלים, בבל, ספרד, איטליה, וכו'
- **תכונות:** Pan & zoom בחינם

### 📊 Tab 3: טבלה (Table)
- **מה זה:** רשימה מלאה של כל החכמים
- **עמודות:** שם (עברית), שם (אנגלית), תקופה, אזור, תחום
- **סינון:** לחץ על שורה = פתח sidebar

### ℹ️ Tab 4: אודות (About)
- **מידע:** על הפרויקט ומה הוא עוזר

---

## 🔧 תכונות ממשק

### חיפוש וסינון
- **חיפוש חכם:** הקלד שם, תקופה, או תחום
- **פילטר תקופה:** בחר בית שני, תנאים, אמוראים, וכו'
- **פילטר אזור:** בחר כל אזור גיאוגרפי

### Sidebar (צד שמאל)
- **כפתור X אדום:** סגור את ה-sidebar
- **נתונים:** שם, תקופה, אזור, תחום, קשרים
- **Escape key:** סגור sidebar כשהוא פתוח

### Legend (צד ימין)
- **תקופות:** צבעים שונים לכל תקופה
- **סוגי קשרים:** הצגת צבעים לכל סוג קשר

---

## 🎨 צבעים

### תקופות (Eras)
| תקופה | צבע | דוגמה |
|------|------|--------|
| בית שני | 🟪 סגול | #8e44ad |
| תנאים | 🔴 אדום | #e74c3c |
| אמוראים | 🟠 כתום | #e67e22 |
| גאונים | 🟡 צהוב | #f1c40f |
| ראשונים | 🟢 ירוק | #27ae60 |
| אחרונים | 🔵 כחול | #2980b9 |
| עת חדשה | 🟦 טורקז | #1abc9c |

### סוגי קשרים (Link Types)
- **תלמיד:** #4ecdc4 (בתכלת)
- **מורה:** #2980b9 (כחול)
- **השפעה:** #8b7965 (חום)
- **התנגדות:** #ff6b6b (אדום)
- **עמית:** #95e1d3 (תירוז)

---

## ⚙️ הגדרות Supabase

אם זה לא עובד:

### 1. בדוק את `config.js`
```javascript
export const SUPABASE_CONFIG = {
  url: 'https://ulluacifirzywhmzkvkr.supabase.co',
  anonKey: 'sb_publishable_...'
}
```

### 2. בדוק את ה-Console (F12)
ישנה להציג:
```
✅ [Supabase] Connecting to...
✅ Loading sages from Supabase...
✅ Loading connections from Supabase...
✅ [AppInit] Single Source Ready: 323 nodes + 25 validated edges
```

### 3. אם עדיין לא עובד
```bash
python migrate_to_supabase_v3.py
```

---

## 📱 על מובייל

- **טאבים:** גלילה אופקית (swipe)
- **Sidebar:** מופיע מלמטה ככרטיס
- **Graph:** Zoom עם pinch, pan with drag

---

## 🔍 טיפים וטריקים

### חיפוש מהיר
- הקלד "רמבם" = מצא את ה-Rambam
- הקלד "אמוראים" = הצג רק אמוראים
- Backspace = בטל חיפוש מיד

### Navigation
- Escape = סגור sidebar
- לחץ על רקע = סגור sidebar
- זום + drag = navigate graph

### Export
- לחץ על "ייצוא" = download JSON של כל הנתונים
- File name: `ozar-chachamim-TIMESTAMP.json`

---

## 📚 בנוכח שיפורים

### בתעדוף עתידי
- [ ] Performance optimizations (300+ nodes)
- [ ] Full-text search עם PostgreSQL
- [ ] Export PDF משופר
- [ ] Dark mode
- [ ] קישורים ל-Wikipedia
- [ ] API public

---

## 🐛 Troubleshooting

### הגרף ריק?
```
1. פתח Console (F12)
2. חפש ל-errors אדומים
3. בדוק שـ Supabase URL נכון
4. הריצו: python migrate_to_supabase_v3.py
```

### Sidebar לא פתוח?
```
1. בדוק שלחצת על חכם
2. Console צריך להציג "selectNode: [sage name]"
3. Refresh F5
```

### Search לא עובד?
```
1. בדוק שהקלדת טקסט בשדה
2. טקסט צריך להתאים בשם/תקופה/תחום
3. Console צריך להציג "🔍 Search: ..."
```

---

## 📞 עזרה

- `F12` = Open Developer Console
- Right-click → Inspect = Debug element
- `Ctrl+Shift+I` = DevTools

---

**Enjoy exploring the wisdom of Jewish sages! 📖✨**

אוצר חכמים — Treasure of Wise People
