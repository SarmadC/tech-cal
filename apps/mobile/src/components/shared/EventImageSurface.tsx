import { LinearGradient } from 'expo-linear-gradient';
import { useState, type PropsWithChildren } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SvgUri } from 'react-native-svg';

import type { MobileEventCard } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';

function isSvgUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return url.toLowerCase().includes('.svg');
  }
}

interface EventImageSurfaceProps extends PropsWithChildren {
  event: MobileEventCard;
  onPress?: PressableProps['onPress'];
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
  style?: StyleProp<ViewStyle>;
  pressedStyle?: StyleProp<ViewStyle>;
}

export function EventImageSurface({
  children,
  event,
  onPress,
  onPressIn,
  onPressOut,
  style,
  pressedStyle,
}: EventImageSurfaceProps) {
  const { tokens } = useAppTheme();
  const initialImage = event.imageUrl ?? event.organizerLogoUrl ?? null;
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const isLogoFallback = Boolean(
    imageUri && imageUri === event.organizerLogoUrl && imageUri !== event.imageUrl
  );
  const logoFallbackUri = isLogoFallback ? imageUri : null;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [style, pressed && pressedStyle]}
    >
      {imageUri && !isLogoFallback ? (
        isSvgUrl(imageUri) ? (
          <SvgUri
            uri={imageUri}
            width="100%"
            height="100%"
            style={StyleSheet.absoluteFillObject}
            onError={() => {
              if (imageUri === event.imageUrl && event.organizerLogoUrl) {
                setImageUri(event.organizerLogoUrl);
                return;
              }
              setImageUri(null);
            }}
          />
        ) : (
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
        )
      ) : null}

      <LinearGradient
        colors={
          isLogoFallback || !imageUri
            ? [tokens.colors.discoverToolbarStrong, tokens.colors.discoverShell]
            : ['rgba(5, 7, 10, 0.22)', 'rgba(5, 7, 10, 0.92)']
        }
        style={StyleSheet.absoluteFillObject}
      />

      {logoFallbackUri ? (
        isSvgUrl(logoFallbackUri) ? (
          <SvgUri
            uri={logoFallbackUri}
            width="100%"
            height="100%"
            style={styles.logoFallback}
            onError={() => setImageUri(null)}
          />
        ) : (
          <Image
            source={{ uri: logoFallbackUri }}
            style={styles.logoFallback}
            resizeMode="contain"
            onError={() => setImageUri(null)}
          />
        )
      ) : null}

      {!imageUri ? (
        <Text
          style={[
            styles.initial,
            {
              color: tokens.colors.discoverTextSoft,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.title.charAt(0).toUpperCase()}
        </Text>
      ) : null}

      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  initial: {
    ...StyleSheet.absoluteFillObject,
    fontSize: 48,
    fontWeight: '800',
    opacity: 0.22,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  logoFallback: {
    bottom: 62,
    left: 24,
    opacity: 0.72,
    position: 'absolute',
    right: 24,
    top: 38,
  },
});
