import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  MobileDiscoverFeed,
  MobileDiscoverRankingMode,
} from "@kurecal/domain";

import { useAppTheme } from "../../providers/ThemeProvider";

interface DiscoverRankingRailProps {
  onChange: (value: MobileDiscoverRankingMode) => void;
  options: MobileDiscoverFeed["controls"]["rankingModes"];
  value: MobileDiscoverRankingMode;
}

export function DiscoverRankingRail({
  onChange,
  options,
  value,
}: DiscoverRankingRailProps) {
  const { tokens } = useAppTheme();
  const trackBackground =
    tokens.mode === "light"
      ? "rgba(15, 23, 42, 0.065)"
      : "rgba(255, 255, 255, 0.08)";
  const trackBorder =
    tokens.mode === "light"
      ? "rgba(15, 23, 42, 0.06)"
      : "rgba(255, 255, 255, 0.08)";
  const activeBackground =
    tokens.mode === "light"
      ? "rgba(255, 255, 255, 0.92)"
      : tokens.colors.discoverToolbarStrong;

  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: trackBackground,
          borderColor: trackBorder,
        },
      ]}
    >
      {options.map((option) => {
        const active = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.segment,
              active && [
                styles.segmentActive,
                {
                  backgroundColor: activeBackground,
                  borderColor:
                    tokens.mode === "light"
                      ? "rgba(15, 23, 42, 0.04)"
                      : "rgba(255, 255, 255, 0.08)",
                  shadowOpacity: 0,
                },
              ],
              {
                opacity: pressed && !active ? 0.68 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: active
                  ? tokens.colors.textPrimary
                  : tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 12.5,
                letterSpacing: -0.1,
                fontWeight: active ? "600" : "500",
                opacity: active ? 1 : 0.84,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    minHeight: 38,
    padding: 3,
  },
  segment: {
    alignItems: "center",
    borderRadius: 4,
    flex: 1,
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 8,
  },
  segmentActive: {
    borderWidth: 1,
    elevation: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 0,
  },
});
