import type {
  ApiResponse,
  AppProfile,
  BlockedUserSummary,
  CommunityCommentDraft,
  CommunityCircleSummary,
  CommunityFeedSnapshot,
  CommunityPostDraft,
  CommunityReportInput,
  CommunityReportRecord,
  CommunityVoteInput,
  MobileCalendarFeed,
  MobileCalendarFeedRequest,
  MobileCareerOnboardingBootstrap,
  MobileCareerOnboardingCompletePayload,
  MobileCareerOnboardingSkipPayload,
  MobileDiscoverFeedRequest,
  MobileDashboardHome,
  MobileDiscoverFeed,
  MobileEventDetail,
  MobileEventEngagement,
  MobileEventEngagementUpdate,
  NormalizedSubscription,
  RevenueCatReconcileInput,
  SubscriptionOffering,
} from '@kurecal/domain';

export interface MobileApiClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
}

function summarizeResponseBody(body: string): string | undefined {
  const normalized = body.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, 160);
}

async function parseJson<T>(response: Response): Promise<ApiResponse<T>> {
  const raw = await response.text();
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const trimmed = raw.trim();

  if (!trimmed) {
    if (response.ok) {
      return { success: true };
    }

    return {
      success: false,
      error: `Request failed with empty response (${response.status})`,
    };
  }

  const looksLikeJson =
    contentType.includes('application/json') ||
    contentType.includes('+json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (!looksLikeJson) {
    return {
      success: false,
      error: `Expected JSON response but received ${contentType || 'non-JSON content'} (${response.status})`,
      message: summarizeResponseBody(trimmed),
    };
  }

  let payload: ApiResponse<T>;
  try {
    payload = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: `Expected valid JSON response but received invalid JSON (${response.status})`,
      message: summarizeResponseBody(trimmed),
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: payload.error ?? 'Request failed',
      message: payload.message,
      data: payload.data,
    };
  }
  return payload;
}

export class MobileApiClient {
  constructor(private readonly options: MobileApiClientOptions) {}

  private async request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    const accessToken = await this.options.getAccessToken();
    const timezone =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    const response = await fetch(new URL(path, this.options.baseUrl), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(timezone ? { 'x-timezone': timezone } : {}),
        ...(init?.headers ?? {}),
      },
    });

    return parseJson<T>(response);
  }

  getProfile() {
    return this.request<AppProfile>('/api/profile');
  }

  updateProfile(payload: Partial<Pick<AppProfile, 'fullName' | 'timezone'>>) {
    return this.request<AppProfile>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  getDashboardHome() {
    return this.request<MobileDashboardHome>('/api/mobile/dashboard/summary');
  }

  getDashboardSnapshot() {
    return this.getDashboardHome();
  }

  getDiscoverFeed(params: MobileDiscoverFeedRequest = {}) {
    return this.request<MobileDiscoverFeed>('/api/mobile/discover', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  getCalendarFeed(request?: MobileCalendarFeedRequest) {
    if (!request) {
      return this.request<MobileCalendarFeed>('/api/mobile/calendar');
    }

    return this.request<MobileCalendarFeed>('/api/mobile/calendar', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  getCareerOnboarding() {
    return this.request<MobileCareerOnboardingBootstrap>('/api/mobile/onboarding/career');
  }

  completeCareerOnboarding(payload: MobileCareerOnboardingCompletePayload) {
    return this.request<{ completed: true }>('/api/mobile/onboarding/career', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  skipCareerOnboarding(payload: MobileCareerOnboardingSkipPayload = {}) {
    return this.request<{ skipped: true }>('/api/mobile/onboarding/career/skip', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getEvent(eventId: string) {
    return this.request<MobileEventDetail>(`/api/mobile/events/${eventId}`);
  }

  getCommunityFeed() {
    return this.request<CommunityFeedSnapshot>('/api/mobile/community/feed');
  }

  getJoinedCircles() {
    return this.request<CommunityCircleSummary[]>('/api/mobile/community/circles');
  }

  getSubscriptionStatus() {
    return this.request<NormalizedSubscription>('/api/mobile/subscription/status');
  }

  getSubscriptionOfferings() {
    return this.request<SubscriptionOffering[]>('/api/mobile/subscription/offerings');
  }

  getBlockedUsers() {
    return this.request<BlockedUserSummary[]>('/api/blocks');
  }

  getEventEngagement(eventId: string) {
    return this.request<MobileEventEngagement>(`/api/mobile/events/${eventId}/engagement`);
  }

  updateEventEngagement(eventId: string, payload: MobileEventEngagementUpdate) {
    return this.request<MobileEventEngagement>(`/api/mobile/events/${eventId}/engagement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  blockUser(blockedUserId: string) {
    return this.request<undefined>('/api/blocks', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId }),
    });
  }

  unblockUser(blockedUserId: string) {
    return this.request<undefined>(`/api/blocks/${blockedUserId}`, {
      method: 'DELETE',
    });
  }

  reconcileRevenueCat(payload: RevenueCatReconcileInput) {
    return this.request<NormalizedSubscription>('/api/mobile/subscription/reconcile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  createCommunityPost(payload: CommunityPostDraft) {
    return this.request<{ id: string }>('/api/community/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  createCommunityComment(payload: CommunityCommentDraft) {
    return this.request<{ id: string }>('/api/community/comments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  submitVote(payload: CommunityVoteInput) {
    return this.request<{ success: true }>('/api/community/votes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  reportCommunityContent(payload: CommunityReportInput) {
    return this.request<CommunityReportRecord>('/api/community/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
