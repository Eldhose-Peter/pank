# AI-Powered Expense Sharing Web App

A responsive, browser-based expense-sharing platform with deterministic accounting, multi-payer support, and conversational natural-language expense entry.

---

## Architecture & Specifications Document

Detailed architectural blueprints, complete 12-table relational schema with Row Level Security (RLS) policies, domain models, and accounting proofs are documented in:
- [Phase 1 Architecture Design](file:///home/eldho/.gemini/antigravity-cli/brain/a1b5f304-874a-4060-afd4-2538de60ecc9/phase-1-architecture-design.md)

---

## Phase 1: Foundation (Completed)

1. **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr`, Zod, Vitest.
2. **Relational Database Schema (12 Tables)**:
   - `profiles`
   - `groups`
   - `group_members` (supports authenticated users & placeholder members for friends who haven't registered yet)
   - `group_invitations` (shareable invite tokens with expiration and usage limits)
   - `expenses` (stores integer minor units like paise; idempotency protection)
   - `expense_payments` (multi-payer support)
   - `expense_splits` (participant shares for equal, exact, percentage, shares splits)
   - `settlements`
   - `expense_audit_log` (immutable change history)
   - `conversation_sessions`, `conversation_messages`, `expense_drafts` (AI natural language pipeline)
3. **Row Level Security (RLS)**:
   - Strict group isolation using `is_group_member()` and `is_group_admin()` `SECURITY DEFINER` functions to eliminate recursive policy traps.
4. **Deterministic Accounting Engine**:
   - Minor currency units (`BIGINT` paise / cents).
   - Largest Remainder Method (Hare-Niemeyer method) for penny-perfect remainder distribution.
   - Zero-sum group balance guarantee ($\sum \text{NetBalance} = 0$).
   - Debt simplification algorithm (min-cash-flow greedy reduction).
5. **Group Management & Invitations Service**:
   - `GroupService`: group creation, membership management, invitation generation, and placeholder claiming.
   - REST API Route Handlers (`/api/groups`, `/api/groups/[groupId]`, `/api/groups/[groupId]/members`, `/api/groups/[groupId]/invitations`, `/api/invitations/[token]/accept`).

---

## Phase 2: Expense Engine (Completed)

1. **Manual Expense Creation & Editing**:
   - Server-side Zod validation (`createExpenseSchema`, `updateExpenseSchema`).
   - Full multi-payer allocation and split types (`equal`, `exact`, `percentage`, `shares`).
   - Idempotent expense creation with UUID key deduplication.
   - Atomic transactional persistence with complete audit history (`update_expense_transactional`, `delete_expense_transactional`).
2. **Settlements Engine**:
   - Repayment recording with validation (`payerMemberId !== payeeMemberId`, positive minor unit amount).
   - Soft delete and member membership enforcement.
3. **Authoritative Balances & Debts Service**:
   - `BalanceService`: aggregates net member balances, spending metrics, and simplified vs. direct pairwise debts.
   - Bilateral debt netting and greedy min-cash-flow transaction minimization.
4. **Route Handlers**:
   - `/api/groups/[groupId]/expenses` (GET, POST)
   - `/api/groups/[groupId]/expenses/[expenseId]` (GET, PATCH, DELETE)
   - `/api/groups/[groupId]/settlements` (GET, POST)
   - `/api/groups/[groupId]/settlements/[settlementId]` (DELETE)
   - `/api/groups/[groupId]/balances` (GET)
5. **Automated Test Suite**:
   - 44 comprehensive Vitest unit tests across 8 test suites verifying split math, remainder distribution, pairwise debt netting, expense service transactions, and settlement schemas.

---

## Phase 3: AI Integration (Gemini 2.5 Flash) (Completed)

1. **Structured Output Extraction**:
   - Powered by `@google/genai` using the `gemini-2.5-flash` model with JSON schema enforcement.
   - Extracts title, amount, currency, split type, payers, participants, and detects missing information.
   - Heuristic fallback engine for offline environments and CI pipelines.
2. **Member Resolution Engine**:
   - `MemberResolver`: Resolves "me"/"I"/"myself" to caller, performs exact case-insensitive matches, first-name matches, and fuzzy token similarity matching.
   - Disambiguates duplicate names and captures unresolved names with suggestion options or placeholder friend creation.
3. **Interactive Expense Drafts Workflow**:
   - `DraftService`:
     - Enforces strict separation: LLM extracts intent into JSON drafts; backend deterministically calculates authoritative penny-perfect splits.
     - Generates clarification questions when input is ambiguous (`pending_clarification`).
     - Displays editable preview when resolved (`ready_for_review`).
     - Explicit confirmation persists authoritative expense using the draft ID as an idempotency key (`confirmed`).
4. **Conversational Group Assistant**:
   - `ConversationService`: Grounds Gemini responses on live group balances, member net debts, and simplified payment paths.
5. **Route Handlers**:
   - `/api/groups/[groupId]/ai/parse` (POST): Natural-language text -> expense draft
   - `/api/groups/[groupId]/ai/drafts/[draftId]` (GET, PATCH): Fetch or edit draft preview
   - `/api/groups/[groupId]/ai/drafts/[draftId]/confirm` (POST): Explicit confirmation
   - `/api/groups/[groupId]/ai/drafts/[draftId]/reject` (POST): Reject draft
   - `/api/groups/[groupId]/ai/chat` (POST): Natural language Q&A about group balances
6. **Automated Test Suite**:
   - 56 comprehensive Vitest unit tests across 11 test suites.

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ (Node.js 22 recommended)
- A Supabase project (local CLI or cloud)

### 2. Environment Setup
Copy the sample environment file:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Migrations
Apply the migrations to your Supabase project in order:
```bash
# Using Supabase CLI (if running locally or linked):
supabase db push

# Or run the SQL files directly in the Supabase SQL Editor:
# 1. supabase/migrations/20261019000001_initial_schema.sql
# 2. supabase/migrations/20261019000002_rls_policies.sql
# 3. supabase/migrations/20261019000003_triggers_and_functions.sql
```

### 4. Running Tests
Run the Vitest test suite (56 unit tests covering split calculation, penny rounding, zero-sum balances, debt simplification, pairwise debts, Gemini AI expense extraction, member name resolution, and draft state machines):
```bash
npm test
```

### 5. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
