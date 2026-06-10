import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import type { MobileEventDetail } from '@kurecal/domain';
import { useAppTheme } from '../../providers/ThemeProvider';

const CARD_INSET = 18;

export function NetworkingPulseSection({
  pulse,
}: {
  pulse: NonNullable<MobileEventDetail['networkingPulse']>;
}) {
  const { tokens } = useAppTheme();
  const hasActiveSignal =
    pulse.state === 'active' && (pulse.trendingTopic || pulse.mostSavedSession);

  if (!hasActiveSignal) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          What attendees are focusing on
        </Text>
      </View>

      <View style={styles.grid}>
        {pulse.trendingTopic ? (
          <View
            style={[
              styles.metric,
              { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border },
            ]}
          >
            <Text style={[styles.label, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
              Trending topic
            </Text>
            <Text numberOfLines={1} style={[styles.value, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
              {pulse.trendingTopic.label}
            </Text>
            <View style={styles.metaRow}>
              <FontAwesome name="line-chart" size={13} color={tokens.colors.textSecondary} />
              <Text style={[styles.meta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                {pulse.trendingTopic.activityLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {pulse.mostSavedSession ? (
          <View
            style={[
              styles.metric,
              { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border },
            ]}
          >
            <Text style={[styles.label, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
              Most saved session
            </Text>
            <Text numberOfLines={1} style={[styles.value, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
              {pulse.mostSavedSession.title}
            </Text>
            <View style={styles.metaRow}>
              <FontAwesome name="bookmark-o" size={13} color={tokens.colors.textSecondary} />
              <Text style={[styles.meta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                {pulse.mostSavedSession.saveCount} saves
              </Text>
            </View>
          </View>
        ) : null}
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
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    minHeight: 96,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    justifyContent: 'space-between',
    padding: CARD_INSET,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
