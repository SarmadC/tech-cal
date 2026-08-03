import { FontAwesome } from '@expo/vector-icons';
import Animated from "react-native-reanimated";
import type {
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityNetworkingPersonCard,
  MobileCommunityNetworkingSharedEvent,
} from '@kurecal/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { useScalePress } from '../../hooks/useAnimation';
import { CommunityFollowButton } from './CommunityFollowButton';
import { CommunityProfileHeroBlock } from './CommunityProfileHeroBlock';
import {
  formatCommunityCompactCount,
  formatFollowUpRecency,
  formatMutualConnectionsLabel,
  formatNetworkingEventDate,
  formatViewerContextLabel,
  getNetworkingDisplayName,
  getNetworkingProfileSnippet,
  getNetworkingRelationshipLabels,
  getNetworkingRoleSummary,
} from './presentation';

interface CommunityNetworkingPersonCardProps {
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard;
  mode: 'meet' | 'follow-up';
  isFollowing: boolean;
  isPending?: boolean;
  onToggleFollow?: () => void;
  onOpenProfile?: () => void;
  onOpenEvent?: (eventId: string) => void;
}

function getPrimaryEvent(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard
): MobileCommunityNetworkingSharedEvent | null {
  return person.strongestSharedEvent ?? person.sharedEvents[0] ?? null;
}

function getFooterLabel(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard,
  mode: 'meet' | 'follow-up'
): string {
  if (mode === 'meet') {
    const meetPerson = person as MobileCommunityNetworkingPersonCard;
    return `${formatCommunityCompactCount(meetPerson.sharedUpcomingEventCount)} shared event${meetPerson.sharedUpcomingEventCount === 1 ? '' : 's'}`;
  }

  const followUpPerson = person as MobileCommunityNetworkingFollowUpCard;
  return formatFollowUpRecency(followUpPerson.mostRecentSharedEventStartTime);
}

function getHeroBadges(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard,
  mode: 'meet' | 'follow-up'
): string[] {
  const labels = getNetworkingRelationshipLabels(person);
  const primaryEvent = getPrimaryEvent(person);
  const badges: string[] = [];

  if (labels[0]) {
    badges.push(labels[0]);
  }

  if (mode === 'follow-up') {
    badges.push('Follow up');
  } else if ('sharedUpcomingEventCount' in person && person.sharedUpcomingEventCount > 1) {
    badges.push(
      `${formatCommunityCompactCount(person.sharedUpcomingEventCount)} shared events`
    );
  } else if (primaryEvent?.viewerContext) {
    badges.push(formatViewerContextLabel(primaryEvent.viewerContext));
  }

  return badges.slice(0, 2);
}

function getContextMeta(event: MobileCommunityNetworkingSharedEvent): string {
  const parts = [formatNetworkingEventDate(event.startTime)];

  if (event.format === 'virtual') {
    parts.push('Virtual');
  } else if (event.format === 'hybrid') {
    parts.push('Hybrid');
  } else if (event.location) {
    parts.push(event.location);
  }

  return parts.join(' · ');
}

export function CommunityNetworkingPersonCard({
  isFollowing,
  isPending = false,
  mode,
  onOpenEvent,
  onOpenProfile,
  onToggleFollow,
  person,
}: CommunityNetworkingPersonCardProps) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const displayName = getNetworkingDisplayName(person);
  const primaryEvent = getPrimaryEvent(person);
  const roleSummary = getNetworkingRoleSummary(person);
  const profileSnippet = getNetworkingProfileSnippet({
    bio: person.bio,
    currentRole: person.currentRole,
    headline: person.headline,
    company: person.company,
    whyNow: person.whyNow,
  });
  const badges = getHeroBadges(person, mode);
  const footerLabel = getFooterLabel(person, mode);
  const mutualLabel =
    person.mutualConnectionsCount > 0
      ? formatMutualConnectionsLabel(person.mutualConnectionsCount)
      : null;
  const footerSummary = [mutualLabel, footerLabel].filter(Boolean).join(' · ');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.divider,
          borderRadius: tokens.radius.lg,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.mode === 'dark' ? 0.08 : 0.04,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: tokens.mode === 'dark' ? 2 : 1,
        },
      ]}
    >
      <CommunityProfileHeroBlock
        accessibilityLabel={`Open profile ${displayName}`}
        action={
          onToggleFollow ? (
            <CommunityFollowButton
              accessibilityLabel={`${isFollowing ? 'Connected with' : 'Connect with'} ${displayName}`}
              appearance="default"
              copyVariant="connect"
              followsViewer={person.followsViewer}
              isFollowing={isFollowing}
              isPending={isPending}
              size="compact"
              showPlusIcon
              onPress={onToggleFollow}
            />
          ) : null
        }
        avatarUrl={person.avatarUrl}
        badges={badges}
        displayName={displayName}
        headline={roleSummary}
        onPress={onOpenProfile}
        size="card"
        summary={profileSnippet}
        toneInput={{
          currentRole: person.currentRole,
          company: person.company,
          seed: person.username,
          isMutualFollow: person.isMutualFollow,
          followsViewer: person.followsViewer,
          isInNetwork: person.isInNetwork,
        }}
      />

      {primaryEvent ? (
        <Pressable
          accessibilityLabel={`Open shared event ${primaryEvent.title}`}
          accessibilityRole="button"
          onPress={() => onOpenEvent?.(primaryEvent.id)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.contextRow, { borderTopColor: tokens.colors.divider }]}
        >
          <Animated.View style={[styles.contextInner, { transform: [{ scale }] }]}>
            <FontAwesome
              color={tokens.colors.textTertiary}
              name={mode === 'follow-up' ? 'refresh' : 'calendar-o'}
              size={13}
            />
            <View style={styles.contextCopy}>
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: '700',
                }}
              >
                {mode === 'follow-up'
                  ? `Met at ${primaryEvent.title}`
                  : primaryEvent.title}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: '600',
                }}
              >
                {getContextMeta(primaryEvent)}
              </Text>
            </View>
            <FontAwesome
              color={tokens.colors.textTertiary}
              name="chevron-right"
              size={13}
            />
          </Animated.View>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.footerRow,
          {
            borderTopColor: tokens.colors.divider,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '700',
          }}
        >
          {footerSummary}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  contextCopy: {
    flex: 1,
    gap: 2,
  },
  contextRow: {
    minHeight: 44,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  contextInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerRow: {
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
