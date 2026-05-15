import { FontAwesome5 } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileDashboardCommitment } from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { useAppTheme } from "../../providers/ThemeProvider";

function formatDateParts(startTime: string) {
  const start = new Date(startTime);
  return {
    date: start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    time: start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function DashboardUpcomingCommitmentsCard({
  commitments,
  showOpenSlot,
  onOpenEvent,
  onExploreEvents,
}: {
  commitments: MobileDashboardCommitment[];
  showOpenSlot?: boolean;
  onOpenEvent?: (eventId: string) => void;
  onExploreEvents?: () => void;
}) {
  const { tokens } = useAppTheme();
  const emptyStateTextColor = tokens.colors.textSecondary;
  const emptyActionColor = tokens.colors.accent;

  return (
    <DashboardCard style={styles.card} contentStyle={styles.cardContent}>
      <View style={styles.header}>
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 18,
            fontWeight: "800",
            letterSpacing: -0.3,
          }}
        >
          Upcoming commitments
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
                        fontWeight: "700",
                      }}
                    >
                      {date}
                    </Text>
                    <Text
                      style={{
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                        fontSize: 11,
                        fontWeight: "500",
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
                        fontWeight: "700",
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
                      {item.event.location || "Details available in event view"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      {
                        borderColor: isUrgent
                          ? tokens.colors.border
                          : isFar
                            ? tokens.colors.border
                            : tokens.colors.border,
                        backgroundColor: isUrgent
                          ? tokens.colors.surfaceMuted
                          : isFar
                            ? tokens.colors.surfaceMuted
                            : tokens.colors.accentSoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isUrgent
                          ? tokens.colors.warning
                          : isFar
                            ? tokens.colors.textSecondary
                            : tokens.colors.accent,
                        fontFamily: tokens.typography.sans,
                        fontSize: 11,
                        fontWeight: "800",
                      }}
                    >
                      {item.daysUntil === 0 ? "Today" : `${item.daysUntil}d`}
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
                    borderTopColor: tokens.colors.divider,
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
                    fontWeight: "700",
                  }}
                >
                  Open Slot
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text
              style={{
                color: emptyStateTextColor,
                fontFamily: tokens.typography.sans,
                fontSize: 15,
                lineHeight: 20,
                fontWeight: "700",
              }}
            >
              No events to prepare for yet.
            </Text>

            {onExploreEvents ? (
              <Pressable
                onPress={onExploreEvents}
                style={({ pressed }) => [
                  styles.emptyAction,
                  pressed && styles.emptyActionPressed,
                ]}
              >
                <Text
                  style={{
                    color: emptyActionColor,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Explore events
                </Text>
                <FontAwesome5
                  name="arrow-right"
                  size={10}
                  color={emptyActionColor}
                />
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
  },
  cardContent: {
    gap: 10,
    padding: 14,
  },
  header: {
    gap: 2,
  },
  list: {
    gap: 2,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    minHeight: 24,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  openSlot: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
  },
  emptyState: {
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  emptyAction: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyActionPressed: {
    opacity: 0.72,
  },
});
