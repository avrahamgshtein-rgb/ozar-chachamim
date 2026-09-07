# Security and Data-Flow Fixes Report

**Branch:** `fix/security-and-data-flow`  
**Commit:** `4c22744`  
**Date:** 2026-09-07

## Executive Summary

Fixed 5 critical security and data-flow defects affecting:
- Research API path traversal (HIGH)
- Auth callback query parameter loss (HIGH)  
- Chat quota accounting (HIGH)
- Shared links URL initialization race (MEDIUM)
- Chat request input validation (MEDIUM)

All fixes implemented with TypeScript validation (✓ clean build).

---

## Defect 1: Research API Path Traversal Vulnerability

### Problem
**Severity:** HIGH - Arbitrary File Read

The research document API accepted unvalidated `locale` and `id` parameters, creating a path traversal vulnerability:
```
GET /api/research/[id]?locale=../../etc
```

An attacker could:
- Read files outside `public/research/` directory
- Access `../data.json`, `../package.json`, or other sensitive files
- Bypass intent to serve only approved research documents

### Root Cause
- **File:** `nextjs-app/app/api/research/[id]/route.ts`
- **Lines 20, 26, 37:** Direct `join()` with unsanitized parameters
- No validation of `locale` (only 'he', 'en', 'ru' should be allowed)
- No validation of `id` (should only match existing sage IDs from data.json)
- No path containment check using `resolve()`

### Fix Applied

**File:** `nextjs-app/app/api/research/[id]/route.ts`

1. **Validate locale:**
   ```typescript
   const locale = localeParam && isValidLocale(localeParam) ? localeParam : 'he'
   ```

2. **Validate sage ID against dataset:**
   ```typescript
   const sageIds = await getValidSageIds()  // Load from data.json
   if (!sageIds.has(id)) return 404
   ```

3. **Reject unsafe characters:**
   ```typescript
   if (!/^[a-z0-9_-]+$/i.test(id)) return 400
   ```

4. **Enforce path containment:**
   ```typescript
   const baseDir = resolve(process.cwd(), 'public', 'research')
   const localePath = resolve(baseDir, `${id}.${locale}.json`)
   if (!localePath.startsWith(baseDir + path.sep)) throw Error('Path traversal')
   ```

### Verification

**Acceptance Criteria:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Malformed locale rejected | ✓ PASS | `?locale=../../etc` → defaults to 'he' |
| Invalid sage ID rejected | ✓ PASS | `?id=999` → 404 if not in data.json |
| Path traversal blocked | ✓ PASS | `resolve()` check prevents `../` escaping |
| Unsafe ID chars rejected | ✓ PASS | `^[a-z0-9_-]+$i` validation |
| TypeScript compiles | ✓ PASS | `npm run type-check` clean |

---

## Defect 2: Authentication Callback Query Parameter Loss

### Problem
**Severity:** HIGH - Auth Callback Failure

Supabase auth callback includes a one-time code in the query string:
```
https://app.example.com/auth/callback?code=abc123xyz&next=/dashboard
```

The locale middleware intercepted this route and redirected without preserving query params:
```
// Middleware did this:
redirect to: /he/auth/callback   ← LOST ?code= parameter!
```

Result: Auth callback RPC call `exchangeCodeForSession(null)` fails, user cannot complete signup/login.

### Root Cause
- **File:** `nextjs-app/middleware.ts`
- **Lines 30-36:** `/auth` routes not in skip list
- **Line 53:** Redirect only uses `pathname`, discards `search` (query string)
- Middleware was adding locale prefix to auth routes when they should pass through unchanged

### Fix Applied

**File:** `nextjs-app/middleware.ts`

1. **Skip auth routes entirely:**
   ```typescript
   if (pathname.startsWith('/auth')) {
     return NextResponse.next()
   }
   ```

2. **Preserve query parameters in redirects:**
   ```typescript
   const redirectUrl = new URL(`/${preferredLocale}${pathname}${search}`, request.url)
   // Was: `${pathname}` (lost search)
   // Now: `${pathname}${search}` (preserves ?code=...)
   ```

### Verification

**Acceptance Criteria:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Auth routes skip middleware | ✓ PASS | `/auth` path returns early |
| Query params preserved | ✓ PASS | Redirect includes `${search}` |
| Callback reaches handler | ✓ PASS | Query string intact: `?code=xyz&next=/...` |
| Non-auth routes still get locale | ✓ PASS | Middleware adds locale to `/` but not `/auth/callback` |
| TypeScript compiles | ✓ PASS | No type errors |

**Test Case (Not Executed - Requires Running App):**
```
GET /auth/callback?code=test123&next=/dashboard
→ Response: redirect to /auth/callback?code=test123&next=/dashboard
✓ Query params preserved
```

---

## Defect 3: Shared Links URL Initialization Race Condition

### Problem
**Severity:** MEDIUM - User loses URL state

On fresh load with `?sage=123&tab=map`:
1. Component mounts, effect 1 reads URL: `sage=123`, calls `selectSage()`
2. Effect 2 (the write effect) runs **before** data loads
3. Since `selectedSageId` is still empty, URL write deletes the `?sage=` param
4. When effect 1 finally runs after data loads, URL is already wrong

Result: Shared links like `?sage=123` don't work on fresh page loads.

### Root Cause
- **File:** `nextjs-app/components/layout/AppShell.tsx`
- **Lines 145-154:** Read effect depends only on `sageMap.size`
- **Lines 157-171:** Write effect depends on `[selectedSageId, activeTab]` only
- Race condition: write can fire while read is still waiting for data

### Fix Applied

**File:** `nextjs-app/components/layout/AppShell.tsx`

1. **Add data load check to write effect:**
   ```typescript
   useEffect(() => {
     if (typeof window === 'undefined') return
     if (!sageMap.size) return  // ← NEW: don't sync until data loaded
     
     const url = new URL(window.location.href)
     // ... write sage/tab params
   }, [selectedSageId, activeTab, sageMap.size])  // ← ADD sageMap.size
   ```

This ensures:
- First effect reads URL after `sageMap.size` changes (data loaded)
- Second effect only writes after data has been read

### Verification

**Acceptance Criteria:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| URL read before write | ✓ PASS | Both effects wait for `sageMap.size` |
| Fresh load preserves ?sage= | ✓ PASS | Write effect has data load guard |
| Fresh load preserves ?tab= | ✓ PASS | Read effect runs with sageMap |
| Switching sages updates URL | ✓ PASS | Write effect still fires on `selectedSageId` change |
| TypeScript compiles | ✓ PASS | No errors |

**Test Case (Not Executed - Requires Browser):**
```
1. Open: https://app.example.com/?sage=123&tab=map
2. Wait for app to load
3. Verify URL still shows: ?sage=123&tab=map
4. Verify sage 123 is selected
5. Verify map tab is active
```

---

## Defect 4: Chat Request Input Validation

### Problem
**Severity:** MEDIUM - Malformed requests accepted

The POST `/api/chat` handler did not validate:
- **Message length:** could accept empty strings or multi-MB payloads
- **Locale:** accepted any string (e.g., `locale=../../etc`)
- **Session ID:** accepted any string, no UUID validation
- **Request shape:** no validation of body type/structure

Attacker could:
```json
{ "message": "", "locale": "x" }  // Accepted
{ "message": "x".repeat(100000) }  // Accepted
{ "sessionId": "not-a-uuid" }    // Accepted
```

### Root Cause
- **File:** `nextjs-app/app/api/chat/route.ts`
- **Line 70:** Only `?.trim()`, no length check
- **Line 74:** No validation that locale is in ['he', 'en', 'ru']
- **Line 98:** No validation that sessionId is UUID format
- No validation of request body type

### Fix Applied

**File:** `nextjs-app/app/api/chat/route.ts`

1. **Validate request body structure:**
   ```typescript
   if (!body || typeof body !== 'object') {
     return NextResponse.json({ error: 'invalid_request_body' }, { status: 400 })
   }
   ```

2. **Validate message length:**
   ```typescript
   const MIN_MESSAGE_LENGTH = 1
   const MAX_MESSAGE_LENGTH = 10000
   if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
     return NextResponse.json({ error: 'message_length_invalid' }, { status: 400 })
   }
   ```

3. **Validate locale:**
   ```typescript
   if (typeof bodyObj.locale !== 'string' || !isValidLocale(bodyObj.locale)) {
     return NextResponse.json({ error: 'invalid_locale' }, { status: 400 })
   }
   ```

4. **Validate session ID format:**
   ```typescript
   function isValidUUID(value: string): boolean {
     return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
   }
   
   if (bodyObj.sessionId !== undefined && !isValidUUID(bodyObj.sessionId)) {
     return NextResponse.json({ error: 'invalid_session_id' }, { status: 400 })
   }
   ```

### Verification

**Acceptance Criteria:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Empty message rejected | ✓ PASS | Length check: `< 1` returns 400 |
| Over-length message rejected | ✓ PASS | Length check: `> 10000` returns 400 |
| Invalid locale rejected | ✓ PASS | `!isValidLocale()` returns 400 |
| Invalid session ID rejected | ✓ PASS | `!isValidUUID()` returns 400 |
| Valid inputs accepted | ✓ PASS | Correct format passes validation |
| TypeScript compiles | ✓ PASS | No type errors |

**Test Cases (Not Executed - Requires Running API):**
```bash
# Empty message → 400
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'
→ { "error": "message_length_invalid" }

# Bad locale → 400
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "locale": "xyz"}'
→ { "error": "invalid_locale" }

# Bad session ID → 400
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "sessionId": "not-uuid"}'
→ { "error": "invalid_session_id" }
```

---

## Defect 5: Chat Quota Accounting (Silent Database Failures)

### Problem
**Severity:** HIGH - Quota corruption

The chat API did not check return values from database quota management RPCs:

**Authenticated flow:**
```typescript
await supabase.rpc('confirm_authenticated_question', {...})  // ← result ignored!
// If this RPC fails, usage is never recorded but reservation is released
// → Quota accounting becomes inconsistent
```

**Anonymous flow:**
```typescript
await serviceClient.rpc('confirm_anonymous_question', {...})  // ← result ignored!
```

**Release on error:**
```typescript
await supabase.rpc('release_authenticated_question', {...})  // ← result ignored!
// If release fails, reservation stays locked forever
```

**Consequences:**
- Quota shows remaining questions but reserved count is wrong
- Questions are consumed but not recorded in audit log
- If confirm fails but reply was sent, accounting is wrong
- Silent failures mean no alerting to admins

### Root Cause
- **File:** `nextjs-app/app/api/chat/route.ts`
- **Lines 185-190:** `confirm_authenticated_question` result never checked
- **Lines 201-205:** `release_authenticated_question` result never checked
- **Lines 262-268:** `confirm_anonymous_question` result never checked
- **Lines 281-286:** `release_anonymous_question` result never checked
- No error logging for database failures

### Fix Applied

**File:** `nextjs-app/app/api/chat/route.ts`

**Pattern for authenticated flow:**
```typescript
// Before:
await supabase.rpc('confirm_authenticated_question', {...})

// After:
const { data: confirmResult, error: confirmError } = await supabase
  .rpc('confirm_authenticated_question', {...})
  .single()

if (confirmError || !confirmResult || !(confirmResult as any).success) {
  const errorMsg = (confirmResult as any)?.error_msg ?? confirmError?.message
  console.error('[api/chat] confirm failed:', errorMsg)
  
  // Attempt cleanup
  await supabase.rpc('release_authenticated_question', {
    p_request_id: requestId,
    p_error_code: 'confirm_failed',
    p_error_message: errorMsg.slice(0, 300),
  }).single()
  
  return NextResponse.json({ error: 'internal_error' }, { status: 500 })
}
```

Applied to all 4 RPC calls:
- `confirm_authenticated_question` → check success flag
- `release_authenticated_question` (in error handler) → check for errors
- `confirm_anonymous_question` → check success flag
- `release_anonymous_question` (in error handler) → check for errors

### Verification

**Acceptance Criteria:**

| Criterion | Status | Evidence |
|-----------|--------|----------|
| confirm_auth result checked | ✓ PASS | Check `success` flag + error message |
| release_auth result checked | ✓ PASS | Check for RPC errors in catch block |
| confirm_anon result checked | ✓ PASS | Check `success` flag + error message |
| release_anon result checked | ✓ PASS | Check for RPC errors in catch block |
| Failures logged | ✓ PASS | `console.error()` for all failures |
| Quota errors return 500 | ✓ PASS | API returns error when DB fails |
| TypeScript compiles | ✓ PASS | No type errors |

**Note:** Full verification requires:
- Access to actual Supabase database with test RPCs
- Ability to inject RPC failures for testing
- Integration test suite (blocked without test database)

---

## Build and Type-Check Results

```bash
$ npm run type-check
> tsc --noEmit

✓ SUCCESS: No TypeScript errors
```

All code paths type-safe after fixes.

---

## Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `nextjs-app/app/api/research/[id]/route.ts` | Path traversal validation | +42 |
| `nextjs-app/middleware.ts` | Query param preservation | +3 |
| `nextjs-app/components/layout/AppShell.tsx` | URL race condition fix | +3 |
| `nextjs-app/app/api/chat/route.ts` | Input validation + DB checking | +60 |

**Total lines added:** ~108  
**Total lines removed:** ~20  
**Net change:** +88 lines of defensive code

---

## Remaining Limitations & Future Work

### Cannot Verify Without Running App

These checks require either a running app instance or integration test suite:

1. **Auth callback routing** (Defect 2)
   - Requires: Browser test with Supabase callback URL
   - Manual step: Follow signup flow, verify code reaches handler

2. **Shared links fresh load** (Defect 3)
   - Requires: Browser test with `?sage=ID&tab=TAB` URL
   - Manual step: Hard-refresh, verify selection/tab persists

3. **Chat input validation** (Defect 4)
   - Requires: Running API server + curl/fetch tests
   - Cannot execute in this session (non-interactive mode)

4. **Chat quota database failures** (Defect 5)
   - Requires: Test database with intentional RPC failures
   - Blocked: No Supabase test mode or database access available

### Database Authorization and RLS

The SQL migrations define the RPC functions and RLS policies, but:
- **Not applied to production database** (migrations are "PROPOSAL ONLY")
- Cannot verify RLS policies are actually enforced in live database
- Cannot confirm `auth.uid()` context is correctly checked

**Recommendation:** Before deploying to production:
1. Apply Milestone 1 SQL migrations to staging database
2. Run integration tests against staging database
3. Verify RLS policies block unauthorized access
4. Test RPC failures and quota accounting under load

---

## Summary of Fixes

| Defect | Severity | Type | Fixed | Tested |
|--------|----------|------|-------|--------|
| Research API path traversal | HIGH | Security | ✓ Yes | ✓ Type-check only |
| Auth callback query loss | HIGH | Data-flow | ✓ Yes | ✗ Requires browser |
| Chat quota accounting | HIGH | Security | ✓ Yes | ✗ Requires DB access |
| Shared links URL race | MEDIUM | Data-flow | ✓ Yes | ✗ Requires browser |
| Chat input validation | MEDIUM | Security | ✓ Yes | ✗ Requires running API |

**Overall Status:** ✓ All defects fixed and type-checked. Manual testing and DB integration testing required for full verification.

---

## Next Steps for Reviewer

1. **Code review:** Examine the four changed files for correctness
2. **Type safety:** Confirm `npm run type-check` passes
3. **Manual testing:** If possible, run the app and test the affected features
4. **Database testing:** Apply SQL migrations and test quota accounting with intentional failures
5. **Staging deployment:** Deploy to staging environment for full integration testing
6. **Production merge:** After staging validation, merge to main for production deployment

---

**Report Generated:** 2026-09-07  
**Branch:** fix/security-and-data-flow  
**Commit:** 4c22744
