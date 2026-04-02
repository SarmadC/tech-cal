import { useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import type { MobileEventDetail, MobileEventEngagement } from '@kurecal/domain';
import {
  buildAgendaDayGroups,
  buildAgendaSecondaryText,
  buildMapsSearchUrl,
  buildSpeakerSecondaryText,
  collectUniqueSpeakers,
  formatAgendaDayLabel,
  formatAgendaDayMeta,
  formatAgendaStartTime,
  formatEventStartDateTime,
  getInitials,
  hasMappableLocation,
  SPEAKER_PREVIEW_COUNT,
} from '@/components/event-detail/eventDetailUtils';
import { useAppTheme } from '@/providers/ThemeProvider';

interface MobileEventDetailScreenProps {
  detail: MobileEventDetail;
  engagement?: MobileEventEngagement;
  isBookmarkPending?: boolean;
  isAttendancePending?: boolean;
  onBack: () => void;
  onPrimaryAction: () => void;
  onAddToCalendar: () => void;
  onToggleBookmark: () => void;
  onToggleAttendance: () => void;
  onOpenEventPage: () => void;
  onOpenLocation: (location: string) => void;
  onShareEvent: () => void;
}

function DetailInfoRow({
  label,
  children,
  interactive = false,
  onPress,
}: {
  label: string;
  children: ReactNode;
  interactive?: boolean;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();

  if (interactive && onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.infoRow,
          {
            backgroundColor: pressed ? tokens.colors.accentSoft : 'transparent',
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
        <View style={styles.infoRowBody}>{children}</View>
      </Pressable>
    );
  }

  return (
    <View style={styles.infoRow}>
      <Text
        style={{
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
      <View style={styles.infoRowBody}>{children}</View>
    </View>
  );
}

export function MobileEventDetailScreen({
  detail,
  engagement,
  isBookmarkPending = false,
  isAttendancePending = false,
  onBack,
  onPrimaryAction,
  onAddToCalendar,
  onToggleBookmark,
  onToggleAttendance,
  onOpenEventPage,
  onOpenLocation,
  onShareEvent,
}: MobileEventDetailScreenProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [showMenu, setShowMenu] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedAgendaDays, setExpandedAgendaDays] = useState<string[]>([]);
  const [showAllSpeakers, setShowAllSpeakers] = useState(false);

  const agendaDayGroups = useMemo(
    () => buildAgendaDayGroups(detail.agenda, detail.timezone),
    [detail.agenda, detail.timezone]
  );
  const uniqueSpeakers = useMemo(() => collectUniqueSpeakers(detail), [detail]);
  const visibleSpeakers = showAllSpeakers ? uniqueSpeakers : uniqueSpeakers.slice(0, SPEAKER_PREVIEW_COUNT);
  const visibleTags = detail.tags.slice(0, 6);
  const hiddenTagCount = Math.max(detail.tags.length - visibleTags.length, 0);
  const hasPrimaryUrl = Boolean(detail.registrationUrl || detail.sourceUrl);
  const canOpenEventPage = Boolean(detail.sourceUrl);
  const primaryLabel = hasPrimaryUrl ? 'Register' : 'Add to calendar';
  const isLocationInteractive = hasMappableLocation(detail.location);
  const isAttending = engagement?.status === 'attending';
  const attendanceLabel = isAttending ? 'Attending' : 'Attend';
  const attendanceAccessibilityLabel = isAttending
    ? 'Remove attending status'
    : 'Mark attending';
  const isBookmarked = Boolean(engagement?.isBookmarked);
  const bookmarkAccessibilityLabel = isBookmarked
    ? 'Remove saved event'
    : 'Save event';
  const bookmarkAccentColor = tokens.colors.warning;
  const bookmarkAccentForeground =
    tokens.mode === 'dark' ? tokens.colors.textInverse : tokens.colors.textPrimary;
  const attendanceAccentColor = tokens.colors.accent;

  function toggleAgendaDay(dayKey: string) {
    setExpandedAgendaDays((current) =>
      current.includes(dayKey) ? current.filter((key) => key !== dayKey) : [...current, dayKey]
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.colors.shell }]} edges={['left', 'right']}>
      <View style={styles.root}>
        {showMenu ? (
          <Pressable
            testID="event-detail-menu-backdrop"
            onPress={() => setShowMenu(false)}
            style={styles.menuBackdrop}
          />
        ) : null}

        <View
          style={[
            styles.header,
            {
              backgroundColor: tokens.colors.shellElevated,
              borderBottomColor: tokens.colors.border,
              paddingTop: insets.top + 12,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent',
                },
              ]}
            >
              <FontAwesome name="angle-left" size={22} color={tokens.colors.textSecondary} />
            </Pressable>

            <View style={styles.headerCopy}>
              {detail.metaLabel ? (
                <Text
                  style={{
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {detail.metaLabel}
                </Text>
              ) : null}
              <Text
                testID="event-detail-title"
                numberOfLines={2}
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 30,
                  fontWeight: '800',
                  lineHeight: 32,
                  letterSpacing: -0.9,
                }}
              >
                {detail.title}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel={bookmarkAccessibilityLabel}
                disabled={isBookmarkPending}
                onPress={onToggleBookmark}
                style={({ pressed }) => [
                  styles.iconButton,
                  styles.iconStateButton,
                  {
                    backgroundColor: isBookmarked
                      ? bookmarkAccentColor
                      : pressed
                        ? tokens.colors.surfaceStrong
                        : tokens.colors.surface,
                    borderColor: isBookmarked
                      ? bookmarkAccentColor
                      : tokens.colors.border,
                    opacity: isBookmarkPending ? 0.45 : 1,
                  },
                ]}
                testID="event-detail-bookmark-action"
              >
                <FontAwesome
                  name={isBookmarked ? 'bookmark' : 'bookmark-o'}
                  size={15}
                  color={isBookmarked ? bookmarkAccentForeground : tokens.colors.textSecondary}
                />
              </Pressable>

              <Pressable
                accessibilityLabel="More actions"
                onPress={() => setShowMenu((current) => !current)}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent',
                  },
                ]}
                testID="event-detail-overflow-trigger"
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
                    onPress={() => {
                      setShowMenu(false);
                      onShareEvent();
                    }}
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

                  {hasPrimaryUrl ? (
                    <Pressable
                      onPress={() => {
                        setShowMenu(false);
                        onAddToCalendar();
                      }}
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
                  ) : null}

                  {canOpenEventPage ? (
                    <Pressable
                      onPress={() => {
                        setShowMenu(false);
                        onOpenEventPage();
                      }}
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
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 28,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.infoSection,
              {
                borderBottomColor: tokens.colors.border,
              },
            ]}
          >
            <DetailInfoRow label="When">
              <Text
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 16,
                  fontWeight: '600',
                  lineHeight: 24,
                }}
              >
                {formatEventStartDateTime(detail.startTime, detail.timezone)}
              </Text>
            </DetailInfoRow>

            <DetailInfoRow
              label="Where"
              interactive={isLocationInteractive}
              onPress={detail.location ? () => onOpenLocation(detail.location!) : undefined}
            >
              <View style={styles.inlineRow}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 16,
                    fontWeight: '600',
                    lineHeight: 24,
                    flex: 1,
                  }}
                >
                  {detail.location ?? 'Location TBA'}
                </Text>
                {isLocationInteractive ? (
                  <FontAwesome name="external-link" size={14} color={tokens.colors.textTertiary} />
                ) : null}
              </View>
            </DetailInfoRow>

            <DetailInfoRow label="Hosted by">
              <View style={styles.hostRow}>
                {detail.host.logoUrl ? (
                  <Image source={{ uri: detail.host.logoUrl }} style={styles.hostImage} />
                ) : (
                  <View
                    style={[
                      styles.hostFallback,
                      {
                        backgroundColor: tokens.colors.surfaceStrong,
                        borderColor: tokens.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {getInitials(detail.host.name)}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 16,
                    fontWeight: '600',
                    lineHeight: 24,
                    flex: 1,
                  }}
                >
                  {detail.host.name}
                </Text>
              </View>
            </DetailInfoRow>

            {visibleTags.length > 0 ? (
              <DetailInfoRow label="Topics">
                <View style={styles.topicWrap}>
                  {visibleTags.map((tag) => (
                    <View
                      key={tag.id}
                      style={[
                        styles.topicChip,
                        {
                          backgroundColor: tokens.colors.surfaceStrong,
                          borderColor: tokens.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {tag.name}
                      </Text>
                    </View>
                  ))}
                  {hiddenTagCount > 0 ? (
                    <View
                      style={[
                        styles.topicChip,
                        {
                          backgroundColor: tokens.colors.surfaceStrong,
                          borderColor: tokens.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: tokens.colors.textTertiary,
                          fontFamily: tokens.typography.sans,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        +{hiddenTagCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </DetailInfoRow>
            ) : null}
          </View>

          {detail.description ? (
            <View
              style={[
                styles.section,
                {
                  borderBottomColor: tokens.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 15,
                  fontWeight: '700',
                }}
              >
                Overview
              </Text>
              <Text
                numberOfLines={showFullDescription ? undefined : 4}
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 15,
                  lineHeight: 28,
                  marginTop: 12,
                }}
              >
                {detail.description}
              </Text>
              {detail.description.length > 240 ? (
                <Pressable
                  testID="event-detail-overview-toggle"
                  onPress={() => setShowFullDescription((current) => !current)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 12 }]}
                >
                  <Text
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {showFullDescription ? 'Show less' : 'Read more'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {agendaDayGroups.length > 0 ? (
            <View
              style={[
                styles.section,
                {
                  borderBottomColor: tokens.colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeadingRow}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Agenda
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  {agendaDayGroups.length} day{agendaDayGroups.length === 1 ? '' : 's'}
                </Text>
              </View>

              <View
                style={[
                  styles.stackDivider,
                  {
                    borderTopColor: tokens.colors.border,
                  },
                ]}
              >
                {agendaDayGroups.map((group) => {
                  const isExpanded = expandedAgendaDays.includes(group.key);
                  return (
                    <View
                      key={group.key}
                      style={[
                        styles.agendaGroup,
                        {
                          borderBottomColor: tokens.colors.border,
                        },
                      ]}
                    >
                      <Pressable
                        testID={`event-detail-agenda-${group.key}`}
                        onPress={() => toggleAgendaDay(group.key)}
                        style={({ pressed }) => [
                          styles.agendaToggle,
                          {
                            backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
                          },
                        ]}
                      >
                        <View style={styles.agendaToggleCopy}>
                          <Text
                            style={{
                              color: tokens.colors.textPrimary,
                              fontFamily: tokens.typography.sans,
                              fontSize: 14,
                              fontWeight: '700',
                            }}
                          >
                            {formatAgendaDayLabel(group, agendaDayGroups.length, detail.timezone)}
                          </Text>
                          <Text
                            style={{
                              color: tokens.colors.textTertiary,
                              fontFamily: tokens.typography.sans,
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {formatAgendaDayMeta(group.items, detail.timezone)}
                          </Text>
                        </View>
                        <FontAwesome
                          name={isExpanded ? 'angle-down' : 'angle-right'}
                          size={16}
                          color={tokens.colors.textTertiary}
                        />
                      </Pressable>

                      {isExpanded ? (
                        <View style={styles.agendaItems}>
                          {group.items.map((agendaItem, index) => (
                            <View key={agendaItem.id} style={styles.agendaItemRow}>
                              <Text
                                numberOfLines={1}
                                style={{
                                  color: tokens.colors.textTertiary,
                                  fontFamily: tokens.typography.mono,
                                  fontSize: 12,
                                  fontWeight: '700',
                                  width: 76,
                                  paddingTop: 2,
                                }}
                              >
                                {formatAgendaStartTime(agendaItem, detail.timezone)}
                              </Text>

                              <View style={styles.agendaItemContent}>
                                {index < group.items.length - 1 ? (
                                  <View
                                    style={[
                                      styles.agendaLine,
                                      {
                                        backgroundColor: tokens.colors.border,
                                      },
                                    ]}
                                  />
                                ) : null}
                                <View
                                  style={[
                                    styles.agendaDot,
                                    {
                                      backgroundColor: tokens.colors.textTertiary,
                                    },
                                  ]}
                                />
                                <Text
                                  style={{
                                    color: tokens.colors.textPrimary,
                                    fontFamily: tokens.typography.sans,
                                    fontSize: 15,
                                    fontWeight: '600',
                                    lineHeight: 22,
                                  }}
                                >
                                  {agendaItem.title}
                                </Text>
                                {buildAgendaSecondaryText(agendaItem) ? (
                                  <Text
                                    style={{
                                      color: tokens.colors.textTertiary,
                                      fontFamily: tokens.typography.sans,
                                      fontSize: 13,
                                      lineHeight: 20,
                                      marginTop: 4,
                                    }}
                                  >
                                    {buildAgendaSecondaryText(agendaItem)}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {uniqueSpeakers.length > 0 ? (
            <View
              style={[
                styles.section,
                {
                  borderBottomColor: tokens.colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeadingRow}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Speakers
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  {uniqueSpeakers.length} speaker{uniqueSpeakers.length === 1 ? '' : 's'}
                </Text>
              </View>

              <View
                style={[
                  styles.stackDivider,
                  {
                    borderTopColor: tokens.colors.border,
                  },
                ]}
              >
                {visibleSpeakers.map((speaker) => (
                  <View
                    key={`${speaker.id}-${speaker.name}`}
                    style={[
                      styles.speakerRow,
                      {
                        borderBottomColor: tokens.colors.border,
                      },
                    ]}
                  >
                    {speaker.photoUrl ? (
                      <Image source={{ uri: speaker.photoUrl }} style={styles.speakerImage} />
                    ) : (
                      <View
                        style={[
                          styles.hostFallback,
                          {
                            backgroundColor: tokens.colors.surfaceStrong,
                            borderColor: tokens.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                            fontSize: 12,
                            fontWeight: '700',
                          }}
                        >
                          {getInitials(speaker.name)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.speakerCopy}>
                      <Text
                        style={{
                          color: tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                          fontSize: 15,
                          fontWeight: '600',
                        }}
                      >
                        {speaker.name}
                      </Text>
                      {buildSpeakerSecondaryText(speaker) ? (
                        <Text
                          style={{
                            color: tokens.colors.textTertiary,
                            fontFamily: tokens.typography.sans,
                            fontSize: 13,
                            lineHeight: 20,
                            marginTop: 2,
                          }}
                        >
                          {buildSpeakerSecondaryText(speaker)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              {uniqueSpeakers.length > SPEAKER_PREVIEW_COUNT ? (
                <Pressable
                  testID="event-detail-speakers-toggle"
                  onPress={() => setShowAllSpeakers((current) => !current)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1, marginTop: 12 }]}
                >
                  <Text
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {showAllSpeakers ? 'Show less' : 'Show all speakers'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: tokens.colors.shellElevated,
              borderTopColor: tokens.colors.border,
              paddingBottom: insets.bottom + 14,
            },
          ]}
        >
          <View style={styles.footerRow}>
            <Pressable
              testID="event-detail-primary-action"
              onPress={onPrimaryAction}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: tokens.colors.textPrimary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <FontAwesome
                name={hasPrimaryUrl ? 'external-link' : 'calendar-plus-o'}
                size={15}
                color={tokens.colors.textInverse}
              />
              <Text
                style={{
                  color: tokens.colors.textInverse,
                  fontFamily: tokens.typography.sans,
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                {primaryLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={attendanceAccessibilityLabel}
              testID="event-detail-attendance-action"
              disabled={isAttendancePending}
              onPress={onToggleAttendance}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: isAttending
                    ? attendanceAccentColor
                    : tokens.colors.surface,
                  borderColor: isAttending
                    ? attendanceAccentColor
                    : tokens.colors.border,
                  opacity: isAttendancePending ? 0.45 : pressed ? 0.82 : 1,
                },
              ]}
            >
              <FontAwesome
                name={isAttending ? 'check-circle' : 'check-circle-o'}
                size={15}
                color={isAttending ? tokens.colors.textInverse : tokens.colors.textSecondary}
              />
              <Text
                style={{
                  color: isAttending ? tokens.colors.textInverse : tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {attendanceLabel}
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
    position: 'relative',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  header: {
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  headerActions: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStateButton: {
    borderWidth: 1,
  },
  menu: {
    position: 'absolute',
    top: 46,
    right: 0,
    width: 220,
    borderRadius: 18,
    borderWidth: 1,
    padding: 6,
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  menuItem: {
    minHeight: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRow: {
    paddingVertical: 14,
  },
  infoRowBody: {
    marginTop: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  hostFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    minHeight: 32,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stackDivider: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  agendaGroup: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  agendaToggle: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  agendaToggleCopy: {
    flex: 1,
  },
  agendaItems: {
    marginTop: 12,
    paddingBottom: 14,
  },
  agendaItemRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  agendaItemContent: {
    flex: 1,
    paddingLeft: 16,
    position: 'relative',
    minHeight: 24,
  },
  agendaLine: {
    position: 'absolute',
    left: 4,
    top: 14,
    bottom: -12,
    width: StyleSheet.hairlineWidth,
  },
  agendaDot: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  speakerRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  speakerImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  speakerCopy: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    width: 124,
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
});
