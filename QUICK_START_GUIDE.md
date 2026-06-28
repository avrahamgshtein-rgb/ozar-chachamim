# 🚀 Quick Start — Filtering & Highlighting

## What Works Now? ✅

When you select filters, the graph responds with:

| Feature | Effect |
|---------|--------|
| **Gold Stroke** | 3px golden border around matching nodes |
| **Glow Effect** | Soft yellow halo around highlighted nodes |
| **Opacity** | Non-matching nodes fade to 10% (ghosted) |
| **Clustering** | Matching nodes move to center |
| **Edges** | Only connections between matches show bright |

---

## How to Use

### 1. 📖 Select a Filter

Click "⚙️ מסננים" to expand filters on the left sidebar.

Choose from:
- **תקופה** (Era) — בית שני, תנאים, ראשונים, וכו'
- **אזור** (Region) — ירושלים, ספרד, ארץ ישראל, וכו'
- **תחום** (Field) — הלכה, קבלה, מוסר, וכו'

### 2. ⚡ Watch the Magic

As soon as you select:
1. **Matching circles** get **gold stroke + glow**
2. **Other circles** fade to ghosted
3. **Matching circles** smoothly move to **center**
4. **Edges** between matches light up

### 3. 🔄 Reset Everything

Click the "🔄 reset" button to:
- Remove all gold highlighting
- Return all nodes to full brightness
- Graph spreads back out

---

## Examples

### Example 1: Second Temple Sages
```
Filter: בית שני (Era)
Result:
  • 9 circles with gold stroke + glow
  • Cluster in the center
  • All other circles ghosted (10% visible)
  • Show only connections between those 9
```

### Example 2: Halakha Scholars
```
Filter: הלכה (Field)
Result:
  • 186 circles with gold stroke + glow
  • Large cluster in center
  • Show connections between them
```

### Example 3: Jerusalem Sages
```
Filter: ירושלים (Region)
Result:
  • All Jerusalem sages highlighted
  • Cluster in center
  • Show their network
```

---

## Testing Checklist

- [ ] Open http://localhost:8080
- [ ] Click "⚙️ מסננים" to expand filters
- [ ] Select "בית שני" from תקופה dropdown
  - [ ] 9 circles get **gold stroke + glow**
  - [ ] 355 circles **fade to 10%**
  - [ ] 9 circles **move to center**
- [ ] Select "הלכה" from תחום dropdown
  - [ ] 186 circles get gold highlighting
  - [ ] 178 circles fade
- [ ] Select a region from אזור dropdown
  - [ ] Matching region sages light up
- [ ] Click **reset button**
  - [ ] All highlighting disappears
  - [ ] Nodes return to full opacity
  - [ ] Graph spreads back out

---

## Common Questions

**Q: Why don't I see highlighting?**
A: Make sure you:
1. Clicked "⚙️ מסננים" to expand filters
2. Selected a value from dropdown (not empty)
3. Check browser console (F12) for errors

**Q: Can I combine filters?**
A: Yes! Select era AND field AND region together.

**Q: How to clear filters?**
A: Click "🔄 reset" button.

---

**Ready to test? Go to http://localhost:8080 and enjoy! 🌟**
