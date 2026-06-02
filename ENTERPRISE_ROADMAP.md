# 🚀 OZAR CHACHAMIM - ENTERPRISE ROADMAP (6 Stages)

**מצב התחיל:** 2026-06-02  
**סטטוס ראשוני:** Tasks A-E Complete + Map Enhancement ✅  
**המטרה:** Platform מוכן-ענן (Vercel) + סוכן אוטונומי 24/7 (Telegram)

---

## 📊 ROADMAP OVERVIEW

```
STAGE 1: "Brain Files" (Local Architecture)
  ✅ CLAUDE.md (הנחיות פרויקט קבועות)
  ⏳ user.md (פרופיל המפתח)
  ⏳ agents.md (חוקי בטיחות + Sub-Agents)
  
STAGE 2: Custom /review Command (Anti-Overengineering)
  ⏳ /review slash command
  ⏳ Git diff analysis
  ⏳ Security scanning (API key detection)
  
STAGE 3: Sub-Agent Workflow (Smart Division of Labor)
  ⏳ Haiku agent for research/filtering
  ⏳ Plan agent for schema design
  ⏳ Context hygiene (one-line summaries)
  
STAGE 4: Concept Search Engine (Semantic Cross-Field)
  ⏳ Multi-field search index
  ⏳ Graph highlighting (opacity 0.05 → 1.0)
  ⏳ Map auto-fly to results
  
STAGE 5: Word Document Streaming (mammoth.js)
  ⏳ Integrate mammoth.js
  ⏳ Supabase Storage connection
  ⏳ Real-time .docx → HTML conversion
  ⏳ Sidebar research panel
  
STAGE 6: 24/7 OpenClaw Telegram Agent
  ⏳ VPS/Mac Mini deployment
  ⏳ Telegram bot API integration
  ⏳ Autonomous query answering
  ⏳ Database cross-referencing
```

---

## 🎯 STAGE 1 DETAIL: "Brain Files" Architecture

### File 1.1: CLAUDE.md ✅ EXISTS
**תוכן:**
- Tech Stack definition
- Project identity
- Core principles (Karpathy)
- File structure
- Current goal (עדכן בכל סשן)

### File 1.2: user.md ⏳ TODO
**יצור בשורש הפרויקט:**

```markdown
# user.md - פרופיל המפתח

## Identity
- **שם:** [Your Name]
- **תפקיד:** חוקר/מהנדס תורני
- **ניסיון:** [בחור ישיבה / בוגר / חוקר]

## Code Style Preferences
- **Language:** Vanilla JavaScript (no frameworks)
- **Commenting:** Minimal (WHY, not WHAT)
- **Patterns:** Simple, readable, under 200 lines per function

## Boundaries
- ✅ Can read and analyze data freely
- ❌ Cannot delete files without explicit permission in terminal
- ❌ Cannot run Bash commands without asking first
- ❌ Cannot commit/push without your approval

## Values
- Prefer simplicity over cleverness
- Data-driven development
- No over-engineering
- Hebrew RTL support always
```

### File 1.3: agents.md ⏳ TODO
**יצור בשורש הפרויקט:**

```markdown
# agents.md - Safety Ladder & Sub-Agent Rules

## Red Line (אל יעבור)
❌ Destructive operations without explicit terminal permission
❌ Running external Bash commands autonomously
❌ Deleting files without "Are you sure?"
✅ Reading/analyzing data
✅ Suggesting changes in comments

## Sub-Agent Allocation

### When to Use Haiku (Fast, Cheap)
- Scanning 323 sages for patterns
- Filtering by era/region/field
- Extracting core_concepts from Excel
- Text tokenization for search index

### When to Use Plan Agent
- Designing database schema
- Planning refactoring strategy
- Mapping out git workflow

### When to Use Main Claude
- Strategic decisions
- Complex code design
- Security & architecture reviews

## Context Hygiene Rule
🧠 Every sub-agent returns exactly ONE line to main chat.
- No "noise" pollution
- No intermediate steps
- Only final summary
```

---

## 🔧 STAGE 2 DETAIL: /review Command

**Create:** `~/.claude/commands/review.md`

**Purpose:** Automatically audit changes before commit

```bash
/review
  ↓
Runs 4 checks:
  1. git diff (what changed?)
  2. Explain in Hebrew (1 line per file)
  3. Security scan (API keys in public code?)
  4. File sanity (no .env, no secrets)
```

**Implementation:**
```bash
#!/bin/bash
echo "🔍 Reviewing changes..."

# 1. Show diff
git diff --stat

# 2. Explain each file
for file in $(git diff --name-only); do
  echo "📄 $file: $(git diff $file | head -20 | tail -1)"
done

# 3. Security scan
grep -r "SUPABASE_KEY\|VITE_SUPABASE" --include="*.js" --include="*.html" | grep -v ".env" && \
  echo "⚠️ WARNING: API key found in source code!" || \
  echo "✅ No API keys in source code"

# 4. Summary
echo "✅ Review complete. Safe to commit? Y/N"
```

---

## 🤖 STAGE 3 DETAIL: Sub-Agent Workflow

### Example: Extracting Core Concepts

```
Main Claude (You):
  "Search all 323 sages for those working on 'חוק ומוסר' (law + ethics)"

  ↓ Delegate to Haiku Sub-Agent

Haiku Agent:
  - Scans Excel file
  - Filters rows where core_concept LIKE '%חוק%' OR '%מוסר%'
  - Returns: "Found 12 sages (Rambam, Ramban, etc.)"

  ↓ Returns to You

Main Claude (Resume):
  "12 sages matched. Building graph visualization..."
```

**Benefits:**
- 💰 Costs 10% of main Claude
- ⚡ Processes faster
- 🧠 Frees your token budget for complex decisions

---

## 🔍 STAGE 4 DETAIL: Concept Search Engine

### Architecture

```
User Input: "רעיון זה"
  ↓
Multi-Field Tokenizer:
  - Search in name_he
  - Search in core_concept
  - Search in tags
  - Search in primary_field
  ↓
Matching Sages Found (e.g., 15 matches)
  ↓
Graph View:
  - Non-matching: opacity 0.05 (faded)
  - Matching: opacity 1.0 (bright)
  ↓
Map View:
  - Auto-fly to first match (if single)
  - Auto-fitBounds (if multiple)
  ↓
Traditions/Ideas Tabs:
  - Filter cards dynamically
```

### Code Integration

```javascript
// In supabase-client.js:
async function conceptSearch(query) {
  const results = {
    byName: sages.filter(s => s.name_he.includes(query)),
    byConcept: sages.filter(s => s.core_concept?.includes(query)),
    byTags: sages.filter(s => s.tags?.includes(query)),
    byField: sages.filter(s => s.primary_field?.includes(query))
  };
  
  // Deduplicate & return
  const allMatching = new Set([
    ...results.byName,
    ...results.byConcept,
    ...results.byTags,
    ...results.byField
  ]);
  
  return {
    sages: Array.from(allMatching),
    stats: {
      byName: results.byName.length,
      byConcept: results.byConcept.length,
      byTags: results.byTags.length,
      byField: results.byField.length
    }
  };
}
```

---

## 📚 STAGE 5 DETAIL: Word Document Streaming

### Architecture

```
Supabase Storage (Research Files)
  ↓ (User clicks sage)
mammoth.js Library
  ↓ (Convert .docx → HTML)
Sidebar Research Panel
  ↓ (Display real-time)
Sage Profile
```

### Installation

```bash
npm install mammoth
```

### Integration in sidebar

```javascript
// In graph.js selectNode():

async function loadResearchDocument(sageId) {
  try {
    // 1. Get file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('research-documents')
      .download(`${sageId}.docx`);
    
    if (error) throw error;
    
    // 2. Convert to HTML using mammoth
    const arrayBuffer = await data.arrayBuffer();
    const result = await mammoth.convertToHtml({arrayBuffer});
    
    // 3. Display in sidebar
    document.getElementById('researchPanel').innerHTML = result.value;
    
  } catch (error) {
    console.error('Research load failed:', error);
    document.getElementById('researchPanel').innerHTML = 
      '<p>מחקר לא זמין</p>';
  }
}
```

### Security Note
```
🔒 שמור על אחסון מאובטח:
  - Use Supabase Storage buckets
  - Enable RLS policies
  - Never expose file URLs in public code
```

---

## 🤖 STAGE 6 DETAIL: 24/7 Telegram OpenClaw Agent

### Architecture

```
Telegram User (בחור ישיבה)
  ↓ (Sends: "מי עבד על חוק ומוסר בתקופת התנאים?")
  ↓
Telegram Bot API
  ↓
Your VPS/Mac Mini (Always On)
  ↓
OpenClaw Agent (Custom GPT-like system)
  ├─ Load Ozar Chachamim Database
  ├─ Query sages by era + concept
  ├─ Cross-reference connections
  ├─ Format response (Torah-appropriate)
  ↓
Return to Telegram
  ↓
User Gets Answer:
  "בתקופת התנאים, רבי עקיבא ורבי שמעון בן יוחאי עבדו..."
```

### Deployment Options

**Option A: Mac Mini (Recommended)**
- Run 24/7 in home
- Full control
- No cloud costs
- Secure + offline-capable

**Option B: VPS (DigitalOcean / Linode)**
- $5/month minimal
- Cloud-based redundancy
- Can scale if needed

**Option C: Raspberry Pi 5**
- $60 one-time
- Low power consumption
- Perfect for persistent local server

### Telegram Bot Setup

```bash
# 1. Create bot with @BotFather on Telegram
# Get: TELEGRAM_BOT_TOKEN

# 2. Create agent script
# Location: ~/ozar-agent/agent.py

# 3. Run on startup (Mac Mini)
# Add to crontab: @reboot python ~/ozar-agent/agent.py
```

### Pseudo-code for Agent Logic

```python
#!/usr/bin/env python3
import os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

async def handle_message(update: Update, context):
    """
    Autonomous agent logic:
    1. Parse user question (Hebrew)
    2. Query Supabase for matching sages
    3. Cross-reference connections
    4. Format Torah-appropriate response
    5. Send to Telegram
    """
    user_query = update.message.text
    
    # Query concept search
    matching_sages = query_concept_search(user_query)
    
    # Enrich with connections
    enriched = add_sage_relationships(matching_sages)
    
    # Format response
    response = format_torah_response(enriched, user_query)
    
    # Send back
    await update.message.reply_text(response)

async def main():
    """Start 24/7 polling for Telegram messages"""
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT, handle_message))
    
    await app.run_polling()

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
```

---

## 🎯 IMPLEMENTATION TIMELINE

### Week 1: Stages 1-2
- [x] Create user.md + agents.md
- [ ] Implement /review command
- [ ] Test security scanning

### Week 2: Stage 3
- [ ] Setup Haiku sub-agent workflow
- [ ] Test context hygiene
- [ ] Measure token savings

### Week 3: Stage 4
- [ ] Build concept search index
- [ ] Implement graph highlighting
- [ ] Test map auto-zoom

### Week 4: Stage 5
- [ ] Install mammoth.js
- [ ] Connect to Supabase Storage
- [ ] Render Word docs in sidebar
- [ ] Test Hebrew text handling

### Week 5-6: Stage 6
- [ ] Setup Telegram bot
- [ ] Deploy to Mac Mini/VPS
- [ ] Implement agent logic
- [ ] User testing + refinement

---

## 🧪 VERIFICATION CHECKLIST

- [ ] All 3 "brain files" exist (CLAUDE.md, user.md, agents.md)
- [ ] /review command works
- [ ] Sub-agents reduce token usage by 40%+
- [ ] Concept search finds sages across all fields
- [ ] Word docs stream in sidebar without lag
- [ ] Telegram bot responds within 5 seconds
- [ ] 24/7 agent doesn't crash for 7+ days

---

## 📞 SUPPORT HIERARCHY

1. Check CLAUDE.md (project guidelines)
2. Check user.md (your preferences)
3. Check agents.md (safety rules)
4. Check git log (what changed?)
5. Run /review (diagnose issues)
6. Check Telegram agent logs (if Stage 6 fails)

---

**Next Action:** Start with STAGE 1 by creating user.md and agents.md

**Status:** Ready to build 🚀
