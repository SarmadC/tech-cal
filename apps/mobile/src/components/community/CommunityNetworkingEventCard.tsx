import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileCommunityNetworkingEvent } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';
import { CommunityAvatarStack } from './CommunityAvatarStack';
import {
  formatCommunityCompactCount,
  formatCommunityEventDay,
  formatNetworkingLocation,
} from './presentation';

interface CommunityNetworkingEventCardProps {
  event: MobileCommunityNetworkingEvent;
  featured?: boolean;
  onOpenEvent?: () => void;
}

function getProofLine(event: MobileCommunityNetworkingEvent): string {
  if (event.relationshipAttendeeCount > 0) {
    return `${formatCommunityCompactCount(event.relationshipAttendeeCount)} ${event.relationshipAttendeeCount === 1 ? 'person you know' : 'people you know'} here`;
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

  return 'Signal building';
}

function getProofOverflowCount(
  event: MobileCommunityNetworkingEvent,
  previewCount: number
): number {
  if (event.attendeePreview.length > 0) {
    return Math.max(0, event.visibleAttendeeCount - previewCount);
  }

  if ((event.speakerPreview?.length ?? 0) > 0) {
    return Math.max(0, (event.speakerPreview?.length ?? 0) - previewCount);
  }

  return 0;
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
    const count = event.speakerPreview?.length ?? 0;
    return `${formatCommunityCompactCount(count)} ${count === 1 ? 'speaker' : 'speakers'} announced`;
  }

  if ((event.recentTrackerCount ?? 0) > 0) {
    const count = event.recentTrackerCount ?? 0;
    return `${formatCommunityCompactCount(count)} ${count === 1 ? 'person' : 'people'} tracked this week`;
  }

  return null;
}

export function CommunityNetworkingEventCard({
  event,
  featured = false,
  onOpenEvent,
}: CommunityNetworkingEventCardProps) {
  const { tokens } = useAppTheme();
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
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.lg,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.shadow.shadowOpacity,
          shadowRadius: tokens.shadow.shadowRadius,
          shadowOffset: tokens.shadow.shadowOffset,
          elevation: tokens.shadow.elevation,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            height: featured ? 200 : 168,
            backgroundColor: tokens.colors.surfaceMuted,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            onError={() => setImageUri(null)}
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.posterMetaRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.posterMeta,
              styles.posterMetaLocation,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
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
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {posterDate}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={[
            styles.posterTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.title}
        </Text>

        {supportingCopy ? (
          <Text
            numberOfLines={2}
            style={[
              styles.supportingCopy,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {supportingCopy}
          </Text>
        ) : null}

        {proofPeople.length > 0 ? (
          <View accessibilityLabel={getProofLine(event)} style={styles.footerRow}>
            <CommunityAvatarStack
              people={proofPeople}
              max={featured ? 4 : 3}
              size={featured ? 28 : 24}
            />
            {proofOverflowCount > 0 ? (
              <Text
                style={[
                  styles.overflowLabel,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                +{formatCommunityCompactCount(proofOverflowCount)}
              </Text>
            ) : null}
            <Text
              style={[
                styles.proofLine,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
              numberOfLines={1}
            >
              {getProofLine(event)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 28,
    paddingTop: 6,
  },
  header: {},
  overflowLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  posterMeta: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  posterMetaDate: {
    flexShrink: 0,
  },
  posterMetaLocation: {
    flex: 1,
    minWidth: 0,
  },
  posterMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  posterTitle: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.92,
  },
  proofLine: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    minWidth: 0,
  },
  supportingCopy: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
  },
});
