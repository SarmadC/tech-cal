# KureCal (tech-cal)

KureCal is a career operating system for discovering, planning, and acting on the tech events that move your professional goals forward.  
We combine high-quality curation, adaptive scoring, intelligent scheduling, and longitudinal analytics to help teams and individual contributors focus on the events that matter.

---

## Table of Contents

- [KureCal (tech-cal)](#kurecal-tech-cal)
  - [Table of Contents](#table-of-contents)
  - [Product Overview](#product-overview)
  - [Feature Highlights](#feature-highlights)
  - [System Architecture](#system-architecture)
  - [Scoring \& Recommendations](#scoring--recommendations)
  - [Telemetry \& Monitoring](#telemetry--monitoring)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
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
  Goal progress, skill growth, networking insights, and event timelines rendered once onboarding is complete (`src/app/dashboard/DashboardClientView.tsx`).

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
- Dashboard analytics API: `src/app/api/dashboard/analytics/route.ts`

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


### Local Development

Protected routes require Supabase auth. Seed environment variables (`.env.local`) before running `npm run dev`.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # Required for server-side RPCs/automation (never expose publicly)

NEXT_PUBLIC_SENTRY_DSN=...           # Optional: Sentry breadcrumbs
NEXT_PUBLIC_ENABLE_BEHAVIORAL_BOOST=true
NEXT_PUBLIC_ENABLE_DIVERSITY_ENHANCEMENT=true

DISCOVERY_SCORING=server             # server|legacy|shadow
DISCOVERY_RERANK=advanced            # off|advanced|shadow
NEXT_PUBLIC_SHOW_BUDGET_HINT=false   # Optional UI hint toggle
```

> Keep secrets (service role key, DSN) out of client bundles. Only expose values that must run in the browser.

---


## Testing Strategy

- **Unit & Integration:** Vitest (`npm run test`) covers hooks, services, and algorithms.  
  Configuration lives in `vitest.config.mts`, with setup in `vitest.setup.ts`.

- **End-to-End:** Playwright scripts (`npm run test:e2e`) exercise auth, discovery, and dashboard flows; see `tests/` and `playwright.config.ts`.

- **Benchmarking & Parity:** Scoring-specific commands (`npm run test:scoring`, `npm run bench:scoring`) validate core algorithms and performance budgets.

- **Manual QA:** `npm run verify:all` bundles critical parity checks before release.

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

