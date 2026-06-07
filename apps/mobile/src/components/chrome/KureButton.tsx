import type { PropsWithChildren } from "react";
import { Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";
import { useScalePress } from "../../hooks/useAnimation";

export function KureButton({
  children,
  variant = "primary",
  disabled = false,
  onPress,
  style,
  testID,
}: PropsWithChildren<{
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  onPress?: () => void | Promise<unknown>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}>) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void onPress?.();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={testID}
      style={[
        styles.base,
        {
          borderRadius: tokens.radius.md,
          borderColor: tokens.colors.border,
          backgroundColor: tokens.colors.surface,
        },
        variant === "primary" && {
          backgroundColor: tokens.colors.pillActive,
          borderColor: tokens.colors.pillActive,
        },
        variant === "secondary" && {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderStrong,
        },
        variant === "ghost" && {
          backgroundColor: "transparent",
          borderColor: "transparent",
        },
        variant === "danger" && {
          backgroundColor: tokens.colors.danger,
          borderColor: tokens.colors.danger,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <Text
          style={[
            styles.label,
            {
              color:
                variant === "primary"
                  ? tokens.colors.pillActiveText
                  : variant === "danger"
                    ? tokens.colors.textInverse
                    : tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {children}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 32,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.45,
  },
});
