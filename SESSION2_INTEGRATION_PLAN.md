# 🚀 Session 2 Integration Plan — אוצר חכמים + Google Drive

*תכנית להשתמש בכלים מ-Session 2 (Skills, Plugins, Connectors) כדי לשפר את האתר ולשלוף מחקרים מ-Google Drive*

---

## 📊 מה Session 2 לימד אותך?

| כלי | הגדרה | דוגמה |
|-----|--------|--------|
| **Skill** | משימה אחת שClaude יודע לעשות | "Extract Sage Biography from PDF" |
| **Plugin** | אגודת כמה Skills + Connectors | "Research Enrichment Plugin" = 5 skills + Google Drive connector |
| **Connector** | חיבור לאפליקציה חיצונית | Google Drive, Slack, Gmail, Notion, etc. |
| **Agent** | אחד שמשתמש בכמה Connectors + Skills | "Research Processor Agent" = יכול לקרוא Google Drive + לעדכן Supabase |

**המטרה של Session 2:** תהפוך משימות חוזרות לאוטומציות שClaude יכול לעשות בכוח עצמו.

---

## 🌐 מה יש לך כרגע (בודקתי את האתר)

✅ **עובד טוב:**
- D3.js interactive graph (רשת קשרים)
- 5 tabs: graph, map, traditions, ideas, timeline
- Search functionality
- Sidebar עם פרטי חכם
- Supabase backend (323 sages)
- RTL Hebrew + English bilingual
- Authentication (login/signup)

❌ **חסר / מוגבל:**
- **מידע עמוק** — Sages אינם מלאים (חסרים פרטים מהמחקרים שלך)
- **No research integration** — אין integration של research docs מ-Google Drive
- **Manual updates** — צריך לעדכן Supabase ידנית
- **Limited search** — חיפוש לא מבוסס על محتוى המחקרים
- **No auto-sync** — אין סינכרון אוטומטי מ-Google Drive

---

## 📁 Google Drive שלך: מה יש שם?

```
אתה נתת לי: https://drive.google.com/drive/folders/1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc

בתוכה (צריך לבדוק):
📁 תיקיות לכל חכם?
  📄 research docs
  📄 notes
  📄 sources

או:
📁 מבנה אחר?
```

**שאלה:** איפה בדיוק המחקרים? תשלח לי structure.

---

## 🛠️ Session 2 Plan: יצור 3 Workflows

### Workflow 1: Skill — "Extract Sage Data from Google Doc"

**מה זה עושה:**
- קוראת Google Doc עם מחקר עמוק
- חותכת את הנתונים החשובים:
  - ✅ Biography (כמה שורות)
  - ✅ Main works (ספרים, מקורות)
  - ✅ Key ideas (עד 5 נקודות עיקריות)
  - ✅ Related sages (מי לימד, מי היו תלמידים)
  - ✅ Geographic info (איפה הוא היה)
- **מחזירה:** Structured JSON

**דוגמה Input:**
```
Google Doc: "רבי מאיר - מחקר עמוק"
[טקסט ארוך עם היסטוריה, פילוסופיה, קשרים...]
```

**דוגמה Output:**
```json
{
  "bio": "רבי מאיר היה תנא מהדור הרביעי...",
  "main_works": [
    "Stam Mishnah (סתם משנה)",
    "Megillat Taanit (מגילת תעניות)"
  ],
  "key_ideas": [
    "חייש למיעוטא - חשש לאפשרות נדירה",
    "דינא דגרמי - אחריות לנזק עקיף",
    "החתימה בגיטין היא העיקר"
  ],
  "related_sages": [
    {"name": "rabbi-yehuda-bar-ilai", "relation": "student"},
    {"name": "judah-the-prince", "relation": "influenced"}
  ],
  "locations": ["ארץ ישראל", "טבריה"]
}
```

**איך מבצעים:**
1. Claude Code קוראת Google Doc (via Connector)
2. מחלצת את הנתונים המובנים
3. מחזירה JSON

---

### Workflow 2: Skill — "Enrich Sage in Database"

**מה זה עושה:**
- לוקח את ה-JSON מ-Workflow 1
- מעדכן את Supabase `sages` table
  - `bio` ← יותר מפורט
  - `core_concept` ← מ-key_ideas
  - `tags` ← מ-related_sages
  - `research_content` ← מלא תוכן
- מוסיף connections בין sages

**דוגמה:**
```sql
UPDATE sages 
SET bio = 'רבי מאיר היה תנא...', 
    core_concept = 'חייש למיעוטא',
    tags = ARRAY['tannaim', 'mishnah', 'halacha']
WHERE id = 1;

INSERT INTO connections (source_id, target_id, type)
VALUES (1, 50, 'student'); -- Yehuda bar Ilai
```

---

### Workflow 3: Plugin — "Research Enrichment Bot"

**מה זה עושה:**
- **משלב את Workflow 1 + 2**
- קורא Google Drive folder
- עבור כל Google Doc:
  1. חוליצ nתונים (Workflow 1)
  2. מעדכן Supabase (Workflow 2)
  3. משדרג את האתר

**דוגמה:**
```
User says: "Enrich all sages from Google Drive"
↓
Plugin:
  ├─ Lists all files in Google Drive folder
  ├─ For each file:
  │  ├─ Read Google Doc
  │  ├─ Extract JSON (Skill 1)
  │  ├─ Update Supabase (Skill 2)
  │  └─ Log progress
  └─ Done! 50 sages enriched
```

---

## 🔌 Connector: Google Drive

**צריך להוסיף:**

```javascript
// google-drive-connector.js

class GoogleDriveConnector {
  constructor(apiKey, folderId) {
    this.apiKey = apiKey;
    this.folderId = folderId; // 1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc
  }

  async listFiles() {
    // Lists all files in folder
    // Returns: [file1, file2, ...]
  }

  async readGoogleDoc(fileId) {
    // Reads Google Doc content
    // Returns: { title, content, ... }
  }

  async updateGoogleDoc(fileId, content) {
    // Updates Google Doc (optional)
  }
}
```

**Setup:**
1. Google Cloud Console: enable Google Drive API
2. Create OAuth credentials (Service Account)
3. Share Google Drive folder with service account
4. Add `google-drive-connector.js` to project

---

## 📋 Implementation Roadmap

### Phase 1: Build (Week 1)
- [ ] Create `google-drive-connector.js` (read Google Drive)
- [ ] Create Skill 1: `extract-sage-data.js` (parse Google Doc → JSON)
- [ ] Create Skill 2: `enrich-sage-in-db.js` (JSON → Supabase)
- [ ] Test with 1 sage

### Phase 2: Automate (Week 2)
- [ ] Create Plugin: `research-enrichment-plugin.js` (orchestrate Skills)
- [ ] Add UI: "Run Enrichment" button in website
- [ ] Test with 10 sages

### Phase 3: Schedule (Week 3)
- [ ] Set up scheduled task: "Sync Google Drive every Sunday"
- [ ] Add progress notifications (Slack/email)
- [ ] Monitor for errors

### Phase 4: Enhance Website (Week 4)
- [ ] Display "Last research update: X days ago"
- [ ] Show rich research content in sidebar
- [ ] Add "Related research" section
- [ ] Improve search (search across research content)

---

## 🎯 What This Enables

**Before (Manual):**
```
You: "Add Rambam info"
↓
Claude Code: Reads your docx manually
↓
You: "Copy this, approve that"
↓
Claude Code: Inserts to Supabase manually
↓
You: Refresh browser, check if it worked
⏱️ Time: 30–60 minutes
```

**After (Automated):**
```
You: "Sync Google Drive folder"
↓
Plugin (autonomously):
  ├─ Lists 50 files
  ├─ Reads each Google Doc
  ├─ Extracts + enriches sages
  ├─ Updates Supabase
  └─ Alerts you: "Done! 50 sages enriched"
⏱️ Time: 5–10 minutes (first time), then automatic on schedule

You can also: "Add 3 more sages" → Done in minutes
```

---

## 🔐 Security Considerations

**Google Drive Access:**
- ✅ Service Account (not OAuth, not personal credentials)
- ✅ Folder-level access only (not entire Drive)
- ✅ Read-only by default (can add write for updates)

**Supabase Updates:**
- ✅ Use Supabase service key (server-side, not exposed)
- ✅ Validate data before INSERT/UPDATE
- ✅ Log all changes (audit trail)

---

## 📞 What I Need From You

To move forward:

1. **Google Drive Structure**
   - תשלח screenshot או תיאור של איפה הקבצים
   - כמה קבצים? (10? 50? 100?)
   - פורמט? (Google Docs? Word? PDF?)

2. **Google Cloud Setup**
   - האם אתה מוכן לקבל API key?
   - או שאתה רוצה שאני אעשה את זה?

3. **Priority: which to build first?**
   - A) Just extract + display (read-only)
   - B) Extract + auto-update Supabase
   - C) Full automation with scheduling

---

## 🚀 Next Steps

1. **You:** Share Google Drive folder structure
2. **Me:** Build Skill 1 (Extract data)
3. **You:** Test with 1 sage
4. **Me:** Build Skill 2 (Update DB)
5. **Me:** Build Plugin (orchestrate)
6. **You:** Run enrichment on all sages
7. **Me:** Add to website + scheduling

---

## 💡 Bonus Ideas (for later)

- 🔍 **Full-text search** across research content
- 📧 **Email digests** of new research
- 🤖 **Auto-generate lesson plans** from research
- 📊 **Research quality score** (how complete is each sage?)
- 🔗 **Auto-detect relationships** (NLP on research → who taught whom)

---

**תשובות שלך לשאלות למעלה → אתחיל בבנייה!** 🎯
