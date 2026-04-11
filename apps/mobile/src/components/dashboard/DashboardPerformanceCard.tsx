import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileDashboardPerformance } from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { useAppTheme } from '../../providers/ThemeProvider';

function formatAttendedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DashboardPerformanceCard({
  performance,
  onOpenEvent,
}: {
  performance: MobileDashboardPerformance;
  onOpenEvent?: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <DashboardCard>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text
            style={[
              styles.eyebrow,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Performance
          </Text>
          <Text
            style={[
              styles.title,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Recent activity
          </Text>
        </View>
        <Text
          style={[
            styles.meta,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {performance.recentWins.length} shown
        </Text>
      </View>

      <View style={styles.summaryRow}>
        {[
          {
            id: 'attended',
            value: performance.summary.attendedCount,
            label: 'attended',
          },
          {
            id: 'rated',
            value: performance.summary.ratedCount,
            label: 'rated',
          },
          {
            id: 'connections',
            value: performance.summary.connectionsMade,
            label: 'connections',
          },
        ].map((item) => (
          <View
            key={item.id}
            style={[
              styles.summaryCard,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.summaryValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {item.value}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {performance.recentWins.length > 0 ? (
        <View style={styles.timeline}>
          {performance.recentWins.map((win, index) => {
            const matchedSummary = [...win.matchedSkills.slice(0, 2), ...win.matchedGoals.slice(0, 1)];

            return (
              <Pressable
                key={win.event.id}
                onPress={() => onOpenEvent?.(win.event.id)}
                style={({ pressed }) => [
                  styles.row,
                  index < performance.recentWins.length - 1 && {
                    borderBottomColor: tokens.colors.divider,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.node,
                      { backgroundColor: tokens.colors.success },
                    ]}
                  />
                  {index < performance.recentWins.length - 1 ? (
                    <View
                      style={[
                        styles.line,
                        { backgroundColor: tokens.colors.divider },
                      ]}
                    />
                  ) : null}
                </View>

                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <View style={styles.titleBlock}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.rowTitle,
                          {
                            color: tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {win.event.title}
                      </Text>
                      <Text
                        style={[
                          styles.rowSubtitle,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {formatAttendedDate(win.attendedDate)}
                        {typeof win.bookmarkedLeadDays === 'number'
                          ? ` • Saved ${win.bookmarkedLeadDays}d ahead`
                          : ''}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.scoreBadge,
                        {
                          backgroundColor: tokens.colors.accentSoft,
                          borderColor: tokens.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color: tokens.colors.accent,
                            fontFamily: tokens.typography.mono,
                          },
                        ]}
                      >
                        {win.score}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: win.feedbackSubmitted
                            ? 'rgba(52, 211, 153, 0.12)'
                            : 'rgba(251, 191, 36, 0.14)',
                          borderColor: win.feedbackSubmitted
                            ? 'rgba(52, 211, 153, 0.24)'
                            : 'rgba(251, 191, 36, 0.28)',
                        },
                      ]}
                    >
                      <FontAwesome5
                        name={win.feedbackSubmitted ? 'check-circle' : 'star'}
                        size={11}
                        color={win.feedbackSubmitted ? '#34d399' : '#fbbf24'}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: win.feedbackSubmitted ? '#34d399' : '#fbbf24',
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {win.feedbackSubmitted && win.actualValueRating
                          ? `${win.actualValueRating}/5 rated`
                          : win.feedbackSubmitted
                            ? 'Feedback logged'
                            : 'Not rated yet'}
                      </Text>
                    </View>

                    {matchedSummary.map((label) => (
                      <View
                        key={`${win.event.id}-${label}`}
                        style={[
                          styles.skillPill,
                          {
                            backgroundColor: tokens.colors.surfaceMuted,
                            borderColor: tokens.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.skillPillText,
                            {
                              color: tokens.colors.textSecondary,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}

          {performance.hiddenCount > 0 ? (
            <View
              style={[
                styles.historyCallout,
                {
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderColor: tokens.colors.borderStrong,
                },
              ]}
            >
              <FontAwesome5
                name="history"
                size={12}
                color={tokens.colors.textSecondary}
              />
              <Text
                style={[
                  styles.historyText,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                +{performance.hiddenCount} more win
                {performance.hiddenCount === 1 ? '' : 's'} in your full history
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View
          style={[
            styles.emptyState,
            {
              backgroundColor: tokens.colors.surfaceMuted,
              borderColor: tokens.colors.borderStrong,
            },
          ]}
        >
          <FontAwesome5
            name="chart-line"
            size={18}
            color={tokens.colors.textSecondary}
          />
          <Text
            style={[
              styles.emptyTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            No recent wins yet
          </Text>
          <Text
            style={[
              styles.emptyBody,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Attend a few events to start building a visible performance trail.
          </Text>
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  timeline: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rail: {
    alignItems: 'center',
    width: 14,
  },
  node: {
    width: 9,
    height: 9,
    borderRadius: 999,
    marginTop: 6,
  },
  line: {
    width: 1,
    flex: 1,
    marginTop: 6,
  },
  rowContent: {
    flex: 1,
    gap: 10,
  },
  rowTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  scoreBadge: {
    minWidth: 48,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  skillPill: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCallout: {
    marginTop: 8,
    minHeight: 40,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
