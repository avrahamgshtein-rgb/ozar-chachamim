# 📋 INSTRUCTION.md — Reusable Workflows for Sage Management

*Safe, repeatable processes for common tasks. Updated: June 2026.*

---

## Overview

This file contains **instruction templates** for Claude Code to follow when working on **recurring tasks**. Each workflow includes:
- What it's for
- The safe boundary (what Claude can/cannot do)
- Step-by-step process
- Definition of done (how you know it's complete)

---

## 🔄 Workflow 1: Add New Sage to Network

**When to use:** You have a new sage to add (from research, student suggestions, etc.)

### Safe Boundary (the 3-level prompt)

**Goal:** Create a complete sage profile (markdown + database entry) for a new sage, making them searchable and visible in the D3 network.

**Constraints:**
- You (the human) provide the source material (docx, book chapter, or description)
- Claude reads the source but does NOT archive the full text
- Claude creates markdown + database entry; you manually approve before publishing
- Bilingual labels (Hebrew + English) required

**Definition of done:**
- ✅ Sage appears in D3 graph (click it, see sidebar)
- ✅ Name, period, location, bio are accurate
- ✅ Related sages are cross-referenced with `[[slug]]`
- ✅ No broken links to other sages
- ✅ Tags are assigned correctly (period, location, specialty, movement)

### Steps

1. **Provide source material**
   ```
   Here's a new sage: [attach docx / paste biography / describe]
   
   Please create a profile for: [Sage Name]
   
   Context: [period, why they're important]
   ```

2. **Claude creates markdown profile**
   - Uses template: `templates/sage-profile.md`
   - Fills in all sections: Overview, Period, Main Works, Core Ideas, Key Relationships
   - Cross-references related sages using `[[slug]]` syntax
   - Assigns tags: `period:`, `location:`, `speciality:`, `movement:`

3. **Claude proposes database entry**
   ```json
   {
     "id": [next available],
     "label": "Sage Name — Hebrew Name",
     "period": "tannaim" or "rishonim" (etc.),
     "location": "ארץ ישראל" or "ספרד" (etc.),
     "field": "Halacha, Mishnah" (etc.),
     "bio": "[first 2–3 sentences of biography]",
     "era": "[normalized period name]",
     "period_order": [number for timeline sorting],
     "tags": ["period:tannaim", "location:israel", ...]
   }
   ```

4. **You review & approve**
   - Check: Is the biography accurate?
   - Check: Are cross-references correct?
   - Check: Is Hebrew spelling correct?
   - Approve or request changes

5. **Claude inserts into Supabase** (if you approve)
   - Validates that all FK constraints exist (all related sages must be in database)
   - Confirms no duplicate entries
   - Inserts the new sage
   - Creates `sages/<slug>.md` file

### Example Prompt (Copy & Paste)

```
Goal: Add a new sage named Rambam to the network.

Sources: I'm providing his research document (sources/rambam/בנו משה בן מימון.docx)

Constraints:
- Read the docx, do NOT export full text
- Create markdown in sages/rambam.md using the template
- Cross-reference related sages (Maimonides' teachers, students, influences)
- Bilingual labels: "Rambam — הרמב״ם"

Definition of done:
- sages/rambam.md is created and valid
- Database entry is proposed (id, label, period, location, field, bio)
- All cross-references to other sages resolve (no broken [[links]])
- Tags are assigned (period:rishonim, location:egypt, speciality:halacha, movement:mishneh-torah)

Before acting: Explain your plan. Do not insert to Supabase without approval.
```

---

## 🔄 Workflow 2: Generate Lesson Plan for New Sage

**When to use:** You want teaching material for yeshiva students (45-minute class)

### Safe Boundary

**Goal:** Create structured, pedagogical lesson plan in Hebrew + English.

**Constraints:**
- Claude reads the sage's markdown profile + docx source
- Claude does NOT export full research text
- You approve before publishing to website
- Lesson must reference specific sources (tractates, books)

**Definition of done:**
- ✅ 45 minutes of content (5 intro + 30 main + 10 discussion)
- ✅ Learning outcomes stated clearly
- ✅ Discussion questions are thoughtful (not yes/no)
- ✅ References use proper citation (תוספתא, תלמוד בבלי, etc.)
- ✅ Bilingual (Hebrew + English)
- ✅ Saved to `notes/<slug>/lesson_plan.md`

### Steps

1. **You request lesson plan**
   ```
   Create a 45-minute lesson plan for: Rabbi Meir (Tanna)
   
   Goal: Yeshiva high school students (grades 10–12)
   
   Topics to cover:
   - His main contributions (Stam Mishnah)
   - His famous sayings
   - His relationships (Elisha ben Abuyah, disciples)
   - Why he matters today
   ```

2. **Claude outlines structure**
   - Introduction (5 min): Who was Rabbi Meir? Why should we care?
   - Main content (30 min): 3 key segments (each ~10 min)
   - Discussion (10 min): 3–4 provocative questions
   - Closing (optional): Modern relevance

3. **Claude drafts lesson plan**
   - Markdown format with timestamps
   - Bilingual: Hebrew headers + English explanations
   - Specific references: תלמוד בבלי מנחות נח., etc.
   - Activity ideas (pair discussion, textual analysis, etc.)

4. **You review & request changes**
   - Is it age-appropriate?
   - Are the questions engaging?
   - Does it flow well?
   - Revise as needed

5. **Claude finalizes** → `notes/<slug>/lesson_plan.md`

### Example Prompt

```
Goal: Generate a 45-minute lesson plan for Rabbi Meir (Tanna).

Sources: 
- Read: sages/rabbi-meir-tanna.md
- Read: sources/rabbi-meir-tanna/*.docx [extract key facts, not full text]

Constraints:
- Audience: Yeshiva students, grades 10–12
- Do NOT export full research text
- Must cite Talmudic sources correctly (e.g., תלמוד בבלי מנחות נח.)
- Hebrew should use proper grammar + gematria/abbreviations where relevant (גר״ש for abbreviations)

Definition of done:
- Lesson plan has: 5-min intro + 30-min main (3 segments) + 10-min discussion
- 3–4 discussion questions (not yes/no, provoke thinking)
- All Talmudic references are accurate
- File saved to: notes/rabbi-meir-tanna/lesson_plan.md

Before acting: Show me the outline. I'll approve, then you write the full version.
```

---

## 🔄 Workflow 3: Extract Migration Path from Research Document

**When to use:** You want to map a sage's geographic journey

### Safe Boundary

**Goal:** Extract structured migration path (from → to → intermediate cities) from research document.

**Constraints:**
- Claude reads docx, extracts ONLY: place names, dates, reasons for travel
- Claude does NOT export full biography
- Output: Structured JSON (from, to, intermediate, description)
- You approve before inserting to Supabase

**Definition of done:**
- ✅ Migration format is valid JSON: `{"from": "...", "to": "...", "intermediate": [...], "description": "..."}`
- ✅ All places match the 28 standard locations (or are added to `location-coords.js`)
- ✅ Description is 1–2 sentences max
- ✅ Dates are included if available

### Steps

1. **You request migration extraction**
   ```
   Extract migration path for: Rambam
   
   Research document: sources/rambam/בנו משה בן מימון.docx
   
   I need: Where was Rambam born? Where did he travel? Why?
   ```

2. **Claude scans document**
   - Finds location names: Córdoba (birth), Cairo (main residence), etc.
   - Finds reasons: "Forced to flee Almohad persecution," "Sought to study in Acre," etc.
   - Finds dates if available

3. **Claude proposes JSON**
   ```json
   {
     "from": "קורדובה",
     "to": "קהיר",
     "intermediate": ["פס", "אל-מוקטם"],
     "description": "Fled Almohad persecution in Spain (1150s), traveled through North Africa, settled in Egypt as physician"
   }
   ```

4. **You approve & Claude inserts to Supabase**
   - UPDATE sages SET migration_path = '[JSON]' WHERE id = [sage_id]

### Example Prompt

```
Goal: Extract migration path for Rambam from his research document.

Source: sources/rambam/בנו משה בן מימון.docx

Constraints:
- Extract ONLY: place names, travel routes, dates, reasons
- Do NOT export full biography or sensitive personal details
- Use standard location names from location-coords.js (קורדובה, קהיר, etc.)
- If a location is not in the standard list, list it & ask me to confirm

Definition of done:
- JSON is valid & complete
- From/to are clear
- Intermediate cities are listed (if any)
- Description is 1–2 sentences
- All place names are correct (Hebrew spelling)

Format:
{
  "from": "קורדובה",
  "to": "קהיר",
  "intermediate": ["מרוקו"],
  "description": "..."
}

Before acting: Show me the JSON. I'll confirm, then you insert to Supabase.
```

---

## 🔄 Workflow 4: Create Connection Between Sages

**When to use:** You discover that Sage A taught Sage B, or they debated, or influenced each other

### Safe Boundary

**Goal:** Add a link in the D3 network showing relationship between two sages.

**Constraints:**
- Both sages must already exist in database
- Connection type must be one of: student, influence, oppose, colleague, predecessor, teacher, contemporary
- You approve before inserting

**Definition of done:**
- ✅ Both sage IDs exist in Supabase
- ✅ Connection type is valid (from list above)
- ✅ Link appears in D3 graph (visually connects two nodes)
- ✅ Hover shows connection type

### Steps

1. **You request connection**
   ```
   Create connection: Rabbi Meir (teacher) → Judah the Prince (student)
   
   Reason: Meir compiled anonymous Mishnah; Judah codified it into the canon
   ```

2. **Claude validates**
   - Confirms both sages exist in database
   - Confirms connection type is valid
   - Checks for duplicates (don't create the same link twice)

3. **Claude proposes INSERT**
   ```sql
   INSERT INTO connections (source_id, target_id, type)
   VALUES ([meir_id], [judah_id], 'student');
   ```

4. **You approve & Claude executes**

---

## 🔄 Workflow 5: Update Cross-References When Adding New Sage

**When to use:** New sage is added; existing sages mention them

### Safe Boundary

**Goal:** Update markdown files with new `[[cross-references]]` to newly added sage.

**Constraints:**
- Claude only adds `[[slug]]` references where relevant (no spam)
- You review the changes before committing
- Only updates existing markdown files (no deletion)

**Definition of done:**
- ✅ All related sages have `[[new-sage]]` reference in their markdown
- ✅ Cross-references are contextual (not just appended randomly)
- ✅ No broken links

### Example

New sage added: Rashbam

Claude updates:
- `sages/rashi.md` → adds `[[rashbam]]` in "Students" section
- `sages/ramban.md` → adds `[[rashbam]]` in "Contemporaries & debates" section

---

## ⚠️ Critical Safety Rules (Always Follow)

### 🔒 Privacy First (Session 1 pattern)
1. Start read-only
2. Limit sources to what's needed
3. Review before sending, deleting, editing, labeling, moving, or scheduling

### 🔒 Research Documents
- ✅ Claude can: Read, summarize, extract dates/locations/titles
- ❌ Claude cannot: Export full text, archive to external services
- ⚠️ For modern/living sages: Extra caution with biographical details

### 🔒 Data Integrity
- Always validate FK constraints before INSERT
- Check for duplicates in Excel/Supabase
- Confirm period/location are valid (see MEMORY.md for lists)

### 🔒 Bilingual
- All labels must be Hebrew + English: "Rambam — הרמב״ם"
- Abbreviations use gematria: "ר״י" (Rabbi Yitzhak), not "RI"
- Hebrew punctuation: גרשיים for marks (״)

---

## Quick Reference: When to Use Which Workflow

| Task | Workflow | Time | Approval? |
|------|----------|------|-----------|
| Add new sage | #1 | 2–3 hrs | ✅ Yes (before Supabase insert) |
| Create lesson plan | #2 | 1 hr | ✅ Yes (before publish) |
| Extract migration | #3 | 30 min | ✅ Yes (before Supabase update) |
| Create connection | #4 | 15 min | ✅ Yes (before INSERT) |
| Update cross-refs | #5 | 30 min | ✅ Yes (before commit) |

---

## 📞 Contact

Questions about these workflows? Let me know (avraham.gshtein@gmail.com).

For architecture & design questions, see CLAUDE.md.
For project context, see MEMORY.md.

---

**EOF**
