import { useMemo, useState, type ReactNode } from 'react';
import { EventDiscussionSection } from './EventDiscussionSection';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MobileEventDetail, MobileEventEngagement } from '@kurecal/domain';

import {
  buildAgendaDayGroups,
  buildAgendaSecondaryText,
  buildSpeakerSecondaryText,
  collectUniqueSpeakers,
  formatAgendaDayLabel,
  formatAgendaDayMeta,
  formatAgendaStartTime,
  formatEventDateTime,
  getInitials,
  hasMappableLocation,
  SPEAKER_PREVIEW_COUNT,
  type AttendanceCtaState,
} from './eventDetailUtils';
import { KureButton } from '../chrome/KureButton';
import { useAppTheme } from '../../providers/ThemeProvider';

const DETAIL_HORIZONTAL_GUTTER = 24;
const DETAIL_CARD_INSET = 18;
const DETAIL_SECTION_GAP = 30;
const DETAIL_CTA_HEIGHT = 46;

function IconMetaRow({
  icon,
  children,
  onPress,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  children: ReactNode;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();

  const inner = (
    <View style={styles.iconMetaRow}>
      <FontAwesome name={icon} size={22} color={tokens.colors.textSecondary} style={styles.iconMetaIcon} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.iconMetaRowPressable,
          { backgroundColor: pressed ? tokens.colors.accentSoft : 'transparent' },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.iconMetaRowPressable}>{inner}</View>;
}

function NetworkingPulseSection({
  pulse,
}: {
  pulse: NonNullable<MobileEventDetail['networkingPulse']>;
}) {
  const { tokens } = useAppTheme();
  const hasActiveSignal =
    pulse.state === 'active' && (pulse.trendingTopic || pulse.mostSavedSession);

  if (!hasActiveSignal) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          What attendees are focusing on
        </Text>
      </View>

      <View style={styles.pulseGrid}>
          {pulse.trendingTopic ? (
            <View
              style={[
                styles.pulseMetric,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                },
              ]}
            >
              <Text style={[styles.pulseLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                Trending topic
              </Text>
              <Text numberOfLines={1} style={[styles.pulseValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                {pulse.trendingTopic.label}
              </Text>
              <View style={styles.pulseMetaRow}>
                <FontAwesome name="line-chart" size={13} color={tokens.colors.textSecondary} />
                <Text style={[styles.pulseMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                  {pulse.trendingTopic.activityLabel}
                </Text>
              </View>
            </View>
          ) : null}

          {pulse.mostSavedSession ? (
            <View
              style={[
                styles.pulseMetric,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                },
              ]}
            >
              <Text style={[styles.pulseLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                Most saved session
              </Text>
              <Text numberOfLines={1} style={[styles.pulseValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                {pulse.mostSavedSession.title}
              </Text>
              <View style={styles.pulseMetaRow}>
                <FontAwesome name="bookmark-o" size={13} color={tokens.colors.textSecondary} />
                <Text style={[styles.pulseMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                  {pulse.mostSavedSession.saveCount} saves
                </Text>
              </View>
            </View>
          ) : null}
      </View>
    </View>
  );
}

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
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedAgendaDays, setExpandedAgendaDays] = useState<string[]>([]);
  const [showAllSpeakers, setShowAllSpeakers] = useState(false);

  const event = detail.event;
  const host = detail.host;
  const tags = detail.tags ?? [];
  const agenda = useMemo(() => detail.agenda ?? [], [detail.agenda]);
  const networkingPulse = detail.networkingPulse;
  const agendaDayGroups = useMemo(
    () => buildAgendaDayGroups(agenda, event.timezone),
    [agenda, event.timezone]
  );
  const uniqueSpeakers = useMemo(
    () => collectUniqueSpeakers(detail),
    [detail]
  );
  const visibleSpeakers = showAllSpeakers
    ? uniqueSpeakers
    : uniqueSpeakers.slice(0, SPEAKER_PREVIEW_COUNT);
  const visibleTags = tags.slice(0, 6);
  const hiddenTagCount = Math.max(tags.length - visibleTags.length, 0);
  const hasPrimaryUrl = Boolean(event.registrationUrl || event.sourceUrl);
  const canOpenEventPage = Boolean(event.sourceUrl);
  const primaryLabel = hasPrimaryUrl ? 'Register' : 'Add to calendar';
  const isLocationInteractive = hasMappableLocation(event.location);
  const isAttending = engagement?.status === 'attending';
  const isAttended = engagement?.status === 'attended';
  const isBookmarked = Boolean(engagement?.isBookmarked);
  const calendarStatusColor =
    calendarStatusTone === 'success'
      ? tokens.colors.success
      : calendarStatusTone === 'warning'
        ? tokens.colors.warning
        : calendarStatusTone === 'danger'
          ? tokens.colors.danger
          : tokens.colors.textTertiary;

  function toggleAgendaDay(dayKey: string) {
    setExpandedAgendaDays((current) =>
      current.includes(dayKey) ? current.filter((key) => key !== dayKey) : [...current, dayKey]
    );
  }

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

        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: tokens.colors.shellElevated,
              borderBottomColor: tokens.colors.border,
              paddingTop: insets.top + 10,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerControls}>
              <Pressable
                accessibilityLabel="Back"
                onPress={onBack}
                style={({ pressed }) => [
                  styles.headerBackButton,
                  { backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent' },
                ]}
              >
                <FontAwesome name="angle-left" size={20} color={tokens.colors.textSecondary} />
              </Pressable>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityLabel={isBookmarked ? 'Remove saved event' : 'Save event'}
                  disabled={isBookmarkPending}
                  onPress={onToggleBookmark}
                  style={({ pressed }) => [
                    styles.iconButton,
                    styles.iconStateButton,
                    {
                      backgroundColor: isBookmarked
                        ? tokens.colors.warning
                        : pressed
                          ? tokens.colors.surfaceStrong
                          : tokens.colors.surface,
                      borderColor: isBookmarked ? tokens.colors.warning : 'transparent',
                      opacity: isBookmarkPending ? 0.45 : 1,
                    },
                  ]}
                >
                  <FontAwesome
                    name={isBookmarked ? 'bookmark' : 'bookmark-o'}
                    size={15}
                    color={isBookmarked ? tokens.colors.textInverse : tokens.colors.textSecondary}
                  />
                </Pressable>

                <Pressable
                  accessibilityLabel="More actions"
                  onPress={() => setShowMenu((current) => !current)}
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent' },
                  ]}
                >
                  <FontAwesome name="ellipsis-v" size={16} color={tokens.colors.textSecondary} />
                </Pressable>

                {showMenu ? (
                  <View
                    style={[
                      styles.menu,
                      {
                        backgroundColor: tokens.colors.surface,
                        borderColor: tokens.colors.borderStrong,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => { setShowMenu(false); onShareEvent(); }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        { backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent' },
                      ]}
                    >
                      <FontAwesome name="share-alt" size={14} color={tokens.colors.textSecondary} />
                      <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                        Share event
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => { setShowMenu(false); onAddToCalendar(); }}
                      style={({ pressed }) => [
                        styles.menuItem,
                        { backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent' },
                      ]}
                    >
                      <FontAwesome name="calendar-plus-o" size={14} color={tokens.colors.textSecondary} />
                      <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                        Add to calendar
                      </Text>
                    </Pressable>

                    {canOpenEventPage ? (
                      <Pressable
                        onPress={() => { setShowMenu(false); onOpenEventPage(); }}
                        style={({ pressed }) => [
                          styles.menuItem,
                          { backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent' },
                        ]}
                      >
                        <FontAwesome name="external-link" size={13} color={tokens.colors.textSecondary} />
                        <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                          Visit event page
                        </Text>
                      </Pressable>
                    ) : null}

                    {isAttended ? (
                      <Pressable
                        disabled={isAttendancePending}
                        onPress={() => { setShowMenu(false); onRemoveAttendance(); }}
                        style={({ pressed }) => [
                          styles.menuItem,
                          {
                            backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
                            opacity: isAttendancePending ? 0.45 : 1,
                          },
                        ]}
                      >
                        <FontAwesome name="times-circle-o" size={14} color={tokens.colors.textSecondary} />
                        <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                          Remove attendance
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        disabled={isAttendancePending}
                        onPress={() => { setShowMenu(false); onToggleAttendance(); }}
                        style={({ pressed }) => [
                          styles.menuItem,
                          {
                            backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
                            opacity: isAttendancePending ? 0.45 : 1,
                          },
                        ]}
                      >
                        <FontAwesome name="check-circle-o" size={14} color={tokens.colors.textSecondary} />
                        <Text style={[styles.menuLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                          {isAttending ? 'Remove RSVP' : attendanceCta.label}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.headerCopy}>
              <Text
                testID="event-detail-title"
                numberOfLines={2}
                style={[
                  styles.headerTitle,
                  { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                ]}
              >
                {event.title}
              </Text>

              <View style={styles.metaCluster}>
                {event.formatLabel ? (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: tokens.colors.accentSoft, borderColor: tokens.colors.border },
                    ]}
                  >
                    <Text style={[styles.metaBadgeText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                      {event.formatLabel}
                    </Text>
                  </View>
                ) : null}
                {event.priceLabel ? (
                  <View
                    style={[
                      styles.metaBadge,
                      { backgroundColor: tokens.colors.surfaceMuted, borderColor: tokens.colors.border },
                    ]}
                  >
                    <Text style={[styles.metaBadgeText, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                      {event.priceLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event facts */}
          <View style={styles.factList}>
            <IconMetaRow icon="calendar">
              <Text selectable style={[styles.metaRowText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                {formatEventDateTime(event.startTime, event.endTime, event.timezone)}
              </Text>
              {calendarStatusLabel ? (
                <Text
                  style={[
                    styles.calendarStatusLabel,
                    { color: calendarStatusColor, fontFamily: tokens.typography.sans },
                  ]}
                >
                  {calendarStatusLabel}
                </Text>
              ) : null}
            </IconMetaRow>

            {event.location ? (
              <>
                <View style={[styles.metaDivider, { backgroundColor: tokens.colors.divider }]} />
                <IconMetaRow
                  icon="map-marker"
                  onPress={isLocationInteractive ? () => onOpenLocation(event.location!) : undefined}
                >
                  <Text selectable style={[styles.metaRowText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                    {event.location}
                  </Text>
                </IconMetaRow>
              </>
            ) : null}

            {host?.name ? (
              <>
                <View style={[styles.metaDivider, { backgroundColor: tokens.colors.divider }]} />
                <View style={styles.iconMetaRowPressable}>
                  <View style={styles.iconMetaRow}>
                    {host.logoUrl ? (
                      <Image source={{ uri: host.logoUrl }} style={styles.hostLogo} />
                    ) : (
                      <View
                        style={[
                          styles.hostFallback,
                          { backgroundColor: tokens.colors.accentSoft },
                        ]}
                      >
                        <Text style={[styles.hostFallbackText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                          {getInitials(host.name)}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.organizerLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                        Organizer
                      </Text>
                      <Text selectable style={[styles.metaRowText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                        {host.name}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {networkingPulse ? (
            <NetworkingPulseSection pulse={networkingPulse} />
          ) : null}

          {/* Description */}
          {event.description ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  What this event is about
                </Text>
              </View>
              <Text
                selectable
                numberOfLines={showFullDescription ? undefined : 5}
                style={[styles.sectionBody, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}
              >
                {event.description}
              </Text>
              {event.description.length > 280 ? (
                <Pressable onPress={() => setShowFullDescription((current) => !current)}>
                  <Text style={[styles.linkLabel, { color: tokens.colors.link, fontFamily: tokens.typography.sans }]}>
                    {showFullDescription ? 'Show less' : 'Read more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Tags */}
          {tags.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  Tags
                </Text>
              </View>
              <View style={styles.tagWrap}>
                {visibleTags.map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tagBadge,
                      {
                        backgroundColor: tokens.colors.surfaceMuted,
                        borderColor: tokens.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
                {hiddenTagCount > 0 ? (
                  <View
                    style={[
                      styles.tagBadge,
                      {
                        backgroundColor: tokens.colors.accentSoft,
                        borderColor: tokens.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                      +{hiddenTagCount} more
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Speakers */}
          {uniqueSpeakers.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  Who is on stage
                </Text>
              </View>

              <View
                style={[
                  styles.listPanel,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderColor: tokens.colors.border,
                  },
                ]}
              >
                {visibleSpeakers.map((speaker, index) => {
                  const secondary = buildSpeakerSecondaryText(speaker);

                  return (
                    <View
                      key={speaker.id || speaker.name}
                      style={[
                        styles.speakerListRow,
                        index > 0 && { borderTopColor: tokens.colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      <View style={styles.speakerRow}>
                        {speaker.photoUrl ? (
                          <Image source={{ uri: speaker.photoUrl }} style={styles.speakerAvatar} />
                        ) : (
                          <View
                            style={[
                              styles.speakerFallback,
                              { backgroundColor: tokens.colors.accentSoft },
                            ]}
                          >
                            <Text style={[styles.speakerFallbackText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                              {getInitials(speaker.name)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.speakerCopy}>
                          <Text style={[styles.cardTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                            {speaker.name}
                          </Text>
                          {secondary ? (
                            <Text style={[styles.cardMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                              {secondary}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {uniqueSpeakers.length > SPEAKER_PREVIEW_COUNT ? (
                <Pressable onPress={() => setShowAllSpeakers((current) => !current)}>
                  <Text style={[styles.linkLabel, { color: tokens.colors.link, fontFamily: tokens.typography.sans }]}>
                    {showAllSpeakers ? 'Show fewer speakers' : `Show all ${uniqueSpeakers.length} speakers`}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Agenda */}
          {agendaDayGroups.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  Event schedule
                </Text>
              </View>

              <View style={styles.agendaStack}>
                {agendaDayGroups.map((group) => {
                  const expanded = expandedAgendaDays.includes(group.key);
                  const visibleItems = expanded ? group.items : group.items.slice(0, 3);

                  return (
                    <View
                      key={group.key}
                      style={[
                        styles.agendaPanel,
                        {
                          backgroundColor: tokens.colors.surface,
                          borderColor: tokens.colors.border,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => toggleAgendaDay(group.key)}
                        style={styles.agendaHeader}
                      >
                        <View style={styles.agendaHeaderCopy}>
                          <Text style={[styles.cardTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                            {formatAgendaDayLabel(group, agendaDayGroups.length, event.timezone)}
                          </Text>
                          <Text style={[styles.cardMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                            {formatAgendaDayMeta(group.items, event.timezone)}
                          </Text>
                        </View>
                        <FontAwesome
                          name={expanded ? 'angle-up' : 'angle-down'}
                          size={18}
                          color={tokens.colors.textSecondary}
                        />
                      </Pressable>

                      <View style={styles.agendaItems}>
                        {visibleItems.map((agendaItem) => {
                          const secondary = buildAgendaSecondaryText(agendaItem);

                          return (
                            <View
                              key={agendaItem.id}
                              style={[
                                styles.agendaItem,
                                { borderTopColor: tokens.colors.divider },
                              ]}
                            >
                              <Text style={[styles.agendaTime, { color: tokens.colors.accent, fontFamily: tokens.typography.mono }]}>
                                {formatAgendaStartTime(agendaItem, event.timezone)}
                              </Text>
                              <View style={styles.agendaCopy}>
                                <Text style={[styles.agendaTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                                  {agendaItem.title}
                                </Text>
                                {secondary ? (
                                  <Text style={[styles.cardMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                                    {secondary}
                                  </Text>
                                ) : null}
                              </View>
                              {onToggleAgendaSave ? (
                                <Pressable
                                  accessibilityLabel={
                                    agendaItem.isSaved
                                      ? 'Remove saved session'
                                      : 'Save session'
                                  }
                                  disabled={pendingAgendaSaveIds?.has(agendaItem.id)}
                                  onPress={() =>
                                    onToggleAgendaSave(agendaItem.id, !agendaItem.isSaved)
                                  }
                                  style={({ pressed }) => [
                                    styles.agendaSaveButton,
                                    {
                                      backgroundColor: agendaItem.isSaved
                                        ? tokens.colors.accentSoft
                                        : pressed
                                          ? tokens.colors.surfaceMuted
                                          : 'transparent',
                                      borderColor: agendaItem.isSaved
                                        ? tokens.colors.accent
                                        : tokens.colors.border,
                                      opacity: pendingAgendaSaveIds?.has(agendaItem.id)
                                        ? 0.45
                                        : 1,
                                    },
                                  ]}
                                >
                                  <FontAwesome
                                    name={agendaItem.isSaved ? 'bookmark' : 'bookmark-o'}
                                    size={12}
                                    color={
                                      agendaItem.isSaved
                                        ? tokens.colors.accent
                                        : tokens.colors.textSecondary
                                    }
                                  />
                                </Pressable>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ── Discussions / Event Room ── */}
          <EventDiscussionSection
            eventId={event.id}
            onStartThread={onStartThread}
          />
        </ScrollView>

        {/* ── Sticky CTA bar ── */}
        <View
          style={[
            styles.ctaBar,
            {
              backgroundColor: tokens.colors.shellElevated,
              borderTopColor: tokens.colors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
            },
          ]}
        >
          <View style={styles.ctaRow}>
            <View style={{ flex: 1 }}>
              <KureButton onPress={onPrimaryAction} style={styles.primaryCtaButton}>
                {primaryLabel}
              </KureButton>
            </View>
            <Pressable
              accessibilityLabel={attendanceCta.accessibilityLabel}
              disabled={isAttendancePending}
              onPress={onToggleAttendance}
              style={({ pressed }) => [
                styles.attendanceButton,
                {
                  backgroundColor: attendanceCta.active
                    ? tokens.colors.accentSoft
                    : pressed
                      ? tokens.colors.surfaceMuted
                      : tokens.colors.surface,
                  borderColor: attendanceCta.active
                    ? tokens.colors.accent
                    : tokens.colors.borderStrong,
                  opacity: isAttendancePending ? 0.45 : 1,
                },
              ]}
            >
              <FontAwesome
                name={attendanceCta.icon}
                size={13}
                color={attendanceCta.active ? tokens.colors.accent : tokens.colors.textSecondary}
              />
              <Text
                style={[
                  styles.attendanceLabel,
                  {
                    color: attendanceCta.active ? tokens.colors.accent : tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {attendanceCta.label}
              </Text>
            </Pressable>
          </View>
        </View>
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
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 24,
    paddingHorizontal: DETAIL_HORIZONTAL_GUTTER,
  },
  headerRow: {
    gap: 16,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    gap: 12,
    minHeight: 84,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: 0,
  },
  metaCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaBadge: {
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerActions: {
    position: 'relative',
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStateButton: {
    borderWidth: 1,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  menu: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 188,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 4,
    zIndex: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
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
  factList: {
    gap: 0,
  },
  iconMetaRowPressable: {
    paddingVertical: 20,
  },
  iconMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  iconMetaIcon: {
    width: 34,
    textAlign: 'center',
  },
  metaRowText: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
  },
  calendarStatusLabel: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
  },
  metaDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  organizerLabel: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 4,
  },
  hostLogo: {
    width: 52,
    height: 52,
    borderRadius: 7,
  },
  hostFallback: {
    width: 52,
    height: 52,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostFallbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ctaBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingHorizontal: DETAIL_HORIZONTAL_GUTTER,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  primaryCtaButton: {
    minHeight: DETAIL_CTA_HEIGHT,
    height: DETAIL_CTA_HEIGHT,
  },
  attendanceButton: {
    minWidth: 118,
    minHeight: DETAIL_CTA_HEIGHT,
    height: DETAIL_CTA_HEIGHT,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  attendanceLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    gap: 14,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 6,
    rowGap: 10,
  },
  tagBadge: {
    minHeight: 26,
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pulseGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  pulseMetric: {
    flex: 1,
    minHeight: 96,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    justifyContent: 'space-between',
    padding: DETAIL_CARD_INSET,
  },
  pulseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pulseValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  pulseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseMeta: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  listPanel: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  agendaStack: {
    gap: 8,
  },
  agendaPanel: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speakerListRow: {
    paddingHorizontal: DETAIL_CARD_INSET,
    paddingVertical: 10,
  },
  speakerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  speakerFallback: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerFallbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  speakerCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: DETAIL_CARD_INSET,
    paddingVertical: 10,
  },
  agendaHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  agendaItems: {
    gap: 0,
  },
  agendaItem: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: DETAIL_CARD_INSET,
    paddingVertical: 10,
  },
  agendaTime: {
    width: 72,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  agendaCopy: {
    flex: 1,
    gap: 4,
  },
  agendaSaveButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
