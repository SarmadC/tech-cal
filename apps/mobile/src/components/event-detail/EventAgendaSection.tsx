import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import {
  buildAgendaSecondaryText,
  formatAgendaDayLabel,
  formatAgendaDayMeta,
  formatAgendaStartTime,
  type AgendaDayGroup,
} from './eventDetailUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

const CARD_INSET = 18;

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
                  <Text style={[styles.cardTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                    {formatAgendaDayLabel(group, agendaDayGroups.length, timezone)}
                  </Text>
                  <Text style={[styles.cardMeta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                    {formatAgendaDayMeta(group.items, timezone)}
                  </Text>
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
