This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Scoring System (Discovery)

This project uses a unified, server-side career alignment scoring system.

- Core logic: `src/lib/recommendation/alignmentCore.ts`
- Server enrichment: `src/services/careerImpactEnrichmentService.ts`
- Discovery API: `src/app/api/events/filtered/route.ts`

Environment flags:

```bash
# Primary scoring (default: server)
DISCOVERY_SCORING=server  # unified alignment core
DISCOVERY_SCORING=legacy  # old EnhancedScoringService (kill switch)
DISCOVERY_SCORING=shadow  # compute both, log deltas

# Optional advanced reranking (default: off)
DISCOVERY_RERANK=off      # core order only
DISCOVERY_RERANK=advanced # rerank top-K with DeterministicV2Strategy
DISCOVERY_RERANK=shadow   # compute rerank but keep core order, log deltas
```

Environment example:

```bash
# .env.local (recommended for 0 users → first production)
DISCOVERY_SCORING=server
DISCOVERY_RERANK=advanced  # enable advanced reranker immediately

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SENTRY_DSN=...  # for telemetry breadcrumbs
```

Rollout guidance:
- With 0 users: set `DISCOVERY_RERANK=advanced` now (no disruption risk).
- With users: use `shadow` first, monitor rank deltas/latency for 1-2 weeks, then flip to `advanced`.
- Kill switch: set `DISCOVERY_RERANK=off` or `DISCOVERY_SCORING=legacy` to revert instantly.

Focused tests:

```bash
npm run test:scoring   # parity + API contract for scoring
npm run bench:scoring  # performance benchmark (N=10/25/50/100)
```

## Deploy on Vercel


