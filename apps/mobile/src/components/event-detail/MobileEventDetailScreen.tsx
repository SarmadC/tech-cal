import { useMemo, useState, type ReactNode } from 'react';
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
} from './eventDetailUtils';
import { KureButton } from '../chrome/KureButton';
import { useAppTheme } from '../../providers/ThemeProvider';

function IconMetaRow({
  icon,
  children,
  onPress,
}: {
  icon: string;
  children: ReactNode;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();

  const inner = (
    <View style={styles.iconMetaRow}>
      <FontAwesome name={icon as any} size={13} color={tokens.colors.textTertiary} style={styles.iconMetaIcon} />
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
}: {
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
  const agenda = detail.agenda ?? [];
  const speakerLineup = detail.speakerLineup ?? [];
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
  const isBookmarked = Boolean(engagement?.isBookmarked);

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
            <Pressable
              accessibilityLabel="Back"
              onPress={onBack}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: pressed ? tokens.colors.surfaceStrong : 'transparent' },
              ]}
            >
              <FontAwesome name="angle-left" size={22} color={tokens.colors.textSecondary} />
            </Pressable>

            <View style={styles.headerCopy}>
              {event.metaLabel ? (
                <Text
                  style={[
                    styles.headerEyebrow,
                    { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
                  ]}
                >
                  {event.metaLabel}
                </Text>
              ) : null}
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

              {/* Compact meta cluster: badges + date + location */}
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
                    borderColor: isBookmarked ? tokens.colors.warning : tokens.colors.border,
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
                      {isAttending ? 'Remove RSVP' : 'Mark attending'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event meta sheet: date, location, organizer */}
          <View
            style={[
              styles.metaSheet,
              {
                backgroundColor: tokens.colors.surface,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <IconMetaRow icon="calendar">
              <Text style={[styles.metaRowText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                {formatEventDateTime(event.startTime, event.endTime, event.timezone)}
              </Text>
            </IconMetaRow>

            {event.location ? (
              <>
                <View style={[styles.metaDivider, { backgroundColor: tokens.colors.divider }]} />
                <IconMetaRow
                  icon="map-marker"
                  onPress={isLocationInteractive ? () => onOpenLocation(event.location!) : undefined}
                >
                  <Text style={[styles.metaRowText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
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
                      <Text style={[styles.metaRowText, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                        {host.name}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </View>

          {/* Description */}
          {event.description ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionEyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  Overview
                </Text>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  What this event is about
                </Text>
              </View>
              <Text
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
                <Text style={[styles.sectionEyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  Focus areas
                </Text>
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
                <Text style={[styles.sectionEyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  Speakers
                </Text>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  Who is on stage
                </Text>
              </View>

              <View style={styles.cardStack}>
                {visibleSpeakers.map((speaker) => {
                  const secondary = buildSpeakerSecondaryText(speaker);

                  return (
                    <View
                      key={speaker.id || speaker.name}
                      style={[
                        styles.infoCard,
                        {
                          backgroundColor: tokens.colors.surface,
                          borderColor: tokens.colors.border,
                        },
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
                <Text style={[styles.sectionEyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                  Agenda
                </Text>
                <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                  Event schedule
                </Text>
              </View>

              <View style={styles.cardStack}>
                {agendaDayGroups.map((group) => {
                  const expanded = expandedAgendaDays.includes(group.key);
                  const visibleItems = expanded ? group.items : group.items.slice(0, 3);

                  return (
                    <View
                      key={group.key}
                      style={[
                        styles.infoCard,
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
              <KureButton onPress={onPrimaryAction}>{primaryLabel}</KureButton>
            </View>
            {canOpenEventPage ? (
              <View style={{ flex: 1 }}>
                <KureButton variant="secondary" onPress={onOpenEventPage}>
                  Official site
                </KureButton>
              </View>
            ) : null}
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
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  metaCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  metaBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
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
    top: 48,
    right: 0,
    width: 188,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  metaSheet: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  iconMetaRowPressable: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconMetaIcon: {
    width: 18,
    textAlign: 'center',
  },
  metaRowText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  metaDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  organizerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 1,
  },
  hostLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  hostFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ctaBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardStack: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 14,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speakerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
  },
  speakerFallback: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerFallbackText: {
    fontSize: 16,
    fontWeight: '700',
  },
  speakerCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
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
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  agendaTime: {
    width: 58,
    fontSize: 12,
    fontWeight: '700',
  },
  agendaCopy: {
    flex: 1,
    gap: 4,
  },
  agendaTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
