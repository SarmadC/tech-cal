import type { MobileCalendarFeedRequest, MobileDiscoverFeedRequest } from '@kurecal/domain';

export const mobileQueryKeys = {
  dashboard: {
    home: () => ['dashboard-home'] as const,
  },
  calendar: {
    root: () => ['calendar-feed'] as const,
    feed: (request: MobileCalendarFeedRequest) => ['calendar-feed', request] as const,
    previewRoot: () => ['calendar-feed-preview'] as const,
    preview: (request: MobileCalendarFeedRequest) => ['calendar-feed-preview', request] as const,
  },
  discover: {
    root: () => ['discover-feed'] as const,
    feed: (request: MobileDiscoverFeedRequest) => ['discover-feed', request] as const,
    previewRoot: () => ['discover-feed-preview'] as const,
    preview: (request: MobileDiscoverFeedRequest) => ['discover-feed-preview', request] as const,
  },
  event: {
    detail: (eventId: string | undefined | null) => ['event-detail', eventId ?? null] as const,
    engagement: (userId: string | undefined | null, eventId: string | undefined | null) =>
      ['event-engagement', userId ?? null, eventId ?? null] as const,
  },
  community: {
    feed: () => ['community-feed'] as const,
    joinedCircles: (userId: string | undefined | null) => ['joined-circles', userId ?? null] as const,
    blockedUsers: () => ['blocked-users'] as const,
  },
  subscription: {
    status: () => ['subscription-status'] as const,
    offerings: () => ['revenuecat-offering-packages'] as const,
  },
};
