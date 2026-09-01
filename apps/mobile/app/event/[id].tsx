import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Share, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';

import type {
  MobileCalendarConnectionStatus,
  MobileCommunityCircle,
  MobileEventDetail,
  MobileEventEngagement,
  MobileEventNetworkingFeedback,
  MobileEventNetworkingFeedbackUpdate,
} from '@kurecal/domain';

import { MobileEventDetailScreen } from '../../src/components/event-detail/MobileEventDetailScreen';
import { EventReviewSheet } from '../../src/components/event-detail/EventReviewSheet';
import {
  CommunityComposerModal,
  type CommunityComposerEventOption,
  type CommunityComposerImageAttachment,
} from '../../src/components/community/CommunityComposerModal';
import { useCommunityImageAttachments } from '../../src/hooks/useCommunityImageAttachments';
import {
  buildMapsSearchUrl,
  getAttendanceCtaState,
} from '../../src/components/event-detail/eventDetailUtils';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import { useAuth } from '../../src/context/AuthProvider';
import { recordSignatureInteraction } from '../../src/lib/signatureInteractions';
import {
  getDeviceCalendarMapping,
  removeEventFromDeviceCalendar,
  syncEventToDeviceCalendar,
  type DeviceCalendarEventMapping,
} from '../../src/lib/deviceCalendarSync';
import {
  loadMobileEventDetail,
  loadMobileEventNetworkingFeedback,
  loadMobileGoogleCalendarStatus,
  loadMobileCommunityHome,
  syncMobileGoogleCalendarEvent,
  unsyncMobileGoogleCalendarEvent,
  createMobileCommunityPost,
  updateMobileEventAgendaSave,
  updateMobileEventEngagement,
  updateMobileEventNetworkingFeedback,
} from '../../src/lib/mobileApi';

export default function EventDetailRoute() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{
    id: string | string[];
  }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [data, setData] = useState<MobileEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [attendancePending, setAttendancePending] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [postComposerVisible, setPostComposerVisible] = useState(false);
  const [postComposerTitle, setPostComposerTitle] = useState('');
  const [postComposerBody, setPostComposerBody] = useState('');
  const [postComposerPosting, setPostComposerPosting] = useState(false);
  const [postComposerCircles, setPostComposerCircles] = useState<
    MobileCommunityCircle[]
  >([]);
  const [postComposerSelectedCircleId, setPostComposerSelectedCircleId] =
    useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] =
    useState<MobileEventNetworkingFeedback | null>(null);
  const postImageAttachments = useCommunityImageAttachments({
    isBusy: postComposerPosting,
  });
  const [pendingAgendaSaveIds, setPendingAgendaSaveIds] = useState<Set<string>>(
    () => new Set()
  );
  const [calendarPending, setCalendarPending] = useState(false);
  const [googleStatus, setGoogleStatus] =
    useState<MobileCalendarConnectionStatus | null>(null);
  const [appleMapping, setAppleMapping] =
    useState<DeviceCalendarEventMapping | null>(null);
  const platformSettingsLabel =
    Platform.OS === 'ios' ? 'iOS Settings' : 'your device settings';

  async function loadDetail() {
    if (!eventId) {
      setError('Event id is missing');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextData, nextGoogleStatus] = await Promise.all([
        loadMobileEventDetail(eventId),
        loadMobileGoogleCalendarStatus().catch(() => null),
      ]);
      setData(nextData);
      setGoogleStatus(nextGoogleStatus);
      setAppleMapping(await getDeviceCalendarMapping(nextData.event.id));
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load event detail'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [eventId]);

  async function openUrl(url: string | null | undefined) {
    if (!url) {
      return;
    }

    try {
      await Linking.openURL(url);
    } catch (nextError) {
      Alert.alert(
        'Unable to open link',
        nextError instanceof Error ? nextError.message : 'Link failed to open.'
      );
    }
  }

  async function handlePrimaryAction() {
    if (!data) {
      return;
    }

    const primaryUrl = data.event.registrationUrl ?? data.event.sourceUrl;
    if (primaryUrl) {
      await openUrl(primaryUrl);
      return;
    }

    handleAddToCalendar();
  }

  function updateEngagementState(engagement: MobileEventEngagement) {
    setData((current) =>
      current
        ? {
            ...current,
            event: {
              ...current.event,
              engagement,
            },
          }
        : current
    );
  }

  function handleAddToCalendar() {
    if (!data) {
      return;
    }

    const googleSynced =
      data.event.engagement?.calendarSync?.provider === 'google' &&
      data.event.engagement.calendarSync.status === 'synced';
    const googleAvailable = Boolean(
      googleStatus?.connected && googleStatus.isActive && !googleStatus.requiresUpgrade
    );

    Alert.alert('Calendar sync', 'Choose where to sync this event.', [
      {
        text: googleSynced ? 'Remove Google sync' : 'Sync to Google',
        onPress: () => {
          if (!googleAvailable) {
            Alert.alert(
              'Connect Google Calendar',
              googleStatus?.requiresUpgrade
                ? 'Google Calendar sync is included with KureCal Pro.'
                : 'Connect Google Calendar from Settings before syncing events.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: googleStatus?.requiresUpgrade ? 'Upgrade' : 'Settings',
                  onPress: () =>
                    router.push(
                      googleStatus?.requiresUpgrade ? '../paywall' : '../settings'
                    ),
                },
              ]
            );
            return;
          }

          void (googleSynced
            ? handleUnsyncGoogleCalendar()
            : handleSyncGoogleCalendar());
        },
      },
      {
        text: appleMapping ? 'Remove Device Calendar' : 'Save to Device Calendar',
        onPress: () => {
          void (appleMapping
            ? handleRemoveAppleCalendar()
            : handleSyncAppleCalendar());
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleShareEvent() {
    if (!data) {
      return;
    }

    try {
      await Share.share({
        message: [data.event.title, data.event.sourceUrl, data.event.registrationUrl]
          .filter(Boolean)
          .join('\n'),
      });
    } catch (nextError) {
      Alert.alert(
        'Unable to share event',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    }
  }

  async function syncGoogleAfterEngagementChange(
    engagement: MobileEventEngagement
  ) {
    if (!data || !googleStatus?.connected || googleStatus.requiresUpgrade) {
      return;
    }

    try {
      const shouldSync =
        engagement.isBookmarked ||
        engagement.status === 'attending' ||
        engagement.status === 'attended';

      if (shouldSync) {
        await syncMobileGoogleCalendarEvent(data.event.id);
      } else {
        await unsyncMobileGoogleCalendarEvent(data.event.id);
      }

      const [nextDetail, nextGoogleStatus] = await Promise.all([
        loadMobileEventDetail(data.event.id),
        loadMobileGoogleCalendarStatus().catch(() => googleStatus),
      ]);
      setData(nextDetail);
      setGoogleStatus(nextGoogleStatus);
    } catch (nextError) {
      console.warn('Google Calendar sync after engagement change failed', nextError);
    }
  }

  async function ensureTrackedForCalendarSync(): Promise<boolean> {
    if (!data) {
      return false;
    }

    const engagement = data.event.engagement;
    const isTracked =
      engagement?.isBookmarked ||
      engagement?.status === 'attending' ||
      engagement?.status === 'attended';

    if (isTracked) {
      return true;
    }

    const nextEngagement = await updateMobileEventEngagement(data.event.id, {
      isBookmarked: true,
    });
    updateEngagementState(nextEngagement);
    return true;
  }

  async function handleSyncGoogleCalendar() {
    if (!data || calendarPending) {
      return;
    }

    setCalendarPending(true);
    try {
      await ensureTrackedForCalendarSync();
      await syncMobileGoogleCalendarEvent(data.event.id);
      const [nextDetail, nextStatus] = await Promise.all([
        loadMobileEventDetail(data.event.id),
        loadMobileGoogleCalendarStatus().catch(() => googleStatus),
      ]);
      setData(nextDetail);
      setGoogleStatus(nextStatus);
      Alert.alert('Calendar synced', 'This event is synced to Google Calendar.');
      void recordSignatureInteraction({
        accountCreatedAt: session?.user.created_at,
        interaction: 'calendar-sync',
      });
    } catch (nextError) {
      Alert.alert(
        'Google sync failed',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setCalendarPending(false);
    }
  }

  async function handleUnsyncGoogleCalendar() {
    if (!data || calendarPending) {
      return;
    }

    setCalendarPending(true);
    try {
      await unsyncMobileGoogleCalendarEvent(data.event.id);
      const [nextDetail, nextStatus] = await Promise.all([
        loadMobileEventDetail(data.event.id),
        loadMobileGoogleCalendarStatus().catch(() => googleStatus),
      ]);
      setData(nextDetail);
      setGoogleStatus(nextStatus);
      Alert.alert(
        'Calendar sync removed',
        'Google Calendar sync is removed for this event.'
      );
    } catch (nextError) {
      Alert.alert(
        'Remove sync failed',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setCalendarPending(false);
    }
  }

  async function handleSyncAppleCalendar() {
    if (!data || calendarPending) {
      return;
    }

    setCalendarPending(true);
    try {
      const result = await syncEventToDeviceCalendar(data);
      if (result.status === 'permission_denied') {
        Alert.alert(
          'Calendar permission needed',
          `Allow calendar access in ${platformSettingsLabel} to save events to Device Calendar.`
        );
      } else if (result.status === 'unavailable') {
        Alert.alert(
          'Calendar unavailable',
          'No writable device calendar is available.'
        );
      } else {
        setAppleMapping(result.mapping);
        Alert.alert('Saved to Device Calendar', 'This event is saved on this device.');
        void recordSignatureInteraction({
          accountCreatedAt: session?.user.created_at,
          interaction: 'calendar-sync',
        });
      }
    } catch (nextError) {
      Alert.alert(
        'Device Calendar sync failed',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setCalendarPending(false);
    }
  }

  async function handleRemoveAppleCalendar() {
    if (!data || calendarPending) {
      return;
    }

    setCalendarPending(true);
    try {
      const result = await removeEventFromDeviceCalendar(data.event.id);
      setAppleMapping(result.mapping);
      Alert.alert(
        'Removed from Device Calendar',
        'This device calendar entry is removed.'
      );
    } catch (nextError) {
      Alert.alert(
        'Remove Device Calendar failed',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setCalendarPending(false);
    }
  }

  async function handleToggleBookmark() {
    if (!data || bookmarkPending) {
      return;
    }

    const nextValue = !(data.event.engagement?.isBookmarked ?? false);
    setBookmarkPending(true);

    try {
      const engagement = await updateMobileEventEngagement(data.event.id, {
        isBookmarked: nextValue,
      });

      updateEngagementState(engagement);
      void syncGoogleAfterEngagementChange(engagement);
      if (nextValue) {
        void recordSignatureInteraction({
          accountCreatedAt: session?.user.created_at,
          interaction: 'event-save',
        });
      }
    } catch (nextError) {
      Alert.alert(
        'Unable to update bookmark',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setBookmarkPending(false);
    }
  }

  async function openReviewSheet() {
    if (!data) {
      return;
    }

    setReviewVisible(true);
    setReviewLoading(true);
    try {
      setReviewFeedback(await loadMobileEventNetworkingFeedback(data.event.id));
    } catch (nextError) {
      console.warn('Unable to load existing event review', nextError);
      setReviewFeedback(null);
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleToggleAttendance() {
    if (!data || attendancePending) {
      return;
    }

    const action = getAttendanceCtaState(data.event, data.event.engagement).action;
    if (action === 'review') {
      await openReviewSheet();
      return;
    }

    const nextStatus =
      action === 'confirm-attended'
        ? 'attended'
        : data.event.engagement?.status === 'attending'
          ? null
          : 'attending';
    setAttendancePending(true);

    try {
      const engagement = await updateMobileEventEngagement(data.event.id, {
        status: nextStatus,
      });

      updateEngagementState(engagement);
      void syncGoogleAfterEngagementChange(engagement);
      if (nextStatus === 'attended') {
        await openReviewSheet();
      }
    } catch (nextError) {
      Alert.alert(
        'Unable to update attendance',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setAttendancePending(false);
    }
  }

  async function handleRemoveAttendance() {
    if (!data || attendancePending) {
      return;
    }

    setAttendancePending(true);
    try {
      const engagement = await updateMobileEventEngagement(data.event.id, {
        status: null,
      });
      updateEngagementState(engagement);
      void syncGoogleAfterEngagementChange(engagement);
    } catch (nextError) {
      Alert.alert(
        'Unable to remove attendance',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setAttendancePending(false);
    }
  }

  async function handleSubmitReview(input: MobileEventNetworkingFeedbackUpdate) {
    if (!data || input.actualValueRating == null) {
      throw new Error('Select a rating to submit your review.');
    }

    const feedback = await updateMobileEventNetworkingFeedback(data.event.id, input);
    setReviewFeedback(feedback);
    setReviewVisible(false);
  }

  async function loadPostComposerCircles() {
    try {
      const home = await loadMobileCommunityHome();
      setPostComposerCircles(
        home.circles?.filter((circle) => circle.isJoined) ?? []
      );
    } catch (nextError) {
      Alert.alert(
        'Community unavailable',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load your circles.'
      );
    }
  }

  function resetPostComposer() {
    setPostComposerTitle('');
    setPostComposerBody('');
    setPostComposerPosting(false);
    setPostComposerSelectedCircleId(null);
    postImageAttachments.resetMedia();
  }

  function closePostComposer() {
    if (postComposerPosting || postImageAttachments.isUploadingMedia) {
      return;
    }

    postImageAttachments.cleanupUnpublishedMedia();
    setPostComposerVisible(false);
  }

  async function openPostComposer() {
    setPostComposerVisible(true);
    if (!postComposerCircles.length) {
      await loadPostComposerCircles();
    }
  }

  async function handleCreatePost() {
    if (!data || !eventId || postComposerPosting || postImageAttachments.isUploadingMedia) {
      return;
    }

    const circle =
      postComposerCircles.find((c) => c.id === postComposerSelectedCircleId) ??
      postComposerCircles[0];
    if (!circle) {
      Alert.alert('Join a circle', 'Join a circle before creating a post.');
      return;
    }

    const title = postComposerTitle.trim();
    const body = postComposerBody.trim();
    if (!title) {
      Alert.alert('Add a title', 'Give your post a title before publishing.');
      return;
    }

    setPostComposerPosting(true);
    try {
      const media = postImageAttachments.media.map((item) => ({
        path: item.path,
        width: item.width,
        height: item.height,
      }));

      await createMobileCommunityPost({
        circleId: circle.id,
        circleSlug: circle.slug,
        title,
        content: body,
        postType: 'event_note',
        eventId: data.event.id,
        media,
      });

      postImageAttachments.markMediaPublished(media.map((m) => m.path));
      setPostComposerVisible(false);
      Alert.alert('Post shared', 'Your post is attached to this event.');
    } catch (nextError) {
      Alert.alert(
        'Post failed',
        nextError instanceof Error ? nextError.message : 'Unable to post.'
      );
    } finally {
      setPostComposerPosting(false);
    }
  }

  async function handleToggleAgendaSave(agendaItemId: string, isSaved: boolean) {
    if (!data || pendingAgendaSaveIds.has(agendaItemId)) {
      return;
    }

    setPendingAgendaSaveIds((current) => new Set(current).add(agendaItemId));

    try {
      await updateMobileEventAgendaSave(data.event.id, agendaItemId, isSaved);
      const nextDetail = await loadMobileEventDetail(data.event.id);
      setData(nextDetail);
    } catch (nextError) {
      Alert.alert(
        isSaved ? 'Unable to save session' : 'Unable to remove saved session',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setPendingAgendaSaveIds((current) => {
        const next = new Set(current);
        next.delete(agendaItemId);
        return next;
      });
    }
  }

  if (loading && !data) {
    return (
      <LinearGradient colors={['#0d1117', '#090d14', '#06080d']} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <ScreenStateView
            mode="loading"
            title="Loading event"
            description="Pulling the rich event detail, agenda, and speaker lineup."
          />
        </View>
      </LinearGradient>
    );
  }

  if (error && !data) {
    return (
      <LinearGradient colors={['#0d1117', '#090d14', '#06080d']} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <ScreenStateView
            mode="error"
            title="Event unavailable"
            description={error}
            onRetry={() => {
              void loadDetail();
            }}
          />
        </View>
      </LinearGradient>
    );
  }

  if (!data) {
    return null;
  }

  const googleSync = data.event.engagement?.calendarSync;
  const calendarStatusLabel = calendarPending
    ? 'Calendar sync in progress'
    : googleSync?.status === 'synced' && appleMapping
      ? 'Synced to Google and Device Calendar'
      : googleSync?.status === 'synced'
        ? 'Synced to Google Calendar'
        : appleMapping
          ? 'Saved to Device Calendar'
          : googleStatus?.requiresUpgrade
            ? 'Google Calendar sync requires Pro'
            : googleStatus?.connected
              ? 'Google Calendar connected'
              : 'Calendar sync not connected';
  const calendarStatusTone =
    googleSync?.status === 'failed'
      ? 'danger'
      : googleSync?.status === 'synced' || appleMapping
        ? 'success'
        : googleStatus?.requiresUpgrade
          ? 'warning'
          : 'neutral';
  const attendanceCta = getAttendanceCtaState(data.event, data.event.engagement);
  // Explicitly selected circle — no auto-select fallback so the dropdown shows "Select circle" by default
  const postComposerCircle =
    postComposerCircles.find((c) => c.id === postComposerSelectedCircleId) ?? null;
  // First circle used as fallback reference for the modal's effectiveCircle and canSubmit computation
  const postComposerFallbackCircle = postComposerCircles[0] ?? null;
  const attachedEvent: CommunityComposerEventOption | null =
    postComposerFallbackCircle
      ? {
          id: data.event.id,
          slug: data.event.slug ?? data.event.id,
          title: data.event.title,
          startTime: data.event.startTime,
          location: data.event.location ?? null,
          format: data.event.formatLabel ?? null,
          organizerLogoUrl: data.host?.logoUrl ?? null,
          circle: {
            id: postComposerFallbackCircle.id,
            name: postComposerFallbackCircle.name,
            slug: postComposerFallbackCircle.slug,
          },
        }
      : null;

  return (
    <>
      <MobileEventDetailScreen
        attendanceCta={attendanceCta}
        detail={data}
        engagement={data.event.engagement}
        isBookmarkPending={bookmarkPending}
        isAttendancePending={attendancePending}
        pendingAgendaSaveIds={pendingAgendaSaveIds}
        calendarStatusLabel={calendarStatusLabel}
        calendarStatusTone={calendarStatusTone}
        onBack={() => router.back()}
        onPrimaryAction={() => {
          void handlePrimaryAction();
        }}
        onAddToCalendar={() => {
          handleAddToCalendar();
        }}
        onToggleBookmark={() => {
          void handleToggleBookmark();
        }}
        onToggleAttendance={() => {
          void handleToggleAttendance();
        }}
        onRemoveAttendance={() => {
          void handleRemoveAttendance();
        }}
        onToggleAgendaSave={(agendaItemId, isSaved) => {
          void handleToggleAgendaSave(agendaItemId, isSaved);
        }}
        onOpenEventPage={() => {
          void openUrl(data.event.sourceUrl);
        }}
        onOpenLocation={(location) => {
          void openUrl(buildMapsSearchUrl(location));
        }}
        onShareEvent={() => {
          void handleShareEvent();
        }}
        onStartThread={() => {
          void openPostComposer();
        }}
      />
      <CommunityComposerModal
        attachedEvent={attachedEvent}
        body={postComposerBody}
        bodyPlaceholder="Share context, ask a question, kick off a conversation..."
        circle={postComposerCircle}
        circles={postComposerCircles}
        emptyNotice="Join a circle before creating a community post."
        fallbackCircle={postComposerFallbackCircle}
        isUploadingMedia={postImageAttachments.isUploadingMedia}
        isWorking={postComposerPosting}
        media={postImageAttachments.media}
        modalTitle="Create post"
        requireCircle
        showAttachedEventPreview
        showCircleControls={postComposerCircles.length > 0}
        showCommunityControls={false}
        showEventControls={false}
        showImageControls
        showPostTypeControls={false}
        submitLabel="Post"
        title={postComposerTitle}
        titlePlaceholder="Title"
        visible={postComposerVisible}
        onAfterClose={resetPostComposer}
        onChangeBody={setPostComposerBody}
        onChangeCircle={(circleId) =>
          setPostComposerSelectedCircleId((prev) =>
            prev === circleId ? null : circleId,
          )
        }
        onChangeTitle={setPostComposerTitle}
        onClose={closePostComposer}
        onPickImages={() => {
          void postImageAttachments.pickImages();
        }}
        onRemoveImage={(path) => {
          void postImageAttachments.removeImage(path);
        }}
        onSubmit={() => {
          void handleCreatePost();
        }}
      />
      <EventReviewSheet
        eventTitle={data.event.title}
        feedback={reviewFeedback}
        isLoading={reviewLoading}
        onDismiss={() => setReviewVisible(false)}
        onSubmit={handleSubmitReview}
        visible={reviewVisible}
      />
    </>
  );
}
