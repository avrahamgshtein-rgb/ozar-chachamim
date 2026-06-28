# 🔍 DEBUG INSTRUCTIONS - בדיקה מדוקדקת

**בדוק את כל זה כדי להבין מה קורה בדיוק:**

---

## 1️⃣ **תסתכל ב-Browser Console (F12)**

**כשאתה מעמיס את הדף:**
```
צריך לראות:
✅ 🌐 [Supabase] Connecting...
✅ 📚 Loading sages from Supabase...
✅ [AppInit] Single Source Ready: XXX nodes
✅ ✓ Nodes created with hover handlers
```

אם אתה רואה **שגיאות אדומות** - תיעד אותן בדיוק!

---

## 2️⃣ **כשאתה לוחץ על עיגול בגרף:**

בדוק את ה-console - צריך לראות:
```
🖱️ CLICKED on: [שם החכם] (ID: X)
```

**אם זה לא מופיע:**
- ❌ הקליק לא מגיע כלל
- ❌ צריך לתקן את handler של קליק

**אם זה מופיע:**
- ✅ הקליק עובד
- אבל אם לא נפתח פאנל, צריך לראות:
  ```
  📌 Opening FloatingPanel for [שם]...
  ```
  או
  ```
  ❌ FloatingPanel not initialized!
  ```

---

## 3️⃣ **בדוק אם FloatingPanel קיים:**

כתוב בקונסול (Ctrl+Shift+J):
```javascript
console.log('FloatingPanel:', window.FloatingPanel);
console.log('MobileCard:', window.MobileCard);
console.log('graphData:', window.graphData);
console.log('sageMap:', window.graphData?.sageMap);
```

**צריך לראות:**
- `FloatingPanel: { showPanel: ƒ, hidePanel: ƒ }`
- `MobileCard: { show: ƒ, hide: ƒ }`
- `graphData: { nodes: Array(323), links: Array(25), sageMap: Map }`
- `sageMap: Map(323)`

**אם משהו `undefined` או `null`:**
- 🔴 זו בעיה קריטית! צריך להתקן!

---

## 4️⃣ **בדוק אם הטאבים משתנים:**

כשאתה לוחץ על טאב, צריך לראות בקונסול:
```
📑 Switching to tab: [שם הטאב]
   Found X views, removing active from all...
   ✓ Activated view: [שם]-view
```

**אם לא רואה את זה:**
- ❌ הקליק לא מגיע לפונקציית switchTab
- בדוק אם כפתורי הטאבים מחוברים כראוי

**אם רואה את זה אבל הטאבים לא משתנים:**
- ❌ CSS בעיה - .view.active לא עובד כתקין
- צריך לבדוק את ה-CSS

---

## 5️⃣ **בדוק את view HTML:**

בקונסול:
```javascript
// בדוק כל view
document.querySelectorAll('.view').forEach(v => {
  console.log(v.id, 'active:', v.classList.contains('active'));
});
```

**צריך לראות:**
```
network-view active: true
table-view active: false
map-view active: false
comparator-view active: false
research-view active: false
about-view active: false
```

**אם יותר מאחד `true`:**
- 🔴 בעיה קריטית! טאבים משתתפים!

---

## 6️⃣ **בדוק CSS של views:**

בקונסול:
```javascript
const view = document.getElementById('network-view');
console.log('Display:', window.getComputedStyle(view).display);
console.log('Visibility:', window.getComputedStyle(view).visibility);
```

צריך:
- `Display: flex` (כשפעיל) או `none` (כשלא פעיל)

---

## 📝 **תרשום בדיוק מה אתה רואה ותשלח לי:**

```
1. כשמעמיס את הדף - מה רואה בקונסול?
2. כשלוחץ על עיגול - רואה "🖱️ CLICKED"?
3. כשלוחץ על עיגול - נפתח פאנל?
4. כשלוחץ על טאב - רואה "📑 Switching to tab"?
5. כשלוחץ על טאב - התצוגה משתנה?
6. כשמריץ את ה-check של views - כמה `active: true`?
```

**תעשה את כל הבדיקות האלה ותשלח לי את התוצאות בדיוק!**
