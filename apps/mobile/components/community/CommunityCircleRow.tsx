import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KureButton } from '@/components/chrome/KureButton';
import { useAppTheme } from '@/providers/ThemeProvider';
import {
  formatCommunityCircleName,
  getCommunityCircleIcon,
  getCommunityCircleTone,
} from '@/components/community/presentation';

interface CommunityCircleListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  isJoined: boolean;
  memberCount: number;
  icon?: string | null;
}

interface CommunityCircleRowProps {
  circle: CommunityCircleListItem;
  onPress?: () => void;
  onToggle?: (circle: CommunityCircleListItem, isJoined: boolean) => Promise<void>;
}

export function CommunityCircleRow({
  circle,
  onPress,
  onToggle,
}: CommunityCircleRowProps) {
  const { tokens, resolvedTheme } = useAppTheme();
  const [optimisticJoined, setOptimisticJoined] = useState(circle.isJoined);
  const [isLoading, setIsLoading] = useState(false);
  const tone = getCommunityCircleTone(circle.name, resolvedTheme);
  const icon = getCommunityCircleIcon(circle.name, circle.icon);

  useEffect(() => {
    setOptimisticJoined(circle.isJoined);
  }, [circle.isJoined]);

  async function handleToggle() {
    if (!onToggle || isLoading) {
      return;
    }

    const previous = optimisticJoined;
    setOptimisticJoined(!previous);
    setIsLoading(true);

    try {
      await onToggle(circle, previous);
    } catch {
      setOptimisticJoined(previous);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open circle ${circle.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
          borderBottomColor: tokens.colors.divider,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: tone.background,
          },
        ]}
      >
        <FontAwesome name={icon as never} size={17} color={tone.foreground} />
      </View>

      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 15,
            lineHeight: 19,
            fontWeight: '700',
          }}
        >
          {formatCommunityCircleName(circle.name)}
        </Text>
        {circle.description ? (
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              lineHeight: 17,
            }}
          >
            {circle.description}
          </Text>
        ) : null}
      </View>

      {onToggle ? (
        <View style={styles.trailing}>
          <KureButton
            variant={optimisticJoined ? 'secondary' : 'primary'}
            disabled={isLoading}
            onPress={handleToggle}
          >
            {isLoading ? '...' : optimisticJoined ? 'Joined' : 'Join'}
          </KureButton>
        </View>
      ) : (
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 11,
            fontWeight: '700',
          }}
        >
          {circle.memberCount} members
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  trailing: {
    width: 96,
  },
});
