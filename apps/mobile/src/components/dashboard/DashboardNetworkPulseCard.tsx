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
  attendedEventCount = 0,
  speakerMatches = [],
  onOpenRecommendedSpeakers,
  onOpenPendingContact,
}: {
  networkPulse: MobileDashboardNetworkPulse;
  attendedEventCount?: number;
  speakerMatches?: MobileCommunityNetworkingSpeakerMatch[];
  onOpenRecommendedSpeakers?: () => void;
  onOpenPendingContact?: () => void;
}) {
  const { tokens, resolvedTheme } = useAppTheme();
  const cardFill =
    resolvedTheme === 'light'
      ? '#F5DDD2'
      : 'rgba(44, 27, 22, 0.98)';
  const totalConnectionsLabel = `connection${
    networkPulse.confirmedConnectionCount === 1 ? '' : 's'
  }`;
  const visibleSpeakerMatches = speakerMatches.slice(0, 3);
  const perEventValue =
    attendedEventCount > 0
      ? networkPulse.confirmedConnectionCount / attendedEventCount
      : 0;
  const footerText = networkPulse.nextContactToConfirm
    ? `Confirm with ${networkPulse.nextContactToConfirm.name}`
    : visibleSpeakerMatches.length > 0
    ? `${visibleSpeakerMatches.length} speaker intro${
        visibleSpeakerMatches.length === 1 ? '' : 's'
      } ready`
    : 'Open a speaker or profile to start tracking connections';
  const footerMeta = networkPulse.nextContactToConfirm
    ? networkPulse.nextContactToConfirm.sourceEvent?.title
      ? `Requested after ${networkPulse.nextContactToConfirm.sourceEvent.title}`
      : networkPulse.nextContactToConfirm.kind === 'speaker'
        ? 'Speaker request still pending'
        : 'Profile request still pending'
    : visibleSpeakerMatches.length > 0
    ? 'Suggested from your event graph'
    : 'Suggested from your saved events';
  const insightActionLabel = networkPulse.nextContactToConfirm
    ? 'Confirm'
    : visibleSpeakerMatches.length > 0
      ? 'Open'
      : null;
  const insightAction =
    networkPulse.nextContactToConfirm && onOpenPendingContact
      ? onOpenPendingContact
      : visibleSpeakerMatches.length > 0
        ? onOpenRecommendedSpeakers
        : undefined;
  const insightSurfaceColor =
    resolvedTheme === 'light' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.04)';
  const glyphActiveColor = resolvedTheme === 'light' ? '#059669' : '#34D399';
  const actionAccentColor =
    insightActionLabel === 'Open'
      ? resolvedTheme === 'light'
        ? '#C2410C'
        : '#FDBA74'
      : glyphActiveColor;

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
        <View style={styles.headerMetric}>
          <Text
            style={[
              styles.headerValue,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
          >
            {perEventValue.toFixed(1)}
          </Text>
          <Text
            style={[
              styles.headerMeta,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
          >
            per event
          </Text>
        </View>
      </View>

      <View style={styles.heroSection}>
        <Text
          style={[
            styles.heroValue,
            { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
          ]}
        >
          {networkPulse.confirmedConnectionCount} {totalConnectionsLabel}
        </Text>
      </View>

      <Pressable
        disabled={!insightAction}
        onPress={insightAction}
        style={({ pressed }) => [
          styles.insightStrip,
          {
            borderTopColor:
              resolvedTheme === 'light'
                ? 'rgba(15, 23, 42, 0.08)'
                : 'rgba(255, 255, 255, 0.06)',
            backgroundColor: pressed && insightAction ? insightSurfaceColor : 'transparent',
            opacity: pressed && insightAction ? 0.96 : 1,
          },
        ]}
      >
        {!networkPulse.nextContactToConfirm && visibleSpeakerMatches.length > 0 ? (
          <View style={styles.avatarStack}>
            {visibleSpeakerMatches.slice(0, 2).map((match, index) => (
              <View
                key={`${match.speaker.id}-${index}`}
                style={[
                  styles.avatarWrap,
                  {
                    marginLeft: index === 0 ? 0 : -8,
                  },
                ]}
              >
                <CommunityAvatar
                  avatarUrl={match.speaker.photoUrl}
                  name={match.speaker.name}
                  size={26}
                />
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.footerDot,
              { backgroundColor: glyphActiveColor },
            ]}
          />
        )}

        <View style={styles.insightTextBlock}>
          <Text
            style={[
              styles.footerText,
              { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
            ]}
            numberOfLines={1}
          >
            {footerText}
          </Text>
          <Text
            style={[
              styles.footerMeta,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
            numberOfLines={1}
          >
            {footerMeta}
          </Text>
        </View>
        {insightActionLabel ? (
          <Text
            style={[
              styles.insightAction,
              { color: actionAccentColor, fontFamily: tokens.typography.sans },
            ]}
          >
            {insightActionLabel}
          </Text>
        ) : null}
      </Pressable>
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
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  headerMetric: {
    alignItems: 'flex-end',
  },
  headerValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  heroSection: {
    alignItems: 'flex-start',
    minHeight: 18,
  },
  heroValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  insightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    minHeight: 48,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
  },
  avatarWrap: {
    position: 'relative',
  },
  insightTextBlock: {
    flex: 1,
    gap: 2,
  },
  insightAction: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  footerMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
});
