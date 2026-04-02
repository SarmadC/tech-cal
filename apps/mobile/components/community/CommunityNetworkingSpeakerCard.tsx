import { FontAwesome } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileCommunityNetworkingEvent } from "@kurecal/domain";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { getSafeExternalUrl } from "@/components/community/presentation";
import { useAppTheme } from "@/providers/ThemeProvider";

type SpeakerPreview = NonNullable<
  MobileCommunityNetworkingEvent["speakerPreview"]
>[number];

interface CommunityNetworkingSpeakerCardProps {
  speaker: SpeakerPreview;
  onOpenSpeaker?: () => void;
}

function getSpeakerHeadline(speaker: SpeakerPreview): string {
  const parts = [speaker.title, speaker.company].filter(Boolean);
  return parts.join(" · ") || "Event speaker";
}

function getExternalAction(speaker: SpeakerPreview): {
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
  url: string;
} | null {
  const linkedinUrl = getSafeExternalUrl(speaker.linkedinUrl);
  if (linkedinUrl) {
    return {
      label: "LinkedIn",
      icon: "linkedin-square",
      url: linkedinUrl,
    };
  }

  const twitterUrl = getSafeExternalUrl(speaker.twitterUrl);
  if (twitterUrl) {
    return {
      label: "Twitter",
      icon: "twitter",
      url: twitterUrl,
    };
  }

  const websiteUrl = getSafeExternalUrl(speaker.websiteUrl);
  if (websiteUrl) {
    return {
      label: "Website",
      icon: "external-link",
      url: websiteUrl,
    };
  }

  return null;
}

export function CommunityNetworkingSpeakerCard({
  speaker,
  onOpenSpeaker,
}: CommunityNetworkingSpeakerCardProps) {
  const { tokens } = useAppTheme();
  const externalAction = getExternalAction(speaker);

  return (
    <View
      testID="community-speaker-card-row"
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.divider,
          borderRadius: tokens.radius.md,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.mode === "dark" ? 0.05 : 0.03,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={`Open speaker ${speaker.name}`}
        accessibilityRole="button"
        onPress={onOpenSpeaker}
        style={({ pressed }) => [
          styles.primaryPressTarget,
          {
            borderRadius: tokens.radius.md,
          },
          pressed && styles.pressed,
        ]}
      >
        <View testID="community-speaker-card-avatar" style={styles.avatarWrap}>
          <CommunityAvatar
            avatarUrl={speaker.photoUrl}
            name={speaker.name}
            size={58}
          />
        </View>

        <View style={styles.copy}>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 18,
              lineHeight: 22,
              fontWeight: "800",
              letterSpacing: -0.4,
            }}
          >
            {speaker.name}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              lineHeight: 18,
              fontWeight: "600",
            }}
          >
            {getSpeakerHeadline(speaker)}
          </Text>
        </View>
      </Pressable>

      {externalAction ? (
        <Pressable
          accessibilityLabel={`Open ${speaker.name} ${externalAction.label}`}
          accessibilityRole="button"
          onPress={() => {
            void Linking.openURL(externalAction.url);
          }}
          style={({ pressed }) => [
            styles.externalShortcut,
            {
              backgroundColor: tokens.colors.surfaceStrong,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.pill,
            },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome
            color={tokens.colors.textPrimary}
            name={externalAction.icon}
            size={12}
          />
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              lineHeight: 15,
              fontWeight: "700",
            }}
          >
            {externalAction.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  primaryPressTarget: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  externalShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.86,
  },
});
