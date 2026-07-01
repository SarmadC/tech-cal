import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import {
  buildAgendaSecondaryText,
  formatAgendaDayLabel,
  formatAgendaSessionCount,
  formatAgendaStartTime,
  getInitials,
  type AgendaDayGroup,
} from './eventDetailUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

const CARD_INSET = 18;
const MAX_VISIBLE_SPEAKER_AVATARS = 4;

export function EventAgendaSection({
  agendaDayGroups,
  timezone,
  pendingAgendaSaveIds,
  onToggleAgendaSave,
}: {
  agendaDayGroups: AgendaDayGroup[];
  timezone?: string | null;
  pendingAgendaSaveIds?: Set<string>;
  onToggleAgendaSave?: (agendaItemId: string, isSaved: boolean) => void;
}) {
  const { tokens } = useAppTheme();
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  function toggleDay(key: string) {
    setExpandedDays((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Event schedule
        </Text>
      </View>

      <View style={styles.stack}>
        {agendaDayGroups.map((group) => {
          const expanded = expandedDays.includes(group.key);
          const visibleItems = expanded ? group.items : group.items.slice(0, 3);

          return (
            <View
              key={group.key}
              style={[
                styles.panel,
                { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border },
              ]}
            >
              <Pressable onPress={() => toggleDay(group.key)} style={styles.panelHeader}>
                <View style={styles.panelHeaderCopy}>
                  <View style={styles.dayTitleRow}>
                    <Text style={[styles.cardTitle, styles.dayTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                      {formatAgendaDayLabel(group, timezone)}
                    </Text>
                    <Text style={[styles.cardMeta, styles.sessionCount, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                      {formatAgendaSessionCount(group.items)}
                    </Text>
                  </View>
                </View>
                <FontAwesome
                  name={expanded ? 'angle-up' : 'angle-down'}
                  size={18}
                  color={tokens.colors.textSecondary}
                />
              </Pressable>

              <View>
                {visibleItems.map((item) => {
                  const secondary = buildAgendaSecondaryText(item);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.item,
                        { borderTopColor: tokens.colors.divider },
                      ]}
                    >
                      <Text style={[styles.itemTime, { color: tokens.colors.accent, fontFamily: tokens.typography.mono }]}>
                        {formatAgendaStartTime(item, timezone)}
                      </Text>
                      <View style={styles.itemCopy}>
                        <Text style={[styles.cardTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                          {item.title}
                        </Text>
                        {secondary ? (
                          <Text style={[styles.cardMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                            {secondary}
                          </Text>
                        ) : null}
                        {item.speakers && item.speakers.length > 0 ? (
                          <View style={styles.speakerStack}>
                            {item.speakers.slice(0, MAX_VISIBLE_SPEAKER_AVATARS).map((speaker, speakerIndex) => (
                              <View
                                key={speaker.id || `${item.id}-${speaker.name}-${speakerIndex}`}
                                style={[
                                  styles.speakerAvatarFrame,
                                  speakerIndex > 0 && styles.overlappedAvatar,
                                  {
                                    backgroundColor: tokens.colors.surface,
                                    borderColor: tokens.colors.surface,
                                  },
                                ]}
                              >
                                {speaker.photoUrl ? (
                                  <Image
                                    source={{ uri: speaker.photoUrl }}
                                    style={styles.speakerAvatarImage}
                                  />
                                ) : (
                                  <View
                                    style={[
                                      styles.speakerAvatarFallback,
                                      { backgroundColor: tokens.colors.accentSoft },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.speakerAvatarText,
                                        {
                                          color: tokens.colors.accent,
                                          fontFamily: tokens.typography.sans,
                                        },
                                      ]}
                                    >
                                      {getInitials(speaker.name)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ))}
                            {item.speakers.length > MAX_VISIBLE_SPEAKER_AVATARS ? (
                              <View
                                style={[
                                  styles.speakerAvatarFrame,
                                  styles.overlappedAvatar,
                                  {
                                    backgroundColor: tokens.colors.surfaceMuted,
                                    borderColor: tokens.colors.surface,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.speakerAvatarText,
                                    {
                                      color: tokens.colors.textSecondary,
                                      fontFamily: tokens.typography.sans,
                                    },
                                  ]}
                                >
                                  +{item.speakers.length - MAX_VISIBLE_SPEAKER_AVATARS}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                      {onToggleAgendaSave ? (
                        <Pressable
                          accessibilityLabel={item.isSaved ? 'Remove saved session' : 'Save session'}
                          disabled={pendingAgendaSaveIds?.has(item.id)}
                          onPress={() => onToggleAgendaSave(item.id, !item.isSaved)}
                          style={({ pressed }) => [
                            styles.saveButton,
                            {
                              backgroundColor: item.isSaved
                                ? tokens.colors.accentSoft
                                : pressed
                                  ? tokens.colors.surfaceMuted
                                  : 'transparent',
                              borderColor: item.isSaved ? tokens.colors.accent : tokens.colors.border,
                              opacity: pendingAgendaSaveIds?.has(item.id) ? 0.45 : 1,
                            },
                          ]}
                        >
                          <FontAwesome
                            name={item.isSaved ? 'bookmark' : 'bookmark-o'}
                            size={12}
                            color={item.isSaved ? tokens.colors.accent : tokens.colors.textSecondary}
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
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
  stack: {
    gap: 8,
  },
  panel: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: CARD_INSET,
    paddingVertical: 10,
  },
  panelHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    flex: 1,
  },
  sessionCount: {
    flexShrink: 0,
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: CARD_INSET,
    paddingVertical: 10,
  },
  itemTime: {
    width: 72,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  speakerStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  speakerAvatarFrame: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlappedAvatar: {
    marginLeft: -7,
  },
  speakerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  speakerAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerAvatarText: {
    fontSize: 9,
    fontWeight: '700',
  },
  saveButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
});
