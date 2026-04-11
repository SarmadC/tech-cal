import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { DiscoverChip as DiscoverChipValue } from '../../lib/discoverState';
import { useAppTheme } from '../../providers/ThemeProvider';

export type DiscoverChip = DiscoverChipValue;

interface DiscoverChipRailProps {
  chips: DiscoverChip[];
}

export function DiscoverChipRail({ chips }: DiscoverChipRailProps) {
  const { tokens } = useAppTheme();

  if (chips.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          accessibilityLabel={`Remove ${chip.label} filter`}
          onPress={chip.onRemove}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: tokens.colors.discoverToolbar,
              borderColor: tokens.colors.discoverToolbarBorder,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: tokens.colors.discoverTextSoft,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {chip.label} ×
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 12,
  },
  content: {
    gap: 6,
  },
});
