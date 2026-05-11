import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";

export function KureCard({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
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
          shadowOpacity: tokens.shadow.shadowOpacity,
          shadowRadius: tokens.shadow.shadowRadius,
          shadowOffset: tokens.shadow.shadowOffset,
          elevation: tokens.shadow.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
});
