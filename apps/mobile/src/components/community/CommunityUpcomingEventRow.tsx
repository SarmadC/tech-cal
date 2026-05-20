import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { useAppTheme } from '../../providers/ThemeProvider';
import {
  formatCommunityEventTime,
  formatNetworkingEventDate,
} from './presentation';

interface CommunityUpcomingEventRowProps {
  title: string;
  startTime: string;
  meta: string;
  onPress?: () => void;
  showDivider?: boolean;
}

export function CommunityUpcomingEventRow({
  meta,
  onPress,
  showDivider = false,
  startTime,
  title,
}: CommunityUpcomingEventRowProps) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open event ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.colors.divider,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.dateBadge}>
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.mono,
            fontSize: 10,
            lineHeight: 14,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {formatNetworkingEventDate(startTime)}
        </Text>
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            lineHeight: 18,
            fontWeight: '800',
          }}
        >
          {formatCommunityEventTime(startTime)}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            lineHeight: 18,
            fontWeight: '800',
          }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '600',
          }}
        >
          {meta}
        </Text>
      </View>
      <FontAwesome
        name="chevron-right"
        size={13}
        color={tokens.colors.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
  },
  dateBadge: {
    width: 96,
    gap: 2,
  },
  pressed: {
    opacity: 0.84,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
