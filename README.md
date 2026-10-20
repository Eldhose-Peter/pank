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
Run the Vitest test suite (24 unit tests covering split calculation, penny rounding, zero-sum balances, debt simplification, and group validation):
```bash
npm test
```

### 5. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
