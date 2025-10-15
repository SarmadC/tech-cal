import type { Event, EventWithCareerImpact, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';
import { ScoringStrategyFactory } from '@/services/scoring';

export interface RerankOptions {
  topK?: number;
  userId?: string;
}

interface EventWithIndex extends EventWithCareerImpact {
  __idx: number;
}

/**
 * Rerank events using DeterministicV2Strategy over the alignment core results.
 * - Primary sort key: advanced (DeterministicV2) score (desc)
 * - Ties: core careerImpact.overall (desc)
 * - Stability: original index (asc)
 * Only topK events (by core score) are scored with the advanced strategy to control latency.
 */
export async function rerankWithAdvanced(
  events: EventWithCareerImpact[],
  careerProfile: CareerProfile,
  supabaseClient: SupabaseClientType,
  options: RerankOptions = {}
): Promise<EventWithCareerImpact[]> {
  if (!events.length) return events;

  const topK = Math.max(1, Math.min(options.topK ?? 30, 200));
  const userId = options.userId;

  // Ensure we can read core scores; if missing, skip rerank gracefully
  // Events are already typed as EventWithCareerImpact

  // Sort copy by core score to pick topK for advanced scoring
  const withIdx: EventWithIndex[] = events.map((e, i) => Object.assign({}, e, { __idx: i }));
  withIdx.sort((a, b) => {
    const ca = (a as EventWithCareerImpact).careerImpact?.overall ?? 0;
    const cb = (b as EventWithCareerImpact).careerImpact?.overall ?? 0;
    return cb - ca;
  });

  const candidateSlice = withIdx.slice(0, Math.min(topK, withIdx.length));
  const strategy = ScoringStrategyFactory.getDefaultStrategy();

  // Compute advanced scores for the candidate slice
  const results = await Promise.all(
    candidateSlice.map(async (e) => {
      const score = await strategy.calculate(
        { event: e as unknown as Event, careerProfile },
        { userId, supabaseClient }
      );
      return { id: e.id, overall: score.overall, metadata: score.metadata } as const;
    })
  );

  const advScoreById = new Map<string, number>();
  const advMetaById = new Map<string, Record<string, unknown>>();
  for (const r of results) {
    advScoreById.set(r.id, r.overall);
    advMetaById.set(r.id, r.metadata as Record<string, unknown>);
  }

  // Attach lightweight metadata from advanced stage when available
  const merged: EventWithCareerImpact[] = events.map((e) => {
    const advMeta = advMetaById.get(e.id);
    if (!advMeta) return e;
    const existingMeta = e.careerImpact?.metadata ?? {};
    const existingMetaRec = existingMeta as Record<string, unknown>;
    const behavioralBoost = (advMeta as any)?.appliedAdjustments?.behavioralBoost; // eslint-disable-line @typescript-eslint/no-explicit-any
    const similarEvents = (advMeta as any)?.appliedAdjustments?.behavioralSimilarEvents; // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      ...e,
      careerImpact: {
        ...(e.careerImpact ?? { overall: 0, confidence: 0, components: {}, explanation: {}, metadata: {} } as any), // eslint-disable-line @typescript-eslint/no-explicit-any
        metadata: {
          ...existingMetaRec,
          behavioralBoost: behavioralBoost ?? (existingMetaRec['behavioralBoost'] as unknown),
          similarEvents: similarEvents ?? (existingMetaRec['similarEvents'] as unknown),
        },
      },
    } as EventWithCareerImpact;
  });

  // Build a comparator that prefers advanced score when present, then core, then original index
  const getCore = (e: EventWithCareerImpact): number => e.careerImpact?.overall ?? 0;
  const idxMap = new Map<string, number>(events.map((e, i) => [e.id, i]));

  const sorted = [...merged].sort((a, b) => {
    const aa = advScoreById.get(a.id);
    const bb = advScoreById.get(b.id);
    if (aa !== undefined || bb !== undefined) {
      // Treat undefined as smaller than any defined advanced score
      const advA = aa ?? -Infinity;
      const advB = bb ?? -Infinity;
      if (advA !== advB) return advB - advA;
    }
    const coreA = getCore(a);
    const coreB = getCore(b);
    if (coreA !== coreB) return coreB - coreA;
    return (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0);
  });

  return sorted;
}


