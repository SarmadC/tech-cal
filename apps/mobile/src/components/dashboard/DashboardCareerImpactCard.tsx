import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { MobileDashboardCareerImpact } from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { useAppTheme } from '../../providers/ThemeProvider';

function formatProgressLabel(level: 'exploring' | 'building' | 'regular') {
  if (level === 'regular') {
    return 'Regular';
  }

  if (level === 'building') {
    return 'Building';
  }

  return 'Exploring';
}

function toneColor(
  tone: 'success' | 'info' | 'warning',
  colors: ReturnType<typeof useAppTheme>['tokens']['colors']
) {
  if (tone === 'success') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  return colors.info;
}

export function DashboardCareerImpactCard({
  careerImpact,
}: {
  careerImpact: MobileDashboardCareerImpact;
}) {
  const { tokens } = useAppTheme();

  if (careerImpact.totalEvents === 0) {
    return (
      <DashboardCard>
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
            Career Impact
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
            Alignment story pending
          </Text>
        </View>

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
            name="lightbulb"
            size={18}
            color={tokens.colors.warning}
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
            Attend a few events first
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
            This section starts surfacing your strongest skill and goal themes once
            your attended history has real signal.
          </Text>
        </View>
      </DashboardCard>
    );
  }

  const metrics = [
    {
      id: 'skills',
      label: 'Skill aligned',
      value: `${careerImpact.skillAlignedPercentage}%`,
      detail: `${careerImpact.skillAlignedCount} events`,
    },
    {
      id: 'goals',
      label: 'Goal aligned',
      value: `${careerImpact.goalAlignedPercentage}%`,
      detail: `${careerImpact.goalAlignedCount} events`,
    },
    {
      id: 'networking',
      label: 'Networking',
      value: `${careerImpact.networkingPercentage}%`,
      detail: `${careerImpact.networkingCount} events`,
    },
  ];

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
            Career Impact
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
            What your attendance is building
          </Text>
        </View>
        <Text
          style={[
            styles.headerMeta,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {careerImpact.totalEvents} attended
        </Text>
      </View>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <View
            key={metric.id}
            style={[
              styles.metricCard,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.metricValue,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {metric.value}
            </Text>
            <Text
              style={[
                styles.metricLabel,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {metric.label}
            </Text>
            <Text
              style={[
                styles.metricDetail,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {metric.detail}
            </Text>
          </View>
        ))}
      </View>

      {careerImpact.skillProgress.length > 0 ? (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Skill progression
          </Text>

          <View style={styles.progressList}>
            {careerImpact.skillProgress.map((item) => {
              const progressValue =
                item.progressLevel === 'regular'
                  ? 1
                  : item.progressLevel === 'building'
                    ? 0.64
                    : 0.28;

              return (
                <View
                  key={item.skill}
                  style={[
                    styles.progressRow,
                    {
                      backgroundColor: tokens.colors.surfaceMuted,
                      borderColor: tokens.colors.border,
                    },
                  ]}
                >
                  <View style={styles.progressHeader}>
                    <View style={styles.progressCopy}>
                      <Text
                        style={[
                          styles.progressSkill,
                          {
                            color: tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {item.skill}
                      </Text>
                      <Text
                        style={[
                          styles.progressHint,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {item.nextMilestone}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.levelBadge,
                        {
                          backgroundColor: tokens.colors.accentSoft,
                          borderColor: tokens.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelBadgeText,
                          {
                            color: tokens.colors.accent,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {formatProgressLabel(item.progressLevel)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: tokens.colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round(progressValue * 100)}%`,
                          backgroundColor: tokens.colors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Key takeaways
        </Text>
        <View style={styles.insightsList}>
          {careerImpact.insights.map((item, index) => {
            const color = toneColor(item.tone, tokens.colors);
            return (
              <View
                key={`${item.tone}-${index}`}
                style={[
                  styles.insightRow,
                  {
                    backgroundColor: tokens.colors.surfaceMuted,
                    borderColor: tokens.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.insightDot,
                    { backgroundColor: color },
                  ]}
                />
                <Text
                  style={[
                    styles.insightMessage,
                    {
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {item.message}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
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
  headerMeta: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricDetail: {
    fontSize: 11,
    lineHeight: 15,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  progressList: {
    gap: 10,
  },
  progressRow: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  progressCopy: {
    flex: 1,
    gap: 3,
  },
  progressSkill: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  progressHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  levelBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  insightsList: {
    gap: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  insightMessage: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
