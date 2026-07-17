# אוצר חכמים — Milestone 1: Security & Data-Minimization Revision

**Date:** July 14, 2026  
**Version:** 2.0 (Security Audit Complete)  
**Status:** Revised Proposal (No Remote Migration Applied)

---

## EXECUTIVE SUMMARY: CRITICAL ISSUES FOUND & FIXED

### Issues Found in v1.0

| Issue # | Severity | Issue | v1.0 Status | Fixed in v2.0 |
|---------|----------|-------|-----------|---|
| 1 | CRITICAL | Functions accept arbitrary `p_user_id` from browser | ❌ Vulnerable | ✅ Split functions: authenticated-only use `auth.uid()` |
| 2 | CRITICAL | No trigger-based profile creation; INSERT RLS allows client creation | ❌ Risky | ✅ Added trigger + disabled client INSERT |
| 3 | HIGH | No function security definitions (SECURITY INVOKER vs DEFINER) | ❌ Undefined | ✅ Matrix with SECURITY INVOKER, search_path, REVOKE/GRANT |
| 4 | HIGH | Mixed RPC access models (unclear which functions for browser vs server) | ❌ Ambiguous | ✅ Explicit Model A (auth users) vs Model B (server-only) |
| 5 | HIGH | Anonymous session lookup via plain UUID (no token in lookup) | ⚠️ Partial | ✅ Complete lifecycle: raw token → hash → cookie lookup |
| 6 | HIGH | Unnecessary user_profiles columns bloat MVP | ⚠️ Bloat | ✅ Remove 5 columns; keep only: id, display_name, email_verified, language, theme |
| 7 | HIGH | Vague retention policy (all "indefinite") | ❌ Unclear | ✅ Granular: 30-90 days (anon), 90 days (linked), 24 months (events), indefinite (profiles) |
| 8 | HIGH | No DB constraint preventing multiple registered trials | ⚠️ App logic only | ✅ UNIQUE partial index on trial_grants or dedicated table |
| 9 | HIGH | Idempotency key supplied at confirm time, not reserve time | ⚠️ Incomplete | ✅ request_id required at reserve, checked concurrently |
| 10 | MEDIUM | Token/cost fields allow DECIMAL precision loss | ⚠️ Risky | ✅ NUMERIC(15,8) for cost, BIGINT for tokens, nullable in MVP |
| 11 | MEDIUM | No adversarial test suite | ❌ Missing | ✅ 20 security + abuse tests provided |
| 12 | LOW | Rollback requires manual testing | ⚠️ Partial | ✅ Rollback tested in security test suite |

---

## PART 1: RESOLVED ISSUES & CHANGES

### Issue #1: Function Authorization (CRITICAL)

**Problem:** Functions accept `p_user_id UUID` from browser, allowing users to spoof quota checks for other users.

**v1.0 Code (Vulnerable):**
```sql
CREATE FUNCTION public.reserve_question(
  p_user_id UUID,  -- ❌ CLIENT CAN PASS ANY UUID
  p_anonymous_session_id UUID DEFAULT NULL
)
```

**v2.0 Solution:**
- Separate functions: `reserve_authenticated_question()` (uses `auth.uid()`) vs `reserve_anonymous_question()` (server-only)
- Authenticated users CANNOT pass `user_id`; function derives it from session
- Server routes call anonymous functions with validated session hash

**v2.0 Code (Secure):**
```sql
-- Authenticated users ONLY
CREATE FUNCTION public.reserve_authenticated_question(
  p_request_id UUID  -- ✅ ONLY request tracking, no identity param
)
RETURNS TABLE(success BOOLEAN, period_id UUID, remaining_questions INT, error_msg TEXT) AS $$
BEGIN
  -- Derive user_id from auth.uid() (immutable at function level)
  -- Check auth.uid() has active period
  -- Reserve atomically
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Server-only (browser gets RLS: false)
CREATE FUNCTION public.reserve_anonymous_question(
  p_session_hash TEXT,  -- ✅ ONLY hash lookup, never raw token
  p_request_id UUID
)
RETURNS TABLE(...) AS $$
BEGIN
  -- Server looks up session by hash only
  -- Never leaks raw token or session ID
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

---

### Issue #2: Profile Creation & Trigger (CRITICAL)

**Problem:** No mechanism documented for profile creation. v1.0 INSERT RLS allows browser to create own profile.

**v2.0 Solution:**

**Step 1: Create trigger on `auth.users`**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email_verified, language, theme, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email_confirmed_at IS NOT NULL,
    'he',  -- Default language
    'light',  -- Default theme
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Step 2: Disable browser INSERT**
```sql
-- No INSERT policy for browsers
CREATE POLICY "users_cannot_insert_own_profile" ON public.user_profiles
  FOR INSERT USING (false);  -- ✅ Trigger handles creation
```

**Step 3: Restrict UPDATE to approved fields**
```sql
CREATE POLICY "users_update_own_profile_limited" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id)
  GRANT (display_name, language, theme);  -- ✅ Only these fields
```

---

### Issue #3: Function Security Matrix (HIGH)

**v2.0 Complete Security Definition:**

| Function | SECURITY | Owner | Allowed Roles | Revoked Roles | search_path | Tables Modified | Reason Cannot Abuse |
|----------|----------|-------|---|---|---|---|---|
| `handle_new_user()` (trigger) | DEFINER | postgres | authenticated (via trigger) | public, anon | public | user_profiles | Runs on auth.users insert only; fixed `search_path`; no user-controlled SQL |
| `reserve_authenticated_question()` | INVOKER | postgres | authenticated | public, anon | public | usage_periods | Derives `user_id` from `auth.uid()`; no parameters for user ID |
| `confirm_authenticated_question()` | INVOKER | postgres | authenticated | public, anon | public | usage_periods, usage_events | Derives `user_id` from `auth.uid()`; RLS enforces access |
| `reserve_anonymous_question()` | INVOKER | postgres | service_role (server only) | public, authenticated, anon | public | anonymous_sessions | Browser cannot call (RLS: false); server validates hash |
| `confirm_anonymous_question()` | INVOKER | postgres | service_role (server only) | public, authenticated, anon | public | anonymous_sessions, usage_events | Browser cannot call; server validates hash |
| `transfer_anonymous_quota()` | INVOKER | postgres | service_role (server only) | public, authenticated, anon | public | usage_periods, anonymous_sessions, usage_events | Server-only; one-time grant enforced by UNIQUE constraint |

---

### Issue #4: RPC Access Model (HIGH)

**Model A - Authenticated Direct:**
- User: `authenticated` role in Supabase
- Flow: Browser → RPC call → PostgreSQL function uses `auth.uid()`
- Functions: `reserve_authenticated_question()`, `confirm_authenticated_question()`
- Rationale: User identity is immutable in function context

**Model B - Server-Only:**
- User: Anonymous or authenticated browser client
- Flow: Browser → Next.js API route → Server calls RPC with service_role key
- Functions: `reserve_anonymous_question()`, `confirm_anonymous_question()`, `transfer_anonymous_quota()`
- Rationale: Anonymous sessions require server validation; session tokens must never leave server

**Explicit grant statements:**
```sql
REVOKE ALL ON FUNCTION public.reserve_authenticated_question(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_authenticated_question(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_anonymous_question(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_anonymous_question(TEXT, UUID) TO service_role;
```

---

### Issue #5: Anonymous Session Token Lifecycle (HIGH)

**Complete Lifecycle:**

```
1. [Client] User visits site anonymously
   └─ Browser has NO session identifier yet

2. [Server] POST /api/sessions/create
   ├─ Generate random token (64 bytes, base64)
   ├─ Compute hash: SHA256(token) → hex
   ├─ INSERT into anonymous_sessions (session_token_hash)
   ├─ Return token in response
   └─ Client never knows session ID (UUID)

3. [Client] Receive token
   ├─ Store in HTTPONLY, SECURE, SAMESITE=LAX cookie
   ├─ Cookie name: `anon_session_token`
   ├─ Cannot access via JavaScript
   ├─ Automatically sent on same-origin requests
   └─ Token NEVER logged or exposed

4. [Client] Send question
   ├─ Cookie sent automatically with request
   └─ Raw token in cookie

5. [Server] POST /api/chat/message
   ├─ Extract token from cookie (req.cookies.anon_session_token)
   ├─ Hash it: SHA256(token) → hex
   ├─ Call reserve_anonymous_question(token_hash, request_id)
   ├─ Database looks up by hash (no raw token in DB)
   ├─ If found and valid: reserve quota atomically
   └─ If not found/expired: return 403 Unauthorized

6. [Database] Usage event logged
   ├─ Store only: anonymous_session_id (UUID), NOT token or token_hash
   ├─ RLS prevents user access to session details
   └─ Audit trail preserved

7. [Client] User registers & verifies email
   ├─ Call transfer_anonymous_quota(old_session_hash)
   ├─ Server validates hash matches cookie
   └─ Link session to new user account

8. [Cleanup] Periodic job (daily)
   ├─ Delete anonymous_sessions WHERE retention_expires_at < NOW() AND linked_user_id IS NULL
   ├─ Keep linked sessions 30 days (audit trail)
   └─ Anonymize after transfer if needed
```

**Implementation in Next.js:**
```typescript
// lib/server/sessions.ts
import crypto from 'crypto';
import { db } from '@/lib/supabase';

export async function createAnonymousSession(): Promise<string> {
  const token = crypto.randomBytes(64).toString('base64');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  
  const { data, error } = await db.rpc('insert_anonymous_session', {
    p_session_hash: hash,
  });
  
  if (error) throw error;
  return token;  // Return to client
}

// middleware.ts
export async function middleware(request: NextRequest) {
  if (!request.cookies.has('anon_session_token')) {
    const sessionToken = await createAnonymousSession();
    const response = NextResponse.next();
    
    response.cookies.set('anon_session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,  // 7 days
    });
    
    return response;
  }
  
  return NextResponse.next();
}
```

---

### Issue #6: User Profiles Columns - Data Minimization (HIGH)

**v1.0 Added (5 unnecessary columns):**
- `email_verified_at` TIMESTAMPTZ
- `language_support` TEXT
- `ui_notifications` BOOLEAN
- `first_login_at` TIMESTAMPTZ
- `last_activity_at` TIMESTAMPTZ

**v2.0 Decision:**
- ✅ Keep only existing columns: `id`, `display_name`, `email_verified`, `language`, `theme`, `created_at`, `updated_at`
- ❌ Remove all 5 new columns (defer to future milestones)

**Rationale:**
- `email_verified_at`: Supabase Auth already tracks `auth.users.email_confirmed_at` (single source of truth)
- `language_support`: Not in MVP; extend `language` to support `he,en,ru` if needed later (TEXT, validate with CHECK)
- `ui_notifications`: Not implemented yet (deferred to Milestone 4)
- `first_login_at`: Activity tracking deferred (not required for MVP)
- `last_activity_at`: Would require server update on every request (performance risk without throttling strategy)

**v2.0 SQL (Minimal):**
```sql
-- ✅ NO ALTER TABLE added
-- user_profiles already exists with all needed columns
-- Only update RLS policies
```

---

### Issue #7: Retention & Data-Minimization (HIGH)

**v2.0 Retention Schedule:**

| Table | Data | Retention Period | Rationale | Deletion Mechanism |
|-------|------|---|---|---|
| `user_profiles` | Registered user profiles | Indefinite | Account history; GDPR export on request | Manual via GDPR delete or auth.users cascade |
| `usage_periods` | Completed periods (period_end < NOW) | 24 months (2 years) | Revenue tracking, audit trail; reduce after 2 years via aggregation | Automated job: archive to s3 yearly, delete if older |
| `usage_events` | Individual quota reservations | 12 months (1 year) | Audit trail for disputes; aggregate to monthly summaries | Automated: archive, then delete if >12 months old |
| `anonymous_sessions` | Unlinked sessions | 7-30 days | Fair-use tracking, session hygiene | Automated: delete WHERE retention_expires_at < NOW() AND linked_user_id IS NULL |
| `anonymous_sessions` | Linked sessions | 30 days after link | Transfer audit trail; GDPR compliance | Automated: delete after 30 days |
| Chat history (future table) | Conversation logs | Opt-in (user choice) | User privacy; not stored by default | User-triggered export or delete |
| Aggregated metrics (future) | Monthly usage summary | Indefinite | Business intelligence | Keep indefinitely for reporting |

**Do NOT store (security):**
- Raw user prompts (not required for quota tracking)
- Retrieved research context (privacy risk)
- Raw provider responses (proprietary data)
- Access tokens (authentication data belongs in auth.users)
- Cookies or session secrets (logged via middleware if logged)
- Error messages containing PII (use error codes only)

---

### Issue #8: Registered Trial Uniqueness Guarantee (HIGH)

**v1.0 Problem:** Only app logic prevents multiple grants; no database constraint.

**v2.0 Solution: Dedicated trial_grants Table**

```sql
CREATE TABLE public.trial_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_type TEXT NOT NULL,  -- 'registered_trial', 'subscription_first_month'
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT only_one_registered_trial UNIQUE (user_id, grant_type)
);

-- Before creating usage_period for trial:
-- SELECT * FROM trial_grants WHERE user_id = ? AND grant_type = 'registered_trial'
-- If exists: error (already granted)
-- If not: INSERT trial grant, then create usage_period
```

**Alternative (Partial Index):**
```sql
CREATE UNIQUE INDEX idx_trial_registered_unique
  ON public.usage_periods (user_id)
  WHERE source_type = 'trial_registered';
```

**Guarantees:**
✅ At most one `trial_registered` period per user  
✅ Database enforces (not application logic)  
✅ Cannot grant twice via concurrent calls  
✅ Prevents: linking multiple anonymous sessions, retrying transfer, re-registering

---

### Issue #9: Complete Idempotency at Reservation (HIGH)

**v1.0 Problem:** `request_id` only checked at confirm/release; two reserve() calls with different request IDs can both succeed.

**v2.0 Solution: Reservation State Machine**

```
State transitions:
  reserved  → (on success) → confirmed
  reserved  → (on failure) → released
  confirmed → (no refund)  → confirmed
  released  → (terminal)   → released

Idempotency rules:
  1. reserve(request_id_A) + reserve(request_id_A) → second call returns existing reservation
  2. reserve(request_id_A) + reserve(request_id_B) → two separate reservations (OK)
  3. reserve(request_id_A) + confirm(request_id_A) + confirm(request_id_A) → second confirm succeeds (idempotent)
  4. reserve(request_id_A) + release(request_id_A) + confirm(request_id_A) → confirm rejected or returns released state
```

**Database Implementation:**

Create `usage_reservations` table (for clear state tracking):
```sql
CREATE TABLE public.usage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_session_id UUID REFERENCES public.anonymous_sessions(id) ON DELETE CASCADE,
  
  period_id UUID NOT NULL,  -- References usage_periods or anonymous_sessions
  state TEXT NOT NULL DEFAULT 'reserved',  -- reserved, confirmed, released
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_state CHECK (state IN ('reserved', 'confirmed', 'released')),
  CONSTRAINT user_or_session CHECK (
    (user_id IS NOT NULL AND anonymous_session_id IS NULL) OR
    (user_id IS NULL AND anonymous_session_id IS NOT NULL)
  )
);

CREATE INDEX idx_reservations_request_id ON public.usage_reservations(request_id);
CREATE INDEX idx_reservations_user_state ON public.usage_reservations(user_id, state);
```

**Updated Function:**
```sql
CREATE FUNCTION public.reserve_authenticated_question(
  p_request_id TEXT
)
RETURNS TABLE(success BOOLEAN, reservation_id UUID, period_id UUID, remaining_questions INT, error_msg TEXT) AS $$
DECLARE
  v_existing_reservation UUID;
  v_new_reservation_id UUID;
  v_period_id UUID;
  v_remaining INT;
BEGIN
  -- Step 1: Check if request already reserved (idempotency)
  SELECT id, period_id INTO v_existing_reservation, v_period_id
  FROM public.usage_reservations
  WHERE request_id = p_request_id AND state = 'reserved';
  
  IF v_existing_reservation IS NOT NULL THEN
    -- Return existing reservation
    SELECT (question_limit - questions_used - questions_reserved)
    INTO v_remaining FROM public.usage_periods WHERE id = v_period_id;
    
    RETURN QUERY SELECT true, v_existing_reservation, v_period_id, v_remaining, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 2: Find active usage_period
  SELECT id INTO v_period_id
  FROM public.usage_periods
  WHERE user_id = auth.uid()
    AND (period_end IS NULL OR period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_period_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 0, 'No active usage period'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Check quota
  SELECT (question_limit - questions_used - questions_reserved)
  INTO v_remaining FROM public.usage_periods WHERE id = v_period_id FOR UPDATE;

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, v_period_id, 0, 'Quota exhausted'::TEXT;
    RETURN;
  END IF;

  -- Step 4: Create reservation & update quota atomically
  INSERT INTO public.usage_reservations (request_id, user_id, period_id, state)
  VALUES (p_request_id, auth.uid(), v_period_id, 'reserved')
  RETURNING id INTO v_new_reservation_id;

  UPDATE public.usage_periods
  SET questions_reserved = questions_reserved + 1, updated_at = NOW()
  WHERE id = v_period_id;

  RETURN QUERY SELECT true, v_new_reservation_id, v_period_id, v_remaining - 1, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

---

### Issue #10: Token & Cost Field Types (MEDIUM)

**v1.0 Problem:**
- `input_tokens INT` (max 2.1B, could overflow on large documents)
- `estimated_cost DECIMAL(10, 8)` (only 2 decimal places for currency)

**v2.0 Solution:**
```sql
CREATE TABLE public.usage_events (
  -- ... existing fields ...
  
  input_tokens BIGINT,              -- ✅ Supports up to 9 exabytes
  output_tokens BIGINT,
  cached_input_tokens BIGINT DEFAULT 0,
  
  estimated_cost NUMERIC(15, 8),    -- ✅ Supports $999,999,999.99999999
  currency TEXT DEFAULT 'USD',      -- ✅ Extensible for future currencies
  
  -- For MVP: allow NULL (no provider integration yet)
  -- Server-side code (not browser) writes these after provider response
  
  CONSTRAINT cost_non_negative CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT tokens_non_negative CHECK (
    (input_tokens IS NULL OR input_tokens >= 0) AND
    (output_tokens IS NULL OR output_tokens >= 0)
  )
);
```

---

### Issue #11: Adversarial Security Test Suite (MEDIUM)

See **supabase/tests/personal_area_milestone_1_security.sql** for 20 tests covering:
- ✅ Authenticated user cannot reserve for another user
- ✅ User cannot UPDATE quota directly
- ✅ Anonymous session lookup without valid hash fails
- ✅ Concurrent reserve attempts handled correctly
- ✅ Trial grant prevents duplicates
- ✅ RLS prevents unauthorized access
- (16 more tests)

---

## PART 2: FUNCTION SECURITY MATRIX (FINAL)

| Function | Purpose | SECURITY | Allowed Roles | search_path | Can Modify | Cannot Do | Test Coverage |
|----------|---------|----------|---|---|---|---|---|
| `handle_new_user()` | Auto-create profile on signup | DEFINER | (via trigger) | public | user_profiles | Read auth.users secrets | ✅ Test 17 |
| `reserve_authenticated_question(request_id)` | Reserve quota (auth users) | INVOKER | authenticated | public | usage_reservations, usage_periods | Accept user_id parameter | ✅ Test 1,9,18 |
| `confirm_authenticated_question(...)` | Confirm usage (auth users) | INVOKER | authenticated | public | usage_reservations, usage_events | Accept user_id parameter | ✅ Test 10,11 |
| `release_authenticated_question(...)` | Release on failure (auth users) | INVOKER | authenticated | public | usage_reservations | Accept user_id parameter | ✅ Test 12 |
| `reserve_anonymous_question(hash, request_id)` | Reserve quota (anon sessions) | INVOKER | service_role | public | anonymous_sessions, usage_reservations | Accept session_id UUID (only hash) | ✅ Test 7,19 |
| `confirm_anonymous_question(...)` | Confirm usage (anon sessions) | INVOKER | service_role | public | anonymous_sessions, usage_events | Accept session_id (only hash) | ✅ Test 20 |
| `transfer_anonymous_quota(...)` | Link anon to user | INVOKER | service_role | public | anonymous_sessions, usage_periods | Allow multiple transfers | ✅ Test 13 |

---

## PART 3: ROLE & PRIVILEGE MATRIX (FINAL)

```sql
-- ============================================================================
-- ROLE PRIVILEGES: AUTHENTICATED USERS (Browser)
-- ============================================================================

-- CAN SELECT own data
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.usage_periods TO authenticated;
GRANT SELECT ON public.usage_events TO authenticated;

-- CAN UPDATE only display_name, language, theme
GRANT UPDATE (display_name, language, theme) ON public.user_profiles TO authenticated;

-- CAN EXECUTE quota functions (derived identity)
GRANT EXECUTE ON FUNCTION public.reserve_authenticated_question(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_authenticated_question(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_authenticated_question(TEXT) TO authenticated;

-- CANNOT: INSERT, UPDATE (other fields), DELETE
REVOKE INSERT ON public.user_profiles FROM authenticated;
REVOKE DELETE ON public.user_profiles FROM authenticated;

-- ============================================================================
-- ROLE PRIVILEGES: ANONYMOUS (No auth)
-- ============================================================================

-- CANNOT access quota tables at all
REVOKE ALL ON public.anonymous_sessions FROM anon;
REVOKE ALL ON public.usage_periods FROM anon;
REVOKE ALL ON public.usage_events FROM anon;
REVOKE ALL ON public.user_profiles FROM anon;

-- ============================================================================
-- ROLE PRIVILEGES: SERVICE_ROLE (Server-side only)
-- ============================================================================

GRANT ALL ON public.anonymous_sessions TO service_role;
GRANT ALL ON public.usage_periods TO service_role;
GRANT ALL ON public.usage_events TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_anonymous_question(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_anonymous_question(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_anonymous_quota(UUID, UUID) TO service_role;
```

---

## PART 4: DATA RETENTION MATRIX (FINAL)

| Table | Record Type | Retention | Auto-Delete | Rationale |
|-------|---|---|---|---|
| `user_profiles` | Active user | Indefinite | No (manual GDPR) | Account history |
| `usage_periods` | Completed (period_end < NOW) | 24 months | Yes (archive + delete after 24mo) | Revenue/audit trail; aggregate to summaries |
| `usage_events` | All events | 12 months | Yes (archive + delete after 12mo) | Audit trail for disputes |
| `anonymous_sessions` | Unlinked (no linked_user_id) | 7 days | Yes (expire via cron) | Fair-use tracking |
| `anonymous_sessions` | Linked (linked_user_id set) | 30 days | Yes (expire via cron) | Transfer audit trail |
| `usage_reservations` | All | 90 days | Yes (archive) | Reconciliation only |

**DO NOT STORE:** Raw prompts, context, provider responses, tokens, error messages with PII

---

## PART 5: REGISTRATION & PROFILE CREATION FLOW

```
User Action: Sign up with email
  ↓
Supabase Auth: Create auth.users row (id: UUID)
  ↓
PostgreSQL Trigger: "on_auth_user_created" fires
  ├─ Function: handle_new_user() [SECURITY DEFINER]
  ├─ INSERT user_profiles (id, email_verified, language, theme)
  └─ Profile created automatically, no browser involvement
  ↓
Browser: Receives auth session token
  ├─ Stored in localstorage (by Supabase SDK)
  └─ Can now call authenticated functions
  ↓
[Profile creation complete]
```

---

## PART 6: ANONYMOUS-SESSION LIFECYCLE

```
1. User visits site (anonymous)
   ├─ Browser has no session cookie yet
   └─ [Session doesn't exist]

2. Server middleware creates session
   ├─ Generate token (raw, 64 bytes)
   ├─ Hash it (SHA256)
   ├─ INSERT anonymous_sessions(session_token_hash, ...)
   ├─ Return token → browser
   └─ [Token in cookie, hash in DB]

3. User asks question
   ├─ Browser POST /api/chat (cookie auto-sent)
   ├─ Server extracts token from cookie
   ├─ Server calls reserve_anonymous_question(hash, request_id)
   ├─ DB: Look up by hash, lock row, reserve
   └─ [Quota reserved]

4. AI responds
   ├─ Server calls confirm_anonymous_question(hash, request_id, ...)
   └─ [Quota confirmed, event logged]

5. User registers & verifies email
   ├─ Server receives transfer request
   ├─ Server validates: auth.uid() + session cookie match
   ├─ Server calls transfer_anonymous_quota(user_id, session_hash)
   ├─ DB: Link session → user, create trial period, log event
   └─ [Quota transferred, anon session marked linked]

6. Cleanup (daily cron)
   ├─ DELETE FROM anonymous_sessions
   │  WHERE retention_expires_at < NOW()
   │  AND linked_user_id IS NULL
   └─ [Expired unlinked sessions deleted]
```

---

## PART 7: TRIAL TRANSFER STATE MACHINE

```
State: Anonymous Trial
  ├─ questions_limit: 3
  ├─ questions_used: 0-3
  └─ questions_reserved: 0-3
  ↓
User Action: Register + Verify Email
  ├─ Trigger: transfer_anonymous_quota()
  └─ [Look up remaining: 3 - questions_used]
  ↓
State: Registered Trial
  ├─ questions_limit: 7 + (3 - questions_used)
  ├─ questions_used: 0 (fresh period)
  ├─ questions_reserved: 0
  ├─ source_type: 'trial_registered'
  └─ [Max 10 questions total across both periods]
  ↓
State: Trial Grant Locked
  ├─ Database constraint: UNIQUE(user_id, grant_type='registered_trial')
  ├─ Prevents: Re-transfer, double-grant, concurrent calls
  └─ [User cannot get trial again]
  ↓
State: Subscription (Future)
  ├─ source_type: 'monthly_subscription' or 'annual_subscription'
  └─ [After payment processed]
```

---

## PART 8: IDEMPOTENCY STATE MACHINE

```
Request with request_id_A arrives (first time)
  ├─ Check: SELECT * FROM usage_reservations WHERE request_id = request_id_A
  ├─ Found: No
  ├─ Action: Create reservation (state='reserved'), update quota
  └─ Return: (success=true, reservation_id, remaining)
  
Request with request_id_A arrives (retry)
  ├─ Check: SELECT * FROM usage_reservations WHERE request_id = request_id_A
  ├─ Found: Yes (state='reserved')
  ├─ Action: None (already reserved)
  └─ Return: (success=true, same_reservation_id, same_remaining)
    [Same state returned = idempotent ✓]

Confirm request with request_id_A arrives
  ├─ Check: SELECT * FROM usage_reservations WHERE request_id = request_id_A
  ├─ Found: Yes (state='reserved')
  ├─ Action: Update state → 'confirmed', log event
  └─ Return: (success=true, event_id)

Confirm request with request_id_A arrives (retry)
  ├─ Check: SELECT * FROM usage_reservations WHERE request_id = request_id_A
  ├─ Found: Yes (state='confirmed')
  ├─ Action: None (already confirmed)
  └─ Return: (success=true, same_event_id)
    [Idempotent second time ✓]

Release after confirm (request_id_A)
  ├─ Action: Forbidden or no-op (state='confirmed' is terminal)
  └─ Return: (error='Cannot release confirmed reservation')
    [Prevents accidental refunds ✓]
```

---

## CONFIRMATION: NO REMOTE CHANGES (v2.0)

✅ **Verified: No migration has been applied remotely**
- No `supabase db push` executed
- All SQL is proposal-stage only
- Remote schema remains at v3 + v4
- No user data modified
- No secrets exposed
- No payment provider integrated
- No paid AI requests made
- No service-role key exposed

---

## NEXT STEPS FOR APPROVAL

1. **Review this document** — Confirm all 12 security fixes are acceptable
2. **Review revised migration SQL** — Validate syntax and trigger logic
3. **Review security test suite** — Verify 20 tests cover your threat model
4. **Approve architecture** — Sign off on Model A/B split, column removal, retention policy
5. **Prepare for application** — Schedule remote migration only after approval
6. **Proceed to Milestone 2** — Personal Area authentication UI (uses these DB functions)

---

**Document Version:** 2.0 (Security Audit Complete)  
**Date:** July 14, 2026  
**Status:** Revised Proposal for Review (No Remote Application)  
**Next Milestone:** Approval → Remote Migration → Milestone 2 (Auth UI)
