import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { HeaderActionButton } from "@/components/chrome/MobilePage";
import { KureScreen } from "@/components/chrome/KureScreen";
import { ScreenState } from "@/components/chrome/ScreenState";
import { CommunityAvatar } from "@/components/community/CommunityAvatar";
import { CommunitySection } from "@/components/community/CommunitySection";
import { CommunityUpcomingEventRow } from "@/components/community/CommunityUpcomingEventRow";
import {
  formatCommunityTabCount,
  formatNetworkingLocation,
  getSafeExternalUrl,
} from "@/components/community/presentation";
import { getMobileApiClient } from "@/lib/mobileApi";
import { mobileQueryKeys } from "@/lib/queryKeys";
import { mobileQueryStaleTimes } from "@/lib/queryClient";
import { useAppTheme } from "@/providers/ThemeProvider";

function getSpeakerHeadline(title: string | null, company: string | null): string {
  const parts = [title, company].filter(Boolean);
  return parts.join(" · ") || "Speaker";
}

function getSpeakerEventMeta(location: string | null, format: string | null, isPastEvent: boolean): string {
  const locationLine = formatNetworkingLocation(location, format);
  return isPastEvent ? `Past event · ${locationLine}` : locationLine;
}

function getSocialLinks(speaker: {
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
}) {
  const linkedinUrl = getSafeExternalUrl(speaker.linkedinUrl);
  const twitterUrl = getSafeExternalUrl(speaker.twitterUrl);
  const websiteUrl = getSafeExternalUrl(speaker.websiteUrl);

  return [
    linkedinUrl
      ? { label: "LinkedIn", icon: "linkedin-square" as const, url: linkedinUrl }
      : null,
    twitterUrl
      ? { label: "Twitter", icon: "twitter" as const, url: twitterUrl }
      : null,
    websiteUrl
      ? { label: "Website", icon: "external-link" as const, url: websiteUrl }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    icon: keyof typeof FontAwesome.glyphMap;
    url: string;
  }>;
}

export default function SpeakerScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const resolvedId = Array.isArray(id) ? id[0] : id;
  const apiClient = getMobileApiClient();
  const { tokens } = useAppTheme();

  const speakerQuery = useQuery({
    queryKey: mobileQueryKeys.speaker.detail(resolvedId),
    enabled: Boolean(resolvedId),
    staleTime: mobileQueryStaleTimes.live,
    queryFn: async () => {
      const result = await apiClient.getSpeaker(resolvedId!);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Unable to load this speaker.");
      }

      return result.data;
    },
  });

  const speaker = speakerQuery.data;
  const socialLinks = speaker ? getSocialLinks(speaker) : [];

  return (
    <KureScreen
      title="Speaker"
      subtitle="Speaker profile and event context."
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
    >
      <View style={styles.contentWrap}>
        {speakerQuery.isLoading && !speaker ? (
          <ScreenState
            mode="loading"
            title="Loading speaker"
            description="Pulling bio, links, and speaking events."
          />
        ) : null}

        {speakerQuery.isError && !speaker ? (
          <ScreenState
            mode="error"
            title="Speaker unavailable"
            description={
              speakerQuery.error instanceof Error
                ? speakerQuery.error.message
                : "This speaker could not be loaded right now."
            }
          />
        ) : null}

        {speaker ? (
          <>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.lg,
                },
              ]}
            >
              <View
                style={[
                  styles.heroHeader,
                  {
                    borderRadius: tokens.radius.lg,
                    backgroundColor: tokens.mode === "dark" ? "#171B25" : "#1F2430",
                  },
                ]}
              >
                {speaker.photoUrl ? (
                  <ImageBackground
                    source={{ uri: speaker.photoUrl }}
                    style={StyleSheet.absoluteFillObject}
                    imageStyle={{ borderRadius: tokens.radius.lg }}
                    testID="speaker-detail-photo"
                  >
                    <LinearGradient
                      colors={["rgba(15, 23, 42, 0.12)", "rgba(15, 23, 42, 0.7)"]}
                      end={{ x: 0.8, y: 1 }}
                      start={{ x: 0.2, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </ImageBackground>
                ) : (
                  <LinearGradient
                    colors={
                      tokens.mode === "dark"
                        ? ["#161B26", "#232A3B"]
                        : ["#232837", "#2F3648"]
                    }
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
              </View>

              <View
                style={[
                  styles.avatarWrap,
                  {
                    backgroundColor: tokens.colors.surface,
                    borderRadius: 52,
                    borderColor: tokens.colors.surface,
                  },
                ]}
              >
                <CommunityAvatar avatarUrl={speaker.photoUrl} name={speaker.name} size={88} />
              </View>

              <View style={styles.heroBody}>
                <Text
                  style={{
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 26,
                    lineHeight: 30,
                    fontWeight: "800",
                    letterSpacing: -0.7,
                  }}
                >
                  {speaker.name}
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 15,
                    lineHeight: 21,
                    fontWeight: "600",
                  }}
                >
                  {getSpeakerHeadline(speaker.title, speaker.company)}
                </Text>
                {speaker.bio ? (
                  <Text
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 14,
                      lineHeight: 21,
                      fontWeight: "500",
                    }}
                  >
                    {speaker.bio}
                  </Text>
                ) : null}

                {socialLinks.length > 0 ? (
                  <View style={styles.linkRow}>
                    {socialLinks.map((link) => (
                      <Pressable
                        key={link.label}
                        accessibilityLabel={`Open ${speaker.name} ${link.label}`}
                        accessibilityRole="button"
                        onPress={() => {
                          void Linking.openURL(link.url);
                        }}
                        style={({ pressed }) => [
                          styles.linkButton,
                          {
                            backgroundColor: tokens.colors.surfaceStrong,
                            borderColor: tokens.colors.border,
                            borderRadius: tokens.radius.pill,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <FontAwesome name={link.icon} size={13} color={tokens.colors.textPrimary} />
                        <Text
                          style={{
                            color: tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {link.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>

            <CommunitySection
              title="Speaking events"
              meta={`${formatCommunityTabCount(speaker.events.length)} events`}
            >
              <View style={styles.sectionInner}>
                {speaker.events.length > 0 ? (
                  <View
                    style={[
                      styles.eventList,
                      {
                        backgroundColor: tokens.colors.surfaceStrong,
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.md,
                      },
                    ]}
                  >
                    {speaker.events.map((event, index) => (
                      <CommunityUpcomingEventRow
                        key={event.id}
                        title={event.title}
                        startTime={event.startTime}
                        meta={getSpeakerEventMeta(event.location, event.format, event.isPastEvent)}
                        onPress={() => router.push(`/event/${event.id}`)}
                        showDivider={index < speaker.events.length - 1}
                      />
                    ))}
                  </View>
                ) : (
                  <ScreenState
                    mode="empty"
                    title="No event context yet"
                    description="Speaking events will appear here when they are available."
                    variant="plain"
                  />
                )}
              </View>
            </CommunitySection>
          </>
        ) : null}
      </View>
    </KureScreen>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    gap: 14,
  },
  heroCard: {
    overflow: "hidden",
    borderWidth: 1,
  },
  heroHeader: {
    height: 196,
    overflow: "hidden",
  },
  avatarWrap: {
    position: "absolute",
    top: 138,
    left: 18,
    padding: 4,
    borderWidth: 1,
  },
  heroBody: {
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 44,
    paddingBottom: 18,
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 4,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  sectionInner: {
    padding: 16,
    gap: 10,
  },
  eventList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.86,
  },
});
