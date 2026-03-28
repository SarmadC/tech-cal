import { FontAwesome } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MobileEventCard } from '@kurecal/domain';
import { useAppTheme } from '@/providers/ThemeProvider';

interface DiscoverHeroCardProps {
  event: MobileEventCard;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function buildHeroDate(event: MobileEventCard) {
  const start = new Date(event.startTime);
  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return {
    dateLabel,
  };
}

function splitLocation(location: string | null | undefined) {
  if (!location?.trim()) {
    return {
      primary: 'Location TBA',
      secondary: null,
    };
  }

  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    primary: parts[0] ?? location,
    secondary: parts.length > 1 ? parts.slice(1).join(', ') : null,
  };
}

export function DiscoverHeroCard({ event, onPress, style }: DiscoverHeroCardProps) {
  const { tokens } = useAppTheme();
  const initialImage = event.imageUrl ?? event.organizerLogoUrl ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const isSaved = event.engagement?.isBookmarked || event.badges?.includes('Saved');
  const { dateLabel } = useMemo(() => buildHeroDate(event), [event]);
  const location = useMemo(() => splitLocation(event.location), [event.location]);
  const isLogoFallback = Boolean(imageUri && imageUri === event.organizerLogoUrl && imageUri !== event.imageUrl);
  const logoFallbackUri = isLogoFallback ? imageUri : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open top pick ${event.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        style,
        {
          backgroundColor: tokens.colors.discoverToolbarStrong,
          borderColor: tokens.colors.discoverToolbarBorderStrong,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tokens.shadow.shadowOpacity * 0.22,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      {imageUri && !isLogoFallback ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => {
            if (imageUri === event.imageUrl && event.organizerLogoUrl) {
              setImageUri(event.organizerLogoUrl);
              return;
            }

            setImageUri(null);
          }}
        />
      ) : null}

      <LinearGradient
        colors={
          isLogoFallback || !imageUri
            ? [tokens.colors.discoverToolbarStrong, tokens.colors.discoverShell]
            : ['rgba(5, 7, 10, 0.08)', 'rgba(5, 7, 10, 0.82)']
        }
        style={StyleSheet.absoluteFillObject}
      />

      {logoFallbackUri ? (
        <Image
          source={{ uri: logoFallbackUri }}
          style={styles.logoFallback}
          resizeMode="contain"
          onError={() => setImageUri(null)}
        />
      ) : null}

      {!imageUri ? (
        <View style={styles.initialWrap}>
          <Text
            style={{
              color: tokens.colors.discoverTextSoft,
              fontFamily: tokens.typography.sans,
              fontSize: 48,
              fontWeight: '800',
            }}
          >
            {event.title.charAt(0).toUpperCase()}
          </Text>
        </View>
      ) : null}

      <View style={styles.chromeRow}>
        {isSaved ? (
          <View
            style={[
              styles.savedBadge,
              {
                backgroundColor: 'rgba(9, 11, 14, 0.58)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            <FontAwesome name="bookmark" size={12} color="#F8FAFC" />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text
          numberOfLines={3}
          style={{
            color: '#F8FAFC',
            fontFamily: tokens.typography.sans,
            fontSize: 20,
            lineHeight: 24,
            fontWeight: '800',
          }}
        >
          {event.title}
        </Text>

        <View
          style={[
            styles.metaRow,
            {
              borderTopColor: 'rgba(255, 255, 255, 0.16)',
            },
          ]}
        >
          <View style={styles.metaCopy}>
            <Text
              style={{
                color: '#F8FAFC',
                fontFamily: tokens.typography.mono,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: '700',
              }}
            >
              {dateLabel}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: 'rgba(248, 250, 252, 0.82)',
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                lineHeight: 16,
                fontWeight: '600',
              }}
            >
              {location.primary}
              {location.secondary ? ` • ${location.secondary}` : ''}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 184,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  chromeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  savedBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  metaRow: {
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  metaCopy: {
    gap: 2,
  },
  logoFallback: {
    position: 'absolute',
    top: 38,
    right: 24,
    bottom: 62,
    left: 24,
    opacity: 0.72,
  },
  initialWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.22,
  },
});
