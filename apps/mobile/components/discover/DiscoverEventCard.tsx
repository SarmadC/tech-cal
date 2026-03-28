import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventCard } from '@kurecal/domain';
import { useAppTheme } from '@/providers/ThemeProvider';

interface DiscoverEventCardProps {
  event: MobileEventCard;
  onPress?: () => void;
  showDivider?: boolean;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function splitLocation(location: string | null | undefined) {
  const value = location?.trim();
  if (!value) {
    return null;
  }

  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[0] ?? value;
}

function resolveFormatLabel(event: MobileEventCard) {
  if (event.format === 'virtual') {
    return 'Virtual';
  }

  if (event.format === 'in-person') {
    return 'In person';
  }

  if (event.format === 'hybrid') {
    return 'Hybrid';
  }

  return event.formatLabel?.trim() || null;
}

function buildMetadataLine(event: MobileEventCard) {
  const dateLabel = formatDateLabel(event.startTime);
  const formatLabel = resolveFormatLabel(event);
  const locationLabel = splitLocation(event.location);
  const priceLabel = event.priceLabel?.trim() || null;
  const parts = [dateLabel];

  if (event.format === 'virtual') {
    if (formatLabel) {
      parts.push(formatLabel);
    }
  } else if (event.format === 'hybrid') {
    if (formatLabel) {
      parts.push(formatLabel);
    }
    if (locationLabel && locationLabel.toLowerCase() !== 'remote') {
      parts.push(locationLabel);
    }
  } else if (locationLabel && locationLabel.toLowerCase() !== 'remote') {
    parts.push(locationLabel);
  } else if (formatLabel) {
    parts.push(formatLabel);
  }

  if (priceLabel) {
    parts.push(priceLabel);
  }

  return parts.join(' · ');
}

function buildSupportingLine(event: MobileEventCard) {
  const insight = event.insight?.trim();
  if (insight) {
    return insight.endsWith('.') ? insight : `${insight}.`;
  }

  const description = event.description?.trim();
  if (!description) {
    return null;
  }

  return description.length > 88 ? `${description.slice(0, 85).trimEnd()}...` : description;
}

export function DiscoverEventCard({
  event,
  onPress,
  showDivider = true,
}: DiscoverEventCardProps) {
  const { tokens } = useAppTheme();
  const initialImage = event.organizerLogoUrl ?? event.imageUrl ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const metadataLine = buildMetadataLine(event);
  const supportingLine = buildSupportingLine(event);
  const isSaved = event.engagement?.isBookmarked || event.badges?.includes('Saved');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open recommended event ${event.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        {
          backgroundColor: pressed ? tokens.colors.discoverToolbarStrong : 'transparent',
          borderColor: pressed ? tokens.colors.discoverToolbarBorderStrong : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            borderBottomColor: showDivider
              ? tokens.colors.divider
              : 'transparent',
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.logo,
              {
                backgroundColor: tokens.colors.discoverShell,
              },
            ]}
            resizeMode="contain"
            onError={() => {
              if (imageUri === event.organizerLogoUrl) {
                setImageUri(event.imageUrl ?? null);
                return;
              }

              setImageUri(null);
            }}
          />
        ) : (
          <View
            style={[
              styles.initialBadge,
              {
                backgroundColor: tokens.colors.accentSoft,
              },
            ]}
          >
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 13,
                fontWeight: '800',
              }}
            >
              {event.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Text
                numberOfLines={2}
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 15,
                  lineHeight: 19,
                  fontWeight: '700',
                }}
              >
                {event.title}
              </Text>
            </View>
            <View style={styles.trailingIcons}>
              {isSaved ? (
                <FontAwesome
                  name="bookmark"
                  size={10}
                  color={tokens.colors.accent}
                  style={styles.savedIcon}
                />
              ) : null}
              <FontAwesome
                name="angle-right"
                size={11}
                color={tokens.colors.textTertiary}
                style={styles.chevronIcon}
              />
            </View>
          </View>

          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.discoverTextMuted,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              lineHeight: 14,
              fontWeight: '500',
            }}
          >
            {metadataLine}
          </Text>

          {supportingLine ? (
            <Text
              numberOfLines={1}
              style={{
                color: tokens.colors.discoverTextSoft,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                lineHeight: 15,
              }}
            >
              {supportingLine}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    borderWidth: 1,
  },
  card: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  initialBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
    paddingTop: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  trailingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  savedIcon: {
    marginTop: 0,
  },
  chevronIcon: {
    marginTop: 0,
  },
});
