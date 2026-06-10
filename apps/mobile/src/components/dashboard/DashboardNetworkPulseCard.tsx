import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  MobileCommunityNetworkingSpeakerMatch,
  MobileDashboardNetworkPulse,
} from "@kurecal/domain";

import { DashboardCard } from "./DashboardCard";
import { CommunityAvatar } from "../community/CommunityAvatar";
import { useAppTheme } from "../../providers/ThemeProvider";

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
  const { tokens } = useAppTheme();
  const connectionsLabel = `Connection${
    networkPulse.confirmedConnectionCount === 1 ? "" : "s"
  }`;
  const visibleSpeakerMatches = speakerMatches.slice(0, 2);
  const perEventValue =
    attendedEventCount > 0
      ? networkPulse.confirmedConnectionCount / attendedEventCount
      : 0;

  const onPress = networkPulse.nextContactToConfirm
    ? onOpenPendingContact
    : visibleSpeakerMatches.length > 0
      ? onOpenRecommendedSpeakers
      : undefined;

  return (
    <DashboardCard>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          { opacity: pressed && onPress ? 0.9 : 1 },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Your Network
        </Text>

        <Text
          style={[
            styles.heroValue,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {networkPulse.confirmedConnectionCount} {connectionsLabel}
        </Text>

        <View style={styles.footer}>
          <Text
            style={[
              styles.perEvent,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {perEventValue.toFixed(1)} Per Event
          </Text>
          {visibleSpeakerMatches.length > 0 ? (
            <View style={styles.avatarStack}>
              {visibleSpeakerMatches.map((match, index) => (
                <View
                  key={`${match.speaker.id}-${index}`}
                  style={[styles.avatarWrap, { marginLeft: index === 0 ? 0 : -8 }]}
                >
                  <CommunityAvatar
                    avatarUrl={match.speaker.photoUrl}
                    name={match.speaker.name}
                    size={32}
                  />
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
    letterSpacing: 0,
  },
  heroValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  perEvent: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
  },
});
