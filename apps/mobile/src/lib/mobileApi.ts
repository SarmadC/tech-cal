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
  mobileCommunityRoomDetailSchema,
  mobileCommunityRoomThreadCommentDraftSchema,
  mobileCommunityRoomThreadCommentEditDraftSchema,
  mobileCommunityRoomThreadCommentSchema,
  mobileCommunityRoomThreadDetailSchema,
  mobileCommunityRoomThreadDraftSchema,
  mobileCommunityRoomThreadEditDraftSchema,
  mobileCommunityRoomThreadListSchema,
  mobileCommunityRoomThreadSchema,
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
  type MobileCommunityRoomCommentSort,
  type MobileCommunityRoomDetail,
  type MobileCommunityRoomThread,
  type MobileCommunityRoomThreadComment,
  type MobileCommunityRoomThreadCommentDraft,
  type MobileCommunityRoomThreadCommentEditDraft,
  type MobileCommunityRoomThreadDetail,
  type MobileCommunityRoomThreadDraft,
  type MobileCommunityRoomThreadEditDraft,
  type MobileCommunityRoomThreadList,
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
import type { ZodType } from 'zod';

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

export async function loadMobileCommunityRoom(
  eventId: string
): Promise<MobileCommunityRoomDetail> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}`,
    mobileCommunityRoomDetailSchema
  );
}

export async function createMobileCommunityRoomThread(
  eventId: string,
  draft: MobileCommunityRoomThreadDraft
): Promise<MobileCommunityRoomThread> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  const payload = mobileCommunityRoomThreadDraftSchema.parse(draft);
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads`,
    mobileCommunityRoomThreadSchema,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function loadMobileEventThreads(
  eventId: string,
  cursor?: string | null
): Promise<MobileCommunityRoomThreadList> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  const params = new URLSearchParams();
  if (cursor) {
    params.set('cursor', cursor);
  }
  const query = params.toString();
  const path = `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads${query ? `?${query}` : ''}`;
  return fetchMobileContract(path, mobileCommunityRoomThreadListSchema);
}

export async function loadMobileEventThread(
  eventId: string,
  threadId: string,
  sort?: MobileCommunityRoomCommentSort
): Promise<MobileCommunityRoomThreadDetail> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  const query = sort ? `?sort=${encodeURIComponent(sort)}` : '';
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}${query}`,
    mobileCommunityRoomThreadDetailSchema
  );
}

export async function updateMobileEventThread(
  eventId: string,
  threadId: string,
  draft: MobileCommunityRoomThreadEditDraft
): Promise<MobileCommunityRoomThread> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  const payload = mobileCommunityRoomThreadEditDraftSchema.parse(draft);
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}`,
    mobileCommunityRoomThreadSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteMobileEventThread(
  eventId: string,
  threadId: string
): Promise<void> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  await fetchMobileEnvelope(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}`,
    { method: 'DELETE' }
  );
}

export async function updateMobileEventThreadComment(
  eventId: string,
  threadId: string,
  commentId: string,
  draft: MobileCommunityRoomThreadCommentEditDraft
): Promise<MobileCommunityRoomThreadComment> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  if (!commentId.trim()) {
    throw new Error('Comment id is required');
  }
  const payload =
    mobileCommunityRoomThreadCommentEditDraftSchema.parse(draft);
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(commentId)}`,
    mobileCommunityRoomThreadCommentSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteMobileEventThreadComment(
  eventId: string,
  threadId: string,
  commentId: string
): Promise<void> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  if (!commentId.trim()) {
    throw new Error('Comment id is required');
  }
  await fetchMobileEnvelope(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' }
  );
}

export async function createMobileEventThreadComment(
  eventId: string,
  threadId: string,
  draft: MobileCommunityRoomThreadCommentDraft
): Promise<MobileCommunityRoomThreadComment> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  const payload = mobileCommunityRoomThreadCommentDraftSchema.parse(draft);
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}/comments`,
    mobileCommunityRoomThreadCommentSchema,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
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
