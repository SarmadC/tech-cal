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
  onOpenPendingContact,
}: {
  networkPulse: MobileDashboardNetworkPulse;
  speakerMatches?: MobileCommunityNetworkingSpeakerMatch[];
  onOpenSpeaker?: (
    speakerId: string,
    eventId?: string,
    eventTitle?: string
  ) => void;
  onOpenPendingContact?: () => void;
}) {
  const { tokens, resolvedTheme } = useAppTheme();
  const cardFill =
    resolvedTheme === 'light'
      ? '#D8F1E4'
      : 'rgba(13, 34, 24, 0.98)';
  const totalConnectionsLabel = `connection${
    networkPulse.confirmedConnectionCount === 1 ? '' : 's'
  }`;
  const visibleSpeakerMatches = speakerMatches.slice(0, 3);
  const stateLabel =
    networkPulse.pendingRequestCount > 0 &&
    networkPulse.confirmedConnectionCount === 0
      ? 'Requests pending'
      : networkPulse.confirmedConnectionCount === 0
      ? 'No momentum yet'
      : networkPulse.pendingRequestCount > 0
        ? 'Follow up now'
        : networkPulse.confirmedConnectionCount >= 3
          ? 'Connections growing'
          : 'Building momentum';
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
    ? 'Recommended from your event graph'
    : 'Requests and confirmed connections update this card';
  const insightSurfaceColor =
    resolvedTheme === 'light' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.05)';
  const chipBackgroundColor =
    resolvedTheme === 'light' ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.08)';
  const chipBorderColor =
    resolvedTheme === 'light' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(52, 211, 153, 0.16)';
  const glyphActiveColor = resolvedTheme === 'light' ? '#059669' : '#34D399';

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
              backgroundColor: chipBackgroundColor,
              borderColor: chipBorderColor,
            },
          ]}
        >
          <Text
            style={[
              styles.ratioText,
              { color: glyphActiveColor, fontFamily: tokens.typography.sans },
            ]}
          >
            {stateLabel}
          </Text>
        </View>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.heroMetricBlock}>
          <View style={styles.heroMetricRow}>
            <Text
              style={[
                styles.heroValue,
                { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
              ]}
            >
              {networkPulse.confirmedConnectionCount}
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
            {networkPulse.pendingRequestCount > 0
              ? `${networkPulse.pendingRequestCount} request${
                  networkPulse.pendingRequestCount === 1 ? '' : 's'
                } pending`
              : networkPulse.confirmedConnectionCount > 0
                ? 'Confirmed relationships tracked here'
                : 'No confirmed connections yet'}
          </Text>
        </View>
      </View>

      <Pressable
        disabled={!onOpenPendingContact || !networkPulse.nextContactToConfirm}
        onPress={onOpenPendingContact}
        style={({ pressed }) => [
          styles.insightStrip,
          {
            backgroundColor: insightSurfaceColor,
            borderColor: resolvedTheme === 'light'
              ? 'rgba(15, 23, 42, 0.05)'
              : 'rgba(255, 255, 255, 0.04)',
            opacity:
              pressed &&
              onOpenPendingContact &&
              networkPulse.nextContactToConfirm
                ? 0.92
                : 1,
          },
        ]}
      >
        {!networkPulse.nextContactToConfirm && visibleSpeakerMatches.length > 0 ? (
          <View style={styles.avatarStack}>
            {visibleSpeakerMatches.slice(0, 2).map((match, index) => (
              <Pressable
                key={`${match.speaker.id}-${index}`}
                onPress={() =>
                  onOpenSpeaker?.(match.speaker.id, match.event.id, match.event.title)
                }
                style={({ pressed }) => [
                  styles.avatarWrap,
                  {
                    marginLeft: index === 0 ? 0 : -8,
                  },
                  pressed && styles.avatarPressed,
                ]}
              >
                <CommunityAvatar
                  avatarUrl={match.speaker.photoUrl}
                  name={match.speaker.name}
                  size={26}
                />
              </Pressable>
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
        {networkPulse.nextContactToConfirm && onOpenPendingContact ? (
          <Text
            style={[
              styles.insightAction,
              { color: glyphActiveColor, fontFamily: tokens.typography.sans },
            ]}
          >
            Confirm
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
    gap: 12,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  ratioBadge: {
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  ratioText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  heroSection: {
    alignItems: 'flex-start',
  },
  heroMetricBlock: {
    gap: 2,
  },
  heroMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroValue: {
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -1.8,
  },
  heroLabel: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
  },
  heroMeta: {
    fontSize: 13,
    lineHeight: 16,
  },
  insightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 44,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.82,
  },
  insightTextBlock: {
    flex: 1,
    gap: 1,
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
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  footerMeta: {
    fontSize: 11,
    lineHeight: 14,
  },
});
