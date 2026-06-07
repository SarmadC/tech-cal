import { FontAwesome } from "@expo/vector-icons";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/ThemeProvider";
import { AppMenuSheet } from "./AppMenuSheet";

// Floats a hamburger button in the top-left safe area on tab screens and
// owns the slide-in menu sheet. Use `topOffset` to nudge past a custom header.
export function TabMenuOverlay({
  rightAccessory,
  topOffset = 8,
}: {
  rightAccessory?: ReactNode;
  topOffset?: number;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          { paddingTop: insets.top + topOffset },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          hitSlop={10}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.button,
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <FontAwesome name="bars" size={18} color={tokens.colors.textPrimary} />
        </Pressable>
        {rightAccessory}
      </View>
      <AppMenuSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
