import { LinearGradient } from 'expo-linear-gradient';
import type {
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityNetworkingPersonCard,
} from '@kurecal/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CommunityAvatar } from '@/components/community/CommunityAvatar';
import { CommunityFollowButton } from '@/components/community/CommunityFollowButton';
import {
  formatMutualConnectionsLabel,
  formatFollowUpRecency,
  formatViewerContextLabel,
  getNetworkingDisplayName,
  getNetworkingRoleSummary,
  getNetworkingRelationshipLabels,
  getNetworkingWorkSummary,
} from '@/components/community/presentation';
import { useAppTheme } from '@/providers/ThemeProvider';

interface CommunityNetworkingSpotlightCardProps {
  person: MobileCommunityNetworkingPersonCard | MobileCommunityNetworkingFollowUpCard;
  mode: 'meet' | 'follow-up';
  isFollowing: boolean;
  isPending?: boolean;
  onToggleFollow?: () => void;
  onOpenProfile?: () => void;
}

function getContextBadge(
  person: MobileCommunityNetworkingPersonCard | MobileCommunityNetworkingFollowUpCard,
  mode: 'meet' | 'follow-up'
): string {
  const labels = getNetworkingRelationshipLabels(person);
  if (labels[0]) {
    return labels[0];
  }

  const event = person.strongestSharedEvent ?? person.sharedEvents[0];
  if (event?.viewerContext) {
    return formatViewerContextLabel(event.viewerContext);
  }

  if (mode === 'follow-up') {
    const followUpPerson = person as MobileCommunityNetworkingFollowUpCard;
    return formatFollowUpRecency(followUpPerson.mostRecentSharedEventStartTime);
  }

  return 'Suggested';
}

export function CommunityNetworkingSpotlightCard({
  person,
  mode,
  isFollowing,
  isPending = false,
  onToggleFollow,
  onOpenProfile,
}: CommunityNetworkingSpotlightCardProps) {
  const { tokens } = useAppTheme();
  const displayName = getNetworkingDisplayName(person);
  const strongestEvent = person.strongestSharedEvent ?? person.sharedEvents[0] ?? null;
  const roleSummary = getNetworkingRoleSummary(person);
  const workSummary = getNetworkingWorkSummary(person);
  const mutualLabel =
    person.mutualConnectionsCount > 0
      ? formatMutualConnectionsLabel(person.mutualConnectionsCount)
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.mode === 'dark' ? 0.16 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: tokens.mode === 'dark' ? 5 : 3,
        },
      ]}
    >
      <LinearGradient
        colors={
          tokens.mode === 'dark'
            ? ['rgba(30,41,59,0.94)', 'rgba(15,23,42,0.98)']
            : ['rgba(248,250,252,0.98)', 'rgba(239,246,255,0.96)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            borderRadius: tokens.radius.lg,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View suggested profile ${displayName}`}
          onPress={onOpenProfile}
          style={({ pressed }) => [styles.profileArea, pressed && styles.pressed]}
        >
          <CommunityAvatar
            name={person.fullName}
            avatarUrl={person.avatarUrl}
            size={74}
          />
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 19,
              lineHeight: 23,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            {displayName}
          </Text>
          {roleSummary ? (
            <Text
              numberOfLines={2}
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 14,
                lineHeight: 20,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {roleSummary}
            </Text>
          ) : null}
          {workSummary ? (
            <Text
              numberOfLines={1}
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                lineHeight: 17,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {workSummary}
            </Text>
          ) : null}
          {person.location ? (
            <Text
              numberOfLines={1}
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                lineHeight: 17,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {person.location}
            </Text>
          ) : null}
        </Pressable>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.pill,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.accent,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              lineHeight: 15,
              fontWeight: '800',
            }}
          >
            {getContextBadge(person, mode)}
          </Text>
        </View>

        {strongestEvent ? (
          <View style={styles.contextBlock}>
            <Text
              numberOfLines={1}
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                lineHeight: 18,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {strongestEvent.title}
            </Text>
            {mutualLabel ? (
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 12,
                  lineHeight: 18,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {mutualLabel}
              </Text>
            ) : null}
          </View>
        ) : mutualLabel ? (
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              lineHeight: 18,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {mutualLabel}
          </Text>
        ) : (
          <Text
            numberOfLines={2}
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              lineHeight: 18,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {person.whyNow}
          </Text>
        )}

        <CommunityFollowButton
          copyVariant="connect"
          size="compact"
          isFollowing={isFollowing}
          followsViewer={person.followsViewer}
          isPending={isPending}
          accessibilityLabel={`${isFollowing ? 'Connected with' : 'Connect with'} suggested ${displayName}`}
          onPress={onToggleFollow}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 216,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    alignItems: 'center',
  },
  profileArea: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  contextBlock: {
    gap: 2,
    width: '100%',
  },
  badge: {
    minHeight: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.84,
  },
});
