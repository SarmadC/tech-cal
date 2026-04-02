import { FontAwesome } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';
import { formatCommunityEventDay, formatCommunityEventTime } from '@/components/community/presentation';

interface CommunityUpcomingEventRowProps {
  title: string;
  startTime: string | null;
  meta: string;
  onPress?: () => void;
  showDivider?: boolean;
}

export function CommunityUpcomingEventRow({
  title,
  startTime,
  meta,
  onPress,
  showDivider = true,
}: CommunityUpcomingEventRowProps) {
  const { tokens } = useAppTheme();
  const { day, month } = formatCommunityEventDay(startTime);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open upcoming event ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? tokens.colors.surfaceMuted : 'transparent',
          borderBottomColor: showDivider ? tokens.colors.divider : 'transparent',
        },
      ]}
    >
      <View
        style={[
          styles.dateBadge,
          {
            backgroundColor: tokens.colors.surfaceMuted,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 18,
            lineHeight: 20,
            fontWeight: '800',
          }}
        >
          {day}
        </Text>
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.2,
          }}
        >
          {month}
        </Text>
      </View>

      <View style={styles.copy}>
        <Text
          numberOfLines={2}
          style={{
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            lineHeight: 19,
            fontWeight: '700',
          }}
        >
          {title}
        </Text>
        <View style={styles.metaRow}>
          <FontAwesome name="clock-o" size={12} color={tokens.colors.textTertiary} />
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '700',
            }}
          >
            {formatCommunityEventTime(startTime)}
          </Text>
          <Text style={[styles.dot, { color: tokens.colors.textTertiary }]}>•</Text>
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: '600',
              flex: 1,
            }}
          >
            {meta}
          </Text>
        </View>
      </View>

      <FontAwesome name="angle-right" size={14} color={tokens.colors.textTertiary} />
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
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    fontSize: 11,
    lineHeight: 14,
  },
});
