// Non-tab entry to the settings overview. Reached via router.push from
// other tabs (e.g. Profile's settings icon). Using router.dismissTo on
// back so the iOS back stack returns the user to the originating tab,
// since pushing the (tabs)/settings.tsx tab directly is a cross-tab
// navigation that doesn't create a poppable stack entry.

import { Pressable, StyleSheet, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import { router, useLocalSearchParams } from "expo-router";

import SettingsScreen from "../(tabs)/settings";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsHomeRoute() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <SettingsScreen headerLeft={<HeaderBack from={from} />} />;
}

function HeaderBack({ from }: { from?: string }) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      onPress={() => {
        // dismissTo pops the stack back to the originating tab, falling
        // back to a replace if the route isn't in history. The `from`
        // query param is set by whichever screen pushed us here.
        const target: "/dashboard" | "/profile" =
          from === "dashboard" ? "/dashboard" : "/profile";
        router.dismissTo(target);
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
        },
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
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
