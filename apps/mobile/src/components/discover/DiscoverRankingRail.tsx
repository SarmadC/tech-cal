import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MobileDiscoverFeed, MobileDiscoverRankingMode } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';

interface DiscoverRankingRailProps {
  onChange: (value: MobileDiscoverRankingMode) => void;
  options: MobileDiscoverFeed['controls']['rankingModes'];
  value: MobileDiscoverRankingMode;
}

export function DiscoverRankingRail({
  onChange,
  options,
  value,
}: DiscoverRankingRailProps) {
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
                borderColor: active
                  ? tokens.colors.discoverToolbarBorderStrong
                  : 'transparent',
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
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 8,
  },
});
