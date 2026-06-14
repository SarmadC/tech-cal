import { FontAwesome } from "@expo/vector-icons";
import type { MobileCommunityDirectoryPerson } from "@kurecal/domain";
import Animated from "react-native-reanimated";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useScalePress } from "../../hooks/useAnimation";
import { useAppTheme } from "../../providers/ThemeProvider";
import { CommunityFollowButton } from "./CommunityFollowButton";

interface CommunityDirectoryPersonCardProps {
  isPending?: boolean;
  onOpenProfile?: () => void;
  onToggleFollow?: () => void;
  person: MobileCommunityDirectoryPerson;
}

function getDisplayName(person: MobileCommunityDirectoryPerson) {
  return person.fullName || (person.username ? `@${person.username}` : "Community member");
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isSafeAvatarUrl(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

function getActivityLabel(person: MobileCommunityDirectoryPerson) {
  const labels: string[] = [];

  if (person.activity.sharedSavedEventCount > 0) {
    labels.push(`${person.activity.sharedSavedEventCount} shared saved`);
  }

  if (person.activity.attendingThisWeekCount > 0) {
    labels.push(`${person.activity.attendingThisWeekCount} this week`);
  }

  if (person.activity.sharedCircleCount > 0) {
    labels.push(`${person.activity.sharedCircleCount} shared circles`);
  }

  return labels.join(" · ") || `${person.followerCount} followers`;
}

export function CommunityDirectoryPersonCard({
  isPending = false,
  onOpenProfile,
  onToggleFollow,
  person,
}: CommunityDirectoryPersonCardProps) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const displayName = getDisplayName(person);
  const activityLabel = getActivityLabel(person);

  const profileContent = (
    <Animated.View style={[styles.profileInner, { transform: [{ scale }] }]}>
      {isSafeAvatarUrl(person.avatarUrl) ? (
        <Image source={{ uri: person.avatarUrl }} style={styles.avatar} />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.avatarFallback,
            { backgroundColor: tokens.colors.pillActive },
          ]}
        >
          <Text
            style={[
              styles.avatarInitials,
              {
                color: tokens.colors.pillActiveText,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {getInitials(displayName)}
          </Text>
        </View>
      )}
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={[
            styles.name,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {displayName}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.headline,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {person.headline || "Community member"}
        </Text>
        <View style={styles.metaRow}>
          <FontAwesome color={tokens.colors.textTertiary} name="users" size={12} />
          <Text
            numberOfLines={1}
            style={[
              styles.meta,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {activityLabel}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.divider,
          borderRadius: tokens.radius.lg,
        },
      ]}
    >
      <View style={styles.inner}>
        {onOpenProfile ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenProfile}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={styles.profilePressable}
          >
            {profileContent}
          </Pressable>
        ) : (
          <View style={styles.profilePressable}>{profileContent}</View>
        )}
        <CommunityFollowButton
          accessibilityLabel={`${person.activity.isViewerFollowing ? "Following" : "Follow"} ${displayName}`}
          appearance="default"
          copyVariant="follow"
          isFollowing={person.activity.isViewerFollowing}
          isPending={isPending}
          onPress={onToggleFollow}
          size="compact"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  inner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  profilePressable: {
    flex: 1,
    minWidth: 0,
  },
  profileInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    borderRadius: 26,
    height: 52,
    width: 52,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "800",
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  headline: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
