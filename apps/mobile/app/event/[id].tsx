import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';
import type { MobileEventDetail, MobileEventEngagement } from '@kurecal/domain';
import { ScreenState } from '@/components/chrome/ScreenState';
import { MobileEventDetailScreen } from '@/components/event-detail/MobileEventDetailScreen';
import { buildMapsSearchUrl } from '@/components/event-detail/eventDetailUtils';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import {
  getEventEngagement,
  toggleEventBookmark,
  updateEventAttendance,
} from '@/lib/eventEngagement';
import { getMobileApiClient } from '@/lib/mobileApi';
import { mobileQueryKeys } from '@/lib/queryKeys';
import { mobileQueryStaleTimes } from '@/lib/queryClient';
import { useAppTheme } from '@/providers/ThemeProvider';

function updateEventDetailEngagement(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string | undefined,
  nextEngagement: MobileEventEngagement
) {
  queryClient.setQueryData<MobileEventDetail | undefined>(
    mobileQueryKeys.event.detail(eventId),
    (previous) => (previous ? { ...previous, engagement: nextEngagement } : previous)
  );
}

function EventDetailState({
  title,
  description,
  mode,
}: {
  title: string;
  description: string;
  mode: 'loading' | 'error';
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.stateSafeArea, { backgroundColor: tokens.colors.shell }]} edges={['left', 'right']}>
      <View
        style={[
          styles.stateHeader,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: tokens.colors.border,
            backgroundColor: tokens.colors.shellElevated,
          },
        ]}
      >
        <View style={styles.stateHeaderRow}>
          <Pressable
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={[
              styles.stateBackButton,
              {
                backgroundColor: tokens.colors.surfaceMuted,
              },
            ]}
          >
            <FontAwesome name="angle-left" size={22} color={tokens.colors.textSecondary} />
          </Pressable>
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            Event detail
          </Text>
        </View>
      </View>

      <View style={styles.stateBody}>
        <ScreenState
          mode={mode}
          title={title}
          description={description}
          variant="plain"
          fullHeight
        />
      </View>
    </SafeAreaView>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const queryClient = useQueryClient();
  const { user } = useMobileAuth();

  const eventQuery = useQuery({
    queryKey: mobileQueryKeys.event.detail(eventId),
    enabled: Boolean(eventId),
    staleTime: mobileQueryStaleTimes.medium,
    queryFn: async () => {
      const result = await getMobileApiClient().getEvent(eventId!);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Unable to load event');
      }
      return result.data;
    },
  });

  const engagementQuery = useQuery({
    queryKey: mobileQueryKeys.event.engagement(user?.id, eventId),
    enabled: Boolean(user?.id && eventId),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: () => getEventEngagement(user!.id, eventId!),
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !eventId) {
        throw new Error('Sign in again to update saved events.');
      }

      return toggleEventBookmark(user.id, eventId, !currentEngagement?.isBookmarked);
    },
    onSuccess: async (nextState) => {
      queryClient.setQueryData(mobileQueryKeys.event.engagement(user?.id, eventId), nextState);
      updateEventDetailEngagement(queryClient, eventId, nextState);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.calendar.root() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.calendar.previewRoot() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.dashboard.home() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.discover.root() }),
      ]);
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: async (status: MobileEventEngagement['status']) => {
      if (!user?.id || !eventId) {
        throw new Error('Sign in again to update attendance.');
      }

      return updateEventAttendance(user.id, eventId, status);
    },
    onSuccess: async (nextState) => {
      queryClient.setQueryData(mobileQueryKeys.event.engagement(user?.id, eventId), nextState);
      updateEventDetailEngagement(queryClient, eventId, nextState);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.calendar.root() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.calendar.previewRoot() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.dashboard.home() }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.discover.root() }),
      ]);
    },
  });

  const detail = eventQuery.data;
  const currentEngagement = engagementQuery.data ?? detail?.engagement;

  async function addToCalendar() {
    if (!detail) {
      return;
    }

    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Calendar permission needed', 'Allow calendar access to add events from KureCal.');
      return;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const primaryCalendar = calendars.find((calendar) => calendar.allowsModifications) ?? calendars[0];
    if (!primaryCalendar) {
      Alert.alert('No calendar found', 'No editable calendar is available on this device.');
      return;
    }

    await Calendar.createEventAsync(primaryCalendar.id, {
      title: detail.title,
      startDate: new Date(detail.startTime),
      endDate: detail.endTime ? new Date(detail.endTime) : new Date(detail.startTime),
      location: detail.location ?? undefined,
      notes: detail.description ?? undefined,
      url: detail.registrationUrl ?? detail.sourceUrl ?? undefined,
    });

    Alert.alert('Added to calendar', 'The event was added to your device calendar.');
  }

  async function openUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Link unavailable', error instanceof Error ? error.message : 'Unable to open this link.');
    }
  }

  async function handlePrimaryAction() {
    if (!detail) {
      return;
    }

    const primaryUrl = detail.registrationUrl ?? detail.sourceUrl;
    if (primaryUrl) {
      await openUrl(primaryUrl);

      if (user && currentEngagement?.status == null) {
        void attendanceMutation.mutateAsync('attending').catch(() => undefined);
      }
      return;
    }

    await addToCalendar();
  }

  async function handleShareEvent() {
    if (!detail) {
      return;
    }

    const primaryUrl = detail.registrationUrl ?? detail.sourceUrl;
    try {
      await Share.share({
        message: primaryUrl ? `${detail.title}\n${primaryUrl}` : detail.title,
        url: primaryUrl ?? undefined,
        title: detail.title,
      });
    } catch (error) {
      Alert.alert('Share failed', error instanceof Error ? error.message : 'Unable to share this event.');
    }
  }

  function handleToggleBookmark() {
    void bookmarkMutation.mutateAsync().catch((error) => {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unable to update bookmark.');
    });
  }

  function handleToggleAttendance() {
    const nextStatus = currentEngagement?.status === 'attending' ? null : 'attending';
    void attendanceMutation.mutateAsync(nextStatus).catch((error) => {
      Alert.alert('RSVP failed', error instanceof Error ? error.message : 'Unable to update RSVP.');
    });
  }

  if (eventQuery.isLoading && !detail) {
    return (
      <EventDetailState
        mode="loading"
        title="Loading event"
        description="Preparing the event details and agenda."
      />
    );
  }

  if (eventQuery.isError || !detail) {
    return (
      <EventDetailState
        mode="error"
        title="Event unavailable"
        description={
          eventQuery.error instanceof Error ? eventQuery.error.message : 'Try again in a moment.'
        }
      />
    );
  }

  return (
    <MobileEventDetailScreen
      detail={{ ...detail, engagement: currentEngagement }}
      engagement={currentEngagement}
      isBookmarkPending={bookmarkMutation.isPending}
      isAttendancePending={attendanceMutation.isPending}
      onBack={() => router.back()}
      onPrimaryAction={() => {
        void handlePrimaryAction();
      }}
      onAddToCalendar={() => {
        void addToCalendar().catch((error) => {
          Alert.alert('Calendar error', error instanceof Error ? error.message : 'Unable to add event.');
        });
      }}
      onToggleBookmark={handleToggleBookmark}
      onToggleAttendance={handleToggleAttendance}
      onOpenEventPage={() => {
        if (detail.sourceUrl) {
          void openUrl(detail.sourceUrl);
        }
      }}
      onOpenLocation={(location) => {
        void openUrl(buildMapsSearchUrl(location));
      }}
      onShareEvent={() => {
        void handleShareEvent();
      }}
    />
  );
}

const styles = StyleSheet.create({
  stateSafeArea: {
    flex: 1,
  },
  stateHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBody: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
});
