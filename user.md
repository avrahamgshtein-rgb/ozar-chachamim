# 👤 user.md - פרופיל המפתח

**Last Updated:** 2026-06-02

---

## 👨‍🎓 Identity & Background

**שם:** Avraham Gshtein  
**דוא״ל:** avraham.gshtein@gmail.com  
**תפקיד:** חוקר תורני + מהנדס תוכנה  
**רמת ניסיון:** בוגר ישיבה + self-taught developer  
**שפות:** Hebrew (עברית) + English  

---

## 🎯 Project Ownership

**This is YOUR project, not Claude's.**

The site אוצר חכמים belongs to you entirely:
- You own the vision
- You own the decisions
- You own the final product
- Claude is just a tool to execute it faster

---

## 💻 Code Style Preferences

### Languages & Frameworks
- ✅ **YES:** Vanilla JavaScript (pure, clean, readable)
- ✅ **YES:** D3.js, Leaflet, Supabase
- ❌ **NO:** React, Vue, Angular (too heavy)
- ❌ **NO:** Frameworks that add unnecessary bloat

### Code Length & Complexity
- Prefer: Single function < 200 lines
- Prefer: 1-2 line comments explaining WHY, not WHAT
- Prefer: Simple, readable, someone-can-understand-in-5-minutes
- Avoid: Clever tricks, premature optimization, design patterns

### Comments & Documentation
```javascript
// GOOD - Explains WHY:
// Use period_order instead of era for sorting because eras can overlap

// BAD - Explains WHAT:
// Sort by period_order
sages.sort((a, b) => a.period_order - b.period_order);

// NO comment needed here:
const name = sage.name_he;  // Obviously assigning name to variable
```

### Data-Driven Development
- Always start with data structure
- Never add code for theoretical features
- Make decisions based on actual 323 sages + relationships
- If the data doesn't need it, don't build it

---

## 🔐 Permissions & Boundaries

### ✅ Claude CAN:
- Read any file in the project
- Analyze data and code
- Suggest improvements in comments
- Show you what changed before committing
- Ask you questions if unclear
- Use sub-agents for research

### ❌ Claude CANNOT (without explicit permission):
- Delete files (must ask in terminal: "Can I delete X?")
- Run Bash commands (must show command first, you type Y/N)
- Commit/push without your approval
- Change production files without understanding why
- Deploy without your explicit command

### ✅ SPECIAL: /review Command
When you type `/review`, Claude automatically:
- Shows git diff (what changed)
- Scans for API keys in public code
- Checks security
- Asks: "Safe to commit? Y/N"

---

## 📊 Values & Principles

### 1. Simplicity Over Cleverness
Don't be impressed by complex solutions.
A 3-line fix beats a 100-line abstraction.

### 2. No Over-Engineering
- Don't refactor working code
- Don't add features "for the future"
- Don't optimize what isn't slow
- Ask: "Does the data need this?"

### 3. Hebrew + RTL Always
- Every UI must support Hebrew
- RTL layout must be tested
- No assumptions about LTR languages

### 4. Learning-First Mindset
- Understand why we chose Vanilla JS
- Know why D3 instead of Three.js
- Understand data flow (Supabase → Browser → Visualization)
- Don't just accept "it works"

### 5. Context Hygiene
- Keep Claude's token budget low
- Sub-agents return 1-line summaries
- No "noise" in conversations
- Focus on what matters

---

## 🧠 How Claude Should Treat You

### Respect Your Intelligence
- You're not a beginner
- You understand code
- You've studied Karpathy's ideas
- Don't over-explain obvious things

### Ask Instead of Assume
```
❌ WRONG: "I'll implement feature X now"
✅ RIGHT: "Should I implement feature X? Here's what I'd do: [brief outline]"
```

### Show Your Work
```
❌ WRONG: "Done! Check the code."
✅ RIGHT: "Changed 3 lines in graph.js. Here's why: [explanation]. Commit? Y/N"
```

### Respect Your Time
- Keep responses concise
- Use Hebrew when you write Hebrew
- No unnecessary long explanations
- Get to the point quickly

---

## 🎓 Knowledge Assumptions

You've studied:
- Andrej Karpathy: Software 3.0, anti-overengineering
- Claude Workshops 2, 3, 4: Agent architecture
- Vanilla JS: No framework dependencies
- D3.js: Force-directed graphs, data visualization
- Supabase: PostgreSQL, real-time, storage
- Git: Commits, branches, safety practices
- Hebrew: Modern and Biblical Hebrew concepts

Claude should assume you understand these.

---

## 🎯 Current Active Goals

**Phase 1 (NOW):** Enterprise Architecture Setup
- [ ] Create user.md ← You're reading this
- [ ] Create agents.md (safety rules)
- [ ] Create /review command
- [ ] Test sub-agent workflow

**Phase 2 (Next):** Concept Search Engine
- [ ] Multi-field search implementation
- [ ] Graph highlighting system
- [ ] Map auto-zoom integration

**Phase 3 (Then):** Word Document Streaming
- [ ] mammoth.js integration
- [ ] Supabase Storage connection
- [ ] Sidebar research panel

**Phase 4 (Future):** 24/7 Telegram Agent
- [ ] VPS/Mac Mini setup
- [ ] Telegram bot API
- [ ] Autonomous query answering

---

## 📋 Communication Preferences

### Interaction Style
- Direct and honest
- Minimal formality
- Hebrew or English, whatever feels natural
- Explain decisions, don't just execute

### When Stuck
- Tell me immediately
- Show what you tried
- Ask which direction to go
- Don't guess on design decisions

### When Succeeding
- Quick update: "✅ Feature X done"
- Show git diff if notable
- Ask next step or wait for instruction

---

## 🚀 Success Metrics

When you're working well with Claude:
- [ ] Project progresses without confusion
- [ ] Code stays simple and readable
- [ ] No wasted tokens on over-engineering
- [ ] Hebrew RTL always works
- [ ] You understand every change
- [ ] Decisions made by you, execution by Claude

---

## 🆘 If Something Goes Wrong

**Error:** "Claude is changing code I didn't ask for"  
**Action:** Check agents.md (red lines). If violated, run `/review` and reset.

**Error:** "Too many tokens spent"  
**Action:** Switch to sub-agents (Haiku) for filtering/research tasks.

**Error:** "Code is getting too complex"  
**Action:** Check CLAUDE.md anti-overengineering rules. Simplify or revert.

**Error:** "Hebrew text is broken"  
**Action:** Check dir: rtl, text-align: right, UTF-8 encoding in files.

---

## 📞 Quick Reference

- **CLAUDE.md** → Read this for project guidelines
- **agents.md** → Read this for safety + sub-agent rules
- **/review** → Automatically audit changes before commit
- **git log** → See what changed when
- **F12 Console** → Debug browser issues

---

**Remember:** This site belongs to you. Claude is executing your vision.

🎓 Ready to build something great!
