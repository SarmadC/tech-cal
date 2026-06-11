import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SettingsDetailScaffold,
  SettingsFieldLabel,
  SettingsGroup,
} from "../../src/components/settings/mobile-settings-ui";
import { haptics } from "../../src/lib/haptics";
import { useAppTheme } from "../../src/providers/ThemeProvider";
import type { ThemePreference } from "../../src/theme/tokens";

const THEME_OPTIONS: Array<{
  description: string;
  label: string;
  value: ThemePreference;
}> = [
  {
    value: "system",
    label: "System",
    description: "Match your device appearance.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use the darker app surface.",
  },
  {
    value: "light",
    label: "Light",
    description: "Use the brighter app surface.",
  },
];

export default function SettingsThemeRoute() {
  const { preference, resolvedTheme, setThemePreference, tokens } =
    useAppTheme();

  return (
    <SettingsDetailScaffold
      subtitle={resolvedTheme === "dark" ? "Dark active" : "Light active"}
      title="Theme and access"
    >
      <SettingsGroup style={styles.group}>
        <SettingsFieldLabel>Theme / dark</SettingsFieldLabel>
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
        <Text
          style={[
            styles.description,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {
            THEME_OPTIONS.find((option) => option.value === preference)
              ?.description
          }
        </Text>
      </SettingsGroup>
    </SettingsDetailScaffold>
  );
}

const styles = StyleSheet.create({
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
  description: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.78,
  },
});
