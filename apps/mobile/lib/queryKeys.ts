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
    root: () => ['community'] as const,
    home: () => ['community', 'home'] as const,
    circle: (slug: string | undefined | null) => ['community', 'circle', slug ?? null] as const,
    post: (postId: string | undefined | null) => ['community', 'post', postId ?? null] as const,
    feed: () => ['community-feed'] as const,
    joinedCircles: (userId: string | undefined | null) => ['joined-circles', userId ?? null] as const,
    blockedUsers: () => ['blocked-users'] as const,
  },
  profile: {
    root: () => ['profile'] as const,
    public: (username: string | undefined | null) => ['profile', 'public', username ?? null] as const,
    followStatus: (userId: string | undefined | null) =>
      ['profile', 'follow-status', userId ?? null] as const,
    social: () => ['profile', 'social'] as const,
  },
  speaker: {
    root: () => ['speaker'] as const,
    detail: (speakerId: string | undefined | null) => ['speaker', 'detail', speakerId ?? null] as const,
  },
  subscription: {
    status: () => ['subscription-status'] as const,
    offerings: () => ['revenuecat-offering-packages'] as const,
  },
};
