import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { SlideInLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthProvider";
import { useReduceMotion } from "../../hooks/useAnimation";
import { useAppTheme } from "../../providers/ThemeProvider";

interface AppMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

type MenuRow = {
  key: string;
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
  route: string;
};

const PANEL_WIDTH = Math.min(320, Dimensions.get("window").width * 0.82);

export function AppMenuSheet({ visible, onClose }: AppMenuSheetProps) {
  const { tokens } = useAppTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const isDark = tokens.mode === "dark";

  const username = profile?.socialProfile.username?.trim();

  const rows: MenuRow[] = [
    ...(username
      ? [
          {
            key: "profile",
            label: "Profile",
            icon: "user-circle" as const,
            route: `/profile/${encodeURIComponent(username)}`,
          },
        ]
      : []),
    { key: "settings", label: "Settings", icon: "cog", route: "/settings/all" },
    { key: "saved", label: "Saved", icon: "bookmark", route: "/saved" },
    {
      key: "submit-event",
      label: "Submit event",
      icon: "plus-circle",
      route: "/submit-event",
    },
  ];

  function go(route: string) {
    onClose();
    // Defer navigation a tick so the close animation can begin cleanly.
    requestAnimationFrame(() => router.push(route as never));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView
          intensity={28}
          tint={isDark ? "systemThickMaterialDark" : "systemThinMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.backdropDim} />
      </Pressable>
      <Animated.View
        entering={reduceMotion ? undefined : SlideInLeft.duration(220)}
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            borderRightColor: tokens.colors.border,
          },
        ]}
      >
        <BlurView
          intensity={90}
          tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? "rgba(13, 14, 15, 0.6)"
                : "rgba(255, 255, 255, 0.5)",
            },
          ]}
        />
        <Text
          style={[
            styles.heading,
            { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
          ]}
        >
          Menu
        </Text>
        <View style={styles.rows}>
          {rows.map((row) => (
            <Pressable
              key={row.key}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              onPress={() => go(row.route)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed
                    ? tokens.colors.surfaceStrong
                    : "transparent",
                  borderColor: tokens.colors.border,
                },
              ]}
            >
              <FontAwesome
                name={row.icon}
                size={18}
                color={tokens.colors.textSecondary}
                style={styles.rowIcon}
              />
              <Text
                style={[
                  styles.rowLabel,
                  {
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {row.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  panel: {
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    paddingHorizontal: 16,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    opacity: 0.6,
    marginBottom: 16,
    marginLeft: 8,
  },
  rows: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowIcon: {
    width: 22,
    textAlign: "center",
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
