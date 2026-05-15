import type { Event } from '@/types';

const TOP_PICK_MIN_SCORE = 60;
const TOP_PICK_VIEWPORT_SIZE = 3;
const TOP_PICK_MAX_CANDIDATES = 9;

export function getRecommendationScoreForTopPicks(event: Event): number {
  const raw =
    event.recommendationMetadata?.alignmentScore ??
    event.recommendationMetadata?.matchScore ??
    0;

  if (!Number.isFinite(raw)) {
    return 0;
  }

  const normalized = raw <= 1 ? raw * 100 : raw;
  return Math.round(Math.min(100, Math.max(0, normalized)));
}

function getStartTimestamp(event: Event): number {
  const timestamp = new Date(event.startTime).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function getOrganizerKey(event: Event): string {
  return (
    event.organization?.id ??
    event.organization?.name ??
    event.organizer ??
    'unknown-organizer'
  );
}

function getCategoryKey(event: Event): string {
  return event.eventTypeId || event.category?.id || 'unknown-category';
}

function diversifyFirstViewport(
  events: Event[],
  options: {
    viewportSize?: number;
    maxSameOrganizer?: number;
    maxSameCategory?: number;
  } = {}
) {
  const {
    viewportSize = TOP_PICK_VIEWPORT_SIZE,
    maxSameOrganizer = 1,
    maxSameCategory = 1,
  } = options;

  if (events.length <= 1) {
    return events;
  }

  const organizerCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const prioritized: Event[] = [];
  const deferred: Event[] = [];

  events.forEach((event, index) => {
    if (index >= viewportSize) {
      deferred.push(event);
      return;
    }

    const organizerKey = getOrganizerKey(event);
    const categoryKey = getCategoryKey(event);
    const organizerCount = organizerCounts.get(organizerKey) ?? 0;
    const categoryCount = categoryCounts.get(categoryKey) ?? 0;

    if (
      organizerCount < maxSameOrganizer &&
      categoryCount < maxSameCategory
    ) {
      prioritized.push(event);
      organizerCounts.set(organizerKey, organizerCount + 1);
      categoryCounts.set(categoryKey, categoryCount + 1);
    } else {
      deferred.push(event);
    }
  });

  while (
    prioritized.length < Math.min(viewportSize, events.length) &&
    deferred.length > 0
  ) {
    const preferredIndex = deferred.findIndex((candidate) => {
      const organizerKey = getOrganizerKey(candidate);
      const categoryKey = getCategoryKey(candidate);
      const organizerCount = organizerCounts.get(organizerKey) ?? 0;
      const categoryCount = categoryCounts.get(categoryKey) ?? 0;

      return organizerCount < maxSameOrganizer && categoryCount < maxSameCategory;
    });
    const candidate =
      preferredIndex >= 0
        ? deferred.splice(preferredIndex, 1)[0]
        : deferred.shift();
    if (!candidate) {
      break;
    }

    const organizerKey = getOrganizerKey(candidate);
    const categoryKey = getCategoryKey(candidate);
    organizerCounts.set(organizerKey, (organizerCounts.get(organizerKey) ?? 0) + 1);
    categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) ?? 0) + 1);
    prioritized.push(candidate);
  }

  return [...prioritized, ...deferred];
}

export function selectSharedTopPickEvents(events: Event[]) {
  const topCandidates = events
    .filter((event) => getRecommendationScoreForTopPicks(event) >= TOP_PICK_MIN_SCORE)
    .sort((left, right) => {
      const scoreDelta =
        getRecommendationScoreForTopPicks(right) -
        getRecommendationScoreForTopPicks(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const leftStart = getStartTimestamp(left);
      const rightStart = getStartTimestamp(right);
      if (leftStart !== rightStart) {
        return leftStart - rightStart;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, TOP_PICK_MAX_CANDIDATES);

  return diversifyFirstViewport(topCandidates, {
    viewportSize: TOP_PICK_VIEWPORT_SIZE,
    maxSameOrganizer: 1,
    maxSameCategory: 1,
  }).slice(0, TOP_PICK_VIEWPORT_SIZE);
}
