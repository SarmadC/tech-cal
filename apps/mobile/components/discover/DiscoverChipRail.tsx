import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

export interface DiscoverChip {
  key: string;
  label: string;
  onRemove: () => void;
}

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
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
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
  content: {
    gap: 6,
  },
  chip: {
    minHeight: 30,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
