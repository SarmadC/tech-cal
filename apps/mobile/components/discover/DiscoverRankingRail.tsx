import type { MobileDiscoverFeed, MobileDiscoverRankingMode } from '@kurecal/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

interface DiscoverRankingRailProps {
  options: MobileDiscoverFeed['controls']['rankingModes'];
  value: MobileDiscoverRankingMode;
  onChange: (value: MobileDiscoverRankingMode) => void;
}

export function DiscoverRankingRail({ options, value, onChange }: DiscoverRankingRailProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: tokens.colors.discoverToolbar,
          borderColor: tokens.colors.discoverToolbarBorder,
        },
      ]}
    >
      {options.map((option) => {
        const active = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: active ? tokens.colors.discoverToolbarStrong : 'transparent',
                borderColor: active ? tokens.colors.discoverToolbarBorderStrong : 'transparent',
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: active ? tokens.colors.textPrimary : tokens.colors.discoverTextMuted,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: active ? '700' : '500',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
