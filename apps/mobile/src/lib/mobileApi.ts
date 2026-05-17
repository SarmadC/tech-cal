import {
  blockedUserSummarySchema,
  communityCommentDraftSchema,
  communityPostDraftSchema,
  communityReportSchema,
  communityVoteSchema,
  normalizedSubscriptionSchema,
  mobileCalendarFeedRequestSchema,
  mobileCalendarFeedSchema,
  mobileCareerOnboardingBootstrapSchema,
  mobileCareerOnboardingDataSchema,
  mobileCommunityCirclePageSchema,
  mobileCommunityHomeSchema,
  mobileCommunityPostPageSchema,
  mobileDashboardSummarySchema,
  mobileDiscoverFeedRequestSchema,
  mobileDiscoverFeedSchema,
  mobileEventDetailSchema,
  mobileEventNetworkingFeedbackSchema,
  mobileEventNetworkingFeedbackUpdateSchema,
  mobileEventEngagementSchema,
  mobileEventEngagementUpdateSchema,
  mobileFollowStatusSchema,
  mobileLinkedInOutreachLogSchema,
  mobileNetworkingContactRecordSchema,
  mobileNetworkingContactUpdateSchema,
  mobileOnboardingStatusSchema,
  mobileProfileStateSchema,
  mobileProfileUpdateSchema,
  mobilePublicProfileSchema,
  mobileSavedEventsFeedSchema,
  mobileSpeakerDetailSchema,
  revenueCatReconcileSchema,
  subscriptionOfferingSchema,
  type CommunityCommentDraft,
  type CommunityPostDraft,
  type CommunityReportInput,
  type CommunityVoteInput,
  type BlockedUserSummary,
  type MobileCalendarFeed,
  type MobileCalendarFeedRequest,
  type MobileCareerOnboardingBootstrap,
  type MobileCareerOnboardingData,
  type MobileCommunityCirclePage,
  type MobileCommunityHome,
  type MobileCommunityPostPage,
  type MobileDashboardSummary,
  type MobileDiscoverFeed,
  type MobileDiscoverFeedRequest,
  type MobileEventDetail,
  type MobileEventNetworkingFeedback,
  type MobileEventNetworkingFeedbackUpdate,
  type MobileEventEngagement,
  type MobileEventEngagementUpdate,
  type MobileFollowStatus,
  type MobileLinkedInOutreachLog,
  type MobileNetworkingContactRecord,
  type MobileNetworkingContactUpdate,
  type MobileOnboardingStatus,
  type MobileProfileState,
  type MobileProfileUpdate,
  type MobilePublicProfile,
  type MobileSavedEventsFeed,
  type MobileSpeakerDetail,
  type NormalizedSubscription,
  type RevenueCatReconcileInput,
  type SubscriptionOffering,
} from '@kurecal/domain';
import { z, type ZodType } from 'zod';

import { getMobileApiBaseUrl } from './env';
import { sessionStorage } from './sessionStorage';
import { supabase } from './supabase';

interface MobileApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

const PENDING_NETWORKING_FOLLOW_UP_EVENT_KEY =
  'mobile_pending_networking_follow_up_event_id';

function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error('Sign in required');
  }

  return accessToken;
}

async function fetchMobileContract<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit
): Promise<T> {
  const payload = await fetchMobileEnvelope(path, init);
  return schema.parse(payload);
}

async function fetchMobileEnvelope(
  path: string,
  init?: RequestInit
): Promise<unknown> {
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);

  headers.set('Authorization', `Bearer ${accessToken}`);
  const timezone = getDeviceTimezone();
  if (timezone && !headers.has('x-timezone')) {
    headers.set('x-timezone', timezone);
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getMobileApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = (await response
    .json()
    .catch(() => ({}))) as MobileApiEnvelope<unknown>;

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'Mobile request failed');
  }

  return Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
}

async function setPendingNetworkingFollowUpEventId(
  eventId: string | null
): Promise<void> {
  const trimmed = eventId?.trim() ?? '';
  if (!trimmed) {
    await sessionStorage.removeItem(PENDING_NETWORKING_FOLLOW_UP_EVENT_KEY);
    return;
  }

  await sessionStorage.setItem(PENDING_NETWORKING_FOLLOW_UP_EVENT_KEY, trimmed);
}

async function syncPendingNetworkingFollowUpEventId(
  eventId: string | null
): Promise<void> {
  try {
    await setPendingNetworkingFollowUpEventId(eventId);
  } catch (error) {
    console.warn(
      '[mobileApi] Unable to persist pending networking follow-up event id',
      error
    );
  }
}

export async function loadPendingNetworkingFollowUpEventId(): Promise<string | null> {
  try {
    const value = await sessionStorage.getItem(PENDING_NETWORKING_FOLLOW_UP_EVENT_KEY);
    const trimmed = value?.trim() ?? '';
    return trimmed || null;
  } catch (error) {
    console.warn(
      '[mobileApi] Unable to load pending networking follow-up event id',
      error
    );
    return null;
  }
}

export async function clearPendingNetworkingFollowUpEventId(): Promise<void> {
  try {
    await sessionStorage.removeItem(PENDING_NETWORKING_FOLLOW_UP_EVENT_KEY);
  } catch (error) {
    console.warn(
      '[mobileApi] Unable to clear pending networking follow-up event id',
      error
    );
  }
}

export async function loadMobileDashboardSummary(): Promise<MobileDashboardSummary> {
  return fetchMobileContract(
    '/api/mobile/dashboard/summary',
    mobileDashboardSummarySchema
  );
}

export async function loadMobileSubscriptionStatus(): Promise<NormalizedSubscription> {
  return fetchMobileContract(
    '/api/mobile/subscription/status',
    normalizedSubscriptionSchema
  );
}

export async function loadMobileSubscriptionOfferings(): Promise<
  SubscriptionOffering[]
> {
  return fetchMobileContract(
    '/api/mobile/subscription/offerings',
    subscriptionOfferingSchema.array()
  );
}

export async function reconcileMobileRevenueCatSubscription(
  input: RevenueCatReconcileInput
): Promise<NormalizedSubscription> {
  const payload = revenueCatReconcileSchema.parse(input);

  return fetchMobileContract(
    '/api/mobile/subscription/reconcile',
    normalizedSubscriptionSchema,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function loadMobileCalendarFeed(
  input: MobileCalendarFeedRequest = {}
): Promise<MobileCalendarFeed> {
  const payload = mobileCalendarFeedRequestSchema.parse(input);
  return fetchMobileContract(
    '/api/mobile/calendar',
    mobileCalendarFeedSchema,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function loadMobileCommunityHome(): Promise<MobileCommunityHome> {
  return fetchMobileContract('/api/mobile/community', mobileCommunityHomeSchema);
}

export async function loadMobileCommunityCircle(
  slug: string
): Promise<MobileCommunityCirclePage> {
  if (!slug.trim()) {
    throw new Error('Circle slug is required');
  }

  return fetchMobileContract(
    `/api/mobile/community/circles/${encodeURIComponent(slug.trim())}`,
    mobileCommunityCirclePageSchema
  );
}

export async function loadMobileCommunityPost(
  postId: string
): Promise<MobileCommunityPostPage> {
  if (!postId.trim()) {
    throw new Error('Post id is required');
  }

  return fetchMobileContract(
    `/api/mobile/community/posts/${encodeURIComponent(postId.trim())}`,
    mobileCommunityPostPageSchema
  );
}

export async function loadMobilePublicProfile(
  username: string
): Promise<MobilePublicProfile> {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error('Username is required');
  }

  return fetchMobileContract(
    `/api/mobile/profiles/${encodeURIComponent(trimmed)}`,
    mobilePublicProfileSchema
  );
}

export async function loadMobileFollowStatus(
  userId: string
): Promise<MobileFollowStatus> {
  const trimmed = userId.trim();
  if (!trimmed) {
    throw new Error('User id is required');
  }

  return fetchMobileContract(
    `/api/follows/status/${encodeURIComponent(trimmed)}`,
    mobileFollowStatusSchema
  );
}

export async function followMobileUser(userId: string): Promise<void> {
  const trimmed = userId.trim();
  if (!trimmed) {
    throw new Error('User id is required');
  }

  await fetchMobileEnvelope('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ userId: trimmed }),
  });
}

export async function unfollowMobileUser(userId: string): Promise<void> {
  const trimmed = userId.trim();
  if (!trimmed) {
    throw new Error('User id is required');
  }

  await fetchMobileEnvelope(`/api/follows/${encodeURIComponent(trimmed)}`, {
    method: 'DELETE',
  });
}

export async function loadMobileSpeakerDetail(
  speakerId: string
): Promise<MobileSpeakerDetail> {
  const trimmed = speakerId.trim();
  if (!trimmed) {
    throw new Error('Speaker id is required');
  }

  return fetchMobileContract(
    `/api/mobile/speakers/${encodeURIComponent(trimmed)}`,
    mobileSpeakerDetailSchema
  );
}

export async function loadMobileDiscoverFeed(
  input: MobileDiscoverFeedRequest
): Promise<MobileDiscoverFeed> {
  const payload = mobileDiscoverFeedRequestSchema.parse(input);

  return fetchMobileContract('/api/mobile/discover', mobileDiscoverFeedSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loadMobileSavedEvents(
  page = 1
): Promise<MobileSavedEventsFeed> {
  if (!Number.isFinite(page) || page < 1) {
    throw new Error('Page must be positive');
  }

  return fetchMobileContract(
    `/api/mobile/saved?page=${encodeURIComponent(String(page))}`,
    mobileSavedEventsFeedSchema
  );
}

export async function loadMobileEventDetail(
  eventId: string
): Promise<MobileEventDetail> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  return fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}`,
    mobileEventDetailSchema
  );
}

export async function updateMobileEventEngagement(
  eventId: string,
  input: MobileEventEngagementUpdate
): Promise<MobileEventEngagement> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  const payload = mobileEventEngagementUpdateSchema.parse(input);

  return fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}/engagement`,
    mobileEventEngagementSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export async function updateMobileNetworkingContact(
  input: MobileNetworkingContactUpdate
): Promise<MobileNetworkingContactRecord> {
  const payload = mobileNetworkingContactUpdateSchema.parse(input);

  return fetchMobileContract(
    '/api/mobile/networking/contacts',
    mobileNetworkingContactRecordSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export async function logMobileLinkedInRequest(
  eventId: string
): Promise<MobileLinkedInOutreachLog> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  const result = await fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}/networking-outreach`,
    mobileLinkedInOutreachLogSchema,
    {
      method: 'POST',
    }
  );

  await syncPendingNetworkingFollowUpEventId(
    result.linkedinRequestsSent > result.connectionsMade ? result.eventId : null
  );

  return result;
}

export async function loadMobileEventNetworkingFeedback(
  eventId: string
): Promise<MobileEventNetworkingFeedback> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  return fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}/feedback`,
    mobileEventNetworkingFeedbackSchema
  );
}

export async function updateMobileEventNetworkingFeedback(
  eventId: string,
  input: MobileEventNetworkingFeedbackUpdate
): Promise<MobileEventNetworkingFeedback> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }

  const payload = mobileEventNetworkingFeedbackUpdateSchema.parse(input);

  const result = await fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(eventId.trim())}/feedback`,
    mobileEventNetworkingFeedbackSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );

  await syncPendingNetworkingFollowUpEventId(
    (result.linkedinRequestsSent ?? 0) > (result.connectionsMade ?? 0)
      ? result.eventId
      : null
  );

  return result;
}

export async function joinMobileCommunityCircle(circleId: string): Promise<void> {
  if (!circleId.trim()) {
    throw new Error('Circle id is required');
  }

  await fetchMobileEnvelope(
    `/api/community/circles/${encodeURIComponent(circleId.trim())}/join`,
    {
      method: 'POST',
    }
  );
}

export async function leaveMobileCommunityCircle(circleId: string): Promise<void> {
  if (!circleId.trim()) {
    throw new Error('Circle id is required');
  }

  await fetchMobileEnvelope(
    `/api/community/circles/${encodeURIComponent(circleId.trim())}/join`,
    {
      method: 'DELETE',
    }
  );
}

export async function loadMobileBlockedUsers(): Promise<BlockedUserSummary[]> {
  return fetchMobileContract('/api/blocks', blockedUserSummarySchema.array());
}

export async function blockMobileUser(blockedUserId: string): Promise<void> {
  if (!blockedUserId.trim()) {
    throw new Error('Blocked user id is required');
  }

  await fetchMobileEnvelope('/api/blocks', {
    method: 'POST',
    body: JSON.stringify({
      blockedUserId: blockedUserId.trim(),
    }),
  });
}

export async function createMobileCommunityPost(
  input: CommunityPostDraft
): Promise<void> {
  const payload = communityPostDraftSchema.parse(input);

  await fetchMobileEnvelope('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createMobileCommunityComment(
  input: CommunityCommentDraft
): Promise<void> {
  const payload = communityCommentDraftSchema.parse(input);

  await fetchMobileEnvelope('/api/community/comments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitMobileCommunityVote(
  input: CommunityVoteInput
): Promise<void> {
  const payload = communityVoteSchema.parse(input);

  await fetchMobileEnvelope('/api/community/votes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitMobileCommunityReport(
  input: CommunityReportInput
): Promise<void> {
  const payload = communityReportSchema.parse(input);

  await fetchMobileEnvelope('/api/community/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loadMobileProfileState(): Promise<MobileProfileState> {
  return fetchMobileContract('/api/mobile/profile', mobileProfileStateSchema);
}

export async function updateMobileProfile(
  input: MobileProfileUpdate
): Promise<MobileProfileState> {
  const payload = mobileProfileUpdateSchema.parse(input);

  return fetchMobileContract('/api/mobile/profile', mobileProfileStateSchema, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function loadMobileCareerOnboardingBootstrap(): Promise<MobileCareerOnboardingBootstrap> {
  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileCareerOnboardingBootstrapSchema
  );
}

export async function completeMobileCareerOnboarding(
  data: MobileCareerOnboardingData
): Promise<MobileOnboardingStatus> {
  const payload = mobileCareerOnboardingDataSchema.parse(data);

  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileOnboardingStatusSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'complete',
        data: payload,
      }),
    }
  );
}

export async function skipMobileCareerOnboarding(): Promise<MobileOnboardingStatus> {
  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileOnboardingStatusSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'skip',
      }),
    }
  );
}

const pushTokenRegisterResponseSchema = z.object({
  ok: z.literal(true),
});

export interface RegisterPushTokenInput {
  expoPushToken: string;
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion?: string;
}

export async function registerPushToken(
  input: RegisterPushTokenInput
): Promise<void> {
  await fetchMobileContract(
    '/api/mobile/push/register',
    pushTokenRegisterResponseSchema,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
}

export async function unregisterPushToken(input: {
  deviceId: string;
}): Promise<void> {
  await fetchMobileContract(
    '/api/mobile/push/register',
    pushTokenRegisterResponseSchema,
    {
      method: 'DELETE',
      body: JSON.stringify(input),
    }
  );
}
