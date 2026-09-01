import {
  blockedUserSummarySchema,
  communityCommentDraftSchema,
  communityPostDraftSchema,
  communityReportSchema,
  communityVoteSchema,
  normalizedSubscriptionSchema,
  mobileCalendarConnectionStatusSchema,
  mobileCalendarFeedRequestSchema,
  mobileCalendarFeedSchema,
  mobileCareerOnboardingBootstrapSchema,
  mobileCareerOnboardingDataSchema,
  mobileCareerOnboardingDraftSchema,
  mobileCommunityCirclePageSchema,
  mobileCommunityDirectorySchema,
  mobileCommunityEventsSchema,
  mobileCommunityHomeSchema,
  mobileCommunityMentionCandidateSchema,
  mobileCommunityPostPageSchema,
  mobileDashboardSummarySchema,
  mobileDiscoverFeedRequestSchema,
  mobileDiscoverFeedSchema,
  mobileEventAgendaSaveSchema,
  mobileEventDetailSchema,
  mobileEventNetworkingFeedbackSchema,
  mobileEventNetworkingFeedbackUpdateSchema,
  mobileEventEngagementSchema,
  mobileEventEngagementUpdateSchema,
  mobileFollowStatusSchema,
  mobileGoogleCalendarBulkSyncResultSchema,
  mobileGoogleCalendarSyncInputSchema,
  mobileNetworkingContactRecordSchema,
  mobileNetworkingContactUpdateSchema,
  mobileOnboardingStatusSchema,
  mobileProfileStateSchema,
  mobileProfileUpdateSchema,
  usernameAvailabilityResultSchema,
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
  type MobileCalendarConnectionStatus,
  type MobileCalendarFeed,
  type MobileCalendarFeedRequest,
  type MobileCareerOnboardingBootstrap,
  type MobileCareerOnboardingData,
  type MobileCareerOnboardingDraft,
  type MobileCommunityCirclePage,
  type MobileCommunityDirectory,
  type MobileCommunityEvents,
  type MobileCommunityHome,
  type MobileCommunityFeedPost,
  type MobileCommunityMentionCandidate,
  type MobileCommunityPostPage,
  type MobileDashboardSummary,
  type MobileDiscoverFeed,
  type MobileDiscoverFeedRequest,
  type MobileEventDetail,
  type MobileEventAgendaSave,
  type MobileEventNetworkingFeedback,
  type MobileEventNetworkingFeedbackUpdate,
  type MobileEventEngagement,
  type MobileEventEngagementUpdate,
  type MobileFollowStatus,
  type MobileGoogleCalendarBulkSyncResult,
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
  type UsernameAvailabilityResult,
  mobileCommunityFeedPostSchema,
  mobileCommunityRoomDetailSchema,
  mobileCommunityRoomThreadCommentDraftSchema,
  mobileCommunityRoomThreadCommentEditDraftSchema,
  mobileCommunityRoomThreadCommentPageSchema,
  mobileCommunityRoomThreadCommentSchema,
  mobileCommunityRoomThreadDetailSchema,
  mobileNotificationListResponseSchema,
  mobileNotificationPreferencesSchema,
  mobileNotificationUnreadCountSchema,
  type MobileNotificationListResponse,
  type MobileNotificationPreferences,
  type MobileNotificationPreferencesUpdate,
  type MobileNotificationUnreadCount,
  mobileCommunityRoomThreadDraftSchema,
  mobileCommunityRoomThreadEditDraftSchema,
  mobileCommunityRoomThreadListSchema,
  mobileCommunityRoomThreadSchema,
  type MobileCommunityRoomCommentSort,
  type MobileCommunityRoomDetail,
  type MobileCommunityRoomThread,
  type MobileCommunityRoomThreadComment,
  type MobileCommunityRoomThreadCommentDraft,
  type MobileCommunityRoomThreadCommentEditDraft,
  type MobileCommunityRoomThreadCommentPage,
  type MobileCommunityRoomThreadDetail,
  type MobileCommunityRoomThreadDraft,
  type MobileCommunityRoomThreadEditDraft,
  type MobileCommunityRoomThreadList,
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

interface MobileRequestInit extends RequestInit {
  timeoutMs?: number;
}

const PENDING_NETWORKING_FOLLOW_UP_EVENT_KEY =
  'mobile_pending_networking_follow_up_event_id';
const COMMUNITY_MEDIA_BUCKET = 'community-media';
const MAX_COMMUNITY_IMAGE_BYTES = 8 * 1024 * 1024;

function reportMobileApiFailure(
  error: unknown,
  context: Record<string, string | number | boolean | null>,
) {
  // Keep the API contract module usable in Node contract tests while loading
  // the native Sentry bridge only inside the app runtime.
  void import('./monitoring')
    .then(({ captureMobileException }) =>
      captureMobileException(error, context),
    )
    .catch(() => undefined);
}

export interface MobileAvatarUploadInput {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
}

export interface CommunityPostImageUploadInput {
  fileName?: string | null;
  height: number;
  mimeType?: string | null;
  uri: string;
  width: number;
}

export interface CommunityPostImageUploadResult {
  height: number;
  path: string;
  url: string;
  width: number;
}

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
  init?: MobileRequestInit
): Promise<T> {
  const payload = await fetchMobileEnvelope(path, init);
  return schema.parse(payload);
}

async function fetchMobileEnvelope(
  path: string,
  init?: MobileRequestInit
): Promise<unknown> {
  const { timeoutMs = 15_000, ...requestInit } = init ?? {};
  const accessToken = await getAccessToken();
  const headers = new Headers(requestInit.headers);

  headers.set('Authorization', `Bearer ${accessToken}`);
  const timezone = getDeviceTimezone();
  if (timezone && !headers.has('x-timezone')) {
    headers.set('x-timezone', timezone);
  }
  if (
    requestInit.body &&
    !(requestInit.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getMobileApiBaseUrl()}${path}`, {
      ...requestInit,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      const timeoutError = new Error('Request timed out');
      reportMobileApiFailure(timeoutError, {
        endpoint: path.split('?')[0] ?? path,
        method: requestInit.method ?? 'GET',
        timeoutMs,
      });
      throw timeoutError;
    }
    reportMobileApiFailure(err, {
      endpoint: path.split('?')[0] ?? path,
      method: requestInit.method ?? 'GET',
    });
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = (await response
    .json()
    .catch(() => ({}))) as MobileApiEnvelope<unknown>;

  if (!response.ok || payload.success === false) {
    const responseError = new Error(payload.error || 'Mobile request failed');
    if (response.status >= 500) {
      reportMobileApiFailure(responseError, {
        endpoint: path.split('?')[0] ?? path,
        method: requestInit.method ?? 'GET',
        status: response.status,
      });
    }
    throw responseError;
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

function extensionForMimeType(mimeType?: string | null): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
}

function contentTypeForUpload(mimeType?: string | null): string {
  return mimeType?.startsWith('image/') ? mimeType : 'image/jpeg';
}

function randomUploadId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeStoragePath(path: string): string {
  return path.replace(/\.\.[/\\]/g, '').replace(/^\.\.$/,'').replace(/\0/g, '');
}

export async function uploadCommunityPostImage(
  input: CommunityPostImageUploadInput
): Promise<CommunityPostImageUploadResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Sign in required');
  }

  const contentType = contentTypeForUpload(input.mimeType);
  const extension = extensionForMimeType(contentType);
  const safeFileStem =
    input.fileName
      ?.replace(/\.[^.]+$/, '')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'community-image';
  const path = sanitizeStoragePath(`${user.id}/${randomUploadId()}-${safeFileStem}.${extension}`);
  const response = await fetch(input.uri);

  if (!response.ok) {
    throw new Error('Unable to read selected image.');
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_COMMUNITY_IMAGE_BYTES) {
    throw new Error('Choose an image smaller than 8 MB.');
  }

  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .upload(path, bytes, {
      cacheControl: '31536000',
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Unable to upload selected image.');
  }

  const { data: urlData } = supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .getPublicUrl(path);

  return {
    height: input.height,
    path,
    url: urlData.publicUrl,
    width: input.width,
  };
}

export async function deleteCommunityPostImage(path: string): Promise<void> {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  const safePath = sanitizeStoragePath(trimmedPath);
  if (!user || !safePath.startsWith(`${user.id}/`)) {
    throw new Error('Unauthorized: path does not belong to current user');
  }

  const { error } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .remove([safePath]);

  if (error) {
    throw new Error(error.message || 'Unable to remove selected image.');
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

export interface MobileAccountDeletionResult {
  appleAuthorizationRevoked: boolean;
  appleManualRevocationRequired: boolean;
}

const mobileAccountDeletionResultSchema = z.object({
  appleAuthorizationRevoked: z.boolean(),
  appleManualRevocationRequired: z.boolean(),
});

export async function deleteMobileAccount(): Promise<MobileAccountDeletionResult> {
  return fetchMobileContract('/api/mobile/account', mobileAccountDeletionResultSchema, {
    method: 'DELETE',
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
}

export async function completeMobileAppleAuthorization(
  authorizationCode: string,
  clientId: string,
): Promise<void> {
  await fetchMobileEnvelope('/api/mobile/auth/apple/complete', {
    method: 'POST',
    body: JSON.stringify({ authorizationCode, clientId }),
  });
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

export async function loadMobileGoogleCalendarStatus(): Promise<MobileCalendarConnectionStatus> {
  return fetchMobileContract(
    '/api/mobile/calendar/google/status',
    mobileCalendarConnectionStatusSchema
  );
}

export async function disconnectMobileGoogleCalendar(): Promise<MobileCalendarConnectionStatus> {
  return fetchMobileContract(
    '/api/mobile/calendar/google/disconnect',
    mobileCalendarConnectionStatusSchema,
    {
      method: 'POST',
    }
  );
}

export async function syncMobileGoogleCalendarEvent(
  eventId: string
): Promise<void> {
  const payload = mobileGoogleCalendarSyncInputSchema.parse({
    eventId,
    action: 'sync',
  });

  await fetchMobileEnvelope('/api/mobile/calendar/google/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function unsyncMobileGoogleCalendarEvent(
  eventId: string
): Promise<void> {
  const payload = mobileGoogleCalendarSyncInputSchema.parse({
    eventId,
    action: 'delete',
  });

  await fetchMobileEnvelope('/api/mobile/calendar/google/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function bulkSyncMobileGoogleCalendar(): Promise<MobileGoogleCalendarBulkSyncResult> {
  return fetchMobileContract(
    '/api/mobile/calendar/google/bulk-sync',
    mobileGoogleCalendarBulkSyncResultSchema,
    {
      method: 'POST',
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

export async function loadMobileCommunityEvents(
  slug: string
): Promise<MobileCommunityEvents> {
  if (!slug.trim()) {
    throw new Error('Circle slug is required');
  }

  return fetchMobileContract(
    `/api/mobile/community/circles/${encodeURIComponent(slug.trim())}/events`,
    mobileCommunityEventsSchema
  );
}

export async function loadMobileCommunityMentionSuggestions(
  query: string
): Promise<MobileCommunityMentionCandidate[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  return fetchMobileContract(
    `/api/mobile/community/mentions?q=${encodeURIComponent(trimmed)}`,
    mobileCommunityMentionCandidateSchema.array()
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

export async function updateMobileEventAgendaSave(
  eventId: string,
  agendaItemId: string,
  isSaved: boolean
): Promise<MobileEventAgendaSave> {
  const trimmedEventId = eventId.trim();
  const trimmedAgendaItemId = agendaItemId.trim();

  if (!trimmedEventId || !trimmedAgendaItemId) {
    throw new Error('Event id and agenda item id are required');
  }

  return fetchMobileContract(
    `/api/mobile/events/${encodeURIComponent(trimmedEventId)}/agenda/${encodeURIComponent(trimmedAgendaItemId)}/save`,
    mobileEventAgendaSaveSchema,
    {
      method: isSaved ? 'POST' : 'DELETE',
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

export async function unblockMobileUser(blockedUserId: string): Promise<void> {
  if (!blockedUserId.trim()) {
    throw new Error('Blocked user id is required');
  }

  await fetchMobileEnvelope(
    `/api/blocks/${encodeURIComponent(blockedUserId.trim())}`,
    {
      method: 'DELETE',
    }
  );
}

export async function searchMobileCommunityDirectory(
  query: string,
  cursor?: string | null
): Promise<MobileCommunityDirectory> {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }

  if (cursor?.trim()) {
    params.set('cursor', cursor.trim());
  }

  params.set('limit', '20');

  return fetchMobileContract(
    `/api/mobile/community/directory?${params.toString()}`,
    mobileCommunityDirectorySchema
  );
}

export async function createMobileCommunityPost(
  input: CommunityPostDraft
): Promise<void> {
  const parsed = communityPostDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Check the selected circle and post details, then try again.');
  }

  await fetchMobileEnvelope('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
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

export async function deleteMobileCommunityPost(postId: string): Promise<void> {
  const trimmedPostId = postId.trim();
  if (!trimmedPostId) {
    throw new Error('Thread id is required');
  }

  await fetchMobileEnvelope(
    `/api/community/posts/${encodeURIComponent(trimmedPostId)}`,
    {
      method: 'DELETE',
    }
  );
}

export async function deleteMobileCommunityComment(
  commentId: string
): Promise<void> {
  const trimmedCommentId = commentId.trim();
  if (!trimmedCommentId) {
    throw new Error('Reply id is required');
  }

  await fetchMobileEnvelope(
    `/api/community/comments/${encodeURIComponent(trimmedCommentId)}`,
    {
      method: 'DELETE',
    }
  );
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

export async function uploadMobileAvatar(
  input: MobileAvatarUploadInput
): Promise<MobileProfileState> {
  const mimeType = contentTypeForUpload(input.mimeType);
  const extension = extensionForMimeType(mimeType);
  const fileName = input.fileName?.trim() || `profile-photo.${extension}`;
  const formData = new FormData();
  formData.append('avatar', {
    name: fileName,
    type: mimeType,
    uri: input.uri,
  } as unknown as Blob);

  return fetchMobileContract(
    '/api/mobile/profile/avatar',
    mobileProfileStateSchema,
    {
      method: 'POST',
      body: formData,
      timeoutMs: 30_000,
    }
  );
}

export async function removeMobileAvatar(): Promise<MobileProfileState> {
  return fetchMobileContract(
    '/api/mobile/profile/avatar',
    mobileProfileStateSchema,
    {
      method: 'DELETE',
    }
  );
}

export async function checkMobileUsernameAvailability(
  username: string
): Promise<UsernameAvailabilityResult> {
  const query = encodeURIComponent(username.trim());
  return fetchMobileContract(
    `/api/mobile/profile/username-check?q=${query}`,
    usernameAvailabilityResultSchema
  );
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

export async function saveMobileCareerOnboardingDraft(
  data: MobileCareerOnboardingDraft
): Promise<MobileOnboardingStatus> {
  const payload = mobileCareerOnboardingDraftSchema.parse(data);

  return fetchMobileContract(
    '/api/mobile/onboarding/career',
    mobileOnboardingStatusSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'save-draft',
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

// ─── Event Room + Thread API ──────────────────────────────────────────────────

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

const mobileEventCommunityPostsSchema = z.object({
  posts: z.array(mobileCommunityFeedPostSchema),
  totalCount: z.number().int().nonnegative(),
});

export type MobileEventCommunityPosts = z.infer<typeof mobileEventCommunityPostsSchema>;

export async function loadMobileEventCommunityPosts(
  eventId: string
): Promise<MobileEventCommunityPosts> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  return fetchMobileContract(
    `/api/mobile/community/event-posts?eventId=${encodeURIComponent(eventId)}`,
    mobileEventCommunityPostsSchema
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
  const payload = mobileCommunityRoomThreadCommentEditDraftSchema.parse(draft);
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

export async function loadMobileEventThreadComments(
  eventId: string,
  threadId: string,
  {
    cursor,
    limit,
    sort,
  }: {
    cursor?: string | null;
    limit?: number;
    sort?: MobileCommunityRoomCommentSort;
  } = {}
): Promise<MobileCommunityRoomThreadCommentPage> {
  if (!eventId.trim()) {
    throw new Error('Event id is required');
  }
  if (!threadId.trim()) {
    throw new Error('Thread id is required');
  }
  const params = new URLSearchParams();
  if (sort) params.set('sort', sort);
  if (cursor) params.set('cursor', cursor);
  if (limit != null) params.set('limit', String(limit));
  const query = params.toString();
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}/comments${query ? `?${query}` : ''}`,
    mobileCommunityRoomThreadCommentPageSchema
  );
}

export async function loadMobileEventThreadComment(
  eventId: string,
  threadId: string,
  commentId: string
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
  return fetchMobileContract(
    `/api/mobile/community/rooms/${encodeURIComponent(eventId)}/threads/${encodeURIComponent(threadId)}/comments/${encodeURIComponent(commentId)}`,
    mobileCommunityRoomThreadCommentSchema
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function loadMobileNotifications(params?: {
  cursor?: string | null;
  limit?: number;
}): Promise<MobileNotificationListResponse> {
  const search = new URLSearchParams();
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return fetchMobileContract(
    `/api/mobile/notifications${query ? `?${query}` : ''}`,
    mobileNotificationListResponseSchema
  );
}

export async function loadMobileNotificationUnreadCount(): Promise<MobileNotificationUnreadCount> {
  return fetchMobileContract(
    '/api/mobile/notifications/unread-count',
    mobileNotificationUnreadCountSchema
  );
}

export async function markMobileNotificationsRead(
  body: { ids?: string[] } | { all: true }
): Promise<void> {
  await fetchMobileEnvelope('/api/mobile/notifications/mark-read', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function loadMobileNotificationPreferences(): Promise<MobileNotificationPreferences> {
  return fetchMobileContract(
    '/api/mobile/notifications/preferences',
    mobileNotificationPreferencesSchema
  );
}

export async function updateMobileNotificationPreferences(
  patch: MobileNotificationPreferencesUpdate
): Promise<MobileNotificationPreferences> {
  return fetchMobileContract(
    '/api/mobile/notifications/preferences',
    mobileNotificationPreferencesSchema,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
}
