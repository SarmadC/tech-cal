import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../providers/ThemeProvider';

export function DashboardCard({
  children,
  style,
  contentStyle,
  surfaceColors,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  surfaceColors?: readonly [string, string];
}>) {
  const { tokens, resolvedTheme } = useAppTheme();

  const gradientColors =
    surfaceColors ??
    (resolvedTheme === 'light'
      ? (['rgba(255,255,255,0.98)', 'rgba(244,247,251,0.92)'] as const)
      : (['rgba(21,26,34,0.92)', 'rgba(13,16,20,0.98)'] as const));

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: tokens.colors.border,
          borderRadius: 20,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity:
            resolvedTheme === 'light'
              ? 0.08
              : Math.max(tokens.shadow.shadowOpacity - 0.08, 0.14),
          shadowRadius: resolvedTheme === 'light' ? 18 : 24,
          shadowOffset: { width: 0, height: resolvedTheme === 'light' ? 12 : 16 },
          elevation: resolvedTheme === 'light' ? 8 : 12,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  content: {
    gap: 12,
    padding: 16,
  },
});
