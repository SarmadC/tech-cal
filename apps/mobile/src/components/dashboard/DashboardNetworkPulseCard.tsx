import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  MobileCommunityNetworkingSpeakerMatch,
  MobileDashboardNetworkPulse,
} from '@kurecal/domain';

import { DashboardCard } from './DashboardCard';
import { CommunityAvatar } from '../community/CommunityAvatar';
import { useAppTheme } from '../../providers/ThemeProvider';

export function DashboardNetworkPulseCard({
  networkPulse,
  speakerMatches = [],
  onOpenSpeaker,
}: {
  networkPulse: MobileDashboardNetworkPulse;
  speakerMatches?: MobileCommunityNetworkingSpeakerMatch[];
  onOpenSpeaker?: (speakerId: string) => void;
}) {
  const { tokens, resolvedTheme } = useAppTheme();
  const cardFill =
    resolvedTheme === 'light'
      ? '#D8F1E4'
      : 'rgba(13, 34, 24, 0.98)';
  const totalConnectionsLabel = `connection${
    networkPulse.totalConnectionsMade === 1 ? '' : 's'
  }`;
  const visibleSpeakerMatches = speakerMatches.slice(0, 3);
  const footerText = visibleSpeakerMatches.length > 0
    ? `${visibleSpeakerMatches.length} speaker connection${
        visibleSpeakerMatches.length === 1 ? '' : 's'
      } to explore on LinkedIn.`
    : networkPulse.topConnectingEvent
    ? `Best event: ${networkPulse.topConnectingEvent?.title ?? ''} · ${
        networkPulse.topConnectingEvent?.connectionsMade ?? 0
      } ${networkPulse.topConnectingEvent?.connectionsMade === 1 ? 'connection' : 'connections'}`
    : 'Attend + log 1 event to unlock networking insights.';

  return (
    <DashboardCard surfaceColors={[cardFill, cardFill]}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
          ]}
        >
          Relationship momentum
        </Text>

        <View
          style={[
            styles.ratioBadge,
            {
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              borderColor: 'rgba(16, 185, 129, 0.24)',
            },
          ]}
        >
          <Text
            style={[
              styles.ratioText,
              { color: '#059669', fontFamily: tokens.typography.sans },
            ]}
          >
            {networkPulse.networkingEventRatio}% networking
          </Text>
        </View>
      </View>

      <View style={styles.heroMetricBlock}>
        <View style={styles.heroMetricRow}>
          <Text
            style={[
              styles.heroValue,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            {networkPulse.totalConnectionsMade}
          </Text>
          <Text
            style={[
              styles.heroLabel,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            {totalConnectionsLabel}
          </Text>
        </View>
        <Text
          style={[
            styles.heroMeta,
            { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
          ]}
        >
          {networkPulse.connectionsPerEvent.toFixed(1)} per event
        </Text>
      </View>

      {visibleSpeakerMatches.length > 0 ? (
        <View style={styles.footerRow}>
          <View style={styles.avatarStack}>
            {visibleSpeakerMatches.map((match, index) => (
              <Pressable
                key={`${match.speaker.id}-${index}`}
                onPress={() => onOpenSpeaker?.(match.speaker.id)}
                style={({ pressed }) => [
                  styles.avatarWrap,
                  {
                    marginLeft: index === 0 ? 0 : -10,
                  },
                  pressed && styles.avatarPressed,
                ]}
              >
                <CommunityAvatar
                  avatarUrl={match.speaker.photoUrl}
                  name={match.speaker.name}
                  size={28}
                />
              </Pressable>
            ))}
          </View>
          <Text
            style={[
              styles.footerText,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
            numberOfLines={2}
          >
            {footerText}
          </Text>
        </View>
      ) : (
        <View style={styles.footerRow}>
          <View
            style={[
              styles.footerDot,
              { backgroundColor: tokens.colors.textTertiary },
            ]}
          />
          <Text
            style={[
              styles.footerText,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
            numberOfLines={2}
          >
            {footerText}
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
    gap: 12,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  ratioBadge: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  ratioText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroMetricBlock: {
    gap: 4,
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroValue: {
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  heroLabel: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  heroMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.82,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 1,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
