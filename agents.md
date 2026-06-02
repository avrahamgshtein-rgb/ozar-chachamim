# 🤖 agents.md - Safety Ladder & Sub-Agent Rules

**Effective:** 2026-06-02  
**Authority:** Karpathy Principles + OpenAI Safety Ladder  

---

## 🚨 RED LINE (אל יעבור)

These are absolute no-gos. Claude will NOT do these without explicit terminal permission:

```
❌ NEVER - Requires explicit approval in terminal first:
  - Delete any file
  - Run arbitrary Bash commands
  - Force-push to git
  - Change .env or secrets
  - Destructive git operations (reset --hard, etc.)

✅ ALWAYS OK - No permission needed:
  - Read any file
  - Analyze data
  - Suggest improvements
  - Show what changed

⚠️ ALWAYS ASK - Need your Y/N before acting:
  - Commit changes
  - Run npm install
  - Deploy to production
  - Modify database schema
```

---

## 🔐 SECURITY RULES (Mandatory)

### Rule 1: API Keys Never in Source Code
```
❌ WRONG (NEVER):
// .js file or .html:
const SUPABASE_KEY = "sb_published_secret_12345";

✅ RIGHT:
// Use environment variables:
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Define in:
// - Local: .env.local (never commit)
// - Vercel: Settings > Environment Variables (secure)
```

### Rule 2: .env Files Are Sacred
```
🔒 NEVER commit:
  .env
  .env.local
  .env.production
  secrets.json
  Any file with API keys

✅ Always:
  Add to .gitignore
  Use environment variables
  Reference in comments: "See .env.local for VITE_SUPABASE_ANON_KEY"
```

### Rule 3: Word Documents Are Sensitive
```
🔒 NEVER commit:
  *.docx files (too large, binary)
  
✅ Always:
  Store in Supabase Storage (not git)
  Reference by sage_id
  Use mammoth.js to convert on-the-fly
```

---

## 🤖 SUB-AGENT ALLOCATION (Token Efficiency)

When a task arises, use this decision tree:

```
                    Task Arrives
                        |
                        v
            Is it research/filtering
            across 323 sages?
                  /        \
                YES        NO
                /            \
               v              v
         Use Haiku      Use Main Claude
         Sub-Agent      (you, the full model)
         (Fast, cheap)
```

### SUB-AGENT 1: HAIKU (The Filter)

**When to delegate to Haiku:**
- "Search 323 sages for those working on concept X"
- "Extract core_concept from Excel for all Tannaim"
- "Filter sages by region + era"
- "Count connections per sage"
- "Tokenize search query"

**Process:**
```
You: "Find all sages working on חוק ומוסר"
  ↓
Haiku spins up (costs ~5 tokens)
  ├─ Loads Excel/Database
  ├─ Filters rows
  ├─ Deduplicates
  └─ Returns: "Found 12 sages: Rambam, Ramban, ..."
  ↓
You: Continue main conversation (no context bloat)
```

**Token Cost:** ~5-10 tokens per task (vs 100+ for main Claude)

---

### SUB-AGENT 2: PLAN (The Architect)

**When to delegate to Plan:**
- "Design the database schema for research_content table"
- "Plan the refactoring strategy for graph.js"
- "Map the data flow from Supabase to D3"

**Process:**
```
You: "How should we structure the concept search?"
  ↓
Plan Agent:
  ├─ Reads existing code
  ├─ Analyzes data model
  ├─ Designs architecture
  └─ Returns: "Here's the schema + implementation steps"
  ↓
You: Review plan + approve before coding
```

---

### SUB-AGENT 3: MAIN CLAUDE (Strategic)

**What only Main Claude does:**
- Making architectural decisions
- Understanding user intent
- Designing complex algorithms
- Security & ethical reviews
- Final code implementation
- Conversation with you

---

## 📋 CONTEXT HYGIENE PROTOCOL

**The Golden Rule:** Every sub-agent returns exactly ONE line.

```
❌ WRONG - Agent fills chat with noise:
  "I started by reading the Excel file. Then I opened 
   row 1 and found... Actually, let me explain the schema first. 
   The database has... OK so I found 12 matches. Actually 15. 
   Wait, let me recount..."

✅ RIGHT - One line, no fluff:
  "Found 12 sages: Rambam, Ramban, R. Kook, R. Elijah Gaon"
```

**Implementation:**
```javascript
// Haiku sub-agent script:
const results = filterSagesBy(concept);
console.log(`Found ${results.length} sages: ${results.map(s => s.name_he).join(', ')}`);
// Return only this to main chat, nothing else
```

---

## 🔄 WORKFLOW EXAMPLE: Adding Concept Search

### Current State
- Graph shows all 323 sages
- No concept-based filtering
- User can't search by "חוק ומוסר"

### Step 1: Delegate to Haiku
```
You: "Find all sages working on law and ethics concepts"
  ↓
Haiku: "Found 12 sages: Rambam, Ramban, ..."
  ↓
You: "Good. Now I need to implement this in the frontend."
```

### Step 2: Main Claude Designs It
```
You (Main Claude): "Design the search UI for this"
  
Proposal:
  - Add input box to header
  - Call semanticSearch(query)
  - Highlight matching sages on graph
  - Fade non-matching to 0.05 opacity
  
Approve? Y/N
```

### Step 3: Implement (Main Claude)
```
You: "Implement it. Make sure Hebrew search works."
  ↓
Claude codes the search function
  ↓
Claude: "Done. Changed 3 files. Commit? Y/N"
```

---

## ⚡ SLASH COMMANDS (Planned)

### /review (Custom Command)
```
/review

Automatically:
  1. Shows git diff (what changed?)
  2. Scans for API keys in code
  3. Checks .env files aren't committed
  4. Summarizes changes in Hebrew
  5. Asks: "Safe to commit? Y/N"
```

### /plan (Delegate to Plan Agent)
```
/plan "Add demographic data to sages table"

Plan Agent:
  - Analyzes schema
  - Proposes migration
  - Designs data flow
  - Returns implementation steps
```

---

## 🛡️ SAFETY CHECKLIST (Before Each Commit)

**Run `/review` which automatically checks:**

- [ ] No .env files committed
- [ ] No API keys in source code
- [ ] No *.docx files in git
- [ ] node_modules not tracked
- [ ] Only necessary files changed
- [ ] Commit message is clear
- [ ] Hebrew text is UTF-8

**Then you decide:** Commit? Y/N

---

## 📊 TOKEN BUDGETING

### Monthly Estimate (with sub-agents)
```
Main Claude tasks: 80%
  - Architecture decisions
  - Complex coding
  - Strategic planning
  
Haiku sub-agent: 20%
  - Filtering 323 sages
  - Data extraction
  - Text tokenization

Total: ~60% cost reduction vs. all Main Claude
```

---

## 🚨 EMERGENCY PROTOCOLS

**If Claude violates safety rules:**

1. **Stop the action immediately**
2. **Say:** "STOP. Check agents.md line X"
3. **Override:** Claude must revert and ask permission

**If API keys get exposed:**

1. **Delete the branch/commit**
2. **Rotate keys in Supabase immediately**
3. **Update .env.local**
4. **Verify no secrets in git history:**
   ```bash
   git log -p | grep -i "SUPABASE_KEY\|ANON_KEY"
   ```

---

## 🎯 Sub-Agent Activation Checklist

**Is this a good task for Haiku?**
- [ ] It's filtering/searching 323 sages?
- [ ] It needs < 5 minutes to complete?
- [ ] Result is a simple summary (1-10 items)?
- [ ] Token budget is tight?

If YES → Delegate to Haiku

**Is this a good task for Plan?**
- [ ] It requires architectural thinking?
- [ ] I need to map out steps before coding?
- [ ] Schema design or refactoring is involved?
- [ ] I want a second opinion on approach?

If YES → Delegate to Plan

**Otherwise** → Use Main Claude (you)

---

## 🔍 CODE REVIEW STANDARDS

Before Claude commits code:

```javascript
// Quality checklist:
✅ Vanilla JS (no framework bloat)
✅ < 200 lines per function
✅ Hebrew RTL support if UI
✅ No over-engineering
✅ Data-driven (follows 323 sages structure)
✅ Comments explain WHY, not WHAT
✅ No API keys visible
✅ No unnecessary dependencies
```

---

## 📚 References

- **Karpathy, A.** "Software 3.0: Law, Architecture, Safety" (OpenAI Blog)
- **This Repo:** CLAUDE.md (project guidelines)
- **This Repo:** user.md (your preferences)
- **This Repo:** git log (what's been done)

---

## 🎓 Training Sub-Agents

When spawning Haiku or Plan agents, Claude includes this prompt automatically:

```
"You are a specialized sub-agent working on אוצר חכמים.

Rules:
1. CONTEXT HYGIENE: Return exactly one summary line
2. NO NOISE: Don't explain every step, just final result
3. SECURITY: Never suggest committing secrets
4. RESPECT: User is a Torah scholar + developer, not beginner
5. HEBREW: Respond in Hebrew when user does

Your job: Complete this task and report back. Return to main Claude."
```

---

## ✅ VERIFICATION

To confirm agents.md is working:

```bash
# In terminal:
/review

# Should show:
# ✓ agents.md loaded
# ✓ Red lines: [list of violations]
# ✓ Sub-agent allocation: [Haiku vs Plan vs Main]
# ✓ Security check: [API keys hidden?]
```

---

**Last Reviewed:** 2026-06-02  
**Status:** Active & Enforced  
**Authority:** Claude Code Development Practices  

🛡️ **This is binding. Claude will not override these rules.**
