import { FontAwesome } from "@expo/vector-icons";
import type { MobileCommunityNetworkingEvent } from "@kurecal/domain";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";
import { CommunityAvatar } from "./CommunityAvatar";
import { getSafeExternalUrl } from "./presentation";

type SpeakerPreview = NonNullable<
  MobileCommunityNetworkingEvent["speakerPreview"]
>[number];

interface CommunityNetworkingSpeakerCardProps {
  speaker: SpeakerPreview;
  eventTitle: string;
  matchReason: string;
  matchIndex?: number;
  compactReason?: string;
  isPastEvent?: boolean;
  showExternalShortcut?: boolean;
  variant?: "card" | "compact";
  onOpenSpeaker?: () => void;
  onOpenExternalLink?: (label: string, url: string) => void;
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

function splitInsightPhrases(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[,(/)]+/)
    .map((part) => part.replace(/\b(and|for|of|the)\b/gi, " ").trim())
    .map((part) => part.replace(/\s+/g, " "))
    .filter((part) => part.length >= 4)
    .filter(
      (part) =>
        !/^(senior|staff|lead|head|director|associate|principal|vp|chief|professor)$/i.test(
          part,
        ),
    );
}

function getDisplayReason(params: {
  eventTitle: string;
  matchIndex: number;
  matchReason: string;
  speaker: SpeakerPreview;
}): string | null {
  const trimmedReason = params.matchReason.trim();
  const genericReasonPatterns = [
    /^strong fit for your .+ lens\.?$/i,
    /^strong overlap with .+\.?$/i,
    /^useful for your .+ work\.?$/i,
    /^relevant to your .+\.?$/i,
    /^best fit for your .+ from .+\.?$/i,
    /^useful context for your .+ from .+\.?$/i,
    /^clear topic overlap in .+\.?$/i,
    /^most relevant to your current event trail in .+\.?$/i,
    /^.+ overlap\.?$/i,
  ];
  const isGenericReason = genericReasonPatterns.some((pattern) =>
    pattern.test(trimmedReason),
  );

  const titlePhrases = splitInsightPhrases(params.speaker.title);
  const eventPhrases = splitInsightPhrases(params.eventTitle).filter(
    (phrase) => !/^(summit|conference|forum|expo|meetup)$/i.test(phrase),
  );
  const primaryPhrase = titlePhrases[0] ?? eventPhrases[0] ?? null;
  const secondaryPhrase =
    titlePhrases.find((phrase) => phrase !== primaryPhrase) ??
    eventPhrases.find((phrase) => phrase !== primaryPhrase) ??
    null;

  if (!isGenericReason) {
    return trimmedReason;
  }

  return null;
}

export function CommunityNetworkingSpeakerCard({
  compactReason,
  eventTitle,
  isPastEvent = false,
  matchIndex = 0,
  matchReason,
  showExternalShortcut = true,
  onOpenSpeaker,
  onOpenExternalLink,
  speaker,
  variant = "card",
}: CommunityNetworkingSpeakerCardProps) {
  const { tokens } = useAppTheme();
  const externalAction = getExternalAction(speaker);
  const isCompact = variant === "compact";
  const isHero = !isCompact && matchIndex === 0;
  const displayReason = getDisplayReason({
    eventTitle,
    matchIndex,
    matchReason,
    speaker,
  });
  const compactMeta = displayReason?.trim() || "Recommended match";
  const showCompactReason = Boolean(compactReason?.trim());

  if (isCompact) {
    return (
      <Pressable
        accessibilityLabel={`Open speaker ${speaker.name}`}
        accessibilityRole="button"
        onPress={onOpenSpeaker}
        style={({ pressed }) => [
          styles.compactRow,
          {
            opacity: pressed ? 0.76 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.avatarFrame,
            styles.compactAvatarFrame,
            {
              borderColor: tokens.colors.border,
              backgroundColor: tokens.colors.surfaceMuted,
              borderRadius: 999,
            },
          ]}
        >
          <CommunityAvatar
            avatarUrl={speaker.photoUrl}
            name={speaker.name}
            size={38}
          />
        </View>
        <View style={styles.compactCopy}>
          <View style={styles.compactHeaderRow}>
            <View style={styles.compactTitleBlock}>
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 16,
                  lineHeight: 19,
                  fontWeight: "800",
                  letterSpacing: -0.3,
                }}
              >
                {speaker.name}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "600",
                }}
              >
                {getSpeakerHeadline(speaker)}
              </Text>
            </View>
            <FontAwesome
              color={tokens.colors.textTertiary}
              name="angle-right"
              size={16}
            />
          </View>
          {showCompactReason ? (
            <View style={styles.compactReasonRow}>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "700",
                }}
              >
                {compactReason ?? compactMeta}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`Open speaker ${speaker.name}`}
      accessibilityRole="button"
      onPress={onOpenSpeaker}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pressSurface,
            {
              borderRadius: tokens.radius.md,
              opacity: pressed ? 0.94 : 1,
              paddingHorizontal: 12,
              paddingVertical: 12,
            },
          ]}
        >
          <View style={styles.mainRow}>
            <View
              style={[
                styles.reason,
                {
                  borderColor: tokens.colors.border,
                  backgroundColor: tokens.colors.surfaceMuted,
                  borderRadius: 999,
                },
              ]}
            >
              <CommunityAvatar
                avatarUrl={speaker.photoUrl}
                name={speaker.name}
                size={isHero ? 58 : 46}
              />
            </View>
            <View style={styles.copy}>
              <View style={styles.nameRow}>
                <View style={styles.nameBlock}>
                  <Text
                    numberOfLines={isHero ? 2 : 1}
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 20 : 17,
                      lineHeight: isHero ? 24 : 20,
                      fontWeight: "800",
                      letterSpacing: isHero ? -0.5 : -0.35,
                    }}
                  >
                    {speaker.name}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 13 : 12,
                      lineHeight: isHero ? 18 : 17,
                      fontWeight: "600",
                    }}
                  >
                    {getSpeakerHeadline(speaker)}
                  </Text>
                </View>
                {showExternalShortcut && externalAction ? (
                  <Pressable
                    accessibilityLabel={`Open ${speaker.name} ${externalAction.label}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      if (onOpenExternalLink) {
                        onOpenExternalLink(
                          externalAction.label,
                          externalAction.url,
                        );
                        return;
                      }

                      void Linking.openURL(externalAction.url);
                    }}
                    style={({ pressed: externalPressed }) => [
                      styles.externalShortcut,
                      {
                        width: 32,
                        height: 32,
                        backgroundColor: tokens.colors.surfaceMuted,
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.md,
                        opacity: externalPressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <FontAwesome
                      color={tokens.colors.textPrimary}
                      name={externalAction.icon}
                      size={13}
                    />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.supportingBlock}>
                {displayReason ? (
                  <Text
                    numberOfLines={isHero ? 2 : 1}
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 14 : 13,
                      lineHeight: isHero ? 18 : 17,
                      fontWeight: "700",
                    }}
                  >
                    {displayReason}
                  </Text>
                ) : null}
                <View style={styles.eventRow}>
                  <FontAwesome
                    color={tokens.colors.accent}
                    name="calendar-o"
                    size={12}
                  />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 12 : 11,
                      lineHeight: isHero ? 16 : 15,
                      fontWeight: "700",
                    }}
                  >
                    {isPastEvent ? "Spoke at" : "Speaking at"} {eventTitle}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  compactCopy: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  compactHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  compactReasonRow: {
    paddingTop: 1,
  },
  compactTitleBlock: {
    flex: 1,
    gap: 1,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
  },
  pressSurface: {
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  externalShortcut: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  mainRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  supportingBlock: {
    gap: 4,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroAvatarFrame: {
    padding: 2,
  },
  compactAvatarFrame: {
    padding: 1,
  },
});
