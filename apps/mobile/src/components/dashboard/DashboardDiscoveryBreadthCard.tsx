import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { MobileDashboardDiscoveryBreadth } from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { useAppTheme } from '../../providers/ThemeProvider';

function formatLabel(value: MobileDashboardDiscoveryBreadth['breadthLabel']) {
  switch (value) {
    case 'broad':
      return 'Broad';
    case 'balanced':
      return 'Balanced';
    default:
      return 'Narrow';
  }
}

export function DashboardDiscoveryBreadthCard({
  breadth,
}: {
  breadth: MobileDashboardDiscoveryBreadth;
}) {
  const { tokens, resolvedTheme } = useAppTheme();
  const maxFormat = Math.max(
    breadth.formatCounts.virtual,
    breadth.formatCounts['in-person'],
    breadth.formatCounts.hybrid,
    1
  );
  const formatRows = [
    { id: 'virtual', label: 'Virtual', value: breadth.formatCounts.virtual },
    { id: 'in-person', label: 'In person', value: breadth.formatCounts['in-person'] },
    { id: 'hybrid', label: 'Hybrid', value: breadth.formatCounts.hybrid },
  ];

  return (
    <DashboardCard>
      <LinearGradient
        colors={
          resolvedTheme === 'light'
            ? ['rgba(129, 140, 248, 0.16)', 'rgba(129, 140, 248, 0.03)']
            : ['rgba(167, 139, 250, 0.16)', 'rgba(49, 46, 129, 0.04)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.copy}>
          <Text
            style={[
              styles.eyebrow,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
          >
            Discovery Breadth
          </Text>
          <Text
            style={[
              styles.title,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            Outside your usual lane
          </Text>
        </View>

        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: 'rgba(129, 140, 248, 0.14)',
              borderColor: 'rgba(129, 140, 248, 0.24)',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: '#6366f1', fontFamily: tokens.typography.sans },
            ]}
          >
            {formatLabel(breadth.breadthLabel)}
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        {[
          { id: 'categories', value: breadth.categoryCount, label: 'categories' },
          { id: 'organizers', value: breadth.organizerCount, label: 'organizers' },
          {
            id: 'formats',
            value:
              Number(breadth.formatCounts.virtual > 0) +
              Number(breadth.formatCounts['in-person'] > 0) +
              Number(breadth.formatCounts.hybrid > 0),
            label: 'formats',
          },
        ].map((item) => (
          <View
            key={item.id}
            style={[
              styles.metricCell,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderColor: tokens.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.metricValue,
                { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
              ]}
            >
              {item.value}
            </Text>
            <Text
              style={[
                styles.metricLabel,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.barGroup}>
        {formatRows.map((item) => (
          <View key={item.id} style={styles.barRow}>
            <Text
              style={[
                styles.barLabel,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              {item.label}
            </Text>
            <View
              style={[
                styles.barTrack,
                { backgroundColor: tokens.colors.surfaceMuted, borderColor: tokens.colors.border },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(8, Math.round((item.value / maxFormat) * 100))}%`,
                    backgroundColor: tokens.colors.accent,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.barValue,
                { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
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
  copy: {
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
  statusChip: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  barGroup: {
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  barValue: {
    width: 18,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
});
