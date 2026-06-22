import { Pressable, StyleSheet, Text, View } from "react-native";

import { SettingsDetailScaffold } from "../../src/components/settings/mobile-settings-ui";
import { haptics } from "../../src/lib/haptics";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import type { ThemePreference } from "../../src/theme/tokens";

const THEME_OPTIONS: Array<{
  label: string;
  value: ThemePreference;
}> = [
  {
    value: "system",
    label: "System",
  },
  {
    value: "dark",
    label: "Dark",
  },
  {
    value: "light",
    label: "Light",
  },
];

export default function SettingsThemeRoute() {
  const { preference, setThemePreference, tokens } = useAppTheme();

  return (
    <SettingsDetailScaffold title="Theme Select">
      <View>
        <View style={[styles.sectionDivider, { backgroundColor: tokens.colors.divider }]} />
        <View style={styles.group}>
          <View style={styles.segmentRow}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => {
                    haptics.selection();
                    setThemePreference(option.value);
                  }}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: selected
                        ? tokens.colors.accentSoft
                        : tokens.colors.input,
                      borderColor: selected
                        ? tokens.colors.accent
                        : tokens.colors.border,
                    },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentTitle,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.sectionDivider, { backgroundColor: tokens.colors.divider }]} />
      </View>
    </SettingsDetailScaffold>
  );
}

const styles = StyleSheet.create({
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
  },
  group: {
    gap: 8,
    padding: 12,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  segmentTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.78,
  },
});
