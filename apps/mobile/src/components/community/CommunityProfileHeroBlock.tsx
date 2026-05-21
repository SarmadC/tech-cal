import type { ReactNode } from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../providers/ThemeProvider';
import { CommunityAvatar } from './CommunityAvatar';
import { getNetworkingProfileTone } from './presentation';

interface CommunityProfileHeroBlockProps {
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  headerImageUrl?: string | null;
  hideCover?: boolean;
  showAvatar?: boolean;
  headline?: string | null;
  summary?: string | null;
  badges?: string[];
  action?: ReactNode;
  accessibilityLabel?: string;
  onPress?: () => void;
  size?: 'card' | 'profile';
  toneInput: {
    currentRole?: string | null;
    industry?: string | null;
    seed?: string | null;
    isMutualFollow?: boolean;
    followsViewer?: boolean;
    isInNetwork?: boolean;
  };
}

export function CommunityProfileHeroBlock({
  displayName,
  username,
  avatarUrl,
  headerImageUrl,
  hideCover = false,
  showAvatar = true,
  headline,
  summary,
  badges = [],
  action,
  accessibilityLabel,
  onPress,
  size = 'card',
  toneInput,
}: CommunityProfileHeroBlockProps) {
  const { tokens } = useAppTheme();
  const tone = getNetworkingProfileTone({
    mode: tokens.mode,
    ...toneInput,
  });
  const isProfile = size === 'profile';
  const avatarSize = isProfile ? 86 : 70;
  const headerHeight = hideCover ? 0 : headerImageUrl ? (isProfile ? 188 : 154) : isProfile ? 86 : 64;
  const metaItems = [
    isProfile ? null : username ? `@${username}` : null,
    ...badges.slice(0, isProfile ? 2 : 1),
  ].filter(Boolean) as string[];
  const metaText = metaItems.join(' • ');

  const content = (
    <View style={styles.shell}>
      <View
        style={[
          styles.header,
          {
            height: headerHeight,
            borderRadius: isProfile ? tokens.radius.lg : tokens.radius.md,
            backgroundColor: tone.coverStart,
            borderBottomColor: tokens.colors.divider,
          },
        ]}
      >
        {headerImageUrl ? (
          <ImageBackground
            source={{ uri: headerImageUrl }}
            style={StyleSheet.absoluteFillObject}
            imageStyle={{
              borderRadius: isProfile ? tokens.radius.lg : tokens.radius.md,
            }}
          >
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.06)', 'rgba(15, 23, 42, 0.38)']}
              end={{ x: 0.9, y: 1 }}
              start={{ x: 0.1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </ImageBackground>
        ) : (
          <>
            <View
              style={[
                styles.headerCloud,
                {
                  backgroundColor: tone.cloud,
                },
              ]}
            />
            <View
              style={[
                styles.headerGlow,
                {
                  backgroundColor: tone.glow,
                },
              ]}
            />
            <View
              style={[
                styles.headerLine,
                {
                  backgroundColor: tone.line,
                },
              ]}
            />
          </>
        )}
      </View>

      <View
        style={[
          styles.body,
          {
            paddingHorizontal: isProfile ? 18 : 14,
            paddingVertical: isProfile ? 18 : 14,
          },
        ]}
      >
        <View style={styles.topRow}>
          {metaText ? (
            <Text
              numberOfLines={1}
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.mono,
                fontSize: isProfile ? 11 : 10,
                lineHeight: isProfile ? 15 : 14,
                fontWeight: '700',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              {metaText}
            </Text>
          ) : (
            <View style={styles.topRowSpacer} />
          )}

          {action ? <View style={styles.inlineActionWrap}>{action}</View> : null}
        </View>

        <View style={styles.identityRow}>
          {showAvatar ? (
            <View
              style={[
                styles.avatarFrame,
                {
                  borderRadius: avatarSize / 2 + 6,
                  backgroundColor: headerImageUrl
                    ? 'rgba(15, 23, 42, 0.22)'
                    : tone.ring,
                },
              ]}
            >
              <CommunityAvatar
                avatarUrl={avatarUrl}
                name={displayName}
                size={avatarSize}
              />
            </View>
          ) : null}

          <View style={styles.copy}>
            <Text
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: isProfile ? 30 : 22,
                lineHeight: isProfile ? 34 : 26,
                fontWeight: '800',
                letterSpacing: -0.8,
              }}
            >
              {displayName}
            </Text>

            {isProfile && username ? (
              <Text
                style={{
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.mono,
                  fontSize: 12,
                  fontWeight: '600',
                  lineHeight: 16,
                }}
              >
                @{username}
              </Text>
            ) : null}

            {headline ? (
              <Text
                numberOfLines={2}
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: isProfile ? 15 : 14,
                  lineHeight: isProfile ? 21 : 19,
                  fontWeight: '600',
                }}
              >
                {headline}
              </Text>
            ) : null}

            {summary ? (
              <Text
                numberOfLines={isProfile ? 3 : 2}
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {summary}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );

  return onPress ? (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.root}>{content}</View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  shell: {
    overflow: 'hidden',
  },
  header: {
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCloud: {
    position: 'absolute',
    top: -18,
    right: -16,
    width: 164,
    height: 116,
    borderRadius: 48,
    transform: [{ rotate: '8deg' }],
  },
  headerGlow: {
    position: 'absolute',
    left: 16,
    top: 14,
    width: 112,
    height: 44,
    borderRadius: 22,
  },
  headerLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    height: 3,
    borderRadius: 999,
    opacity: 0.55,
  },
  body: {
    gap: 12,
  },
  topRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topRowSpacer: {
    flex: 1,
  },
  inlineActionWrap: {
    flexShrink: 0,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarFrame: {
    padding: 4,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  pressed: {
    opacity: 0.9,
  },
});
