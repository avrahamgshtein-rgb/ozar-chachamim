# 📁 Local Folder Watch — Automatic Sage Upload

**תיקייה שמעקבת אחר קבצים חדשים + עדכון האתר בעצמאות**

---

## 🎯 איך זה עובד

```
אתה מוסיף קובץ Word/txt
      ↓
C:\Users\User\Desktop\ozar-chachamim\data\
      ↓
watch-local-folder.js מגלה את הקובץ
      ↓
קוראה את התוכן (docx, txt, md)
      ↓
חולצת נתונים מובנים (bio, works, ideas, etc.)
      ↓
מחזורה Supabase בעצמאות
      ↓
האתר מתעדכן בחי! ✅
      ↓
הקובץ מועבר ל-data/processed/
```

---

## 📂 מבנה תיקיות

```
ozar-chachamim/
├── data/                    ← הטל קבצים כאן
│   ├── processed/           ← קבצים שהעלו בהצלחה
│   └── failed/              ← קבצים שנכשלו (צריך ביקורת)
├── watch-local-folder.js    ← ה-watcher
└── skills/
    └── extract-sage-from-local-file.js
```

---

## 🚀 התחל בעזרה

### שלב 1: התקנה

```bash
cd C:\Users\User\Desktop\ozar-chachamim

# התקן dependencies
npm install

# צור .env
cp .env.example .env
# עדכן עם Supabase credentials שלך
```

### שלב 2: התחל ל-Watch

```bash
# הפעל את ה-watcher (ממש עכשיו יתחיל לעקוב)
npm run watch:start

# או אם רוצה לבדוק פעם אחת:
npm run watch:once
```

### שלב 3: הוסף קבצים

```bash
# העתק קבצים ל-data/ folder:
cp "C:\path\to\רבי מאיר - מחקר עמוק.docx" data/

# או פשוט גרור וזרוק את הקובץ ל-data/ folder ב-Windows Explorer
```

### שלב 4: צפה בעדכון

```
Terminal יציג:
📄 Processing: רבי מאיר - מחקר עמוק.docx
  ✓ Sage name: rabbi-meir
  ✓ Reading file...
  ✓ Extracting data...
  ✓ Found sage: Rabbi Meir — רבי מאיר
  ✓ Enriching Supabase...
  ✅ ENRICHED: Rabbi Meir — רבי מאיר
     Fields updated: bio, core_concept, main_works, tags
     Connections created: 2
  ✓ Moved to: data/processed/
```

---

## 📋 Form Format Required

### שם הקובץ (חובה)

הקובץ צריך שם עם שם החכם בתחילה:

```
✅ תקין:
  - רבי מאיר - מחקר עמוק.docx
  - Rabbi Meir - Deep Research.docx
  - rambam-biography.docx
  - Rambam.docx

❌ לא תקין:
  - research.docx (אין שם חכם)
  - myfile.docx (לא ברור לאיזה חכם)
```

**כיצד לחלץ את שם החכם:**
- חיתוך בפעם הראשונה על `-` או `—` או פרק
- תרגום ל-English slug: `rabbi-meir`, `rambam`, `rashi`
- חיפוש במאגר (Supabase)

### תוכן הקובץ (מומלץ)

הקובץ יכול להכיל:

```markdown
# רבי מאיר - מחקר עמוק

## ביוגרפיה
רבי מאיר היה תנא מהדור הרביעי...
[טקסט ארוך כמו שתרצה]

## יצירות עיקריות
- Stam Mishnah (סתם משנה)
- Megillat Taanit (מגילת תעניות)

## רעיונות עיקריים
- חייש למיעוטא - חשש לאפשרות נדירה
- דינא דגרמי - אחריות לנזק עקיף

## קשרים
- תלמיד של אלישע בן אבוי
- מורה של יהודה הנשיא

## גיאוגרפיה
- ירושלים (כל אחת)
- טבריה (עבודה)
```

---

## 🔄 Workflow זרימה

### אפשרות 1: Watch Mode (המומלץ)

```bash
npm run watch:start

# Terminal יישאר פתוח ויעקוב אחר data/
# בכל שתהוסיף קובץ - יתעדכן בחי!

# בעצירה: Ctrl+C
```

**יתרונות:**
- ✅ מעקב מתמיד
- ✅ עדכון בחי
- ✅ אפשר לעדכן כמה קבצים בבת אחת

### אפשרות 2: One-Time Mode

```bash
npm run watch:once

# מעבד קבצים פעם אחת בלבד ויוצא
```

**יתרונות:**
- ✅ לא צריך להשאיר Terminal פתוח
- ✅ מהיר לעדכון חד-פעמי

---

## 📄 סוגי קבצים נתמכים

| סוג | הרחבה | דוגמה | תמיכה |
|-----|--------|---------|--------|
| Word | .docx | רבי מאיר.docx | ✅ מלא |
| טקסט | .txt | rambam.txt | ✅ מלא |
| Markdown | .md | rashi.md | ✅ מלא |
| Word Legacy | .doc | file.doc | ✅ בתמיכה |
| Google Doc | — | (הורד כ-.docx) | ✅ בעקיפין |

---

## 🔍 Extraction Logic

ה-watcher עובד בשלבים:

### 1. **Extract Sage Name**
```
רבי מאיר - מחקר עמוק.docx
              ↓
Filename → "rabbi-meir"
```

### 2. **Read File**
```
.docx / .txt / .md
     ↓
Extract text content
```

### 3. **Parse Content**
```
Text ↓
├─ Biography (first 3 sentences)
├─ Main Works (bullet points, book names)
├─ Key Ideas (key phrases, theories)
├─ Related Sages (Rabbi X, Rav Y)
└─ Locations (Jerusalem, Egypt, etc.)
```

### 4. **Find Sage in DB**
```
"rabbi-meir" ↓
Search Supabase: ILIKE label '%rabbi-meir%'
     ↓
Found: id=45, label="Rabbi Meir — רבי מאיר"
```

### 5. **Enrich Supabase**
```
UPDATE sages SET
  bio = '...',
  core_concept = '...',
  main_works = ['...', '...'],
  tags = [...],
  research_enriched_at = now()
WHERE id = 45;
```

### 6. **Create Connections**
```
INSERT INTO connections
  (source_id=45, target_id=50, type='student')
  (source_id=45, target_id=67, type='teacher')
```

### 7. **Move File**
```
data/רבי מאיר - מחקר עמוק.docx
          ↓
data/processed/רבי מאיר - מחקר עמוק.docx
```

---

## ⚙️ Configuration

### בקובץ `.env`:

```bash
# Already set in .env.example, but you can override:

# Watch folder location (default: ./data)
DATA_FOLDER=./data

# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_...
```

### בקובץ `watch-local-folder.js`:

```javascript
const CONFIG = {
  dataFolder: process.env.DATA_FOLDER || './data',
  processedFolder: './data/processed',      // תיקיית הצלחה
  failedFolder: './data/failed',            // תיקיית כישלון
  watchInterval: 5000,                      // בדיקה כל 5 שניות
  // ...
};
```

---

## 🚨 Troubleshooting

| בעיה | סיבה | פתרון |
|------|----|----|
| "File not found" | הקובץ לא בתיקייה | בדוק שקובץ ב-`data/` folder |
| "Sage not found in Supabase" | שם לא מתורגם נכון | בדוק את שם הקובץ או צור sage ידנית |
| "Permission denied" | Supabase credentials | בדוק `.env` ו-SUPABASE_SERVICE_ROLE_KEY |
| "Unsupported file type" | סוג קובץ שגוי | use .docx, .txt, or .md |
| קובץ נכשל → `data/failed/` | שגיאה בעיבוד | בדוק את תוכן הקובץ |

---

## 📊 Example Workflows

### Workflow 1: עדכון חכם אחד

```bash
# 1. כתוב/ערוך בWord
#    C:\...\רבי מאיר - מחקר עמוק.docx

# 2. גרור לתיקייה
#    drag & drop ל- C:\...\ozar-chachamim\data\

# 3. צפה בעדכון
npm run watch:once

# ✅ Done! הרבי מאיר עודכן בSupabase + האתר
```

### Workflow 2: עדכון הרבה חכמים בבת אחת

```bash
# 1. כתוב כמה קבצים
#    - רבי מאיר.docx
#    - רמב״ם.docx
#    - רשי.docx
#    - רמבן.docx

# 2. הכנס לתיקייה
#    Copy all to C:\...\data\

# 3. הפעל watcher
npm run watch:start

# ✅ כל הקבצים יעלו בסדר, בחי!
# 📋 טלים יוצגו בעדכון בחי
```

### Workflow 3: ניטור חי (עדכון שבועי)

```bash
# 1. התחל את ה-watcher בterminal נפרד
npm run watch:start

# 2. עיבודתוך השבוע, אתה יכול:
#    - להוסיף קבצים בכל זמן
#    - Terminal יעדכן בחי
#    - קבצים יעברו ל-processed/

# 3. בסוף השבוע, בדוק processed/ + failed/
#    ls data/processed/      # הצלחות
#    ls data/failed/         # נכשלים (ביקורת ידנית)

# 4. בעצירה: Ctrl+C ב-Terminal
```

---

## 🔐 Security

✅ **בטוח:**
- רק קבצים ב-`data/` נקראים
- שירות אקאונט (לא אישי) משמש
- קבצים לא משודרים לאף מקום

❌ **לא תקין:**
- אל תשמור סודות בקבצים
- אל תשמור passwords בקבצים
- אל תשתף data/failed/ עם אחרים

---

## 📞 Usage Examples

### שימוש 1: Continuous Watch (המומלץ)

```bash
npm run watch:start

# Output:
# ============================================================
# 👁️  WATCHING LOCAL FOLDER FOR SAGE UPDATES
# ============================================================
# Folder: ./data
# Mode: CONTINUOUS (watch)
#
# ⏰ Waiting for new files (checking every 5000ms)...
# 💡 Tip: Drop .docx files into data/ folder and they'll upload automatically!

# [בכל שתהוסיף קובץ:]
# 🔔 Found 1 new file(s):
# 📄 Processing: רבי מאיר.docx
#   ✓ Sage name: rabbi-meir
#   ✓ Found sage: Rabbi Meir — רבי מאיר
#   ✅ ENRICHED
```

### שימוש 2: One-Time Run

```bash
npm run watch:once

# עובד על קבצים ויוצא (שימושי לscripting)
```

### שימוש 3: Custom Folder

```bash
node watch-local-folder.js --folder=/my/custom/folder
```

---

## 🎓 Integration with Schedule

אתה יכול לשלב עם automated schedule:

```bash
# 1. לתזמן את watch:once לחרוץ כל יום ב-11 בלילה:
#    (Windows Task Scheduler)

# 2. בעצמאות, כל קבצים חדשים ב-data/ יעלו
```

---

## 📝 Next Steps

1. ✅ `npm install` (התקן dependencies)
2. ✅ צור `.env` עם Supabase credentials
3. ✅ בדוק: `npm run watch:once` (פעם אחת)
4. ✅ אם עובד → `npm run watch:start` (להתחיל watcher)
5. ✅ הוסף קבצים ל-`data/` folder
6. ✅ צפה בעדכון בחי!

---

**זה הכל!** 🎉

אתה יכול עכשיו:
- להוסיף מחקרים חדשים בWord
- גרור ל-`data/` folder
- Supabase יתעדכן בעצמאות
- האתר יהיה live עם תוכן חדש

**שאלות?** אני כאן! 💪
