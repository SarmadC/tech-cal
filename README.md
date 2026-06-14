# Kure-Cal

Kure-Cal is a career operating system for discovering, planning, and acting on the tech events that move your professional goals forward.  
We combine high-quality curation, adaptive scoring, intelligent scheduling, and longitudinal analytics to help teams and individual contributors focus on the events that matter.

---

## Table of Contents

- [Kure-Cal](#kure-cal)
  - [Table of Contents](#table-of-contents)
  - [Product Overview](#product-overview)
  - [Feature Highlights](#feature-highlights)
  - [System Architecture](#system-architecture)
  - [Scoring \& Recommendations](#scoring--recommendations)
  - [Telemetry \& Monitoring](#telemetry--monitoring)
  - [Event Ingestion Pipeline](#event-ingestion-pipeline)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
  - [Community & Social Features](#community--social-features)
  - [Testing Strategy](#testing-strategy)
  - [Design Principles](#design-principles)
  - [Tech Stack](#tech-stack)

---

## Product Overview

- **Personalized discovery:** career-aware onboarding fuels a unified filtering pipeline and scoring system that ranks events by impact, networking value, and skill alignment.
- **Actionable planning:** calendar views, saved events, and intelligent reminders help users act on recommendations without leaving their workflow.
- **Operational analytics:** dashboards surface KPIs, goal progress, skill development, and networking outcomes, backed by Supabase analytics functions.
- **Growth loops:** telemetry, shadow scoring, and feature flags allow rapid iteration on algorithms while protecting production stability.

---

## Feature Highlights

- **Responsive Landing & Marketing**  
  Adaptive marketing site with motion-rich desktop experiences and touch-friendly mobile presentations (`src/components/landing`).

- **Career Onboarding**  
  Guided onboarding flow captures role, goals, skills, and preferences; completion is enforced across protected routes (`src/app/onboarding/career/page.tsx`).

- **Discovery Workspace**  
  A unified discovery surface with server-driven filtering, responsive layouts, detail drawers, and smart hinting (`src/app/discover/DiscoverClientView.tsx`, `src/hooks/useUnifiedServerFiltering.ts`).

- **Calendar OS**  
  FullCalendar-powered scheduling with event detail panels, quick filters, and deep linking across views (`src/app/calendar/CalendarClientView.tsx`).

- **Career Dashboard**  
  Goal progress, skill growth, networking insights, and event timelines rendered from the shared dashboard summary service once onboarding is complete (`src/app/(protected)/dashboard/page.tsx`, `src/services/dashboard/dashboardSummaryService.ts`).

- **Hackathon Coordination**  
  Team creation/join workflows, capacity validation, and participation analytics for hackathon cohorts (`src/app/hackathons/HackathonClientView.tsx`, `src/services/hackathonService.ts`).

---

## System Architecture

| Layer | Description |
| --- | --- |
| **Frontend** | Next.js App Router with client components for rich interactivity, device detection hooks, and context providers for auth, calendar, and notifications. |
| **Backend** | Supabase (Postgres, Auth, Storage) + Vercel KV + Upstash Redis for rate limiting and caching. API routes enforce onboarding, telemetry consent, and caching strategies. |
| **Data Access** | Strongly typed service layer (`src/services`) encapsulates Supabase queries, RPCs, caching, and transformations. |
| **State Management** | React Query handles client data fetching with hydration from server components; contexts manage cross-cutting concerns (auth, calendar, snackbars). |
| **Deployment** | Compatible with Vercel’s edge/runtime model; feature flags and shadow modes enable safe rollouts. |

Key server components & API entry points:

- Authenticated layout guard: `src/app/(protected)/layout.tsx`
- Filtered events API: `src/app/api/events/filtered/route.ts`
- Recommendations API: `src/app/api/events/recommendations/route.ts`
- Dashboard summary service: `src/services/dashboard/dashboardSummaryService.ts`

---

## Scoring & Recommendations

1. **Base Alignment Core** (`src/lib/recommendation/baseScorer.ts`)  
   Pure scoring function computes skill, goal, interest, and networking alignment without UI dependencies.

2. **Advanced Strategy** (`src/services/scoring/strategies/AdvancedScorer.ts`)  
   Adds career stage, timing, industry, and behavioral signals; exposed through a versioned strategy factory.

3. **Career Impact Enrichment** (`src/services/careerImpactEnrichmentService.ts`)  
   Orchestrates scoring strategy selection, optional shadow comparisons, reranking, and telemetry sampling.

4. **Behavioral Reranker** (`src/services/recommendations/behavioralReranker.ts`)  
   Re-sorts top events using user interaction history, advanced scoring, and applied boost metadata.

5. **Diversity & Cold-Start**  
   - Diversity enhancement ensures recommendation variety (`src/services/diversityEnhancementService.ts`).  
   - Lookalike and trending fallbacks cover cold-start users (`src/services/lookalikeUserService.ts`).

Environment flags:

```
# Scoring strategy selection
DISCOVERY_SCORING=server|legacy|shadow

# Behavioral reranking
DISCOVERY_RERANK=off|advanced|shadow

# Optional feature toggles
NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST=true
NEXT_PUBLIC_ENABLE_DIVERSITY_ENHANCEMENT=true
```

---

## Telemetry & Monitoring

- **Analytics Logging:** `src/utils/supabase/telemetry.ts` sanitizes payloads and writes telemetry events asynchronously.
- **Sentry Instrumentation:** Breadcrumbs for scoring decisions, profile prompts, and API flows (`src/services/analyticsService.ts`).
- **Recommendation Monitoring:** Aggregates CTR, score buckets, and trigger performance for tuning (`src/services/recommendationMonitoringService.ts`).
- **Rate Limiting:** Upstash sliding window guards for high-traffic APIs with graceful client fallbacks.

## Event Ingestion Pipeline

KureCal includes an automated event ingestion pipeline that collects events from RSS feeds, APIs, ICS calendars, and HTML sources with quality control and moderation.

**Key Features:**
- Modular collectors for different source types (RSS, API, ICS, HTML)
- Automatic deduplication with fuzzy matching
- Quality scoring and auto-publish thresholds (75%+ auto-publish, <50% moderation queue)
- Admin moderation dashboard at `/admin/ingestion/moderation`
- Race-condition safe batch processing

**Setup & Configuration:**
See [Ingestion Setup Documentation](./docs/INGESTION_SETUP.md) for:
- Database migration steps
- Environment variable configuration (`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `INGESTION_VERIFY_SPEAKERS`)
- Manual testing procedures (`POST /api/admin/ingestion/run`)
- Vercel cron configuration (configured in `vercel.json`)
- Troubleshooting guide

**Quick Start:**
1. Run migrations: `supabase migration up`
2. Set admin user: Get your UUID from Supabase Dashboard → Authentication → Users, then `UPDATE profiles SET is_admin = TRUE WHERE id = 'YOUR_UUID'`
3. Test manually: `POST /api/admin/ingestion/run` (requires admin auth)
4. Cron runs automatically via Vercel (hourly, configured in `vercel.json`)

**Note:** See `docs/SET_ADMIN_USER.md` for detailed instructions on finding your user ID.

---

## Project Structure

```
src/
├── app/                 # App Router routes (public + protected)
├── components/          # UI components (landing, calendar, dashboard, etc.)
├── config/              # Shared configuration constants
├── contexts/            # React context providers (auth, snackbar, calendar)
├── hooks/               # Custom hooks (server filtering, career profile, etc.)
├── lib/                 # Algorithms (alignment core) and utilities
├── services/            # Data access, scoring, analytics, caching
├── types/               # Shared TypeScript types (events, career, Supabase)
├── utils/               # Cross-cutting utilities (transformers, navigation)
└── data/                # Static marketing and onboarding datasets
```

---

## Getting Started

### Prerequisites

- Node.js 20.9+ (LTS) and npm
- Supabase account and project
- Environment variables configured (see [Environment Variables](#environment-variables))

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# ... other variables as needed
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

Protected routes require Supabase auth and completion of the onboarding flow.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # Required for server-side RPCs/automation (never expose publicly)
CRON_SECRET=...                      # Required for ingestion cron jobs (generate with: openssl rand -hex 32)
INGESTION_VERIFY_SPEAKERS=true      # Optional: Set to 'false' to disable speaker URL verification

NEXT_PUBLIC_SENTRY_DSN=...           # Optional: Sentry breadcrumbs
NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST=true
NEXT_PUBLIC_ENABLE_DIVERSITY_ENHANCEMENT=true
CSP_STAGE=compat                     # compat|balanced|strict; use compat for static-safe recovery, strict only when request nonces propagate across rendered routes

# Bug reporting (Contact page -> Linear)
LINEAR_API_KEY=...                  # Server-only secret (create issues in Linear)
LINEAR_TEAM_ID=...                  # Optional: team UUID, key (e.g. KUR), or name; required only if your API key can access multiple teams

DISCOVERY_SCORING=server             # server|legacy|shadow
DISCOVERY_RERANK=advanced            # off|advanced|shadow
NEXT_PUBLIC_SHOW_BUDGET_HINT=false   # Optional UI hint toggle
```

> Keep secrets (service role key, DSN) out of client bundles. Only expose values that must run in the browser.

---

## Community & Social Features

Kure-Cal includes a comprehensive social networking system for professional connections and event discovery.

**Key Features:**
- Follow/unfollow with progressive trust level requirements
- Block users with mutual invisibility
- Public profiles at clean `/u/username` URLs
- See who's attending events with network context
- Searchable community directory

**Quick Navigation:**
- **Full Documentation:** [Community & Social Features Guide](./docs/COMMUNITY.md)
- **Try It Out:** `/community` (community directory), `/u/[username]` (public profiles), `/dashboard/settings` (social settings)

For comprehensive architecture, API reference, testing guidelines, and troubleshooting, see [docs/COMMUNITY.md](./docs/COMMUNITY.md).

---

## Testing Strategy

### How to Test

#### Unit & Integration Tests
Run all unit and integration tests:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

#### Scoring & Algorithm Tests
Validate core scoring algorithms:
```bash
npm run test:scoring
```

Benchmark scoring performance:
```bash
npm run bench:scoring
```

#### End-to-End Tests
Run E2E tests with Playwright:
```bash
npm run test:e2e
```

Run E2E tests with UI mode:
```bash
npm run test:e2e:ui
```

Run E2E tests against staging:
```bash
npm run test:e2e:staging
```

#### Pre-Release Verification
Run all critical parity checks before deployment:
```bash
npm run verify:all
```

### Test Infrastructure

- **Vitest**: Unit & integration tests covering hooks, services, and algorithms (`vitest.config.mts`, `vitest.setup.ts`)
- **Playwright**: E2E tests exercising auth, discovery, and dashboard flows (`tests/`, `playwright.config.ts`)
- **Benchmarking**: Performance validation for scoring algorithms and performance budgets

---

## Design Principles

The project follows a high-polish SaaS checklist inspired by Stripe/Airbnb/Linear (`context/design-principles.md`).  
Key themes: accessibility, animation quality, design system consistency, purposeful micro-interactions, and mobile parity.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **UI:** Tailwind CSS, Radix UI, MUI (lazy-loaded), FullCalendar, Framer Motion, GSAP
- **State/Data:** TanStack Query, React Context, Supabase (Postgres, Auth, Storage)
- **Scoring:** Custom alignment core, advanced strategy pattern, behavioral reranking, diversity enhancement
- **Tooling:** TypeScript, ESLint 9, Vitest, Playwright, Sentry, Upstash Rate Limits, Vercel KV
    


---

**Happy shipping!**  
Bookmark `npm run verify:all` before every deploy to keep the recommendation engine honest.
