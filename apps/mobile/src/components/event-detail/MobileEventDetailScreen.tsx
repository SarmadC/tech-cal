import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MobileEventDetail, MobileEventEngagement } from '@kurecal/domain';

import {
  buildAgendaDayGroups,
  collectUniqueSpeakers,
  hasMappableLocation,
  type AttendanceCtaState,
} from './eventDetailUtils';
import { EventDetailHeader } from './EventDetailHeader';
import { EventFactsSection } from './EventFactsSection';
import { NetworkingPulseSection } from './NetworkingPulseSection';
import { EventDescriptionSection } from './EventDescriptionSection';
import { EventTagsSection } from './EventTagsSection';
import { EventSpeakersSection } from './EventSpeakersSection';
import { EventAgendaSection } from './EventAgendaSection';
import { EventCtaBar } from './EventCtaBar';
import { EventDiscussionSection } from './EventDiscussionSection';
import { useAppTheme } from '../../providers/ThemeProvider';

const DETAIL_HORIZONTAL_GUTTER = 24;
const DETAIL_SECTION_GAP = 30;

export function MobileEventDetailScreen({
  detail,
  engagement,
  isBookmarkPending = false,
  isAttendancePending = false,
  attendanceCta,
  onBack,
  onPrimaryAction,
  onAddToCalendar,
  calendarStatusLabel,
  calendarStatusTone = 'neutral',
  pendingAgendaSaveIds,
  onToggleBookmark,
  onToggleAttendance,
  onRemoveAttendance,
  onToggleAgendaSave,
  onOpenEventPage,
  onOpenLocation,
  onShareEvent,
  onStartThread,
}: {
  detail: MobileEventDetail;
  engagement?: MobileEventEngagement;
  isBookmarkPending?: boolean;
  isAttendancePending?: boolean;
  attendanceCta: AttendanceCtaState;
  onBack: () => void;
  onPrimaryAction: () => void;
  onAddToCalendar: () => void;
  calendarStatusLabel?: string | null;
  calendarStatusTone?: 'neutral' | 'success' | 'warning' | 'danger';
  pendingAgendaSaveIds?: Set<string>;
  onToggleBookmark: () => void;
  onToggleAttendance: () => void;
  onRemoveAttendance: () => void;
  onToggleAgendaSave?: (agendaItemId: string, isSaved: boolean) => void;
  onOpenEventPage: () => void;
  onOpenLocation: (location: string) => void;
  onShareEvent: () => void;
  onStartThread: () => void;
}) {
  const { tokens } = useAppTheme();
  const [showMenu, setShowMenu] = useState(false);

  const event = detail.event;
  const host = detail.host;
  const tags = detail.tags ?? [];
  const networkingPulse = detail.networkingPulse;
  const agenda = useMemo(() => detail.agenda ?? [], [detail.agenda]);
  const agendaDayGroups = useMemo(
    () => buildAgendaDayGroups(agenda, event.timezone),
    [agenda, event.timezone]
  );
  const uniqueSpeakers = useMemo(() => collectUniqueSpeakers(detail), [detail]);

  const isAttending = engagement?.status === 'attending';
  const isAttended = engagement?.status === 'attended';
  const isBookmarked = Boolean(engagement?.isBookmarked);
  const hasPrimaryUrl = Boolean(event.registrationUrl || event.sourceUrl);
  const primaryLabel = hasPrimaryUrl ? 'Register' : 'Add to calendar';
  const canOpenEventPage = Boolean(event.sourceUrl);
  const isLocationInteractive = hasMappableLocation(event.location);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: tokens.colors.shell }]}
      edges={['left', 'right']}
    >
      <View style={styles.root}>
        {showMenu ? (
          <Pressable
            onPress={() => setShowMenu(false)}
            style={styles.menuBackdrop}
            testID="event-detail-menu-backdrop"
          />
        ) : null}

        <EventDetailHeader
          title={event.title}
          formatLabel={event.formatLabel}
          priceLabel={event.priceLabel}
          isBookmarked={isBookmarked}
          isBookmarkPending={isBookmarkPending}
          isAttending={isAttending}
          isAttended={isAttended}
          isAttendancePending={isAttendancePending}
          canOpenEventPage={canOpenEventPage}
          attendanceCta={attendanceCta}
          showMenu={showMenu}
          onBack={onBack}
          onToggleBookmark={onToggleBookmark}
          onToggleMenu={() => setShowMenu((v) => !v)}
          onMenuClose={() => setShowMenu(false)}
          onToggleAttendance={onToggleAttendance}
          onRemoveAttendance={onRemoveAttendance}
          onOpenEventPage={onOpenEventPage}
          onShareEvent={onShareEvent}
          onAddToCalendar={onAddToCalendar}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <EventFactsSection
            startTime={event.startTime}
            endTime={event.endTime}
            timezone={event.timezone}
            location={event.location}
            isLocationInteractive={isLocationInteractive}
            hostName={host?.name}
            hostLogoUrl={host?.logoUrl}
            calendarStatusLabel={calendarStatusLabel}
            calendarStatusTone={calendarStatusTone}
            onOpenLocation={onOpenLocation}
          />

          {networkingPulse ? (
            <NetworkingPulseSection pulse={networkingPulse} />
          ) : null}

          {event.description ? (
            <EventDescriptionSection description={event.description} />
          ) : null}

          {tags.length > 0 ? (
            <EventTagsSection tags={tags} />
          ) : null}

          {uniqueSpeakers.length > 0 ? (
            <EventSpeakersSection speakers={uniqueSpeakers} />
          ) : null}

          {agendaDayGroups.length > 0 ? (
            <EventAgendaSection
              agendaDayGroups={agendaDayGroups}
              timezone={event.timezone}
              pendingAgendaSaveIds={pendingAgendaSaveIds}
              onToggleAgendaSave={onToggleAgendaSave}
            />
          ) : null}

          <EventDiscussionSection
            eventId={event.id}
            onStartThread={onStartThread}
          />
        </ScrollView>

        <EventCtaBar
          primaryLabel={primaryLabel}
          attendanceCta={attendanceCta}
          isAttendancePending={isAttendancePending}
          onPrimaryAction={onPrimaryAction}
          onToggleAttendance={onToggleAttendance}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: DETAIL_SECTION_GAP,
    paddingHorizontal: DETAIL_HORIZONTAL_GUTTER,
    paddingTop: 26,
    paddingBottom: 36,
  },
});
