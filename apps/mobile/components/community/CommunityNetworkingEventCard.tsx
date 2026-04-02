import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { MobileCommunityNetworkingEvent } from "@kurecal/domain";
import { CommunityAvatarStack } from "@/components/community/CommunityAvatarStack";
import {
  formatCommunityCompactCount,
  formatCommunityEventDay,
  formatNetworkingLocation,
} from "@/components/community/presentation";
import { useAppTheme } from "@/providers/ThemeProvider";

const fallbackHeaderImage = require("../../assets/community/event-fallback.jpg");

interface CommunityNetworkingEventCardProps {
  event: MobileCommunityNetworkingEvent;
  featured?: boolean;
  onOpenEvent?: () => void;
}

const EVENT_TONES = {
  intro: {
    light: {
      border: "rgba(37, 99, 235, 0.18)",
      headerOverlay: "rgba(8, 17, 31, 0.18)",
      body: "#21356F",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#F8FAFC",
      bodyMeta: "rgba(191, 219, 254, 0.84)",
      bodyCopy: "rgba(226, 232, 240, 0.86)",
      overflowText: "rgba(203, 213, 225, 0.82)",
    },
    dark: {
      border: "rgba(96, 165, 250, 0.24)",
      headerOverlay: "rgba(8, 17, 31, 0.18)",
      body: "#21356F",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#F8FAFC",
      bodyMeta: "rgba(191, 219, 254, 0.84)",
      bodyCopy: "rgba(226, 232, 240, 0.86)",
      overflowText: "rgba(203, 213, 225, 0.82)",
    },
  },
  social: {
    light: {
      border: "rgba(16, 185, 129, 0.18)",
      headerOverlay: "rgba(5, 22, 18, 0.18)",
      body: "#184C42",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#F0FDF4",
      bodyMeta: "rgba(187, 247, 208, 0.84)",
      bodyCopy: "rgba(220, 252, 231, 0.84)",
      overflowText: "rgba(209, 250, 229, 0.82)",
    },
    dark: {
      border: "rgba(52, 211, 153, 0.24)",
      headerOverlay: "rgba(5, 22, 18, 0.18)",
      body: "#184C42",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#F0FDF4",
      bodyMeta: "rgba(187, 247, 208, 0.84)",
      bodyCopy: "rgba(220, 252, 231, 0.84)",
      overflowText: "rgba(209, 250, 229, 0.82)",
    },
  },
  buzz: {
    light: {
      border: "rgba(245, 158, 11, 0.18)",
      headerOverlay: "rgba(28, 16, 5, 0.18)",
      body: "#5E3A12",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#FFF7ED",
      bodyMeta: "rgba(253, 230, 138, 0.84)",
      bodyCopy: "rgba(254, 243, 199, 0.82)",
      overflowText: "rgba(254, 215, 170, 0.82)",
    },
    dark: {
      border: "rgba(251, 191, 36, 0.22)",
      headerOverlay: "rgba(28, 16, 5, 0.18)",
      body: "#5E3A12",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#FFF7ED",
      bodyMeta: "rgba(253, 230, 138, 0.84)",
      bodyCopy: "rgba(254, 243, 199, 0.82)",
      overflowText: "rgba(254, 215, 170, 0.82)",
    },
  },
  saved: {
    light: {
      border: "rgba(71, 85, 105, 0.16)",
      headerOverlay: "rgba(8, 17, 31, 0.18)",
      body: "#243055",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#F8FAFC",
      bodyMeta: "rgba(191, 219, 254, 0.84)",
      bodyCopy: "rgba(226, 232, 240, 0.86)",
      overflowText: "rgba(203, 213, 225, 0.82)",
    },
    dark: {
      border: "rgba(148, 163, 184, 0.18)",
      headerOverlay: "rgba(8, 17, 31, 0.18)",
      body: "#243055",
      bodyTopBorder: "rgba(255, 255, 255, 0.06)",
      bodyTitle: "#F8FAFC",
      bodyMeta: "rgba(191, 219, 254, 0.84)",
      bodyCopy: "rgba(226, 232, 240, 0.86)",
      overflowText: "rgba(203, 213, 225, 0.82)",
    },
  },
} as const;

function getProofLine(event: MobileCommunityNetworkingEvent): string {
  if (event.relationshipAttendeeCount > 0) {
    return `${formatCommunityCompactCount(event.relationshipAttendeeCount)} ${event.relationshipAttendeeCount === 1 ? "person you know" : "people you know"} here`;
  }

  if (event.networkAttendingCount > 0) {
    return `${formatCommunityCompactCount(event.networkAttendingCount)} from your network here`;
  }

  if (event.visibleAttendeeCount > 0) {
    return `${formatCommunityCompactCount(event.visibleAttendeeCount)} visible attendees`;
  }

  if ((event.speakerPreview?.length ?? 0) > 0) {
    return `${formatCommunityCompactCount(event.speakerPreview?.length ?? 0)} speakers announced`;
  }

  if ((event.recentTrackerCount ?? 0) > 0) {
    return `${formatCommunityCompactCount(event.recentTrackerCount ?? 0)} tracking this week`;
  }

  return "Signal building";
}

function getProofOverflowCount(
  event: MobileCommunityNetworkingEvent,
  previewCount: number,
): number {
  if (event.attendeePreview.length > 0) {
    return Math.max(0, event.visibleAttendeeCount - previewCount);
  }

  if ((event.speakerPreview?.length ?? 0) > 0) {
    return Math.max(0, (event.speakerPreview?.length ?? 0) - previewCount);
  }

  return 0;
}

function getEventTone(
  event: MobileCommunityNetworkingEvent,
  mode: "light" | "dark",
) {
  if (event.relationshipAttendeeCount > 0 || event.networkAttendingCount > 0) {
    return EVENT_TONES.intro[mode];
  }

  if (event.visibleAttendeeCount > 0) {
    return EVENT_TONES.social[mode];
  }

  if ((event.recentTrackerCount ?? 0) > 0 || event.contextLabel) {
    return EVENT_TONES.buzz[mode];
  }

  return EVENT_TONES.saved[mode];
}

function formatPosterDateLine(event: MobileCommunityNetworkingEvent): string {
  const dateParts = formatCommunityEventDay(event.startTime);
  return `${dateParts.month} ${dateParts.day}`;
}

function getSupportingCopy(event: MobileCommunityNetworkingEvent): string | null {
  if (event.attendeePreview.length > 0) {
    return null;
  }

  if ((event.speakerPreview?.length ?? 0) > 0) {
    return `${formatCommunityCompactCount(event.speakerPreview?.length ?? 0)} announced speakers give this a clearer entry point`;
  }

  if ((event.recentTrackerCount ?? 0) > 0) {
    return `${formatCommunityCompactCount(event.recentTrackerCount ?? 0)} people tracked this event this week`;
  }

  return null;
}

export function CommunityNetworkingEventCard({
  event,
  featured = false,
  onOpenEvent,
}: CommunityNetworkingEventCardProps) {
  const { tokens } = useAppTheme();
  const tone = getEventTone(event, tokens.mode);
  const [imageUri, setImageUri] = useState<string | null>(event.imageUrl ?? null);
  const supportingCopy = getSupportingCopy(event);
  const posterDate = formatPosterDateLine(event);
  const posterLocation = formatNetworkingLocation(event.location, event.format);
  const proofPeople = event.attendeePreview.map((person) => ({
    id: person.id,
    fullName: person.fullName,
    avatarUrl: person.avatarUrl,
  }));
  const proofOverflowCount = getProofOverflowCount(event, proofPeople.length);

  useEffect(() => {
    setImageUri(event.imageUrl ?? null);
  }, [event.imageUrl]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open event ${event.title}`}
      onPress={onOpenEvent}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: tone.border,
          borderRadius: tokens.radius.lg,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: featured ? (tokens.mode === "dark" ? 0.16 : 0.08) : 0,
          shadowRadius: featured ? 18 : 0,
          shadowOffset: featured ? { width: 0, height: 10 } : { width: 0, height: 0 },
          elevation: featured ? 5 : 0,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            height: featured ? 206 : 188,
          },
        ]}
        testID="community-event-card-image"
      >
        <Image
          source={imageUri ? { uri: imageUri } : fallbackHeaderImage}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={imageUri ? () => setImageUri(null) : undefined}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: tone.headerOverlay,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.body,
          {
            backgroundColor: tone.body,
            borderTopColor: tone.bodyTopBorder,
          },
        ]}
      >
        <View testID="community-event-card-metadata" style={styles.posterMetaRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.posterMeta,
              styles.posterMetaLocation,
              {
                color: tone.bodyMeta,
                fontFamily: tokens.typography.mono,
              },
            ]}
          >
            {posterLocation}
          </Text>
          <Text
            style={[
              styles.posterMeta,
              styles.posterMetaDate,
              {
                color: tone.bodyMeta,
                fontFamily: tokens.typography.mono,
              },
            ]}
          >
            {posterDate}
          </Text>
        </View>

        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          numberOfLines={1}
          style={[
            styles.posterTitle,
            {
              color: tone.bodyTitle,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.title.toUpperCase()}
        </Text>

        {supportingCopy ? (
          <Text
            numberOfLines={2}
            style={{
              color: tone.bodyCopy,
              fontFamily: tokens.typography.sans,
              fontSize: 15,
              lineHeight: 22,
              fontWeight: "600",
            }}
          >
            {supportingCopy}
          </Text>
        ) : null}

        {proofPeople.length > 0 ? (
          <View
            accessibilityLabel={getProofLine(event)}
            testID="community-event-card-proof-row"
            style={styles.footerRow}
          >
            <>
              <CommunityAvatarStack
                people={proofPeople}
                max={featured ? 4 : 3}
                size={featured ? 30 : 26}
              />
              {proofOverflowCount > 0 ? (
                <Text
                  style={{
                    color: tone.overflowText,
                    fontFamily: tokens.typography.sans,
                    fontSize: 14,
                    lineHeight: 18,
                    fontWeight: "700",
                  }}
                >
                  +{formatCommunityCompactCount(proofOverflowCount)}
                </Text>
              ) : null}
            </>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
  },
  header: {},
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 8,
    borderTopWidth: 1,
  },
  posterMeta: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  posterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  posterMetaLocation: {
    flex: 1,
    minWidth: 0,
  },
  posterMetaDate: {
    flexShrink: 0,
  },
  posterTitle: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "300",
    letterSpacing: -0.7,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    marginTop: 10,
    minHeight: 30,
  },
  pressed: {
    opacity: 0.88,
  },
});
