import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAppTheme } from '../../providers/ThemeProvider';

export function IconMetaRow({
  icon,
  children,
  onPress,
}: {
  icon: keyof typeof FontAwesome.glyphMap;
  children: ReactNode;
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();

  const inner = (
    <View style={styles.row}>
      <FontAwesome name={icon} size={16} color={tokens.colors.textSecondary} style={styles.icon} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable,
          { backgroundColor: pressed ? tokens.colors.accentSoft : 'transparent' },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.pressable}>{inner}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
});
