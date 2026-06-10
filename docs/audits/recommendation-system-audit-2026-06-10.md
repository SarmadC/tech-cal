# Event Recommendation System Audit

> **Remediation status (2026-06-10, same branch):** C1, H1, H3, M1, M2 (component breakdown), M3, M4 (expansion + category double-count), M5, M6, M7 (location threading), M8 (hydration + decoration reuse), L2, L5, L6 fixed; H2 fixed for the score-breakdown endpoint (now reports the production algorithm). Still open: `timingBonus` remains unimplemented in the alignment core (H2, needs a scoring design decision), the hardcoded major-org list in cold start (M2), exact-match lookalike cohorts (M3, needs a similarity design), threshold consolidation (L1), module-scope rate limiter (L4), and the integration test against real PostgREST semantics. Golden-master snapshots were deliberately re-recorded for the intentional scoring changes.

**Date:** 2026-06-10
**Scope:** Full audit — algorithm correctness, design coherence, data quality, performance, test coverage
**Method:** Read-only review of the scoring/retrieval/pipeline/API code plus a run of all recommendation test suites (`npx vitest run` on 11 files: 92 passed, 3 failed)

---

## Executive summary

The system is well-structured (retrieval → hydration → scoring → boost → rerank → decoration) with good fallbacks and telemetry, but **the personalization quality users actually receive is much weaker than the architecture suggests**, for three compounding reasons:

1. **Tag-based retrieval doesn't filter by tags** (C1). The Supabase queries filter an *embedded* relation without `!inner`, so "tag candidates" are just the soonest-upcoming events. All personalized retrieval is effectively "next ~100 events by start time," which the scorers then re-rank.
2. **The behavioral signal is largely fabricated** (H1). Half the similarity weight compares hardcoded defaults (`format: 'virtual'`, `cost: 'free'`, `difficulty: 'beginner'`) injected at fetch time, not real event data.
3. **The documented scoring model isn't the production scoring model** (H2). The 30/25/20/15/10 weighted model (`ADVANCED_SCORER_CONFIG`) only runs in the env-gated reranker and the debug endpoint. Production scores come from the additive "alignment core," where `timingBonus` is permanently 0.

Three recommendation tests fail at HEAD, including a parity test that exists specifically to catch scoring drift — and it caught it, but is being ignored.

| ID | Severity | Finding |
|----|----------|---------|
| C1 | Critical | Tag filters on embedded relations don't filter events (missing `!inner`) |
| H1 | High | Behavioral similarity compares hardcoded defaults, not real data |
| H2 | High | Production scorer ≠ documented/debug scorer; `timingBonus` always 0 |
| H3 | High | 3 recommendation tests failing at HEAD (parity + golden masters) |
| M1 | Medium | Cold-start gate ignores profile completeness; restricts profiled users to lookalike pool |
| M2 | Medium | Cold-start scoring biases & fabricated component breakdown |
| M3 | Medium | Lookalike cohort is exact-match only; popular-fallback pagination broken; score-scale leak |
| M4 | Medium | Tag similarity double-counts matches; over-broad synonym expansion |
| M5 | Medium | "Beginner" heuristic misclassifies hands-on learners |
| M6 | Medium | Diversity enhancement silently rewrites `careerImpact.overall` |
| M7 | Medium | Location signal inconsistent and mostly unused in the main pipeline |
| M8 | Medium | Redundant per-request work: duplicate tag-similarity computation, re-hydration, 5+ queries |
| L1–L6 | Low | Threshold drift, text-match misattribution, missing tag IDs, module-scope rate limiter, prod logging noise, trending query redundancy |

---

## Critical

### C1 — Tag retrieval doesn't filter by tags (missing `!inner`)

**Where:**
- `src/services/tagBasedMatchingService.ts:427-446` (`getRecommendedEventsByTags` tag query)
- `src/services/eventServices.ts:1875-1889` (`searchEventsByTags`)

Both queries embed tags without an inner join and then filter the embedded path:

```ts
.select(`*, ..., tags:event_tag_relations ( event_tags (event_tag, category) ), ...`)
...
.in('tags.event_tags.event_tag', limitedQueryTerms)
```

In PostgREST, filters on an embedded resource **do not restrict parent rows** unless the embed is marked `!inner` (note: `event_type:event_type_id!inner(*)` in the same query does this correctly). The filter merely nulls out non-matching embedded tag rows. Net effect:

- The "tag candidates" branch returns the first 40 upcoming confirmed events ordered by `start_time` — regardless of tags.
- `searchEventsByTags` (used by the `tags=` param on `GET /api/events/recommendations` and the `tag-search` source) returns the first 50 upcoming events whether or not they match the requested tags, **with their tag lists stripped to only matching tags**, which makes downstream `extractMatchedTagsFromEvents` look plausible.
- Combined with the discovery query (also nearest-by-start-time, limit 30) and `MAX_CANDIDATES = 100`, personalized recommendations can only ever come from roughly the ~100 soonest events. The in-memory scorers then re-rank that arbitrary pool, which is why results look "okay" but personalization depth is capped.

**Why tests didn't catch it:** the golden-master test (`tagBasedMatchingService.parity.test.ts`) mocks the Supabase client, so the SQL semantics are never exercised.

**Suggested fix:** add `!inner` to both levels of the embed used for filtering (`event_tag_relations!inner(event_tags!inner(...))`) — or filter via a junction-table subquery / RPC — in both call sites. Then re-fetch full tag lists separately (an `!inner` filtered embed will also strip non-matching tags from results, affecting downstream tag display and matching).

---

## High

### H1 — Behavioral similarity compares hardcoded defaults, not real data

**Where:**
- `src/utils/behavioralBoostUtils.ts:82-84` — every interacted event is materialized with `format: 'virtual'`, `cost: 'free'`, `difficulty: 'beginner'`, `tags: []`
- `src/services/behavioralBoostService.ts:104-119` — similarity weights: format 25%, cost 15%, difficulty 10%
- Same fabrication in `LookalikeUserService.getTrendingEvents` (`src/services/lookalikeUserService.ts:188-190`)

50% of the behavioral similarity weight compares fields that either don't exist on the target event (`undefined !== 'virtual'` → never matches) or are identical constants on both sides (`undefined === undefined` → always matches, when the target also lacks the field). Either way the signal is noise: the *effective* behavioral similarity is just `eventTypeId` equality (40%) + time-of-day proximity (10%). The 0.3 inclusion threshold and the 0–15% boost are therefore driven almost entirely by event type, while reporting reasons like "Same format" / "Same cost level" that were never measured.

Also: `calculateBoostFromSimilarities` (`behavioralBoostService.ts:152-153`) applies a "recency weight" by array index, but the array was just sorted by **similarity**, not recency — the comment and the math disagree.

**Suggested fix:** stop comparing fields that aren't fetched. Either select real `format`/`cost`/`difficulty` columns (if they exist) in `getUserInteractedEvents`, or reduce the similarity model to the signals actually available (event type, organizer, tags, time) and re-normalize weights.

### H2 — Production scoring model diverges from the documented/debug model; `timingBonus` is dead

**Where:**
- `src/config/scoringConfig.ts:29-48` — `ADVANCED_SCORER_CONFIG` (skill 0.30 / stage 0.25 / networking 0.20 / industry 0.15 / timing 0.10)
- `src/lib/recommendation/baseScorer.ts:548` — `timingBonus: 0 // Reserved for future timing-based scoring`
- `src/services/careerImpactEnrichmentService.ts:270-323` — production path: additive alignment core + tag affinity (≤20) + location (±2~8)
- `src/app/api/events/[id]/score-breakdown/route.ts:120-121` — debug endpoint scores with `ScoringStrategyFactory.getDefaultStrategy()` (AdvancedScorer)

The weighted component model only executes in: (a) the behavioral reranker, gated behind `DISCOVERY_RERANK=advanced|shadow` (off by default), and (b) the score-breakdown debug endpoint. Everything users see comes from the alignment core: capped additive points (`COMPONENT_CAPS`, `ALIGNMENT_WEIGHTS`) where `components` are raw point totals — not weighted percentages — and `timingBonus` is hardcoded to 0. Consequences:

- The score-breakdown endpoint reports numbers from a different algorithm than the one that produced the user-visible score — misleading for exactly the debugging it exists for.
- Event timing affects ranking only via retrieval order and recency boosts in the (broken, see C1) tag path — not via the scorer, despite the documented 10% weight.
- Anyone "tuning" `ADVANCED_SCORER_CONFIG.weights` is tuning a code path that doesn't run in production.

**Suggested fix:** make score-breakdown call the same enrichment path as production (or label the algorithm clearly in the response); either implement `timingBonus` in the alignment core or delete the component and the config weight; document which config block governs which path.

### H3 — Recommendation test suite is red at HEAD

`npx vitest run` on the recommendation suites: **3 failed, 92 passed** (clean working tree, branch `claude/ecstatic-mcclintock-04802f`):

1. `src/lib/__tests__/alignmentCore.parity.test.ts` — "enrichment overall scores match core scores" fails with delta 6 > allowed 2. The enrichment layer's tag-affinity contribution (`careerImpactEnrichmentService.ts:277-279`) was added on top of the core score without updating the parity contract. This test is the drift alarm for H2-style divergence, and it is firing.
2. `src/services/__tests__/tagBasedMatchingService.parity.test.ts` — both golden-master snapshots stale (`popularityBoost` 0→1, `totalScore` off by 1): the `POPULARITY_BOOSTS` floor tier (`minAttendees: 0, points: 1`, `scoringConfig.ts:437`) changed behavior after the snapshots were recorded.

**Suggested fix:** decide whether the new behavior is intended; if yes, update the snapshots and the parity tolerance *deliberately* (documenting the tag-affinity term); if no, fix the regressions. Either way, get these suites into CI as blocking.

---

## Medium

### M1 — Cold-start gate ignores profile completeness

`src/utils/behavioralBoostUtils.ts:119` defines cold start as `< 3` rows in `user_events`; `src/services/eventServices.ts:1936-1951` then routes such users (when they have a career profile and no filters) to **lookalike-only** retrieval, and `fetchHybridBestMatchCandidates` (`recommendationPipeline.ts:379-381`) skips the personalized supplement entirely when `isColdStart`. A brand-new user who completed full career onboarding — exactly the user the profile exists for — gets recommendations drawn only from events that similar-industry users attended, instead of profile-scored retrieval over the full pool. Suggested: treat "has a complete career profile" as exiting cold start for retrieval purposes, and use lookalike as a *supplement*, not a replacement.

### M2 — Cold-start scoring: fabricated breakdown and hardcoded big-tech bias

`src/lib/recommendation/baseScorer.ts`:
- Lines 220-228: the component breakdown is synthesized as fixed fractions of the total (0.4/0.3/0.2/0.1) — any UI/API surfacing components for anonymous users shows made-up numbers (e.g., `careerStageMatch` with no profile to match against).
- Line 168: organizer reputation is a hardcoded 10-company FAANG-ish list; community organizers can never earn the 8 points. Combined with attendee-count points (≤15), cold start systematically favors big-tech mega-events.
- Line 218: scores clamp to 15–55, while `RECOMMENDED = 50` (`recommendationThresholds.ts:15`) — only near-max cold-start events ever qualify as "recommended," which may be intended but is worth making explicit.

### M3 — Lookalike: crude cohorts, broken fallback pagination, score-scale leak

`src/services/lookalikeUserService.ts` / `src/services/eventServices.ts`:
- `findSimilarProfiles` (lookalikeUserService.ts:213-259) matches on exact `industry` (+ exact `current_role`, falling back to exact `seniority`). No skills/interests similarity despite the service's description; users with a null/nonstandard industry get an `eq('industry', undefined)` query. Cohort-quality threshold of ≥5 role matches is arbitrary and unvalidated.
- `getFallbackPopularEvents` (eventServices.ts:2188-2192) returns `totalCount: appEvents.length` — i.e., the page size, not the total — so pagination on the cold-start popular path reports at most one page.
- Lookalike metadata sets `matchScore: lookalikeSupport` (a small integer count, lookalikeUserService.ts:105). Downstream, `getRecommendationScoreForTopPicks` (`topPicks.ts:17`) normalizes `raw <= 1 ? raw * 100 : raw` — a support count of 1 becomes a perfect score of 100 and can enter mobile Top Picks past the 60-point gate.

### M4 — Tag similarity: double counting and over-broad expansion

`src/services/tagBasedMatchingService.ts`:
- The same event tag can score three times for one user term — direct (30·w), similarity (20·w), and category (10·w) all accumulate into `totalScore` with no dedup (lines 150-166); category matching additionally re-awards points for *all* tags in a category once any one matches (lines 349-367).
- `RAW_TAG_SIMILARITIES` equates `'intermediate' ↔ 'advanced'` and `'react' → 'javascript' → 'typescript'`; `buildCandidateTerms` (lines 817-877) then does BFS *transitive* expansion over the bidirectional map, so a profile listing "react" generates candidate terms including `ts`, `node.js`, etc. With C1 fixed, this expansion will control retrieval — worth tightening first (one-hop only, and remove cross-level difficulty links).

### M5 — "Beginner" heuristic misclassifies hands-on learners

`tagBasedMatchingService.ts:119`: `isBeginner = learningStyle.includes('hands-on') || userSkills.length < 3`. A principal engineer who prefers workshops is scored with the beginner weighting (skills-to-learn 1.0 / primary 0.6 vs standard 0.4 / 1.0), inverting which skills drive their matches. Use `seniority` (already on the profile and used elsewhere) instead of learning style.

### M6 — Diversity enhancement silently rewrites scores

`src/services/diversityEnhancementService.ts:410-420`: `applyDiversityScoring` multiplies `careerImpact.overall` by ±10%/5% and writes it back. The mutated overall no longer equals what the components/explanation justify, can cross UI bucket thresholds (a 78 "Strong Match" becomes 85.8 "High Impact"), and is applied in multiple places (lookalike path *and* enrichment path), so an event can be adjusted twice. Suggested: keep the diversity adjustment as a separate rank-only term (or metadata field) instead of overwriting `overall`.

### M7 — Location signal is inconsistent and mostly unused where it matters

- The main pipeline path never passes `userLocation` into tag-based retrieval: `EventService.getRecommendedEventsByTags` (`eventServices.ts:1814-1819`) omits the parameter, so `locationScore` in `totalScore` is the neutral 0.8 for every in-person event; only virtual events get the full 8 (or 10) points — a systematic +1.6–2 pt virtual bias rather than proximity scoring.
- Enrichment separately applies `(score - 0.8) * 10` (`careerImpactEnrichmentService.ts:222`), max ±2 around neutral — a different scale than the retrieval path's ×8 vs ×10 (`scoringConfig.ts:388,399` — the inconsistency is even annotated in the config comment).
- `LocationScoringService.calculateLocationScore` treats Hybrid as fully virtual (1.0) and returns 0.8 both for "no user location" and "event location unknown" — acceptable defaults, but they make the documented "0.3–0.5 continent scoring" nearly unreachable given most events resolve via keyword heuristics.

### M8 — Redundant per-request work

For one call to `GET /api/events/recommendations` (no tags):
1. Retrieval runs 4–5 queries (tag + text + agenda-match + discovery, then full event fetch for agenda matches) — `tagBasedMatchingService.ts:427-504,1055-1086`.
2. `calculateTagSimilarity` runs per event during retrieval scoring (line 565) — heavy regex work over title+description+agenda per profile term.
3. The pipeline then **re-hydrates** all candidates via `getEventsWithAgenda` (`recommendationPipeline.ts:621`) even though the retrieval queries already selected `event_agenda`.
4. `decorateRecommendationMetadata` (`recommendationPipeline.ts:537-538`) recomputes `calculateTagSimilarity` from scratch for every event a second (third) time.
5. The telemetry branch can run the entire ranking pipeline a second time (`recommendations/route.ts:269-278`) — sampled at 1%, acceptable, but it doubles latency when sampled.

The KV score cache (1h TTL, fingerprint-scoped — well designed) only covers step "enrichment," not the tag-similarity recomputation. Suggested quick wins: pass the retrieval-time `TagMatchResult` through to decoration; skip hydration when agenda is already present (check one event for `agenda` before fetching).

---

## Low

- **L1 Threshold drift:** three overlapping bucket systems — `SCORE_THRESHOLDS` 80/60/40 (`scoringConfig.ts:53`), `RECOMMENDATION_THRESHOLDS` 80/50/20 (`recommendationThresholds.ts`), `ADVANCED_SCORER_CONFIG.thresholds` 85/65/45. `getMatchQuality` labels ≥80 "Perfect"/≥50 "Strong" while `getImpactBucket` calls 50 "moderate". Consolidate on `recommendationThresholds.ts` (its header says that's the intent).
- **L2 Text-match misattribution:** `tagBasedMatchingService.ts:986` — when no expanded term is found in-memory (SQL matched but JS scan didn't), `matchedTerm` is `undefined` and `title.includes('')` is `true`, mislabeling the match as `title` and granting the +5 boost.
- **L3 Missing tag IDs:** retrieval selects `event_tags (event_tag, category)` but `normalizeSupabaseEvent` (`tagBasedMatchingService.ts:1184`) reads `tag.id` — always `undefined`. Harmless today but any keying on tag id breaks.
- **L4 Rate limiter scope:** `recommendations/route.ts:17-22` constructs the Upstash limiter against `kv` at module scope (route fails to load if KV env is absent); `score-breakdown/route.ts:34` uses a per-instance in-memory Map, ineffective across serverless instances (fine for a dev endpoint — just don't rely on it if `ENABLE_SCORE_BREAKDOWN=true` in prod).
- **L5 Prod logging noise:** `TagBasedMatchingService` emits 3–4 `console.info` payloads per request including profile stats (`tagBasedMatchingService.ts:399,496,640,776`); the recommendations route logs every request/response. Gate behind `NODE_ENV` or a debug flag.
- **L6 Trending query redundancy:** `lookalikeUserService.ts:167-168` applies `gte(start_time, 30 days ago)` then `gte(start_time, now)` — the first is dead; the "last 30 days" comment describes neither.

---

## Test coverage gaps

Existing suites are decent on pure functions (baseScorer, fingerprints, rerank comparator, boost math) but:

1. **No test exercises real query semantics** — every Supabase call is mocked, which is exactly why C1 is invisible. Add at least one integration test (local Supabase / `supabase start`) asserting that tag retrieval returns *only* tag-matching events.
2. **No test pins the end-to-end ordering contract** of `GET /api/events/recommendations` (retrieval → enrich → sort) with a realistic fixture set.
3. **Behavioral boost tests** don't assert what happens when `format`/`cost` are absent on one side (the H1 case).
4. **Parity tests are failing and evidently not in a blocking CI path** — they only have value if red blocks merge.
5. No test covers diversity-enhancement score mutation crossing bucket boundaries (M6) or the topPicks `raw <= 1` normalization edge (M3).

---

## Suggested roadmap

**Quick wins (hours):**
1. Fix C1 (`!inner` on both filtered embeds) — single biggest quality lever.
2. Fix or consciously re-record the 3 failing tests; make the suites blocking.
3. Pass `userLocation` through `EventService.getRecommendedEventsByTags` (M7) and reuse the retrieval `TagMatchResult` in decoration (M8).
4. Use `seniority` for the beginner heuristic (M5); fix the `matchedTerm`-undefined title boost (L2).

**Medium (days):**
5. Rework behavioral similarity around fields that exist (H1).
6. Unify score-breakdown with the production scorer; implement or remove `timingBonus`; document which config governs which path (H2).
7. Make diversity adjustment rank-only (M6); fix lookalike `matchScore` scale + fallback `totalCount` (M3).
8. Soften the cold-start gate for fully-profiled users (M1).

**Larger (validate before building more):**
9. Before adding new signals, instrument outcomes (CTR/saves on recommended vs. baseline) — several existing signals (behavioral boost, lookalike cohorts, tag expansion) have never been validated and two of them are currently no-ops or noise.
