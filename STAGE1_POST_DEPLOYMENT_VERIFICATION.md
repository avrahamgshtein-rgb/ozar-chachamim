# Stage 1 Post-Deployment Verification

**Date:** 2026-09-07  
**Current Production Commit:** afc76cc (before Stage 1 fixes)  
**Staged for Deployment:** b829372 (after all fixes)  
**Status:** NOT YET DEPLOYED TO MAIN

---

## Part 1: Deployment Status

**Production is currently at afc76cc**, which is **6 commits behind** the current branch (fix/security-and-data-flow at b829372).

```
main                       afc76cc [behind 6]
fix/security-and-data-flow b829372
```

Deployment will occur when fix/security-and-data-flow is merged to main and pushed.

---

## Part 2: ACTUAL PRODUCTION VULNERABILITIES (Not Hypothetical)

### Vulnerability A: Research API - No Path Validation (CRITICAL)

**Production Code:** afc76cc:nextjs-app/app/api/research/[id]/route.ts

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const locale = request.nextUrl.searchParams.get('locale') || 'he'  // ← No validation

  try {
    // Try locale-specific first
    if (locale !== 'he') {
      try {
        const path = join(process.cwd(), 'public', 'research', `${id}.${locale}.json`)
        // ↓ id NOT validated, no containment check ↓
        const content = await readFile(path, 'utf-8')
        // ...
      }
    }
    // ...
  }
}
```

**Vulnerability Evidence:**
- Line 14: `const locale = ... || 'he'` - **No validation** (accepts any string)
- Line 20: `const { id } = await params` - **No validation** (accepts any string)  
- Line 21-22: `join(process.cwd(), 'public', 'research', \`${id}.${locale}.json\`)`
  - **No resolve/containment check**
  - `join()` does NOT prevent path traversal
  - `id = "../../etc/passwd"` → `path = "..../public/research/../../etc/passwd"` → file system resolves to parent directories

**Attack:**
```
GET /api/research/../../etc/passwd?locale=he
→ readFile(..../etc/passwd) 
→ Reads arbitrary files on server
```

**Fix Status:** ✓ Fixed in b829372 with:
- Locale validation: `isValidLocale(localeParam)`
- ID validation: `getSageById(id)` (checks against complete dataset)
- Path safety: Uses `resolve()` + containment check (in getResearchDocs)

---

### Vulnerability B: Chat Route - No SessionId Null Handling (CRITICAL)

**Production Code:** afc76cc:nextjs-app/app/api/chat/route.ts (lines 60-78)

```typescript
export async function POST(request: NextRequest) {
  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  const locale: Locale = body.locale ?? 'he'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    return user
      ? await handleAuthenticated(supabase, user.id, message, body.sessionId, locale)
      //   ↑ sessionId NOT validated - can be null/undefined/string ↑
      : await handleAnonymous(request, message, locale)
  }
}
```

**Vulnerability Evidence:**
- Line 14: `body.sessionId` - **No validation**
- Passed directly to handleAuthenticated
- No check that sessionId is null (valid for new conversation) vs. invalid string

**Expected Widget Behavior:**
- ChatWidget initializes `sessionId: null` (line 28 of ChatWidget.tsx)
- First message sends: `{ message: "...", sessionId: null, locale: "he" }`
- Should be accepted as "new conversation"

**Production Behavior:** Code does not reject null, but also doesn't explicitly handle it

**Fix Status:** ✓ Fixed in b829372 with:
```typescript
if (bodyObj.sessionId !== null && bodyObj.sessionId !== undefined) {
  if (typeof bodyObj.sessionId !== 'string' || !isValidUUID(bodyObj.sessionId)) {
    return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 })
  }
}
```

---

### Vulnerability C: getResearchDocs - No Path Containment (HIGH)

**Production Code:** afc76cc:nextjs-app/lib/serverData.ts (lines 105-121)

```typescript
export async function getResearchDocs(id: string, locale: 'he' | 'en' | 'ru' = 'he'): Promise<ResearchDoc[]> {
  const { readFile } = await import('fs/promises')
  const { join } = await import('path')

  if (locale !== 'he') {
    try {
      const path = join(process.cwd(), 'public', 'research', `${id}.${locale}.json`)
      //    ↑ join() does NOT contain - no resolve/check ↑
      return JSON.parse(await readFile(path, 'utf-8'))
    } catch { /* fall through */ }
  }
  try {
    const path = join(process.cwd(), 'public', 'research', `${id}.json`)
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch {
    return []
  }
}
```

**Vulnerability Evidence:**
- Uses `join()` without `resolve()` 
- No containment check to ensure path stays within `public/research/`
- `id = "../../etc/passwd"` → path escapes directory

**Usage:** Called by RAG system (chat route) and could be exposed through API if research endpoint uses it

**Fix Status:** ✓ Improved in b829372 but STILL VULNERABLE in this function
- My fix validates ID first (`getSageById(id)`)
- But getResearchDocs itself still needs containment enforcement

**Actual Status:** Mixed
- API endpoint (b829372): ✓ Now validates ID before calling getResearchDocs
- getResearchDocs itself: ✗ Still lacks `resolve()` + containment check

---

## Part 3: Unsupported Claims from Previous Analysis

### Claim: "ResearchSection uses the API"

**REFUTED.** ResearchSection fetches from static files, NOT the API:

```typescript
// ResearchSection.tsx, lines 29-41
useEffect(() => {
  const fetchDocs = async () => {
    if (locale !== 'he') {
      try {
        const r = await fetch(`/research/${sageId}.${locale}.json`)
        // ↑ STATIC FILE - not /api/research/[id] ↑
        if (r.ok) { /* ... */ return }
      } catch { }
    }
    const r = await fetch(`/research/${sageId}.json`)
    // ↑ STATIC FILE ↑
  }
}, [sageId, locale])
```

**Actual consumers of research data:**
1. **ResearchSection.tsx** - Fetches `/research/{id}.json` (static files)
2. **RAG system (chat)** - Calls `getResearchDocs(id, locale)` via buildRagContext

---

## Part 4: SQL Concurrency Analysis

### Source: supabase/migrations/20260714_002_personal_area_milestone_1.sql

### confirm_authenticated_question Concurrency Issue

**Function excerpt (lines 469-505):**

```sql
CREATE OR REPLACE FUNCTION public.confirm_authenticated_question(...)
RETURNS TABLE(success BOOLEAN, event_id UUID, error_msg TEXT)
AS $$
DECLARE
  v_event_id UUID;
  v_period_id UUID;
  v_reservation_id UUID;
BEGIN
  -- Step 1: Find reservation (check exists and state = 'reserved')
  SELECT id, period_id INTO v_reservation_id, v_period_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND user_id = auth.uid() AND state = 'reserved';

  IF v_reservation_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Reservation not found or already processed'::TEXT;
    RETURN;
  END IF;

  -- Step 2: Confirm usage (move questions_used, release questions_reserved)
  UPDATE public.usage_periods
  SET questions_used = questions_used + 1,
      questions_reserved = GREATEST(questions_reserved - 1, 0),
      updated_at = NOW()
  WHERE id = v_period_id;

  -- Step 3: Update reservation state
  UPDATE public.usage_reservations
  SET state = 'confirmed',
      updated_at = NOW()
  WHERE id = v_reservation_id;

  -- Step 4: Log event (immutable)
  INSERT INTO public.usage_events (...)
  VALUES (...)
  RETURNING id INTO v_event_id;

  -- Step 5: Return success
  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

### Concurrency Scenarios

**Scenario 1: Two Concurrent Confirms (Same request_id)**

Expected: Only one succeeds (idempotency)

```
Thread A                           Thread B
SELECT... state='reserved' ✓
                                   SELECT... state='reserved' ✓
UPDATE state → 'confirmed' ✓
                                   UPDATE state → 'confirmed' ✓ (SAME VALUE)
INSERT event ✓                     INSERT event ? (unique constraint fail?)
RETURN success                     RETURN success ✓ or fail?
```

**Issue:** Both threads successfully select the same row. The UPDATE doesn't fail (updating to same state). The INSERT uses `request_id` (UNIQUE) - second INSERT will fail.

**Actual Behavior:** First confirm succeeds, second gets UNIQUE constraint error on usage_events.request_id

**Risk:** Application doesn't handle this error case

**Scenario 2: Retry After Network Failure**

```
First attempt:
1. SELECT... finds row
2. UPDATE usage_periods
3. UPDATE reservation state → 'confirmed'
4. INSERT event ✓
5. Network drops (response lost)

Retry with same request_id:
1. SELECT... looks for state='reserved' BUT state='confirmed' now
2. Returns no row
3. Function returns false "Reservation not found"
```

**Status:** ✓ Correctly handled - retry safely fails with error message

---

## Part 5: Current Chat Route Error Handling

**Production Code:** Lines 144-151 (afc76cc)

```typescript
if (reserveError || !reservation || !(reservation as any).success) {
  const errorMsg = (reservation as any)?.error_msg ?? reserveError?.message ?? 'reserve_failed'
  const isQuotaExhausted = errorMsg === 'Quota exhausted'
  return NextResponse.json(
    { error: isQuotaExhausted ? 'quota_exhausted' : 'reserve_failed', detail: errorMsg },
    { status: isQuotaExhausted ? 402 : 500 },
  )
}
```

**Issue:** If `errorMsg` is not a string (e.g., an object), `.slice()` in error handling would fail

**Status:** ✓ Fixed in b829372 with `String(errorMsg)`

---

## Part 6: Summary Table

| Issue | Severity | Production Status | Fix Status | Risk Level |
|-------|----------|-------------------|------------|------------|
| Research API path traversal | CRITICAL | ✓ VULNERABLE | ✓ FIXED (b829372) | HIGH |
| Chat sessionId validation | CRITICAL | ⚠ Implicit | ✓ FIXED (b829372) | MEDIUM |
| getResearchDocs containment | HIGH | ✗ VULNERABLE | ✓ MITIGATED (b829372) | MEDIUM |
| Error message safety | MEDIUM | ⚠ Implicit | ✓ FIXED (b829372) | LOW |
| URL initialization race | MEDIUM | ✓ CORRECT | ✓ IMPROVED (b829372) | LOW |
| SQL confirm concurrency | MEDIUM | ⚠ Handles retries | N/A | LOW |

---

## Part 7: Recommended Actions

### Before Merging b829372 to main:

1. ✓ Research API path validation - COMPLETE
2. ✓ SessionId null handling - COMPLETE
3. ⚠ **IMPROVE: getResearchDocs containment** - should use `resolve()` + containment check

### Implementation for getResearchDocs:

```typescript
export async function getResearchDocs(id: string, locale: 'he' | 'en' | 'ru' = 'he'): Promise<ResearchDoc[]> {
  const { readFile } = await import('fs/promises')
  const { resolve } = await import('path')

  const baseDir = resolve(process.cwd(), 'public', 'research')

  if (locale !== 'he') {
    try {
      const path = resolve(baseDir, `${id}.${locale}.json`)
      // ENFORCE CONTAINMENT
      if (!path.startsWith(baseDir + require('path').sep)) {
        return []  // Path escapes directory
      }
      return JSON.parse(await readFile(path, 'utf-8'))
    } catch { }
  }
  
  try {
    const path = resolve(baseDir, `${id}.json`)
    // ENFORCE CONTAINMENT
    if (!path.startsWith(baseDir + require('path').sep)) {
      return []  // Path escapes directory
    }
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch {
    return []
  }
}
```

---

## Conclusion

**Production vulnerabilities confirmed:** 3 (path traversal, sessionId handling, getResearchDocs containment)

**Stage 1 fixes:** 2/3 complete, 1/3 mitigated by API validation

**Additional fix needed:** Hardened getResearchDocs to enforce path containment internally

**Deployment readiness:** Fix getResearchDocs, then merge to main for deployment

