import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';
import { buildAvatarInitials } from './presentation';

interface CommunityAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
}

export function CommunityAvatar({
  name,
  avatarUrl,
  size = 40,
}: CommunityAvatarProps) {
  const { tokens } = useAppTheme();
  const initials = buildAvatarInitials(name);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    avatarUrl?.trim() || null
  );

  useEffect(() => {
    setResolvedAvatarUrl(avatarUrl?.trim() || null);
  }, [avatarUrl]);

  if (resolvedAvatarUrl) {
    return (
      <Image
        source={{ uri: resolvedAvatarUrl }}
        onError={() => {
          setResolvedAvatarUrl(null);
        }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size / 2),
            borderColor: tokens.colors.border,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          backgroundColor: tokens.colors.surfaceMuted,
          borderColor: tokens.colors.border,
        },
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textSecondary,
          fontFamily: tokens.typography.sans,
          fontSize: Math.max(11, Math.round(size * 0.3)),
          fontWeight: '600',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 1,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
