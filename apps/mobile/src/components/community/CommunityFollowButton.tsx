import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../providers/ThemeProvider';

interface CommunityFollowButtonProps {
  isFollowing: boolean;
  followsViewer?: boolean;
  isPending?: boolean;
  disabled?: boolean;
  copyVariant?: 'follow' | 'connect';
  size?: 'default' | 'compact';
  appearance?: 'default' | 'floating';
  showPlusIcon?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
}

export function CommunityFollowButton({
  isFollowing,
  followsViewer = false,
  isPending = false,
  disabled = false,
  copyVariant = 'follow',
  size = 'default',
  appearance = 'default',
  showPlusIcon = false,
  accessibilityLabel,
  onPress,
}: CommunityFollowButtonProps) {
  const { tokens } = useAppTheme();
  const isFloating = appearance === 'floating';

  const label =
    copyVariant === 'connect'
      ? isPending
        ? 'Working...'
        : isFollowing
          ? 'Connected'
          : followsViewer
            ? 'Connect back'
            : 'Connect'
      : isPending
        ? 'Working...'
        : isFollowing
          ? 'Following'
          : followsViewer
            ? 'Follow back'
            : 'Follow';

  const borderColor = isFloating
    ? isFollowing
      ? tokens.colors.accentSoft
      : tokens.colors.borderStrong
    : isFollowing
      ? tokens.colors.borderStrong
      : tokens.colors.pillActive;
  const backgroundColor = isFloating
    ? isFollowing
      ? tokens.colors.accentSoft
      : tokens.colors.surface
    : isFollowing
      ? tokens.colors.surface
      : tokens.colors.pillActive;
  const textColor = isFloating
    ? isFollowing
      ? tokens.colors.accent
      : tokens.colors.textPrimary
    : isFollowing
      ? tokens.colors.textPrimary
      : tokens.colors.pillActiveText;
  const showIcon = showPlusIcon && !isPending && !isFollowing;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled || isPending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'compact' && styles.buttonCompact,
        isFloating && styles.buttonFloating,
        {
          borderRadius: tokens.radius.pill,
          borderColor,
          backgroundColor,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: isFloating && !disabled && !isPending ? 0.08 : 0,
          shadowRadius: isFloating ? 12 : 0,
          shadowOffset: isFloating ? { width: 0, height: 6 } : { width: 0, height: 0 },
          elevation: isFloating ? 2 : 0,
        },
        pressed && styles.pressed,
        (disabled || isPending) && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        <Text
          style={{
            color: textColor,
            fontFamily: tokens.typography.sans,
            fontSize: size === 'compact' ? 12 : 13,
            fontWeight: '800',
          }}
        >
          {label}
        </Text>
        {showIcon ? <FontAwesome name="plus" size={12} color={textColor} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 38,
    minWidth: 104,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonCompact: {
    minHeight: 34,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  buttonFloating: {
    minWidth: 112,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.56,
  },
});
