import type {
  Event,
  EventFilters,
  EventWithCareerImpact,
  RecommendationCandidateSource,
  RecommendationMetadata,
  RecommendationReason,
  RecommendationTelemetryContext,
  SupabaseClientType,
} from '@/types';
import type { CareerProfile } from '@/types/career';
import type { UserLocation } from '@/services/locationScoringService';

import { EventService } from '@/services/eventServices';
import { TagBasedMatchingService } from '@/services/tagBasedMatchingService';

type SortDirection = 'asc' | 'desc';

export interface RecommendationPipelineOptions {
  events: Event[];
  careerProfile: CareerProfile | null;
  supabaseClient: SupabaseClientType;
  userId?: string;
  userLocation?: UserLocation | null;
  applyDiversityEnhancement?: boolean;
  allowRerank?: boolean;
  sortByCareerImpact?: boolean;
  careerImpactSortDirection?: SortDirection;
  candidateSources?: Map<string, RecommendationCandidateSource[]>;
}

export interface PersonalizedRecommendationCandidateOptions {
  supabaseClient: SupabaseClientType;
  userId?: string;
  careerProfile: CareerProfile | null;
  limit?: number;
  tags?: string[];
}

export interface PersonalizedRecommendationCandidates {
  events: Event[];
  matchedTags: string[];
  candidateSources: Map<string, RecommendationCandidateSource[]>;
}

export interface FilteredRecommendationCandidateOptions {
  filters?: EventFilters;
  supabaseClient: SupabaseClientType;
  careerProfile: CareerProfile | null;
  userId?: string;
  page?: number;
  pageSize?: number;
  telemetry?: RecommendationTelemetryContext;
  skipColdStart?: boolean;
}

export interface FilteredRecommendationCandidates {
  events: Event[];
  totalCount: number;
  isColdStart: boolean;
  candidateSources: Map<string, RecommendationCandidateSource[]>;
}

export interface BestMatchCandidateCounts {
  broad: number;
  personalizedRaw: number;
  personalizedFiltered: number;
  merged: number;
}

export interface HybridBestMatchCandidateOptions extends FilteredRecommendationCandidateOptions {
  personalizedLimit?: number;
}

export interface HybridBestMatchRecommendationCandidates extends FilteredRecommendationCandidates {
  retrievalStrategy: 'filtered-only' | 'hybrid-best-match-v1';
  candidateCounts: BestMatchCandidateCounts;
  supplemented: boolean;
}

const MIN_PERSONALIZED_SUPPLEMENT_LIMIT = 100;
const MAX_PERSONALIZED_SUPPLEMENT_LIMIT = 200;
const PERSONALIZED_SUPPLEMENT_MULTIPLIER = 3;

const SOURCE_REASON_LABELS: Record<RecommendationCandidateSource, string> = {
  filtered: 'Eligible in the filtered event set',
  'tag-based': 'Retrieved from tag and profile affinity',
  'tag-search': 'Matched your requested tags',
  'text-search': 'Matched your search intent',
  discover: 'Included from the Discover candidate pool',
  lookalike: 'Retrieved from similar professionals',
  'cold-start': 'Retrieved for cold-start personalization',
  compatibility: 'Returned through the compatibility recommendation route',
};

function getCareerImpactScore(event: Event): number {
  const score = (event as EventWithCareerImpact).careerImpact?.overall;
  return typeof score === 'number' ? score : 0;
}

function hasCareerImpactScore(event: Event): boolean {
  const score = (event as EventWithCareerImpact).careerImpact?.overall;
  return typeof score === 'number';
}

function sortByCareerImpactScoreOrder(events: Event[], direction: SortDirection): Event[] {
  const isDescending = direction !== 'asc';

  return [...events].sort((a, b) => {
    const aScore = getCareerImpactScore(a);
    const bScore = getCareerImpactScore(b);

    if (isDescending) {
      if (bScore !== aScore) return bScore - aScore;
    } else if (aScore !== bScore) {
      return aScore - bScore;
    }

    const aStart = new Date(a.startTime).getTime();
    const bStart = new Date(b.startTime).getTime();
    return aStart - bStart;
  });
}

function getRerankMode(): 'off' | 'advanced' | 'shadow' {
  const strategy = process.env.DISCOVERY_RERANK || 'off';
  if (strategy === 'advanced' || strategy === 'shadow') {
    return strategy;
  }

  return 'off';
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function mergeCandidateSourceMaps(
  ...maps: Array<Map<string, RecommendationCandidateSource[]> | undefined>
): Map<string, RecommendationCandidateSource[]> {
  const merged = new Map<string, RecommendationCandidateSource[]>();

  maps.forEach((sourceMap) => {
    sourceMap?.forEach((sources, eventId) => {
      const existing = merged.get(eventId) || [];
      merged.set(
        eventId,
        dedupeStrings([...existing, ...sources]) as RecommendationCandidateSource[]
      );
    });
  });

  return merged;
}

function buildCandidateSourceMap(
  events: Event[],
  defaultSource: RecommendationCandidateSource
): Map<string, RecommendationCandidateSource[]> {
  return new Map(
    events.map((event) => {
      const sources = dedupeStrings([
        ...(event.recommendationProvenance || []),
        ...((((event.recommendationMetadata ?? {}) as RecommendationMetadata)
          .candidateSources as RecommendationCandidateSource[] | undefined) || []),
        defaultSource,
      ]) as RecommendationCandidateSource[];

      return [event.id, sources];
    })
  );
}

function extractMatchedTagsFromEvents(events: Event[]): string[] {
  return dedupeStrings(
    events.flatMap((event) => {
      const metadata = (event.recommendationMetadata ?? {}) as RecommendationMetadata;
      if (Array.isArray(metadata.matchedTags) && metadata.matchedTags.length > 0) {
        return metadata.matchedTags;
      }

      return event.tags?.map((tag) => tag.name) || [];
    })
  );
}

function calculatePersonalizedSupplementLimit(page: number, pageSize: number): number {
  return Math.min(
    Math.max(page * pageSize * PERSONALIZED_SUPPLEMENT_MULTIPLIER, MIN_PERSONALIZED_SUPPLEMENT_LIMIT),
    MAX_PERSONALIZED_SUPPLEMENT_LIMIT
  );
}

function mergeRecommendationEvent(primaryEvent: Event, secondaryEvent?: Event): Event {
  if (!secondaryEvent) {
    return primaryEvent;
  }

  const mergedSources = dedupeStrings([
    ...(primaryEvent.recommendationProvenance || []),
    ...(secondaryEvent.recommendationProvenance || []),
  ]) as RecommendationCandidateSource[];

  return {
    ...secondaryEvent,
    ...primaryEvent,
    recommendationMetadata: primaryEvent.recommendationMetadata ?? secondaryEvent.recommendationMetadata,
    recommendationProvenance: mergedSources.length > 0 ? mergedSources : undefined,
  };
}

function createFilteredOnlyCandidateResult(
  result: FilteredRecommendationCandidates,
  counts?: Partial<BestMatchCandidateCounts>
): HybridBestMatchRecommendationCandidates {
  return {
    ...result,
    retrievalStrategy: 'filtered-only',
    candidateCounts: {
      broad: result.events.length,
      personalizedRaw: counts?.personalizedRaw ?? 0,
      personalizedFiltered: counts?.personalizedFiltered ?? 0,
      merged: result.events.length,
    },
    supplemented: false,
  };
}

function mergeHydratedEvent(originalEvent: Event, hydratedEvent: Event): Event {
  const mergedSources = dedupeStrings([
    ...(originalEvent.recommendationProvenance || []),
    ...(hydratedEvent.recommendationProvenance || []),
  ]) as RecommendationCandidateSource[];

  return {
    ...originalEvent,
    ...hydratedEvent,
    recommendationMetadata: originalEvent.recommendationMetadata ?? hydratedEvent.recommendationMetadata,
    recommendationProvenance: mergedSources.length > 0 ? mergedSources : undefined,
  };
}

async function hydrateScorableEvents(
  events: Event[],
  supabaseClient: SupabaseClientType
): Promise<Event[]> {
  if (events.length === 0 || typeof EventService.getEventsWithAgenda !== 'function') {
    return events;
  }

  const eventIds = [...new Set(events.map((event) => event.id).filter(Boolean))];
  if (eventIds.length === 0) {
    return events;
  }

  try {
    const hydratedEvents = await EventService.getEventsWithAgenda(
      { eventIds },
      supabaseClient,
      1,
      eventIds.length
    );

    const hydratedById = new Map(hydratedEvents.map((event) => [event.id, event as Event]));
    return events.map((event) => {
      const hydrated = hydratedById.get(event.id);
      return hydrated ? mergeHydratedEvent(event, hydrated) : event;
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[RecommendationPipeline] Failed to hydrate scorable events, using original candidate payloads', error);
    }
    return events;
  }
}

export async function fetchPersonalizedRecommendationCandidates({
  supabaseClient,
  userId,
  careerProfile,
  limit = 10,
  tags = [],
}: PersonalizedRecommendationCandidateOptions): Promise<PersonalizedRecommendationCandidates> {
  if (tags.length > 0) {
    const events = await EventService.searchEventsByTags(tags, supabaseClient, limit);
    return {
      events,
      matchedTags: dedupeStrings(tags),
      candidateSources: buildCandidateSourceMap(events, 'tag-search'),
    };
  }

  if (!userId || !careerProfile) {
    return {
      events: [],
      matchedTags: [],
      candidateSources: new Map<string, RecommendationCandidateSource[]>(),
    };
  }

  const events = await EventService.getRecommendedEventsByTags(
    userId,
    careerProfile,
    supabaseClient,
    limit
  );

  return {
    events,
    matchedTags: extractMatchedTagsFromEvents(events),
    candidateSources: buildCandidateSourceMap(events, 'tag-based'),
  };
}

export async function fetchFilteredRecommendationCandidates({
  filters = {},
  supabaseClient,
  careerProfile,
  userId,
  page = 1,
  pageSize = 100,
  telemetry,
  skipColdStart = false,
}: FilteredRecommendationCandidateOptions): Promise<FilteredRecommendationCandidates> {
  const result = await EventService.getEventsWithColdStartHandling(
    filters,
    supabaseClient,
    careerProfile,
    userId,
    page,
    pageSize,
    telemetry,
    { skipColdStart }
  );

  return {
    ...result,
    candidateSources: buildCandidateSourceMap(result.events, result.isColdStart ? 'cold-start' : 'filtered'),
  };
}

export async function fetchHybridBestMatchCandidates({
  filters = {},
  supabaseClient,
  careerProfile,
  userId,
  page = 1,
  pageSize = 100,
  telemetry,
  skipColdStart = false,
  personalizedLimit,
}: HybridBestMatchCandidateOptions): Promise<HybridBestMatchRecommendationCandidates> {
  const broadPromise = fetchFilteredRecommendationCandidates({
    filters,
    supabaseClient,
    careerProfile,
    userId,
    page,
    pageSize,
    telemetry,
    skipColdStart,
  });

  if (!userId || !careerProfile) {
    return createFilteredOnlyCandidateResult(await broadPromise);
  }

  const settledPersonalizedPromise = fetchPersonalizedRecommendationCandidates({
    supabaseClient,
    userId,
    careerProfile,
    limit: personalizedLimit ?? calculatePersonalizedSupplementLimit(page, pageSize),
  }).then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (reason) => ({ status: 'rejected' as const, reason }),
  );

  const broadResult = await broadPromise;
  if (broadResult.isColdStart) {
    await settledPersonalizedPromise;
    return createFilteredOnlyCandidateResult(broadResult);
  }

  const personalizedResult = await settledPersonalizedPromise;
  if (personalizedResult.status === 'rejected') {
    console.warn('[RecommendationPipeline] Personalized supplement fetch failed; falling back to filtered candidates', personalizedResult.reason);
    return createFilteredOnlyCandidateResult(broadResult);
  }

  const personalizedRawEvents = personalizedResult.value.events;
  if (personalizedRawEvents.length === 0) {
    return {
      ...broadResult,
      retrievalStrategy: 'hybrid-best-match-v1',
      candidateCounts: {
        broad: broadResult.events.length,
        personalizedRaw: 0,
        personalizedFiltered: 0,
        merged: broadResult.events.length,
      },
      supplemented: false,
    };
  }

  const personalizedEventIds = [...new Set(personalizedRawEvents.map((event) => event.id).filter(Boolean))];
  const existingEventIds = filters.eventIds || [];
  const filteredPersonalizedEventIds = existingEventIds.length > 0
    ? existingEventIds.filter((eventId) => personalizedEventIds.includes(eventId))
    : personalizedEventIds;

  if (filteredPersonalizedEventIds.length === 0) {
    return {
      ...broadResult,
      retrievalStrategy: 'hybrid-best-match-v1',
      candidateCounts: {
        broad: broadResult.events.length,
        personalizedRaw: personalizedRawEvents.length,
        personalizedFiltered: 0,
        merged: broadResult.events.length,
      },
      supplemented: false,
    };
  }

  let personalizedFilteredResult: FilteredRecommendationCandidates;
  try {
    personalizedFilteredResult = await fetchFilteredRecommendationCandidates({
      filters: {
        ...filters,
        eventIds: filteredPersonalizedEventIds,
      },
      supabaseClient,
      careerProfile,
      userId,
      page: 1,
      pageSize: filteredPersonalizedEventIds.length,
      skipColdStart: true,
    });
  } catch (error) {
    console.warn('[RecommendationPipeline] Personalized supplement re-filter failed; falling back to filtered candidates', error);
    return createFilteredOnlyCandidateResult(broadResult, {
      personalizedRaw: personalizedRawEvents.length,
    });
  }

  const personalizedRawById = new Map(personalizedRawEvents.map((event) => [event.id, event]));
  const personalizedSupplementEvents = personalizedFilteredResult.events.map((event) =>
    mergeRecommendationEvent(event, personalizedRawById.get(event.id))
  );
  const personalizedSupplementMap = new Map(personalizedSupplementEvents.map((event) => [event.id, event]));
  const mergedEvents = broadResult.events.map((event) => {
    const supplementEvent = personalizedSupplementMap.get(event.id);
    if (supplementEvent) {
      personalizedSupplementMap.delete(event.id);
      return mergeRecommendationEvent(event, supplementEvent);
    }
    return event;
  });

  personalizedSupplementMap.forEach((event) => {
    mergedEvents.push(event);
  });

  return {
    events: mergedEvents,
    totalCount: broadResult.totalCount,
    isColdStart: false,
    candidateSources: mergeCandidateSourceMaps(
      broadResult.candidateSources,
      personalizedResult.value.candidateSources,
      personalizedFilteredResult.candidateSources,
    ),
    retrievalStrategy: 'hybrid-best-match-v1',
    candidateCounts: {
      broad: broadResult.events.length,
      personalizedRaw: personalizedRawEvents.length,
      personalizedFiltered: personalizedFilteredResult.events.length,
      merged: mergedEvents.length,
    },
    supplemented: mergedEvents.length > broadResult.events.length,
  };
}

function buildRecommendationReasons(
  event: EventWithCareerImpact,
  matchedTags: string[],
  sources: RecommendationCandidateSource[]
): RecommendationReason[] {
  const reasons: RecommendationReason[] = [];
  const alignmentReasons = event.careerImpact?.explanation?.alignmentReasons ?? [];

  alignmentReasons.forEach((reason) => {
    reasons.push({
      type: reason.type,
      reason: reason.reason,
      contribution: reason.contribution,
      source: 'career-impact',
    });
  });

  const tagAffinityContribution = event.careerImpact?.metadata?.tagAffinityContribution;
  if (matchedTags.length > 0) {
    reasons.push({
      type: 'tag-affinity',
      reason: `Matched tags: ${matchedTags.slice(0, 3).join(', ')}`,
      contribution: typeof tagAffinityContribution === 'number' ? tagAffinityContribution : 0,
      source: 'tag-based',
    });
  }

  sources.forEach((source) => {
    reasons.push({
      type: 'source',
      reason: SOURCE_REASON_LABELS[source],
      contribution: 0,
      source,
    });
  });

  return reasons;
}

function decorateRecommendationMetadata(
  rankedEvents: Event[],
  careerProfile: CareerProfile | null,
  candidateSourceMap: Map<string, RecommendationCandidateSource[]>
): Event[] {
  return rankedEvents.map((event, index) => {
    const scoredEvent = event as EventWithCareerImpact;
    const existingMetadata = (event.recommendationMetadata ?? {}) as RecommendationMetadata;
    const candidateSources = dedupeStrings([
      ...(candidateSourceMap.get(event.id) || []),
      ...(event.recommendationProvenance || []),
      ...((existingMetadata.candidateSources as RecommendationCandidateSource[] | undefined) || []),
    ]) as RecommendationCandidateSource[];

    const tagMatch = careerProfile
      ? TagBasedMatchingService.calculateTagSimilarity(event, careerProfile)
      : null;
    const matchedTags = dedupeStrings([
      ...(tagMatch?.matchedTags || []),
      ...(scoredEvent.careerImpact?.explanation?.matchedTags || []),
      ...(existingMetadata.matchedTags || []),
    ]);

    const alignmentExplanation = dedupeStrings([
      ...(scoredEvent.careerImpact?.explanation?.reasons || []),
      ...(existingMetadata.alignmentExplanation || []),
    ]);

    const reasons = dedupeStrings([
      ...(existingMetadata.reasons || []),
      ...alignmentExplanation,
      matchedTags.length > 0 ? `Matched tags: ${matchedTags.slice(0, 3).join(', ')}` : null,
      ...candidateSources.map((source) => SOURCE_REASON_LABELS[source]),
    ]);

    const metadata: RecommendationMetadata = {
      ...existingMetadata,
      matchedTags,
      matchExplanation: tagMatch?.explanation || existingMetadata.matchExplanation,
      matchScore: tagMatch?.score ?? existingMetadata.matchScore ?? 0,
      impactScore: scoredEvent.careerImpact?.overall ?? existingMetadata.impactScore ?? 0,
      profileBoost: existingMetadata.profileBoost ?? 0,
      recencyBoost: existingMetadata.recencyBoost ?? 0,
      popularityBoost: existingMetadata.popularityBoost ?? 0,
      totalScore: scoredEvent.careerImpact?.overall ?? existingMetadata.totalScore ?? 0,
      reasons,
      tagRank: existingMetadata.tagRank ?? index + 1,
      alignmentScore: scoredEvent.careerImpact?.overall ?? existingMetadata.alignmentScore ?? null,
      alignmentConfidence: scoredEvent.careerImpact?.confidence ?? existingMetadata.alignmentConfidence ?? null,
      alignmentComponents: scoredEvent.careerImpact?.components ?? existingMetadata.alignmentComponents ?? null,
      alignmentStrategyVersion:
        scoredEvent.careerImpact?.metadata?.algorithmVersion ??
        existingMetadata.alignmentStrategyVersion ??
        'alignment-core-v2',
      alignmentExplanation,
      candidateSources,
      explanation: buildRecommendationReasons(scoredEvent, matchedTags, candidateSources),
    };

    const careerImpact = scoredEvent.careerImpact
      ? {
          ...scoredEvent.careerImpact,
          explanation: {
            ...scoredEvent.careerImpact.explanation,
            matchedTags,
          },
          metadata: {
            ...scoredEvent.careerImpact.metadata,
            candidateSources,
          },
        }
      : scoredEvent.careerImpact;

    return {
      ...event,
      ...(careerImpact ? { careerImpact } : {}),
      recommendationMetadata: metadata,
      recommendationProvenance: candidateSources,
    };
  });
}

export async function rankEventsWithRecommendationPipeline({
  events,
  careerProfile,
  supabaseClient,
  userId,
  userLocation,
  applyDiversityEnhancement = false,
  allowRerank = false,
  sortByCareerImpact = false,
  careerImpactSortDirection = 'desc',
  candidateSources,
}: RecommendationPipelineOptions): Promise<Event[]> {
  if (events.length === 0) {
    return events;
  }

  const hydratedEvents = await hydrateScorableEvents(events, supabaseClient);
  const shouldEnrich = hydratedEvents.some((event) => !hasCareerImpactScore(event)) || allowRerank;

  const scoredEvents = shouldEnrich
    ? await EventService.enrichEventsWithCareerImpact(
        hydratedEvents,
        careerProfile,
        supabaseClient,
        userId,
        applyDiversityEnhancement,
        userLocation,
        { allowRerank }
      )
    : hydratedEvents;

  const sourceMap =
    candidateSources ??
    new Map(
      scoredEvents.map((event) => [event.id, (event.recommendationProvenance || ['compatibility']) as RecommendationCandidateSource[]])
    );

  const decoratedEvents = decorateRecommendationMetadata(scoredEvents, careerProfile, sourceMap);

  if (!sortByCareerImpact) {
    return decoratedEvents;
  }

  const isDescending = careerImpactSortDirection !== 'asc';
  const rerankMode = getRerankMode();

  if (allowRerank && isDescending && rerankMode === 'advanced') {
    return decoratedEvents;
  }

  return sortByCareerImpactScoreOrder(decoratedEvents, careerImpactSortDirection);
}
