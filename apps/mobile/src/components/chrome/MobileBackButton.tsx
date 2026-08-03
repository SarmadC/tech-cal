import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";

export function MobileBackButton({
  fallback = "/discover",
  label = "Back",
}: {
  fallback?: string;
  label?: string;
}) {
  const { tokens } = useAppTheme();

  function handlePress() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallback as never);
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={12}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name="chevron.left"
        size={17}
        tintColor={tokens.colors.textPrimary}
        type="monochrome"
        fallback={<Text style={[styles.fallback, { color: tokens.colors.textPrimary }]}>‹</Text>}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  fallback: {
    fontSize: 24,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.7,
  },
});
