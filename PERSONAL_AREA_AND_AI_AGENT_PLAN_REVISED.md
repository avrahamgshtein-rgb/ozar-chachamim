# אוצר חכמים — Personal Area & AI Research Agent Implementation Plan (REVISED)

**Date:** July 14, 2026  
**Version:** 2.0 (Revised)  
**Status:** Awaiting Approval Before Milestone 1

---

## VERIFICATION STATUS

### Verified Facts from Repository ✅

| Fact | Source | Verification |
|------|--------|---------------|
| **Next.js version** | `nextjs-app/package.json:19` | 15.1.0 ✅ |
| **React version** | `nextjs-app/package.json:20` | 19.0.0 ✅ |
| **Zustand installed** | `nextjs-app/package.json:23` | 5.0.1 ✅ (no store implementation yet) |
| **Supabase JS** | `nextjs-app/package.json:13-14` | supabase-js 2.45.0, @supabase/ssr 0.5.2 ✅ |
| **Sentry** | `nextjs-app/package.json:12` | @sentry/nextjs 10.65.0 ✅ |
| **Vercel Analytics** | `nextjs-app/package.json:15` | 1.3.1 ✅ |
| **D3 & Leaflet** | `nextjs-app/package.json:17-18` | d3 7.9.0, leaflet 1.9.4 ✅ |
| **Supabase schema** | `/supabase-schema-v3.sql, -v4.sql` | Tables exist: sages, connections, research_content, user_profiles, bookmarks, view_history ✅ |
| **PostgreSQL FTS** | `supabase-schema-v3.sql:56-58` | search_vector tsvector with GIN index ✅ |
| **Existing RLS** | `supabase-schema-v3.sql:173-195` | Public read on sages/connections/research ✅ |
| **Client search** | `nextjs-app/lib/search.ts` | Hebrew normalization, fuzzy matching (no semantic) ✅ |
| **Locale routing** | `nextjs-app/middleware.ts` | he/en/ru support ✅ |
| **API routes** | `nextjs-app/app/api/` | Only `/api/research/[id]` exists ✅ |
| **Supabase credentials** | `nextjs-app/lib/supabase.ts:4-5` | Public anon key hardcoded (acceptable for client) ✅ |
| **No Stripe code** | Full grep -r | No stripe.* files or dependencies ✅ |
| **No AI integration** | Full grep -r | No anthropic, openai, claude imports ✅ |
| **No auth implementation** | `nextjs-app/app/api/auth/` | Does not exist ✅ |
| **No chat tables** | `supabase-schema-v3.sql` | chat_sessions, chat_messages not in schema ✅ |
| **Deployment** | `nextjs-app/next.config.ts` | Configured for Vercel (remotePatterns for supabase) ✅ |

### Unresolved Assumptions ❓

| Assumption | Required Info | Impact |
|-----------|---|---|
| **Active Supabase project** | Project URL + current schema version | All database work depends on this |
| **Stripe vs other payment** | Which provider is configured/desired? | Core billing architecture |
| **AI provider credentials** | Anthropic API key available? Other providers? | Core agent functionality |
| **Email service** | Resend, SendGrid, or built-in Supabase? | Auth email verification flows |
| **Current Supabase Auth status** | Is auth.users table active? RLS configured? | Foundation for personal area |
| **Wikipedia API access** | Any existing Wikimedia integration? | Fallback source implementation |
| **Anonymous session strategy** | Cookie, JWT, or other? | Trial usage tracking |
| **Vector search requirement** | For MVP, is semantic search needed, or just keyword? | Research retrieval implementation |

---

## SECTION 1: Revised Architecture Overview

### 1.1 Core Principles (Updated)

**Critical Changes from Original Plan:**

1. **No AI model hard-coded** — Provider-neutral interface
   - Configuration-driven model selection
   - Support multiple providers (Anthropic, OpenAI, mock)
   - Per-request cost and token limits

2. **No Stripe lock-in** — Billing provider abstraction
   - Configuration-driven provider selection
   - Adapter pattern for multiple payment processors
   - Core entitlement logic decoupled from Stripe

3. **Corrected annual subscription** — Same monthly allowance, discounted annual billing
   - Annual: 12 × 100 questions = 1200 total, delivered as monthly resets
   - Monthly: 100 questions per billing month
   - No rollover; monthly reset on billing date
   - Unused questions do NOT carry forward

4. **No bonus packs in MVP** — Future extensibility only
   - Architecture supports credit purchases
   - No checkout, UI, or webhook handling for add-ons in initial launch
   - All plans: 3/7/100 question limits only

5. **Wikipedia as automatic fallback** — Not disabled
   - Query site research first
   - If insufficient, query Hebrew Wikipedia
   - If Hebrew missing, query English Wikipedia
   - Always label Wikipedia-derived claims

6. **Anonymous trial strengthened** — Server-side validation
   - Signed server-side session (not client-side localStorage)
   - Concurrent request prevention
   - Rate limiting and abuse detection

7. **Usage accounting atomic** — Database transactions
   - Reserve quota before AI call
   - Release if AI call fails
   - Prevent double-spending on concurrent requests

---

## SECTION 2: Verified Supabase Schema & RLS

### 2.1 Existing Tables (Production)

**Already in supabase-schema-v3.sql:**

```sql
-- Public read access (anyone)
public.sages
  ├── id (TEXT PRIMARY KEY)
  ├── name_he, name_en
  ├── era, era_key, period_order
  ├── region, coordinates, migration_path
  ├── primary_field, tags, summary, core_concept
  ├── search_vector (GIN index for FTS)
  └── RLS: SELECT public

public.connections
  ├── id (BIGSERIAL PRIMARY KEY)
  ├── source_id, target_id (FK → sages.id)
  ├── connection_type, historical_period, notes
  └── RLS: SELECT public

public.research_content
  ├── id (BIGSERIAL PRIMARY KEY)
  ├── sage_id (UNIQUE FK → sages.id)
  ├── content_text (full research)
  ├── content_summary, source_file, word_count
  └── RLS: SELECT public, INSERT public

-- User data (auth-linked)
public.user_profiles
  ├── id (UUID PK, FK → auth.users)
  ├── display_name, email_verified
  ├── language, theme
  ├── created_at, updated_at
  └── RLS: SELECT/UPDATE only own record

public.bookmarks
  ├── id, user_id (FK), sage_id (FK)
  ├── note, created_at
  └── RLS: SELECT/INSERT/DELETE only own records

public.view_history
  ├── id, user_id (FK), sage_id (FK)
  ├── viewed_at, context
  └── RLS: SELECT only own records
```

**RLS Policies Already Defined:**
- `anyone_read_sages`: `SELECT USING (true)`
- `anyone_read_connections`: `SELECT USING (true)`
- `anyone_read_research`: `SELECT USING (true)`
- `anyone_insert_research`: `INSERT WITH CHECK (true)`
- `users_read_own_profile`: `SELECT USING (auth.uid() = id)`

### 2.2 New Tables Required (Milestone 2+)

**Milestone 2: Authentication & Personal Area**
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- This extends user_profiles table (can merge if preferred)
  -- Or use existing user_profiles + add subscription columns
  
  display_name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  language CHAR(2) DEFAULT 'he',
  theme TEXT DEFAULT 'dark',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Milestone 3: Usage Entitlement (before Milestone 4)**
```sql
CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Plan tracking
  subscription_status TEXT DEFAULT 'trial',
    -- 'trial_anonymous', 'trial_registered', 'active', 'expired', 'canceled'
  subscription_plan TEXT, -- 'monthly', 'annual', null
  
  -- Quota (monthly reset)
  questions_allowed INT DEFAULT 100,
  questions_used INT DEFAULT 0,
  questions_reset_at TIMESTAMPTZ,
  
  -- Billing
  payment_provider TEXT, -- 'stripe', 'paypal', 'custom'
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  
  -- Status
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_status CHECK (
    subscription_status IN ('trial_anonymous', 'trial_registered', 'active', 'expired', 'canceled')
  )
);

CREATE INDEX idx_entitlements_user ON public.entitlements(user_id);
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_entitlement"
  ON public.entitlements FOR SELECT
  USING (auth.uid() = user_id);
```

**Milestone 4: Chat & Research Retrieval**
```sql
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  
  -- Metadata for citations
  sources JSONB, -- [{sage_id, sage_name_he, title, confidence}]
  
  -- Cost tracking
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(10, 8),
  
  -- Quality
  feedback_rating INT, -- 1-5, optional user rating
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at ASC);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_messages"
  ON public.chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );
```

**Milestone 5: Usage Logging & Audit**
```sql
CREATE TABLE public.usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  event_type TEXT NOT NULL,
    -- 'chat_message', 'anonymous_trial', 'password_reset', 'sage_view'
  
  sage_id TEXT,
  query_chars INT,
  response_chars INT,
  tokens_input INT,
  tokens_output INT,
  cost_usd DECIMAL(10, 8),
  
  -- Rate limit tracking
  ip_address INET,
  http_user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_log_user ON public.usage_log(user_id, created_at DESC);
CREATE INDEX idx_usage_log_ip ON public.usage_log(ip_address, created_at DESC);
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_usage"
  ON public.usage_log FOR SELECT
  USING (auth.uid() = user_id);
```

---

## SECTION 3: Retrieval Architecture (Detailed)

### 3.1 Available Infrastructure

**What exists:**
- PostgreSQL full-text search (search_vector tsvector column on sages table)
- GIN index on search_vector
- 292 research documents stored as JSON in `/public/research/*.json`
- Existing client-side fuzzy search in `lib/search.ts` (Hebrew normalization only)
- No embeddings infrastructure, no vector columns, no pg_trgm

**What does NOT exist:**
- Semantic embeddings
- Vector index (pgvector)
- Local embedding model
- Embedding generation pipeline
- Embedding storage

### 3.2 MVP Retrieval Strategy (PostgreSQL FTS Only)

**Phase 1: Keyword Search**

1. **Parse user query for sage names**
   ```typescript
   function extractMentionedSages(query: string): Sage[] {
     // Use existing fuzzy search: lib/search.ts
     const sageMatches = searchSagesLocal(allSages, query, limit: 5)
     return sageMatches
   }
   ```

2. **If sage mentioned: Direct lookup**
   ```sql
   SELECT * FROM research_content
   WHERE sage_id = ANY($1::TEXT[])
   LIMIT 5
   ```

3. **If no sage: PostgreSQL full-text search**
   ```sql
   SELECT * FROM research_content rc
   WHERE EXISTS (
     SELECT 1 FROM sages s
     WHERE s.id = rc.sage_id
     AND s.search_vector @@ plainto_tsquery('hebrew', $1)
   )
   LIMIT 3
   ```

4. **Fallback: Keyword match across content**
   ```sql
   SELECT rc.*, s.name_he FROM research_content rc
   JOIN sages s ON s.id = rc.sage_id
   WHERE rc.content_text ILIKE '%' || $1 || '%'
   LIMIT 3
   ```

5. **Return with metadata**
   ```typescript
   interface ResearchChunk {
     sage_id: string
     sage_name_he: string
     sage_name_en?: string
     content: string (up to 2000 chars)
     source_file: string
     word_count: number
     confidence: number (0-1, based on match type)
   }
   ```

### 3.3 Hebrew Text Normalization

**Reuse existing from `lib/search.ts`:**
- Strip nikud (diacritics)
- Strip gershayim/geresh/quotes
- Unify final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ)
- Lowercase
- Trim whitespace

**Applied to:**
- User query
- Sage names before matching
- Research document chunk headings (if extracting)

### 3.4 Chunking Strategy for Long Documents

**Rule:** No document chunk >2000 characters
1. Load research document (often 5000-15000 chars)
2. Split by periods + newlines, keeping chunks ≤2000 chars
3. Add sage context to each chunk (sage name, era, field)
4. Tag each chunk with source_file + position
5. Index all chunks in retrieval

**Chunk metadata stored:**
- `chunk_id` (source_file + offset)
- `sage_id`
- `sage_name_he`, `sage_name_en`
- `chunk_text` (max 2000 chars)
- `chunk_start_position`
- `is_header` (boolean, if chunk is a title/heading)

### 3.5 Citation Generation

**After AI response:**
1. Extract mentioned sage names from response
2. Look up each sage in retrieved research chunks
3. For each sage, find the chunk that best supports the claim
4. Build citation:
   ```json
   {
     "sage_id": "1",
     "sage_name_he": "הרמב״ם",
     "sage_name_en": "Rambam",
     "source_file": "1.en.json",
     "excerpt": "The Rambam was born in Córdoba...",
     "confidence": 0.92
   }
   ```
5. Insert citations into response text using markers: `[Source: Rambam]`

**Validation:** Reject citations for sages NOT mentioned in retrieved documents

### 3.6 Future Phase: Semantic Search

**NOT in MVP.** Planned for Phase 2 (after billing launches):
1. Choose embedding model (e.g., mBERT for Hebrew, nomic-embed-text for cost)
2. Generate embeddings for all research chunks
3. Store in pgvector table
4. Create HNSW index for fast similarity search
5. Hybrid ranking: 30% keyword + 70% semantic
6. Update retrieval_service.ts to call embedding API on user query
7. Measure query time and cost impact

---

## SECTION 4: Billing Architecture (Provider-Neutral)

### 4.1 Billing Provider Abstraction

**Do NOT hard-code Stripe.** Create adapter pattern:

```
src/billing/
  types.ts (interfaces)
  billingService.ts (core logic, provider-agnostic)
  entitlementService.ts (quota management)
  webhookService.ts (handle provider events)
  providers/
    ├── stripe.ts (Stripe adapter, if credentials available)
    ├── paypal.ts (PayPal adapter, stub for future)
    └── mock.ts (Mock provider for testing)
```

**types.ts:**
```typescript
// Core interfaces (provider-independent)
interface Subscription {
  id: string
  user_id: UUID
  plan: 'monthly' | 'annual'
  status: 'active' | 'canceled' | 'expired'
  billing_cycle_start: Date
  billing_cycle_end: Date
  auto_renew: boolean
}

interface PricingPlan {
  id: string
  name: string
  currency: string
  price: Decimal
  questions_per_month: number
  billing_interval_months: number
}

interface CheckoutSession {
  provider: string // 'stripe', 'paypal', 'custom'
  session_id: string
  checkout_url: string
  expires_at: Date
}

interface WebhookEvent {
  provider: string
  type: string // 'subscription.created', 'payment.succeeded', etc.
  data: any
}
```

**billingService.ts (provider-agnostic):**
```typescript
class BillingService {
  constructor(private provider: IBillingProvider) {}
  
  async createCheckout(userId: UUID, planId: string): Promise<CheckoutSession> {
    // Get plan config from database (not hard-coded)
    const plan = await db.pricing_plans.findById(planId)
    // Delegate to provider adapter
    return this.provider.createCheckout(userId, plan)
  }
  
  async handleWebhook(event: WebhookEvent): Promise<void> {
    // Delegate event handling to provider
    await this.provider.handleWebhook(event)
  }
  
  async getSubscriptionStatus(userId: UUID) {
    return db.entitlements.findByUserId(userId)
  }
}
```

**providers/stripe.ts (Stripe adapter):**
```typescript
class StripeProvider implements IBillingProvider {
  private stripe: Stripe.Stripe
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    this.stripe = new Stripe(apiKey)
  }
  
  async createCheckout(userId: UUID, plan: PricingPlan): Promise<CheckoutSession> {
    // Only if Stripe is configured
    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID_MONTHLY, // From env, not hard-coded
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/billing/success`,
      cancel_url: `${process.env.APP_URL}/billing/cancel`,
    })
    return { provider: 'stripe', session_id: session.id, checkout_url: session.url }
  }
}
```

### 4.2 Pricing Configuration (NOT Hard-Coded)

**Store in database table:**
```sql
CREATE TABLE public.pricing_plans (
  id TEXT PRIMARY KEY,
  
  -- Metadata
  name TEXT NOT NULL, -- 'Monthly', 'Annual', 'Trial'
  description TEXT,
  
  -- Entitlements
  questions_per_month INT NOT NULL,
  billing_interval_months INT, -- 1 for monthly, 12 for annual
  
  -- Pricing
  currency CHAR(3) DEFAULT 'ILS',
  price DECIMAL(10, 2),
  
  -- Provider mappings
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  paypal_plan_id TEXT,
  
  is_visible BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data (configurable, not in code):
INSERT INTO pricing_plans VALUES
  ('trial_anonymous', 'Anonymous Trial', null, 3, null, 'ILS', 0, null, null, null, true, true, NOW()),
  ('trial_registered', 'Registered Trial', null, 7, null, 'ILS', 0, null, null, null, true, true, NOW()),
  ('monthly', 'Monthly Plan', '100 questions/month', 100, 1, 'ILS', 19.90, 'prod_stripe_xxx', 'price_stripe_xxx', null, true, true, NOW()),
  ('annual', 'Annual Plan', '100 questions/month (12 months)', 100, 12, 'ILS', 199.00, 'prod_stripe_yyy', 'price_stripe_yyy', null, true, true, NOW());
```

### 4.3 Unresolved Payment Decision

**Required before Milestone 6:**
- Confirm which payment provider is available/desired
- Provide credentials (Stripe API keys, PayPal merchant account, etc.)
- Confirm currency and pricing
- Confirm tax/VAT handling for Israel

**Options:**
1. **Stripe** — Global, PCI Level 1, supports ILS, requires business account
   - Needs: API keys, product/price IDs configured
   - Needs: Webhook secret for events

2. **PayPal** — Global, lower fees potentially, supports ILS
   - Needs: Business account, merchant ID
   - Needs: OAuth setup if using PayPal integration

3. **Israeli local provider** — (e.g., Bit, 2Checkout)
   - Needs: Business registration, payment processing agreement
   - Needs: Hebrew support

4. **Custom billing** — No payment processing
   - Use for testing MVP
   - Manually process payments later

---

## SECTION 5: AI Provider Architecture (Model-Neutral)

### 5.1 AI Provider Abstraction

**Do NOT hard-code Claude.** Create provider interface:

```
src/ai/
  types.ts
  agentService.ts
  modelRouter.ts
  citationService.ts
  promptInjectionDetector.ts
  providers/
    ├── anthropic.ts (Claude, if credentials available)
    ├── openai.ts (GPT, stub for future)
    └── mock.ts (Fake responses for testing)
```

**types.ts:**
```typescript
interface AIProvider {
  name: string // 'anthropic', 'openai', 'mock'
  models: string[] // ['claude-sonnet-5', 'claude-opus-4.8']
  
  complete(request: CompletionRequest): Promise<CompletionResponse>
  streamComplete(request: CompletionRequest): AsyncIterator<TextChunk>
  countTokens(text: string): number
  estimateCost(tokens: TokenCount): number
}

interface ModelConfig {
  provider: string // 'anthropic', 'openai', 'mock'
  model: string // 'claude-sonnet-5', 'gpt-4o'
  temperature: number
  max_tokens: number
  timeout_sec: number
}

interface CompletionRequest {
  system_prompt: string
  user_message: string
  context: ResearchChunk[]
  max_tokens: number
  temperature: number
}

interface CompletionResponse {
  content: string
  tokens_input: number
  tokens_output: number
  cost_usd: number
  stop_reason: string
}
```

**modelRouter.ts:**
```typescript
class ModelRouter {
  async selectModel(question: string): Promise<ModelConfig> {
    // Simple: Always use configured model
    // Advanced: Route complex questions to stronger model
    
    if (isSimpleFactualQuestion(question)) {
      return CONFIG.models.default // cheaper, faster
    } else {
      return CONFIG.models.complex // more capable
    }
  }
}
```

**agentService.ts:**
```typescript
class AgentService {
  private provider: AIProvider
  private retrieval: ResearchRetrievalService
  private wikipedia: WikipediaFallback
  
  async chat(userId: UUID, query: string): Promise<ChatResponse> {
    // 1. Validate
    checkRateLimit(userId)
    checkUsageQuota(userId)
    validateQueryInjection(query)
    
    // 2. Retrieve
    const siteSources = await this.retrieval.search(query)
    const isSufficient = evaluate(siteSources, query)
    
    // 3. Fallback to Wikipedia if needed
    let context = siteSources
    let wikipediaUsed = false
    if (!isSufficient) {
      const wikiSources = await this.wikipedia.search(query)
      context = [...siteSources, ...wikiSources]
      wikipediaUsed = wikiSources.length > 0
    }
    
    // 4. Call AI (provider-neutral)
    const response = await this.provider.complete({
      system_prompt: SYSTEM_PROMPT,
      user_message: query,
      context,
      max_tokens: 2000,
      temperature: 0.3,
    })
    
    // 5. Extract citations
    const citations = extractCitations(response.content, context)
    
    // 6. Validate response
    validateNoHallucinations(response.content, citations, context)
    
    // 7. Log & charge
    await logUsage(userId, query, response, wikipediaUsed)
    await decrementQuota(userId)
    
    return {
      content: response.content,
      citations,
      wikipedia_used: wikipediaUsed,
      tokens_input: response.tokens_input,
      tokens_output: response.tokens_output,
      cost_usd: response.cost_usd,
    }
  }
}
```

### 5.2 Anthropic Provider (Conditional on Credentials)

**providers/anthropic.ts:**
```typescript
class AnthropicProvider implements AIProvider {
  private client: Anthropic
  
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured. Set before using Anthropic provider.')
    }
    this.client = new Anthropic({ apiKey })
  }
  
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const systemWithContext = `${request.system_prompt}\n\nContext:\n${
      request.context.map(c => c.content).join('\n---\n')
    }`
    
    const message = await this.client.messages.create({
      model: 'claude-sonnet-5', // Configurable via CONFIG
      max_tokens: request.max_tokens || 2000,
      temperature: request.temperature || 0.3,
      system: systemWithContext,
      messages: [
        { role: 'user', content: request.user_message }
      ],
    })
    
    return {
      content: message.content[0].type === 'text' ? message.content[0].text : '',
      tokens_input: message.usage.input_tokens,
      tokens_output: message.usage.output_tokens,
      cost_usd: calculateCost(message.usage),
      stop_reason: message.stop_reason,
    }
  }
}
```

### 5.3 Mock Provider (for Testing)

**providers/mock.ts:**
```typescript
class MockProvider implements AIProvider {
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Return canned response (no API call)
    return {
      content: "The Rambam was a 12th-century Jewish philosopher.",
      tokens_input: 150,
      tokens_output: 15,
      cost_usd: 0,
      stop_reason: 'end_turn',
    }
  }
}
```

### 5.4 Model Configuration (Environment-Driven)

**Not in code. Use environment variables:**
```env
# AI Configuration
AI_PROVIDER=mock  # or 'anthropic', 'openai'
AI_MODEL_DEFAULT=claude-sonnet-5
AI_MODEL_COMPLEX=claude-opus-4.8 (for complex questions, if available)
ANTHROPIC_API_KEY=sk-ant-xxxxx (only needed if AI_PROVIDER=anthropic)
OPENAI_API_KEY=sk-xxxxx (for future)

# Cost limits
MAX_COST_PER_REQUEST=0.10 (USD, fail if exceeded)
```

**Load into config at startup:**
```typescript
const aiConfig = {
  provider: process.env.AI_PROVIDER || 'mock',
  model_default: process.env.AI_MODEL_DEFAULT || 'claude-sonnet-5',
  model_complex: process.env.AI_MODEL_COMPLEX || undefined,
  cost_limit: parseFloat(process.env.MAX_COST_PER_REQUEST || '0.10'),
}
```

---

## SECTION 6: Anonymous Trial Session Design

### 6.1 Session Creation (NOT Client-Side)

**User opens site (no account):**
1. Backend creates signed server-side session
2. Session stored in database: `public.anonymous_sessions`
3. Session ID returned as HTTP-only cookie
4. Cookie cannot be modified by client

**Schema:**
```sql
CREATE TABLE public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL, -- HMAC-SHA256 signed
  
  questions_remaining INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  ip_address INET,
  user_agent TEXT
);
```

### 6.2 Question Reservation

**User sends query:**
```typescript
async function reserveAnonymousQuestion(sessionId: UUID): Promise<boolean> {
  // Atomic database operation:
  const result = await db.anonymous_sessions.update(
    { id: sessionId },
    { questions_remaining: raw('questions_remaining - 1') },
    { where: { questions_remaining: { '>': 0 } } } // Only if > 0
  )
  
  return result.rowCount > 0 // True if reservation succeeded
}
```

**In transaction:**
1. Check questions_remaining > 0
2. Decrement atomically
3. If decrement succeeds, proceed with AI
4. If AI fails, increment back (transaction rollback)

### 6.3 Cookie Hijacking Prevention

**Session cookie attributes:**
- HttpOnly: true (no JavaScript access)
- Secure: true (HTTPS only)
- SameSite: Strict (no cross-site requests)
- Max-Age: 7 days
- Signed with HMAC-SHA256

**Rate limiting on IP:**
- Max 10 requests per minute per IP
- 30-minute cooldown after 3rd violation
- Log IP for abuse detection

### 6.4 Upgrade Path (Anonymous → Registered)

**User registers after using anonymous trial:**
1. Transfer remaining questions to registered trial (if any)
2. Add 7 registered trial questions (total: max 10)
3. Delete anonymous session record
4. Create registered trial entitlement record

```typescript
async function upgradeAnonymousToRegistered(sessionId: UUID, userId: UUID) {
  const anonSession = await db.anonymous_sessions.findById(sessionId)
  const remaining = anonSession.questions_remaining
  
  // Create registered entitlement
  await db.entitlements.create({
    user_id: userId,
    subscription_plan: 'trial_registered',
    questions_allowed: Math.min(remaining + 7, 10),
    questions_used: 0,
  })
  
  // Clean up anonymous session
  await db.anonymous_sessions.delete({ id: sessionId })
}
```

---

## SECTION 7: Wikipedia Fallback Integration

### 7.1 Automatic Fallback Logic

**Evaluate site source sufficiency:**
```typescript
function needsWikipediaFallback(
  query: string,
  siteSources: ResearchChunk[]
): boolean {
  if (siteSources.length === 0) return true // No site sources found
  
  const relevanceScore = calculateRelevance(siteSources, query)
  const confidenceThreshold = 0.6
  
  return relevanceScore < confidenceThreshold
}
```

**Fallback execution:**
```typescript
const siteSources = await retrieval.search(query)

let context = siteSources
let wikipediaUsed = false

if (needsWikipediaFallback(query, siteSources)) {
  const wikiResults = await wikipedia.search(query)
  if (wikiResults.length > 0) {
    context = [...siteSources, ...wikiResults]
    wikipediaUsed = true
  }
}
```

### 7.2 Wikipedia Source Implementation

**Use Wikimedia API, not scraping:**
```typescript
class WikipediaFallback {
  async search(query: string): Promise<ResearchChunk[]> {
    // Try Hebrew Wikipedia first
    let results = await this.queryWikimedia('he', query)
    
    // Fallback to English if Hebrew unavailable
    if (results.length === 0) {
      results = await this.queryWikimedia('en', query)
    }
    
    return results.map(r => ({
      source: 'wikipedia',
      source_language: r.lang,
      sage_id: null,
      content: r.extract.slice(0, 2000), // First 2000 chars
      confidence: 0.5, // Lower than site sources
    }))
  }
  
  private async queryWikimedia(lang: string, query: string) {
    const url = `https://${lang}.wikipedia.org/w/api.php`
    const params = {
      action: 'query',
      format: 'json',
      prop: 'extracts',
      exintro: true,
      explaintext: true,
      srsearch: query,
      utf8: true,
    }
    
    const response = await fetch(`${url}?${new URLSearchParams(params)}`)
    return response.json() // Return structured data
  }
}
```

### 7.3 Response Labeling

**Mark Wikipedia-derived content in response:**
```typescript
const response = {
  content: "The Rambam was born in Córdoba. (According to Wikipedia...)",
  sources: [
    { source: 'site', sage_id: '1', confidence: 0.95 },
    { source: 'wikipedia', lang: 'he', confidence: 0.5 },
  ],
  wikipedia_used: true,
}
```

**In UI, show distinction:**
- Site sources: Bold, full color
- Wikipedia sources: Lighter, italicized, labeled "Wikipedia"

### 7.4 Conflict Handling

**If site and Wikipedia disagree:**
```typescript
function presentConflict(siteSource: ResearchChunk, wikiSource: ResearchChunk) {
  return {
    content: `According to our research: [site quote]. 
              Wikipedia states: [wiki quote].
              The discrepancy may reflect different interpretations.`,
    note: "Conflicting sources detected. Site research takes precedence.",
  }
}
```

---

## SECTION 8: Atomic Usage Accounting

### 8.1 Question Reservation Flow

**Database transaction:**
```sql
BEGIN TRANSACTION;

-- Step 1: Check quota
SELECT questions_remaining INTO @remaining
FROM public.entitlements
WHERE user_id = $1
FOR UPDATE; -- Lock row to prevent race conditions

IF @remaining <= 0 THEN
  ROLLBACK;
  RAISE EXCEPTION 'Quota exceeded';
END IF;

-- Step 2: Reserve (decrement)
UPDATE public.entitlements
SET questions_used = questions_used + 1,
    updated_at = NOW()
WHERE user_id = $1;

-- Step 3: Log attempt
INSERT INTO public.usage_log (user_id, event_type, created_at)
VALUES ($1, 'chat_reserved', NOW());

COMMIT;
```

### 8.2 Release on Failure

**If AI call fails after reservation:**
```typescript
async function chatWithRecovery(userId: UUID, query: string) {
  // Reserve quota
  const reserved = await reserveQuestion(userId)
  if (!reserved) throw new QuotaExceededError()
  
  try {
    // Call AI
    const response = await aiProvider.complete({ ... })
    
    // Success: Log actual cost
    await logUsage(userId, {
      event_type: 'chat_completed',
      tokens_input: response.tokens_input,
      tokens_output: response.tokens_output,
      cost_usd: response.cost_usd,
    })
    
    return response
  } catch (error) {
    // Failure: Release quota
    await releaseQuestion(userId)
    
    // Log attempt (for debugging)
    await logUsage(userId, {
      event_type: 'chat_failed',
      error_message: error.message,
    })
    
    throw error
  }
}
```

### 8.3 Concurrent Request Prevention

**Table-level lock in database:**
```sql
CREATE TABLE public.question_reservations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Procedure: Try to acquire lock (30 second timeout)
CREATE OR REPLACE FUNCTION reserve_question(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  INSERT INTO question_reservations (user_id, locked_at)
  VALUES (p_user_id, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET locked_at = NOW()
  WHERE question_reservations.locked_at < NOW() - INTERVAL '30 seconds'
  RETURNING TRUE INTO v_result;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```typescript
const gotLock = await db.rpc('reserve_question', { p_user_id: userId })
if (!gotLock) {
  throw new Error('Request already in progress. Please wait.')
}

try {
  // Execute request
} finally {
  // Release lock
  await db.question_reservations.delete({ user_id: userId })
}
```

---

## SECTION 9: Supabase Auth Reuse

### 9.1 Existing Auth Tables

**Supabase provides `auth.users` table (managed):**
- No direct SQL access needed
- Email, password_hash, email_confirmed_at managed by Supabase Auth
- UUID primary key
- JWT tokens auto-generated

### 9.2 Extending with Profiles

**Do NOT duplicate password/email.** Use profiles table:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Application-specific fields
  display_name TEXT,
  language CHAR(2) DEFAULT 'he',
  theme TEXT DEFAULT 'dark',
  email_notifications BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "users_select_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### 9.3 Password Reset (Supabase Auth Built-In)

**No custom table needed. Supabase Auth handles:**
1. `POST /auth/v1/recover` — Send reset link
2. `POST /auth/v1/verify` — Verify token
3. `POST /auth/v1/set-password` — Update password

**Frontend uses:**
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email)
// Supabase sends email with link
// User clicks: app.com/reset-password?token=xxx
// Form submits new password via supabase.auth.updateUser({ password: newPassword })
```

### 9.4 Email Verification

**Supabase Auth built-in:**
1. On signup, Supabase sends verification email
2. User clicks link → token confirmed in auth.users
3. App checks `auth.users.email_confirmed_at` before granting features

**No custom verification table needed.**

---

## SECTION 10: Simplified Account Deletion (MVP)

### 10.1 Deletion Workflow

**User requests deletion:**
```typescript
async function requestAccountDeletion(userId: UUID) {
  // Step 1: Cancel subscription immediately (stop charges)
  await cancelSubscription(userId)
  
  // Step 2: Mark for deletion (soft delete)
  await db.profiles.update(userId, {
    marked_for_deletion_at: new Date(),
    deletion_confirmed: false,
  })
  
  // Step 3: Send confirmation email
  await emailQueue.queue({
    user_id: userId,
    template: 'account_deletion_confirm',
    data: { confirmation_link: generateConfirmationToken(userId) },
  })
  
  // Step 4: Hard delete after 30 days (via cron job)
  // (Set up later; for now, manual admin deletion)
}
```

### 10.2 Data Cleanup

**What to delete:**
- ✅ auth.users (managed by Supabase, cascades to profiles)
- ✅ public.profiles (ON DELETE CASCADE)
- ✅ public.chat_sessions, chat_messages (ON DELETE CASCADE)
- ✅ public.entitlements (ON DELETE CASCADE)
- ✅ public.usage_log (ON DELETE CASCADE or soft-delete for audit)
- ❌ Bookmarks/history (keep anonymized, or soft-delete)

**What to retain (audit):**
- Usage logs with NULL user_id (for fraud detection)
- Subscription records (for accounting/tax)
- Invoice data (for accounting)

### 10.3 Admin Deletion Procedure

**For MVP, manual deletion via admin SQL:**
```bash
# 1. Find user
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

# 2. Delete (cascading)
DELETE FROM auth.users WHERE id = 'uuid-here';

# 3. Verify
SELECT COUNT(*) FROM public.chat_messages WHERE user_id = 'uuid-here';
# Should return 0
```

**Future: Implement automated 30-day hard delete (Milestone 3+)**

---

## SECTION 11: Implementation Milestones (Revised)

### Milestone 1: Repository & Database Verification

**Deliverables:**
- ✅ Revised plan document (this file)
- ✅ Verified architecture report (Section 1-3)
- Database migration proposal (new tables only)
- RLS policy proposal
- **No production database changes**

**Timeline:** 1 day (review only)

**Checklist:**
- [ ] Owner reviews and approves architecture
- [ ] Confirms Supabase project URL
- [ ] Confirms active schema version (v3 or v4)
- [ ] Confirms payment provider decision
- [ ] Confirms AI provider credentials (if not mock)
- [ ] Confirms email service configuration
- [ ] All assumptions resolved

**Exit Criteria:** Owner approval + all unknowns resolved

---

### Milestone 2: Authentication & Personal Area

**Deliverables:**
- `nextjs-app/app/auth/register/page.tsx`
- `nextjs-app/app/auth/login/page.tsx`
- `nextjs-app/app/auth/verify-email/page.tsx`
- `nextjs-app/app/profile/page.tsx`
- `nextjs-app/lib/auth-client.ts` (client helpers)
- `nextjs-app/app/api/auth/register/route.ts`
- `nextjs-app/app/api/auth/login/route.ts`
- `nextjs-app/app/api/auth/logout/route.ts`
- Database: profiles table + RLS
- Tests: registration, verification, login, logout

**Timeline:** 1 week (estimate)

**Depends On:** Milestone 1 completion

**Exit Criteria:** User can register → verify email → log in → log out

---

### Milestone 3: Usage Entitlement (Before Payment)

**Deliverables:**
- Anonymous trial (3 questions, server-side session)
- Registered trial (7 additional after verification)
- Usage quota enforcement
- Rate limiting (10 queries/min, 30-sec cooldown on limit)
- Mock AI provider (return canned responses)
- Tests: quota checks, concurrent requests, abuse prevention

**Database:**
- `anonymous_sessions` table
- `entitlements` table
- `usage_log` table

**Timeline:** 1 week

**Depends On:** Milestone 2

**Exit Criteria:** Anonymous user can send 3 messages → upgrade on registration → 7 more messages

---

### Milestone 4: Research Retrieval & Chat UI

**Deliverables:**
- PostgreSQL full-text search (use existing search_vector)
- Research chunking & retrieval
- Citation extraction
- Chat UI components (ChatInterface, ChatMessage, ChatSidebar)
- Chat session storage
- Mock AI responses (no real AI needed for testing)

**Database:**
- `chat_sessions` table
- `chat_messages` table

**Timeline:** 1-2 weeks

**Depends On:** Milestone 3

**Exit Criteria:** User can chat with mock AI, see citations, view chat history (no real AI yet)

---

### Milestone 5: AI Agent Integration

**Deliverables:**
- `src/ai/` (provider abstraction)
- `src/ai/providers/anthropic.ts` (if API key available)
- `src/ai/providers/mock.ts` (for testing)
- Prompt injection detection
- Wikipedia fallback service
- Response validation (no hallucinations)
- Streaming chat UI (optional)
- Token counting and cost logging

**Depends On:**
- Milestone 3 (quota system)
- Milestone 4 (chat UI)
- AI provider credentials available (Milestone 1)

**Timeline:** 1-2 weeks

**Exit Criteria:** Real AI responses with citations, cost tracking, Wikipedia fallback works

---

### Milestone 6: Subscription Billing

**Deliverables:**
- `src/billing/` (provider abstraction)
- `src/billing/providers/stripe.ts` (if Stripe confirmed)
- Pricing UI (PricingTable component)
- Checkout flow
- Webhook handlers (subscription.created, payment_succeeded, etc.)
- Subscription status display
- Invoice history

**Database:**
- `pricing_plans` table (configurable)
- Extend `entitlements` with payment provider fields

**Depends On:** ALL previous milestones + Payment provider decision (Milestone 1)

**Timeline:** 2 weeks

**Exit Criteria:** User can subscribe to monthly/annual plan → usage resets monthly → cancel subscription

---

### Milestone 7: Polish & Launch

**Deliverables:**
- Email notifications (welcome, verification, password reset, billing reminders)
- Error boundaries & error handling
- Analytics & monitoring (Sentry)
- Security audit (OWASP top 10)
- Performance testing (Lighthouse ≥90)
- Documentation & runbooks
- Admin dashboard (optional)

**Timeline:** 1 week

**Exit Criteria:** All Lighthouse checks pass, no Sentry errors, ready for production

---

## SECTION 12: Files Summary

### Milestone 1: No Files (Review Only)

### Milestone 2: Authentication

**New Files:**
```
nextjs-app/
├── app/auth/
│   ├── register/page.tsx
│   ├── login/page.tsx
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── app/api/auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── verify-email/route.ts
├── app/profile/
│   ├── page.tsx
│   ├── edit/page.tsx
│   └── settings/page.tsx
├── lib/auth-client.ts
├── lib/validators.ts
└── components/auth/
    ├── LoginForm.tsx
    ├── RegisterForm.tsx
    ├── PasswordResetForm.tsx
    └── VerifyEmailBanner.tsx
```

### Milestone 3: Entitlements

**New Files:**
```
nextjs-app/
├── lib/entitlementService.ts
├── lib/rateLimiter.ts
├── app/api/usage/balance/route.ts
└── components/billing/
    └── UsageDisplay.tsx
```

### Milestone 4: Chat

**New Files:**
```
nextjs-app/
├── app/chat/
│   ├── page.tsx
│   └── [sessionId]/page.tsx
├── components/chat/
│   ├── ChatInterface.tsx
│   ├── ChatMessage.tsx
│   ├── SourceCitation.tsx
│   ├── ChatSidebar.tsx
│   └── QueryInput.tsx
└── lib/retrievalService.ts
```

### Milestone 5: AI

**New Files:**
```
src/
├── ai/
│   ├── types.ts
│   ├── agentService.ts
│   ├── promptInjectionDetector.ts
│   ├── citationExtractor.ts
│   ├── providers/
│   │   ├── anthropic.ts
│   │   ├── openai.ts (stub)
│   │   └── mock.ts
│   └── wikipedia.ts
```

### Milestone 6: Billing

**New Files:**
```
src/
├── billing/
│   ├── types.ts
│   ├── billingService.ts
│   ├── webhookService.ts
│   ├── providers/
│   │   ├── stripe.ts
│   │   ├── paypal.ts (stub)
│   │   └── mock.ts
│   └── pricing.ts

nextjs-app/
├── app/billing/
│   ├── page.tsx
│   ├── success/page.tsx
│   └── cancel/page.tsx
├── app/api/billing/
│   ├── subscribe/route.ts
│   ├── status/route.ts
│   ├── cancel/route.ts
│   └── webhook/stripe/route.ts
└── components/billing/
    ├── PricingTable.tsx
    ├── SubscribeButton.tsx
    ├── CurrentPlanBadge.tsx
    └── InvoiceHistory.tsx
```

---

## SECTION 13: Unresolved Questions for Owner

**Before Milestone 1 completes, confirm:**

1. **Supabase Project:**
   - What is the current project URL?
   - Which schema version is active (v3, v4, or other)?
   - Are RLS policies already enforced?

2. **Payment Provider:**
   - Is Stripe configured? (If yes, provide API keys, product IDs)
   - Alternative: PayPal, Israeli provider, or custom?
   - Pricing: Confirm 19.90 ILS (monthly) and 199 ILS (annual)?
   - Currency: ILS, USD, or both?

3. **AI Provider:**
   - Is Anthropic API key available?
   - Confirm model: Claude Sonnet 5, or alternative?
   - Alternative: OpenAI, mock for MVP?

4. **Email Service:**
   - Resend, SendGrid, or Supabase-managed?
   - How are password reset / verification emails sent currently?

5. **Vector Search:**
   - Is semantic search needed for MVP, or keyword-only?
   - If semantic, which embedding model?

6. **Anonymous Trial:**
   - Should cookie be reset on browser close, or 7-day persistent?
   - Allowed to upgrade anonymous trial to registered trial?

7. **Wikipedia:**
   - Enabled by default (automatic fallback when site insufficient)?
   - Or disabled by default, opt-in only?
   - Hebrew first, then English fallback?

---

## VERIFICATION CHECKLIST

**Before any code or database migration, verify:**

- [ ] Owner reviews entire revised plan
- [ ] Supabase project identified & schema version confirmed
- [ ] Payment provider decision made (Stripe, PayPal, custom, or mock)
- [ ] AI provider credentials available (Anthropic, OpenAI, or mock)
- [ ] Email service configured
- [ ] No production database has been modified
- [ ] No code has been written
- [ ] Architecture decisions approved
- [ ] Assumptions list is complete & resolved

---

## SUMMARY: Current Status

✅ **Completed:**
- Verified existing architecture (tech stack, dependencies, database, API routes)
- Analyzed Supabase schema v3/v4
- Designed provider-neutral billing interface
- Designed provider-neutral AI interface
- Designed corrected annual subscription model (100/month, 12 months)
- Designed anonymous trial with server-side session
- Designed atomic usage accounting
- Designed Wikipedia fallback system
- Designed 7-milestone implementation roadmap

❓ **Awaiting Owner Decision:**
- Supabase project URL & schema version
- Payment provider (Stripe, PayPal, other, or mock)
- AI provider credentials
- Email service configuration
- Wikipedia enabled/disabled by default
- Anonymous trial cookie persistence

🔒 **No Production Changes Yet:**
- No database migrations applied
- No code written
- No credentials committed to git
- All work staged for approval

---

**Document Version:** 2.0 (Revised)  
**Date:** July 14, 2026  
**Status:** Awaiting Owner Approval  
**Next Step:** Resolve unresolved questions → proceed to Milestone 1
