import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileDashboardCommitment } from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { useAppTheme } from '../../providers/ThemeProvider';

function formatDateParts(startTime: string) {
  const start = new Date(startTime);
  return {
    date: start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    time: start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}

export function DashboardUpcomingCommitmentsCard({
  commitments,
  showOpenSlot,
  onOpenEvent,
}: {
  commitments: MobileDashboardCommitment[];
  showOpenSlot?: boolean;
  onOpenEvent?: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <DashboardCard>
      <View style={styles.header}>
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 18,
            fontWeight: '800',
          }}
        >
          Upcoming Commitments
        </Text>
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          RSVP&apos;d events you need to prepare for
        </Text>
      </View>

      <View style={styles.list}>
        {commitments.length > 0 ? (
          <>
            {commitments.map((item, index) => {
              const { date, time } = formatDateParts(item.event.startTime);
              const isUrgent = item.daysUntil <= 7;
              const isFar = item.daysUntil > 30;

              return (
                <Pressable
                  key={item.trackingId}
                  onPress={() => onOpenEvent?.(item.event.id)}
                  style={({ pressed }) => [
                    styles.row,
                    index < commitments.length - 1 && {
                      borderBottomColor: tokens.colors.divider,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.dateBlock}>
                    <Text
                      style={{
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      {date}
                    </Text>
                    <Text
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 11,
                        fontWeight: '500',
                      }}
                    >
                      {time}
                    </Text>
                  </View>

                  <View style={styles.meta}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 14,
                        fontWeight: '700',
                      }}
                    >
                      {item.event.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      {item.event.location || 'Details available in event view'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      {
                        borderColor: isUrgent
                          ? 'rgba(251, 191, 36, 0.35)'
                          : isFar
                            ? tokens.colors.border
                            : 'rgba(96, 165, 250, 0.28)',
                        backgroundColor: isUrgent
                          ? 'rgba(251, 191, 36, 0.12)'
                          : isFar
                            ? tokens.colors.surfaceMuted
                            : tokens.colors.accentSoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isUrgent
                          ? '#fbbf24'
                          : isFar
                            ? tokens.colors.textSecondary
                            : tokens.colors.accent,
                        fontFamily: tokens.typography.sans,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      {item.daysUntil === 0 ? 'Today' : `${item.daysUntil}d`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {showOpenSlot ? (
              <View
                style={[
                  styles.openSlot,
                  {
                    borderColor: tokens.colors.borderStrong,
                    backgroundColor: tokens.colors.surfaceMuted,
                  },
                ]}
              >
                <FontAwesome5
                  name="plus"
                  size={12}
                  color={tokens.colors.textSecondary}
                />
                <Text
                  style={{
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  Open Slot
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View
            style={[
              styles.emptyState,
              {
                borderColor: tokens.colors.borderStrong,
                backgroundColor: tokens.colors.surfaceMuted,
              },
            ]}
          >
            <FontAwesome5
              name="calendar-alt"
              size={18}
              color={tokens.colors.textSecondary}
            />
            <Text
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              No upcoming commitments
            </Text>
          </View>
        )}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.9,
  },
  dateBlock: {
    width: 72,
    gap: 2,
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  badge: {
    minWidth: 48,
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  openSlot: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyState: {
    minHeight: 108,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
