import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';

import type { MobileEventDetail } from '@kurecal/domain';

import { MobileEventDetailScreen } from '../../src/components/event-detail/MobileEventDetailScreen';
import { buildMapsSearchUrl } from '../../src/components/event-detail/eventDetailUtils';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  loadMobileEventDetail,
  updateMobileEventEngagement,
} from '../../src/lib/mobileApi';

function buildGoogleCalendarUrl(detail: MobileEventDetail) {
  const event = detail.event;
  const start = new Date(event.startTime)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const end = new Date(event.endTime ?? event.startTime)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const location = event.location ? `&location=${encodeURIComponent(event.location)}` : '';
  const details = event.description
    ? `&details=${encodeURIComponent(event.description)}`
    : '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}${location}${details}`;
}

export default function EventDetailRoute() {
  const { id } = useLocalSearchParams<{
    id: string | string[];
  }>();
  const eventId = Array.isArray(id) ? id[0] : id;
  const [data, setData] = useState<MobileEventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [attendancePending, setAttendancePending] = useState(false);

  async function loadDetail() {
    if (!eventId) {
      setError('Event id is missing');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextData = await loadMobileEventDetail(eventId);
      setData(nextData);
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

    await openUrl(data.event.registrationUrl ?? data.event.sourceUrl);
  }

  async function handleAddToCalendar() {
    if (!data) {
      return;
    }

    await openUrl(buildGoogleCalendarUrl(data));
  }

  async function handleCopyEventLink() {
    if (!data) {
      return;
    }

    const eventLink = data.event.registrationUrl ?? data.event.sourceUrl;
    if (!eventLink) {
      Alert.alert('No link available', 'This event does not have a public link yet.');
      return;
    }

    try {
      await Clipboard.setStringAsync(eventLink);
      Alert.alert('Link copied', 'The event link is on your clipboard.');
    } catch (nextError) {
      Alert.alert(
        'Unable to copy link',
        nextError instanceof Error ? nextError.message : 'Please try again.',
      );
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
    } catch (nextError) {
      Alert.alert(
        'Unable to update bookmark',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setBookmarkPending(false);
    }
  }

  async function handleToggleAttendance() {
    if (!data || attendancePending) {
      return;
    }

    const nextStatus =
      data.event.engagement?.status === 'attending' ? null : 'attending';
    setAttendancePending(true);

    try {
      const engagement = await updateMobileEventEngagement(data.event.id, {
        status: nextStatus,
      });

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
    } catch (nextError) {
      Alert.alert(
        'Unable to update attendance',
        nextError instanceof Error ? nextError.message : 'Please try again.'
      );
    } finally {
      setAttendancePending(false);
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

  return (
    <>
      <MobileEventDetailScreen
        detail={data}
        engagement={data.event.engagement}
        isBookmarkPending={bookmarkPending}
        isAttendancePending={attendancePending}
        onBack={() => router.back()}
        onPrimaryAction={() => {
          void handlePrimaryAction();
        }}
        onAddToCalendar={() => {
          void handleAddToCalendar();
        }}
        onToggleBookmark={() => {
          void handleToggleBookmark();
        }}
        onToggleAttendance={() => {
          void handleToggleAttendance();
        }}
        onOpenEventPage={() => {
          void openUrl(data.event.sourceUrl);
        }}
        onOpenLocation={(location) => {
          void openUrl(buildMapsSearchUrl(location));
        }}
        onShareEvent={() => {
          void handleCopyEventLink();
        }}
      />
    </>
  );
}
