# 🔬 Research Content Integration - Final Setup

## ✅ What's Done
- Extract script created: `extract_research.py`
- 54 Word files found, 10 matched to sages
- Database schema updated with RLS policy

## ⚠️ One Manual Step Required

**Go to Supabase SQL Editor:**
1. Open: https://app.supabase.com → Your Project → SQL Editor
2. **Paste this SQL:**
```sql
CREATE POLICY "anyone_insert_research" ON public.research_content
FOR INSERT WITH CHECK (true);
```
3. **Click: RUN**

## 🚀 Then Run This

```bash
python extract_research.py
```

This will:
- Extract text from 10 Word files
- Upload to `research_content` table
- Match to sages: אלישע וישליצקי, יצחק אבוהב, לוי סעדיה נחמני, and 7 more

## ✨ Result

When you click on any matching sage in the graph:
- **Sidebar shows**: 📖 Research section
- **Contains**: Full text (1,500-7,000 words per sage)
- **Searchable**: Full-text search across research documents

---

**Sages with research ready:**
1. הרב אלישע וישליצקי (3,851 words)
2. הרב יצחק אבוהב (3,845 words)
3. הרב לוי סעדיה נחמני (1,484 words)
4. הרב מרדכי שרעבי (7,152 words)
5. רבי רפאל משה לוריא (3,279 words)
6. רבי אלעזר אזכרי (1,497 words)
7. יעקב בן אשר (1,932 words)
8. רבנו בחיי אבן פקודה (2,807 words)
9. רבנו גרשום מאור הגולה (2,014 words)
10. פילון האלכסנדרוני (4,115 words)

---

**Next Phase (Phase 5):**
- Improve name matching for remaining 44 Word files
- Add timeline view by era
- PDF export of profiles

