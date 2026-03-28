import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/providers/ThemeProvider';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function MobileSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (nextValue: T) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: tokens.colors.pill,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.pill,
        },
      ]}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.option,
              {
                borderRadius: tokens.radius.pill,
                backgroundColor: active ? tokens.colors.pillActive : 'transparent',
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: active ? tokens.colors.pillActiveText : tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {option.label}
              {typeof option.count === 'number' ? ` ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    padding: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
  },
  option: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
