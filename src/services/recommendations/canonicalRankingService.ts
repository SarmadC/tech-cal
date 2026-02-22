import type { Event, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';
import type { UserLocation } from '@/services/locationScoringService';
import { EventService } from '@/services/eventServices';

type SortDirection = 'asc' | 'desc';

export interface CanonicalRankingOptions {
  events: Event[];
  careerProfile: CareerProfile | null;
  supabaseClient: SupabaseClientType;
  userId?: string;
  userLocation?: UserLocation | null;
  applyDiversityEnhancement?: boolean;
  allowRerank?: boolean;
  sortByCareerImpact?: boolean;
  careerImpactSortDirection?: SortDirection;
}

function getCareerImpactScore(event: Event): number {
  const score = (event as { careerImpact?: { overall?: number } }).careerImpact?.overall;
  return typeof score === 'number' ? score : 0;
}

function hasCareerImpactScore(event: Event): boolean {
  const score = (event as { careerImpact?: { overall?: number } }).careerImpact?.overall;
  return typeof score === 'number';
}

function sortByCareerImpactScoreOrder(events: Event[], direction: SortDirection): Event[] {
  const isDescending = direction !== 'asc';
  return [...events].sort((a, b) => {
    const aScore = getCareerImpactScore(a);
    const bScore = getCareerImpactScore(b);

    if (isDescending) {
      if (bScore !== aScore) return bScore - aScore;
    } else {
      if (aScore !== bScore) return aScore - bScore;
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

export async function rankEventsWithCanonicalPipeline({
  events,
  careerProfile,
  supabaseClient,
  userId,
  userLocation,
  applyDiversityEnhancement = false,
  allowRerank = false,
  sortByCareerImpact = false,
  careerImpactSortDirection = 'desc',
}: CanonicalRankingOptions): Promise<Event[]> {
  if (events.length === 0) {
    return events;
  }

  const shouldEnrich = events.some((event) => !hasCareerImpactScore(event)) || allowRerank;

  const rankedEvents = shouldEnrich
    ? await EventService.enrichEventsWithCareerImpact(
        events,
        careerProfile,
        supabaseClient,
        userId,
        applyDiversityEnhancement,
        userLocation,
        { allowRerank }
      )
    : events;

  if (!sortByCareerImpact) {
    return rankedEvents;
  }

  const isDescending = careerImpactSortDirection !== 'asc';
  const rerankMode = getRerankMode();

  // Preserve advanced rerank ordering for descending "career-impact" sorts.
  if (allowRerank && isDescending && rerankMode === 'advanced') {
    return rankedEvents;
  }

  return sortByCareerImpactScoreOrder(rankedEvents, careerImpactSortDirection);
}
