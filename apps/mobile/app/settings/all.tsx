// Non-tab entry to the settings overview. Reached via router.push from the
// hamburger menu (and other tabs). Back pops the pushed screen, returning
// the user to whichever tab opened the menu.

import { Pressable, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import { router } from "expo-router";

import SettingsScreen from "../../src/screens/SettingsScreen";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsHomeRoute() {
  return <SettingsScreen headerLeft={<HeaderBack />} />;
}

function HeaderBack() {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      onPress={() => {
        // Pop the pushed settings screen back to the tab that opened it.
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/discover");
        }
      }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name="chevron.left"
        size={17}
        tintColor={tokens.colors.textPrimary}
        type="monochrome"
        fallback={<Text style={{ color: tokens.colors.textPrimary }}>‹</Text>}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
