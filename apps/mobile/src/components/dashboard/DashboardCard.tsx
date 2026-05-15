import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";

export function DashboardCard({
  children,
  style,
  contentStyle,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  surfaceColors?: readonly [string, string];
}>) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  content: {
    gap: 8,
    padding: 12,
  },
});
