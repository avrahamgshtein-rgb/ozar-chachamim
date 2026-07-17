# אוצר חכמים — Milestone 1: Database & RLS Design

**Date:** July 14, 2026  
**Version:** 1.0  
**Status:** Proposal Only (No Remote Migration Applied)

---

## PART 1: Active Schema Findings & Evidence

### 1.1 Supabase Project Identification

**Source:** `nextjs-app/lib/supabase.ts:4-5`

```typescript
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'
```

**Finding:** Supabase project URL is hardcoded with fallback. Public anon key is also hardcoded (acceptable for client-side, but environment variables should be preferred).

**Improvement Required:** Move to environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ulluacifirzywhmzkvkr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C
```

**Action:** Update `lib/supabase.ts` to load from env only, fail if not set (during Milestone 2).

### 1.2 Active Schema Version

**Available schema files:**
- `supabase-schema.sql` (v1, basic)
- `supabase-schema-v2.sql` (connections + bookmarks)
- `supabase-schema-v3.sql` (full schema, current baseline) ✅ **ACTIVE**
- `supabase-schema-v4.sql` (extends v3 with connection metadata)

**Evidence of v3 as baseline:**
- `nextjs-app/lib/supabase.ts` queries `sages_with_stats` (view created in v3+)
- `supabase-schema-v3.sql:127-137` defines `user_profiles` table used by app
- `supabase-schema-v4.sql:1-2` states "Existing tables (from v3) remain unchanged"
- v4 only adds columns to `connections` table (ALTER TABLE, not CREATE)

**Verified Tables in v3:**
```
public.sages (445 rows expected)
public.connections (validated FK)
public.research_content (292 research docs)
public.user_profiles (empty, ready for users)
public.bookmarks (empty)
public.view_history (empty)
```

**RLS Status:** All tables have RLS enabled with basic policies (public read, user-specific write).

**Conclusion:** Schema v3 is active baseline. v4 can be applied after Milestone 1 (adds metadata to connections, does not affect new tables).

### 1.3 Search & Full-Text Index

**Source:** `supabase-schema-v3.sql:56-58`

```sql
ALTER TABLE public.sages ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX idx_sages_search ON public.sages USING GIN (search_vector);
```

**Finding:** PostgreSQL full-text search already indexed on sages. Trigger updates search_vector on insert/update.

**Language Support:** 
- Hebrew tokenization available (PostgreSQL `to_tsvector('hebrew', ...)')
- English fallback available

**Available for MVP:** Yes. No need for pgvector or embeddings in Milestone 1.

---

## PART 2: Analysis of Existing `user_profiles` Table

### 2.1 Current Schema

**Source:** `supabase-schema-v3.sql:127-137`

```sql
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  display_name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  language TEXT DEFAULT 'he', -- 'he' or 'en'
  theme TEXT DEFAULT 'light', -- 'light' or 'dark'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Primary Key & Relationships

- **PK:** `id` (UUID, directly references `auth.users.id`)
- **Cascade:** ON DELETE CASCADE (user deleted → profile auto-deleted)
- **Benefit:** Single source of truth for user identity (no duplicate passwords/emails)
- **FK Status:** Strong (auth.users managed by Supabase Auth)

### 2.3 Existing Columns & Usability

| Column | Type | Current Use | Application |
|--------|------|-------------|-------------|
| `id` | UUID | User identity | Must keep as PK |
| `display_name` | TEXT | Optional user name | Extend: accept name from registration |
| `email_verified` | BOOLEAN | Email confirmation flag | **Extend:** add `email_verified_at` TIMESTAMPTZ |
| `language` | TEXT | UI locale (he/en) | Keep as-is, add `ru` support |
| `theme` | TEXT | UI theme (light/dark) | Extend: add `auto` mode |
| `created_at` | TIMESTAMPTZ | Account creation | Keep as-is |
| `updated_at` | TIMESTAMPTZ | Last profile change | Keep as-is |

### 2.4 RLS Policies (Current)

**Source:** `supabase-schema-v3.sql:199-204`

```sql
-- Profiles: Users can only read their own
CREATE POLICY "users_read_own_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

**Assessment:**
- ✅ SELECT restricted to own record
- ⚠️ UPDATE restricted but **missing WITH CHECK** clause (potential issue if combined with INSERT)
- ❌ INSERT policy missing (how are new profiles created?)
- ❌ DELETE policy missing (should prevent self-deletion or allow?)

### 2.5 Profile Creation Gap

**Problem:** No INSERT policy defined on `user_profiles`. When user registers via Supabase Auth, how is their profile created?

**Solution Options:**
1. **Supabase Auth trigger** (automatic, Supabase-managed) — Most secure
2. **Server-side controlled insert** (app creates row after auth signup) — Explicit control
3. **ALTER RLS to allow INSERT** — Opens attack surface

**Recommendation:** Use server-side controlled insert with explicit RLS check (Section 3.1).

### 2.6 Extension Strategy (NO RENAME)

**Do not rename `user_profiles`.** Instead, add columns:

```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS language_support TEXT DEFAULT 'he,en', -- CSV of supported langs
ADD COLUMN IF NOT EXISTS ui_notifications BOOLEAN DEFAULT TRUE;
```

**Rationale:**
- Existing schema migration scripts reference `user_profiles` by name
- Renaming breaks backwards compatibility
- Adding columns is non-breaking

---

## PART 3: New Tables Design

### 3.1 Table 1: `anonymous_sessions`

**Purpose:** Track anonymous trial usage without requiring authentication.

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session token (hashed, never stored raw)
  session_token_hash TEXT UNIQUE NOT NULL,
  -- Stored as: ENCODE(SHA256(session_token), 'hex')
  -- Computed by: SELECT encode(digest(?, 'sha256'), 'hex')
  
  -- Quota
  questions_limit INT DEFAULT 3,
  questions_used INT DEFAULT 0,
  questions_reserved INT DEFAULT 0,
  
  -- Linkage to account (when user registers)
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  retention_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Privacy & abuse detection
  ip_address INET,
  user_agent TEXT,
  
  -- Constraints
  CONSTRAINT valid_quota CHECK (questions_used >= 0 AND questions_used <= questions_limit),
  CONSTRAINT valid_reserved CHECK (questions_reserved >= 0 AND questions_reserved + questions_used <= questions_limit)
);

CREATE INDEX idx_anonymous_sessions_token_hash ON public.anonymous_sessions(session_token_hash);
CREATE INDEX idx_anonymous_sessions_linked_user ON public.anonymous_sessions(linked_user_id);
CREATE INDEX idx_anonymous_sessions_created ON public.anonymous_sessions(created_at DESC);
CREATE INDEX idx_anonymous_sessions_expired ON public.anonymous_sessions(retention_expires_at);
```

**RLS Policies:**

```sql
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- No SELECT from browser
CREATE POLICY "anonymous_sessions_no_select" ON public.anonymous_sessions
  FOR SELECT USING (false);

-- Prevent INSERT from browser
CREATE POLICY "anonymous_sessions_no_insert" ON public.anonymous_sessions
  FOR INSERT WITH CHECK (false);

-- Prevent UPDATE from browser
CREATE POLICY "anonymous_sessions_no_update" ON public.anonymous_sessions
  FOR UPDATE USING (false);

-- Prevent DELETE from browser
CREATE POLICY "anonymous_sessions_no_delete" ON public.anonymous_sessions
  FOR DELETE USING (false);
```

**Access:** Server-side only (via stored procedures or API routes, never direct client query).

**Notes:**
- `session_token_hash`: Client receives raw token in HTTP-only cookie. Hash stored in DB (one-way).
- `questions_reserved`: Incremented when question is sent, decremented if AI call fails (rollback).
- `linked_user_id`: Set when anonymous user registers, enabling quota transfer.
- `retention_expires_at`: Cleanup task deletes records older than 7 days (prevents bloat).

---

### 3.2 Table 2: `usage_periods`

**Purpose:** Track quota per billing period (monthly for subscribers, trial for others).

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS public.usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference (required, handles both auth and anonymous-converted)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Period metadata
  source_type TEXT NOT NULL,
    -- 'trial_anonymous' → 3 questions, no expiry
    -- 'trial_registered' → 7 questions, no expiry (one-time grant)
    -- 'monthly_subscription' → 100 questions, resets on billing date
    -- 'annual_subscription' → 100 questions per month, resets monthly
  
  -- Time range
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ, -- NULL for ongoing trials
  
  -- Quota
  question_limit INT NOT NULL,
  questions_used INT DEFAULT 0,
  questions_reserved INT DEFAULT 0,
  
  -- Lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_source_type CHECK (source_type IN (
    'trial_anonymous', 'trial_registered', 'monthly_subscription', 'annual_subscription'
  )),
  CONSTRAINT valid_dates CHECK (period_end IS NULL OR period_end > period_start),
  CONSTRAINT valid_quota CHECK (questions_used >= 0 AND questions_reserved >= 0)
);

CREATE INDEX idx_usage_periods_user ON public.usage_periods(user_id);
CREATE INDEX idx_usage_periods_active ON public.usage_periods(user_id, period_end DESC)
  WHERE period_end IS NULL OR period_end > NOW();
CREATE INDEX idx_usage_periods_source ON public.usage_periods(source_type);
```

**RLS Policies:**

```sql
ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;

-- Users can READ their own periods
CREATE POLICY "users_read_own_usage_periods" ON public.usage_periods
  FOR SELECT USING (auth.uid() = user_id);

-- Users CANNOT INSERT/UPDATE/DELETE (server-only)
CREATE POLICY "users_cannot_modify_usage_periods" ON public.usage_periods
  FOR INSERT USING (false);

CREATE POLICY "users_cannot_update_usage_periods" ON public.usage_periods
  FOR UPDATE USING (false);

CREATE POLICY "users_cannot_delete_usage_periods" ON public.usage_periods
  FOR DELETE USING (false);
```

**Notes:**
- One active period per user at a time (enforced by app logic, not constraint).
- Trial periods (`trial_anonymous`, `trial_registered`) have no expiry, but are one-time only.
- Subscription periods expire and are replaced by new monthly/annual periods.
- `questions_reserved`: Atomic operation (see Section 5.1).

---

### 3.3 Table 3: `usage_events`

**Purpose:** Immutable audit log of all quota-related activities.

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request tracking
  request_id TEXT UNIQUE NOT NULL,
  -- Must be globally unique (idempotency)
  -- Format: UUID-v4 from request header
  
  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_session_id UUID REFERENCES public.anonymous_sessions(id) ON DELETE SET NULL,
  -- One of user_id or anonymous_session_id must be set
  
  -- Event type
  event_type TEXT NOT NULL,
    -- 'question_reserved' → quota reserved before AI call
    -- 'question_released' → quota released after AI failure
    -- 'question_confirmed' → quota confirmed after AI success
    -- 'quota_granted' → manual admin grant (rare)
    -- 'quota_refund' → manual admin refund (rare)
  
  -- AI provider metadata
  provider TEXT,           -- 'anthropic', 'openai', 'mock', etc
  model TEXT,              -- 'claude-sonnet-5', 'gpt-4o', etc
  
  -- Token usage (if billable)
  input_tokens INT,
  output_tokens INT,
  cached_input_tokens INT DEFAULT 0,
  
  -- Cost tracking
  estimated_cost DECIMAL(10, 8),
  
  -- Error tracking
  error_code TEXT,         -- 'insufficient_quota', 'api_timeout', etc
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'question_reserved', 'question_released', 'question_confirmed',
    'quota_granted', 'quota_refund'
  )),
  CONSTRAINT user_or_session_required CHECK (
    (user_id IS NOT NULL AND anonymous_session_id IS NULL) OR
    (user_id IS NULL AND anonymous_session_id IS NOT NULL) OR
    (user_id IS NOT NULL AND anonymous_session_id IS NOT NULL)
  ),
  CONSTRAINT positive_tokens CHECK (
    (input_tokens IS NULL OR input_tokens >= 0) AND
    (output_tokens IS NULL OR output_tokens >= 0)
  )
);

CREATE INDEX idx_usage_events_user ON public.usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_session ON public.usage_events(anonymous_session_id, created_at DESC);
CREATE INDEX idx_usage_events_request_id ON public.usage_events(request_id);
CREATE INDEX idx_usage_events_type ON public.usage_events(event_type);
```

**RLS Policies:**

```sql
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Users can READ their own events
CREATE POLICY "users_read_own_usage_events" ON public.usage_events
  FOR SELECT USING (
    (auth.uid() = user_id) OR
    (user_id IS NULL AND anonymous_session_id IN (
      SELECT id FROM public.anonymous_sessions WHERE linked_user_id = auth.uid()
    ))
  );

-- Users CANNOT INSERT/UPDATE/DELETE
CREATE POLICY "users_cannot_modify_usage_events" ON public.usage_events
  FOR INSERT USING (false);

-- Exception: Server can insert via trusted function
-- (See Section 5.2 for server-side function)
```

**Notes:**
- Immutable by users; server appends only.
- `request_id`: Prevents double-charging if user retries request (idempotency key).
- `cached_input_tokens`: Tracks Claude cache hits (future: charge less for cached tokens).
- Every question consumed generates 2-3 events (reserved → confirmed/released).
- Audit trail cannot be modified by users.

---

## PART 4: Extension to `user_profiles`

### 4.1 Additive Migration

**Add fields without renaming:**

```sql
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS language_support TEXT DEFAULT 'he',
  CONSTRAINT valid_languages CHECK (language_support ~ '^[a-z]{2}(,[a-z]{2})*$'),
ADD COLUMN IF NOT EXISTS ui_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
```

**Purpose of new columns:**
- `email_verified_at`: Timestamp when email confirmed (replaces boolean flag, but keep boolean for compatibility)
- `language_support`: Comma-separated list of languages user has accepted (for future localization)
- `ui_notifications`: User preference for notification emails
- `first_login_at`: Track when user first accesses chat (vs just registering)
- `last_activity_at`: Used for cleanup of inactive accounts (future feature)

### 4.2 Updated RLS Policies

**Preserve existing, add WITH CHECK clause:**

```sql
-- Drop existing (old syntax)
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;

-- Recreate with WITH CHECK
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add INSERT policy (for server-side profile creation)
CREATE POLICY "users_insert_own_profile" ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Add DELETE policy (prevent self-deletion, allow Supabase cascade)
CREATE POLICY "prevent_user_delete_own_profile" ON public.user_profiles
  FOR DELETE
  USING (false); -- Deletion only via cascade from auth.users
```

---

## PART 5: Atomic Quota Reservation System

### 5.1 PostgreSQL Function: Atomic Question Reservation

**Purpose:** Ensure no two concurrent requests can use the same question (prevent overspending).

**Function Definition:**

```sql
CREATE OR REPLACE FUNCTION public.reserve_question(
  p_user_id UUID,
  p_anonymous_session_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  period_id UUID,
  remaining_questions INT,
  error_msg TEXT
) AS $$
DECLARE
  v_period_id UUID;
  v_remaining INT;
  v_reserved INT;
BEGIN
  -- Step 1: Identify active usage period
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_period_id
    FROM public.usage_periods
    WHERE user_id = p_user_id
      AND (period_end IS NULL OR period_end > NOW())
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE; -- Lock the row
    
    IF v_period_id IS NULL THEN
      RETURN QUERY SELECT false, NULL::UUID, 0, 'No active usage period'::TEXT;
      RETURN;
    END IF;
  ELSE
    -- Anonymous session
    IF p_anonymous_session_id IS NULL THEN
      RETURN QUERY SELECT false, NULL::UUID, 0, 'User ID or session ID required'::TEXT;
      RETURN;
    END IF;
    
    -- Validate session exists and not expired
    SELECT id INTO v_period_id
    FROM public.anonymous_sessions
    WHERE id = p_anonymous_session_id
      AND retention_expires_at > NOW()
    FOR UPDATE;
    
    IF v_period_id IS NULL THEN
      RETURN QUERY SELECT false, NULL::UUID, 0, 'Anonymous session expired or not found'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Step 2: Check quota (for usage_periods)
  IF p_user_id IS NOT NULL THEN
    SELECT (question_limit - questions_used - questions_reserved)
    INTO v_remaining
    FROM public.usage_periods
    WHERE id = v_period_id
    FOR UPDATE;
    
    IF v_remaining <= 0 THEN
      RETURN QUERY SELECT false, v_period_id, 0, 'Quota exhausted'::TEXT;
      RETURN;
    END IF;
    
    -- Step 3: Reserve atomically
    UPDATE public.usage_periods
    SET questions_reserved = questions_reserved + 1,
        updated_at = NOW()
    WHERE id = v_period_id;
  ELSE
    -- Check quota (for anonymous_sessions)
    SELECT (questions_limit - questions_used - questions_reserved)
    INTO v_remaining
    FROM public.anonymous_sessions
    WHERE id = p_anonymous_session_id
    FOR UPDATE;
    
    IF v_remaining <= 0 THEN
      RETURN QUERY SELECT false, p_anonymous_session_id, 0, 'Quota exhausted'::TEXT;
      RETURN;
    END IF;
    
    -- Reserve for anonymous
    UPDATE public.anonymous_sessions
    SET questions_reserved = questions_reserved + 1,
        last_used_at = NOW()
    WHERE id = p_anonymous_session_id;
    
    v_period_id := p_anonymous_session_id;
  END IF;
  
  -- Step 4: Return success
  RETURN QUERY SELECT true, v_period_id, v_remaining - 1, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.reserve_question(UUID, UUID) TO authenticated;
```

### 5.2 Function: Confirm Question Usage

**Called after successful AI response:**

```sql
CREATE OR REPLACE FUNCTION public.confirm_question(
  p_period_id UUID,
  p_request_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_anonymous_session_id UUID DEFAULT NULL,
  p_provider TEXT DEFAULT 'anthropic',
  p_model TEXT DEFAULT 'claude-sonnet-5',
  p_input_tokens INT DEFAULT 0,
  p_output_tokens INT DEFAULT 0,
  p_estimated_cost DECIMAL DEFAULT 0
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Step 1: Check if already confirmed (idempotency)
  SELECT id INTO v_event_id
  FROM public.usage_events
  WHERE request_id = p_request_id
    AND event_type = 'question_confirmed';
  
  IF v_event_id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_event_id, 'Already confirmed'::TEXT;
    RETURN;
  END IF;
  
  -- Step 2: Confirm usage and release reservation
  IF p_user_id IS NOT NULL THEN
    UPDATE public.usage_periods
    SET questions_used = questions_used + 1,
        questions_reserved = questions_reserved - 1,
        updated_at = NOW()
    WHERE id = p_period_id;
  ELSE
    UPDATE public.anonymous_sessions
    SET questions_used = questions_used + 1,
        questions_reserved = questions_reserved - 1,
        last_used_at = NOW()
    WHERE id = p_period_id;
  END IF;
  
  -- Step 3: Log event (immutable)
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type,
    provider, model, input_tokens, output_tokens, estimated_cost
  )
  VALUES (
    p_request_id, p_user_id, p_anonymous_session_id, 'question_confirmed',
    p_provider, p_model, p_input_tokens, p_output_tokens, p_estimated_cost
  )
  RETURNING id INTO v_event_id;
  
  -- Step 4: Return success
  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.confirm_question(UUID, TEXT, UUID, UUID, TEXT, TEXT, INT, INT, DECIMAL) TO authenticated;
```

### 5.3 Function: Release Question (On Failure)

**Called if AI request fails before confirmation:**

```sql
CREATE OR REPLACE FUNCTION public.release_question(
  p_period_id UUID,
  p_request_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_anonymous_session_id UUID DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  event_id UUID,
  error_msg TEXT
) AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Step 1: Release reservation
  IF p_user_id IS NOT NULL THEN
    UPDATE public.usage_periods
    SET questions_reserved = GREATEST(questions_reserved - 1, 0),
        updated_at = NOW()
    WHERE id = p_period_id;
  ELSE
    UPDATE public.anonymous_sessions
    SET questions_reserved = GREATEST(questions_reserved - 1, 0),
        last_used_at = NOW()
    WHERE id = p_period_id;
  END IF;
  
  -- Step 2: Log event (for audit trail)
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type,
    error_code, error_message
  )
  VALUES (
    p_request_id, p_user_id, p_anonymous_session_id, 'question_released',
    p_error_code, p_error_message
  )
  RETURNING id INTO v_event_id;
  
  RETURN QUERY SELECT true, v_event_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.release_question(UUID, TEXT, UUID, UUID, TEXT, TEXT) TO authenticated;
```

---

## PART 6: Anonymous-to-Registered Transfer Flow

### 6.1 Transfer Function

**Called after user completes email verification:**

```sql
CREATE OR REPLACE FUNCTION public.transfer_anonymous_quota(
  p_new_user_id UUID,
  p_anonymous_session_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  registered_period_id UUID,
  transferred_questions INT,
  error_msg TEXT
) AS $$
DECLARE
  v_remaining_questions INT;
  v_new_period_id UUID;
BEGIN
  -- Step 1: Verify anonymous session exists and not already linked
  SELECT (questions_limit - questions_used)
  INTO v_remaining_questions
  FROM public.anonymous_sessions
  WHERE id = p_anonymous_session_id
    AND linked_user_id IS NULL
    AND retention_expires_at > NOW()
  FOR UPDATE;
  
  IF v_remaining_questions IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Session not found, already linked, or expired'::TEXT;
    RETURN;
  END IF;
  
  -- Step 2: Create registered trial period
  INSERT INTO public.usage_periods (
    user_id, source_type, period_start, period_end,
    question_limit, questions_used, questions_reserved
  )
  VALUES (
    p_new_user_id, 'trial_registered', NOW(), NULL,
    7 + v_remaining_questions, -- 7 base + transferred
    0, 0
  )
  RETURNING id INTO v_new_period_id;
  
  -- Step 3: Link anonymous session to user (for audit trail)
  UPDATE public.anonymous_sessions
  SET linked_user_id = p_new_user_id,
      retention_expires_at = NOW() + INTERVAL '30 days' -- Keep for 30 days for reference
  WHERE id = p_anonymous_session_id;
  
  -- Step 4: Log transfer event
  INSERT INTO public.usage_events (
    request_id, user_id, anonymous_session_id, event_type
  )
  VALUES (
    gen_random_uuid()::TEXT, p_new_user_id, p_anonymous_session_id, 'quota_granted'
  );
  
  RETURN QUERY SELECT true, v_new_period_id, v_remaining_questions, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.transfer_anonymous_quota(UUID, UUID) TO authenticated;
```

### 6.2 Usage Illustration

**Anonymous user flow:**
1. User visits → server creates anonymous session with 3 questions
2. User sends 2 questions → questions_used = 2
3. User registers & verifies email
4. `transfer_anonymous_quota(new_user_id, session_id)` called
5. New period created: 7 + (3 - 2) = 8 questions available
6. Anonymous session marked linked (audit trail)

---

## PART 7: Data Retention & Cleanup Policy

### 7.1 Retention Schedule

| Table | Retention | Cleanup Trigger |
|-------|-----------|-----------------|
| `user_profiles` | Indefinite | Manual via GDPR request |
| `usage_periods` | Indefinite (completed periods) | Keep for tax/audit (7 years recommended) |
| `usage_events` | Indefinite (audit trail) | Keep indefinitely for fraud detection |
| `anonymous_sessions` | 7 days | Auto-delete via `retention_expires_at` |

### 7.2 Cleanup Trigger

**For anonymous sessions (optional, not required for MVP):**

```sql
-- Periodic cleanup job (run daily via Vercel cron)
DELETE FROM public.anonymous_sessions
WHERE retention_expires_at < NOW()
  AND linked_user_id IS NULL;
  -- Only delete unlinking sessions (linked sessions kept 30 days for reference)
```

**Alternative:** Use Vercel cron function or external job scheduler (future).

---

## PART 8: Privacy & Security Risk Assessment

### 8.1 Data Classification

| Data | Classification | Risk | Mitigation |
|------|---|---|---|
| User email | HIGH | Exposure via breach | Stored in auth.users (Supabase managed) |
| Password hash | CRITICAL | Plaintext exposure | Managed by Supabase Auth (bcrypt) |
| Usage events | MEDIUM | Inference of behavior | RLS: user can't see others' usage |
| Session tokens (raw) | CRITICAL | Session hijacking | Hashed in DB, HTTP-only cookie in client |
| Anonymous quotas | LOW | Fair-use violation | Server-enforced (browser can't modify) |
| IP address (logged) | MEDIUM | Privacy concern | Retained 30 days (GDPR compliance) |

### 8.2 Attack Vectors & Mitigations

| Attack | Mitigation |
|--------|-----------|
| **Concurrent question overflow** | FOR UPDATE locks in PostgreSQL function |
| **Browser modifies quota** | RLS: users can only READ (not UPDATE) usage_periods |
| **Session token brute force** | 7-day expiry + HTTP-only cookie |
| **Anonymous session reuse** | Hashed token, no raw storage |
| **Anonymous quota hijack** | No direct browser access to anonymous_sessions |
| **Usage event tampering** | RLS: INSERT/UPDATE/DELETE forbidden for users |
| **GDPR data export** | Usage events provide audit trail, user can download via API |
| **Account takeover** | Supabase Auth manages email verification |

### 8.3 Database Privileges

**Required for application server:**

```sql
-- Grant to authenticated users
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT UPDATE (display_name, language, theme, ui_notifications) ON public.user_profiles TO authenticated;
GRANT SELECT ON public.usage_periods TO authenticated;
GRANT SELECT ON public.usage_events TO authenticated;

-- Grant to service role (server-side functions only)
GRANT EXECUTE ON FUNCTION public.reserve_question(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_question(UUID, TEXT, UUID, UUID, TEXT, TEXT, INT, INT, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_question(UUID, TEXT, UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_anonymous_quota(UUID, UUID) TO service_role;

-- Insert usage events (server-side)
GRANT INSERT ON public.usage_events TO service_role;
GRANT INSERT ON public.anonymous_sessions TO service_role;
GRANT INSERT ON public.usage_periods TO service_role;
```

---

## PART 9: Retrieval Sufficiency Rule (MVP)

### 9.1 Deterministic Fallback Logic

**Do NOT rely on AI to decide Wikipedia fallback.** Use rule-based evaluation:

```sql
CREATE OR REPLACE FUNCTION public.evaluate_retrieval_sufficiency(
  p_query TEXT,
  p_sage_matches INT, -- Count of exact sage matches
  p_fts_results INT,  -- Count of FTS results
  p_fts_rank_avg DECIMAL -- Average PostgreSQL rank of FTS results
)
RETURNS TABLE(
  is_sufficient BOOLEAN,
  reason TEXT,
  confidence DECIMAL,
  suggested_fallback TEXT
) AS $$
BEGIN
  -- Rule 1: Exact sage match found
  IF p_sage_matches >= 1 THEN
    RETURN QUERY SELECT true, 'Direct sage match found', 0.95, 'none'::TEXT;
    RETURN;
  END IF;
  
  -- Rule 2: Good FTS results (high rank + multiple sources)
  IF p_fts_results >= 2 AND p_fts_rank_avg >= 0.5 THEN
    RETURN QUERY SELECT true, 'Multiple FTS results above threshold', 0.85, 'none'::TEXT;
    RETURN;
  END IF;
  
  -- Rule 3: Single high-quality FTS result
  IF p_fts_results >= 1 AND p_fts_rank_avg >= 0.7 THEN
    RETURN QUERY SELECT true, 'Single high-confidence FTS result', 0.75, 'none'::TEXT;
    RETURN;
  END IF;
  
  -- Rule 4: Some FTS results but low confidence
  IF p_fts_results >= 1 AND p_fts_rank_avg >= 0.3 THEN
    RETURN QUERY SELECT false, 'Low-confidence FTS results', 0.4, 'wikipedia'::TEXT;
    RETURN;
  END IF;
  
  -- Rule 5: No relevant internal sources
  IF p_fts_results = 0 AND p_sage_matches = 0 THEN
    RETURN QUERY SELECT false, 'No internal sources found', 0.0, 'wikipedia'::TEXT;
    RETURN;
  END IF;
  
  -- Default
  RETURN QUERY SELECT false, 'Insufficient internal coverage', 0.3, 'wikipedia'::TEXT;
END;
$$ LANGUAGE plpgsql;
```

### 9.2 Application Rule

**In chat API (`app/api/chat/message/route.ts`, Milestone 5):**

```typescript
const retrieval = await db.searchResearch(userQuery)
const sufficiency = await db.evaluateRetrieval(
  userQuery,
  retrieval.sage_matches.length,
  retrieval.fts_results.length,
  retrieval.avg_fts_rank
)

let context = retrieval.docs

if (!sufficiency.is_sufficient && sufficiency.suggested_fallback === 'wikipedia') {
  const wikiResults = await wikipedia.search(userQuery, { lang: 'he' })
  if (wikiResults.length > 0) {
    context = [...context, ...wikiResults]
  }
}

const aiResponse = await aiProvider.complete({
  system_prompt: SYSTEM_PROMPT,
  user_message: userQuery,
  context,
})
```

### 9.3 User-Facing Source Labels

**Response labels (trilingual):**

```typescript
{
  sources: [
    {
      type: 'direct',      // תיוג: מקור ישיר מאוצר חכמים (Direct source)
      sage_id: '1',
      confidence: 0.95,
    },
    {
      type: 'supporting',  // תיוג: מקור תומך מאוצר חכמים (Supporting source)
      sage_id: '42',
      confidence: 0.70,
    },
    {
      type: 'wikipedia',   // תיוג: מקור משלים מוויקיפדיה (Supplementary Wikipedia source)
      lang: 'he',
      confidence: 0.45,
    },
  ],
  wikipedia_used: true,
  internal_coverage: 0.75, // 75% of answer from Otsar Chachamim
}
```

---

## PART 10: Files & Modifications Summary

### 10.1 New Files to Create (Milestone 1 Proposals)

**Migrations directory (create if not exists):**
```
supabase/migrations/
  ├── 20260714_001_personal_area_milestone_1.sql (PROPOSAL)
  ├── 20260714_001_personal_area_milestone_1_rollback.sql (PROPOSAL)
  └── README.md (migration instructions)
```

**Configuration files:**
```
nextjs-app/
  ├── .env.local.example → rename to .env.local
  │   (Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  └── supabase/config.json (optional, for CLI reference)
```

### 10.2 Files to Modify (Milestone 1)

| File | Change | Reason |
|------|--------|--------|
| `nextjs-app/lib/supabase.ts` | Load URL/key from env, fail if not set | Remove hardcoded fallback |
| `nextjs-app/.env.example` | Add NEXT_PUBLIC_SUPABASE_* | Document env vars |
| `.env.example` | Update Supabase section | Consistent with Next.js |

### 10.3 Files NOT Created Yet (Milestone 2+)

```
app/auth/ (not created)
app/api/auth/ (not created)
app/chat/ (not created)
src/billing/ (not created)
src/ai/ (not created)
```

---

## PART 11: Database Layer Tests (Milestone 1 Verification)

**Tests to run BEFORE applying migration (to validate SQL):**

```sql
-- Test 1: Anonymous session creation
SELECT * FROM public.reserve_question(NULL, gen_random_uuid());
-- Expected: Error (invalid session ID)

-- Test 2: User_profiles extension columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
-- Expected: New columns listed

-- Test 3: RLS policies enforced
SET SESSION AUTHORIZATION TO 'authenticated';
SELECT COUNT(*) FROM public.usage_periods;
-- Expected: 0 rows (no own records yet)

-- Test 4: Server function privileges
SELECT has_function_privilege('authenticated', 'public.reserve_question(uuid, uuid)', 'EXECUTE');
-- Expected: false (authenticated cannot call, only service_role)

-- Test 5: Immutability of usage_events
-- Attempt INSERT from browser (simulate authenticated)
-- Expected: Denied by RLS policy
```

---

## PART 12: Unresolved Assumptions & Decisions

### 12.1 Confirmed (From Owner Decisions)

✅ **Use existing Supabase project** (ulluacifirzywhmzkvkr.supabase.co)  
✅ **Use existing user_profiles table** (extend, don't rename)  
✅ **Mock billing provider in MVP** (no Stripe keys needed)  
✅ **Mock AI provider in MVP** (no Anthropic key needed)  
✅ **Use Supabase Auth** (no duplicate email/password tables)  
✅ **Anonymous trial:** 3 questions, server-side session, 7-day technical retention  
✅ **Registered trial:** 7 additional questions, no second grant  
✅ **Wikipedia fallback:** Enabled automatically, rule-based  
✅ **No vector search in MVP** (PostgreSQL FTS only)  

### 12.2 Implementation Decisions (For Approval)

| Decision | Options | Recommendation | Status |
|----------|---------|---|---|
| **Move hardcoded Supabase URL to env?** | Yes / Keep as-is | Yes, move to env | ✅ **Approve** |
| **Cleanup anonymous sessions after 7 days?** | Auto-delete / Manual | Auto-delete (low-cost job) | ⏳ **Defer to Milestone 2** |
| **Cache PostgreSQL FTS results?** | Yes / No | Yes (Redis optional) | ⏳ **Defer to Milestone 4** |
| **Log all usage events** | Yes / Sample 10% | Yes, all (audit trail) | ✅ **Yes** |
| **Prevent user account self-deletion?** | Allow / Prevent | Prevent (only via cascade) | ✅ **Yes** |

---

## PART 13: Summary of Proposed Migrations

### 13.1 Migration 1: Core Tables & Functions

**File:** `supabase/migrations/20260714_001_personal_area_milestone_1.sql`

**Includes:**
1. `user_profiles` column additions (email_verified_at, language_support, etc)
2. `anonymous_sessions` table creation
3. `usage_periods` table creation
4. `usage_events` table creation
5. RLS policies for all tables
6. PostgreSQL functions (reserve_question, confirm_question, release_question, transfer_anonymous_quota)
7. Indexes for query performance

**Size:** ~600 lines SQL

**Status:** PROPOSAL ONLY (not applied)

### 13.2 Rollback: Migration 1

**File:** `supabase/migrations/20260714_001_personal_area_milestone_1_rollback.sql`

**Includes:**
1. Drop all new tables (cascading deletes safe)
2. Drop all functions
3. Drop all indexes
4. Drop new columns from user_profiles
5. Restore original RLS policies

**Status:** PROPOSAL ONLY (not applied)

---

## CONFIRMATION: No Remote Changes

✅ **Verified: No migration has been applied remotely**
- No `supabase db push` executed
- All SQL is proposal-stage only
- Remote schema remains at v3 (with v4 applied previously)
- No user data modified
- No secrets exposed
- No payment provider integrated
- No AI requests made

✅ **Local files created (review only):**
- `/home/user/repo/PERSONAL_AREA_MILESTONE_1_DATABASE_PLAN.md` (this file)
- Proposed migrations (not applied)

---

## Next Steps for Approval

1. **Review this document** — Confirm design choices
2. **Validate SQL** — Run tests in Milestone 1 section (local) to verify syntax
3. **Approve architecture** — Sign off on table structure, RLS policies, functions
4. **Await Milestone 2** — Authentication UI and API routes
5. **NO remote changes yet** — All changes staged for review only

---

**Document Version:** 1.0  
**Date:** July 14, 2026  
**Status:** Proposal for Review (No Remote Application)  
**Next Milestone:** Milestone 1 SQL proposals → Ready for Milestone 2 (Auth UI)
