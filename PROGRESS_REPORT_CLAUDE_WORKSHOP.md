# אוצר חכמים — דוח התקדמות בקורס Claude Workshop
*בדיקה ממצה של השימוש בכלים ותיקים מהקורס (Session 1-3)*

---

## 📊 סיכום מהיר

| מזל | תחום | מצב | רמה |
|-----|------|------|------|
| ✅ | מבנה פרויקט | מדוהמ וואידאמ | 8/10 |
| ⚠️ | CLAUDE.md / MEMORY.md | חלקי בלבד | 5/10 |
| ❌ | Context Budgeting | לא מיושם | 0/10 |
| ❌ | Privacy Rules | בדיקה נדרשת | 4/10 |
| ⭐ | Delegation Model | טוב מאוד | 7/10 |
| ❌ | Skills / Plugins | לא בשימוש | 0/10 |
| ⭐ | Data Organization | מעולה | 9/10 |

**ציון כללי: 5/10** — הפרויקט בנוי היטב, אך לא מנצל בעדיין את הכלים המתקדמים מהקורס.

---

## 1️⃣ מה עשית נכון

### ✅ ארכיטקטורה פרויקט חזקה
- **מבנה היררכי**: `sources/` → `notes/` → `sages/` → `site-data/`
- **קובץ CLAUDE.md**: קיים וכולל documentation ל-Frontend/Backend
- **Delegation קטגוריאלי**: כל חכם בעל תיקיית `notes/` משלו עם:
  - `lesson_plan.md` — תכנית שיעור
  - `questions.md` — שאלות לדיון
  - `post.md` — פוסט בלוג
  - `related_figures.md` — דמויות קשורות

### ✅ ארכיתקטורה נתונים מבורכת
- 323 חכמים במסד Supabase
- 25 קשרים בתוך הרשת
- Coordinates ו-migration paths מובנים כ-JSON

### ✅ Frontend יפה
- D3.js visualization בעברית RTL
- 5 tabs: קשרים, מפה, מסורות, רעיונות, שלשלת הקבלה
- עברית בסדר גמור

---

## 2️⃣ מה חסר (בהתאם לקורס)

### ❌ **MEMORY.md — אין לך!**
**מה זה צריך להיות:**
```markdown
# MEMORY.md — אוצר חכמים Project Context

## About the Project
- A knowledge base of 323 Jewish sages across 7 historical eras
- Interactive D3 network visualization
- Hebrew RTL + English bilingual
- 54 research documents (docx files) in `sources/`

## Key Facts
- Tannaim (תנאים): 2nd century CE
- Amoraim (אמוראים): 3rd–6th centuries
- Rishonim (ראשונים): 10th–16th centuries
- Modern (עת חדשה): 19th century+

## How Sages Are Structured
- Each sage has: `sages/<slug>.md` (main profile)
- Some have: `notes/<slug>/` (lesson plans, questions)
- Research files: `sources/<slug>/*.docx`
- Connections: stored in Supabase `connections` table

## Current Phase
- Phase 5 complete: PDF export, mobile responsive
- Phase 6: Full-text search + research document integration

## Rules for Claude
- Always respect privacy: research documents contain potentially sensitive content
- When importing new sages: validate FK constraints to existing sages
- Hebrew RTL: labels must be bilingual where possible
```

**פעולה:** צור `MEMORY.md` כדי שClaude Code יזכור את הקונטקסט כל פעם.

---

### ❌ **INSTRUCTION.md — אין לך!**
**מה זה צריך להיות:**

```markdown
# INSTRUCTION.md — Reusable Workflows for Sage Management

## 🔄 Recurring Task 1: Add New Sage to Network

**When to use:** Every time you have a new sage to profile

**Steps:**
1. Create `sages/<slug>.md` using template `templates/sage-profile.md`
2. Fill in all sections: Overview, Period, Main Works, Core Ideas, Relationships
3. Add node to Supabase `sages` table (id, label, group, period, location, field, bio)
4. Create `notes/<slug>/` directory with:
   - `lesson_plan.md` — 45-minute teaching plan
   - `questions.md` — 5-10 discussion questions
   - `post.md` — 800-word blog post
   - `related_figures.md` — 3-5 related sages with cross-references
5. If research document exists: save to `sources/<slug>/<docx-file>`

**Definition of done:**
- Sage appears in D3 graph visualization
- Sidebar shows all profile fields
- No broken links to related sages

## 🔄 Recurring Task 2: Generate Lesson Plan for New Sage

**When to use:** When adding structured teaching material

**Context to provide Claude:**
- Goal: Write a 45-minute lesson plan in Hebrew
- Sources: the sage's docx research file + markdown biography
- Constraints: Must reference ספר/tractate names accurately
- Output format: Markdown table with timestamps + learning outcomes

**Approval boundary:**
- You review the lesson plan before publishing to website

## 🔄 Recurring Task 3: Extract Migration Path from Research Doc

**When to use:** When building geographic history

**Steps:**
1. Point Claude to `sources/<slug>/<file.docx>`
2. Ask: "Extract migration path: where was this sage born, traveled, studied, worked?"
3. Format: `{"from": "ירושלים", "to": "ספרד", "intermediate": ["מצרים"]}`
4. Update Supabase `migration_path` column

## Critical Safety Rules
🔒 **Privacy First:**
- Research documents contain potentially sensitive biographical info
- Always: "Read-only. Do not create backups of full text."
- Never: Export full research text without explicit approval

🔒 **Data Integrity:**
- Before any INSERT/UPDATE to Supabase:
  - Validate that source sage IDs exist
  - Check for duplicate connections
  - Confirm period dates are in range

🔒 **Hebrew RTL:**
- All labels must be bilingual: "Rambam — הרמב״ם"
- Use proper Hebrew punctuation: גרשיים (״) for abbreviations
```

**פעולה:** צור `INSTRUCTION.md` עם המטלות החוזרות שלך.

---

### ⚠️ **Context Budgeting — חסר מבנה**

**מה זה צריך להיות:**

בקובץ `CLAUDE.md`, צריך להוסיף סעיף:

```markdown
## Context Budgeting for Claude Code

### Source Budget
- ✅ Can read: `sages/*.md`, `notes/*/*.md`, `templates/`
- ✅ Can read: `site-data/חכמי ישראל.xlsx` (metadata only)
- ❌ Cannot read: Full text of `sources/**/*.docx` (sensitive)
- ⚠️ Can read excerpts: Only if explicitly extracted & approved

### Action Budget
- ✅ Can write: Markdown files in `sages/`, `notes/`
- ✅ Can create: New sage profiles + lesson plans
- ✅ Can update: Relationships in markdown cross-references
- ❌ Cannot send: Full research document text via email
- ❌ Cannot delete: Any source files without approval

### Output Budget
- ✅ Must provide: Structured lesson plans, lesson plans, outlines
- ✅ Can produce: JSON migration paths
- ⚠️ Limited access: Research summaries (no full text extraction)
- ❌ Never produce: Private biographical details without consent

### Time Budget (Optional)
- Expected tokens per task: 5,000–10,000
- If exceeding 15,000: Break into sub-tasks, use Memory.md to resume

### Definition of Done (Must Always Include)
Before acting, confirm with user:
1. "Goal: [What exactly should happen?]"
2. "Constraints: [What may I NOT touch?]"
3. "Definition of done: [How do we know this is complete?]"
```

**פעולה:** הוסף סעיף זה ל-CLAUDE.md שלך.

---

### ❌ **Privacy Rules — בדיקה נדרשת**

**בעיה:** יש לך 54 קבצי Word עם מחקר על חכמים. בחלקם אולי יש:
- מידע ביוגרפי רגיש
- ציטוטים מפרטיים
- ערכים עדכניים על אנשים חיים

**מה צריך לעשות:**

הוסף ל-CLAUDE.md:

```markdown
## Privacy & Safety Rules (Session 1 Pattern)

**Privacy First — Always:**
1. ✅ Start read-only. Never assume write permissions.
2. ✅ Limit sources. Specify exactly which files Claude may access.
3. ✅ Use demo data for practice. Never load personal/sensitive research.
4. ✅ Review before sending, deleting, editing, labeling, moving, or scheduling.

**Specific to Research Documents:**
- Research files in `sources/*/` contain biographical research
- If a sage is living (modern era): Treat names/details as sensitive
- Extract only: Dates, periods, publications, historical migrations
- Never export: Full biographical text without explicit user approval

**Safe practices:**
- ✅ Claude reads and summarizes research (stays in chat)
- ✅ Claude extracts structured data (dates, locations, book titles)
- ⚠️ User manually copies interesting quotes
- ❌ Claude never archives full text to external services
```

**פעולה:** בדוק את `sources/` — האם יש פרטים רגישים?

---

## 3️⃣ שלוש פעולות מידיות

### 1. צור MEMORY.md
```bash
# In your project root:
touch MEMORY.md
# ממלא את התשובה הראשונה לעיל
```

**זה יעזור ל-Claude Code:**
- זוכר מי אתה, מה הפרויקט, איך הוא מובנה
- 10% מה-context window שלו אבל **שווה את זה** כי הוא לא שוכח

### 2. צור INSTRUCTION.md
```bash
touch INSTRUCTION.md
# ממלא בתשובה השנייה לעיל
```

**זה יעזור ל-Claude Code:**
- לדעת איזה משימות חוזרות יש לך
- איך להפעיל אתן בצורה בטוחה

### 3. עדכן CLAUDE.md
- הוסף סעיף "Context Budgeting"
- הוסף סעיף "Privacy & Safety Rules"
- הוסף לינק ל-INSTRUCTION.md ו-MEMORY.md

---

## 4️⃣ בדוק את השימוש בקורס

### מה תלמדת (Session 1–3)

| כלי | הגדרה מהקורס | השימוש שלך |
|-----|---|---|
| **CLAUDE.md** | Rule file — תגיד ל-Claude איך לעבוד | ✅ קיים, אבל חסר Context Budgeting |
| **MEMORY.md** | זיכרון — מה Claude צריך לזכור | ❌ חסר לגמרי |
| **INSTRUCTION.md** | סדר שגרתי — איך לבצע משימות חוזרות | ❌ חסר לגמרי |
| **3-Level Prompt** | Goal + Constraints + Definition of Done | ❌ לא מיושם בפרומפטים שלך |
| **Privacy Rules** | Start read-only, limit sources, review before acting | ⚠️ חלקי |
| **Skills & Plugins** | Reusable workflows | ❌ לא בשימוש |
| **Context Budgeting** | "תן ל-Claude בדיוק מה הוא צריך" | ❌ לא מיושם |

### זה התחום שלך להתקדם

**Session 1 מסר ברור:** 
> "The human still defines the goal, limits the context, approves actions, and checks the result."

אתה עשית את זה בחלקך (בנית מבנה מדוהמ). עכשיו **וודא שClaude Code משתמש בו**:

1. כתוב את מה שאתה רוצה בצורה ברורה (Goal)
2. אמור מה Claude לא יכול לעשות (Constraints)
3. תגיד איך נדע שזה בוצע (Definition of Done)

---

## 5️⃣ ציעוץ עבור Session 4

בקורס עתיד אתה צפוי ללמוד:
- **Claude Dispatch** — run multiple agents in parallel
- **Claude Plugin Architecture** — בנה skills משלך
- **Advanced Memory** — שמור context ארוך טווח

**הכנה ל-Session 4:**
1. ✅ סיים את 3 הקבצים לעיל
2. ✅ נסה ל-create Skill: "Generate Sage Profile" (reusable workflow)
3. ✅ שמור את הנסיון כdocumentation

---

## סטטוס מסכם

```
🎯 Objective: Leverage Claude Cowork/Code to scale sage research

✅ DONE:
  - Frontend visualization
  - Data architecture
  - Privacy awareness

⚠️ IN PROGRESS:
  - Context budgeting
  - Memory files

❌ TODO:
  - MEMORY.md
  - INSTRUCTION.md  
  - Context Budgeting section
  - Skills (Sage Profile generator)
  - Test 3-Level Prompt workflow

🎓 Next milestone:
  - Run 1 full workflow using CLAUDE.md + MEMORY.md + INSTRUCTION.md
  - Measure: Can Claude auto-generate lesson plan without your re-explaining?
```

---

**כתוב לי איזה מהפעולות הללו תרצה להתחיל בעדיפות ראשונה, ואנחנו נתחיל!** 🚀
