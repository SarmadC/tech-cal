import { FontAwesome } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Image,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildAvatarInitials } from "../community/presentation";
import { useAuth } from "../../context/AuthProvider";
import { useSubscription } from "../../context/SubscriptionContext";
import { showActionSheet } from "../../lib/actionSheet";
import { haptics } from "../../lib/haptics";
import { useAppTheme } from "../../providers/ThemeProvider";

interface AppMenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

type MenuRow = {
  key: string;
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
  route?: string;
  destructive?: boolean;
  onPress?: () => void;
};

type MenuGroup = {
  key: string;
  title: string;
  rows: MenuRow[];
};

function isSafeAvatarUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

function isEmailAddress(value: string | null | undefined): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export function AppMenuSheet({ visible, onClose }: AppMenuSheetProps) {
  const { tokens } = useAppTheme();
  const { profile, signOut } = useAuth();
  const { hasPaidAccess } = useSubscription();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDark = tokens.mode === "dark";
  const panelWidth = Math.min(340, Math.max(288, width * 0.86));
  const pendingRouteRef = useRef<string | null>(null);
  const pendingSignOutRef = useRef(false);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    return () => {
      pendingRouteRef.current = null;
      pendingSignOutRef.current = false;
    };
  }, []);

  const handleDismiss = useCallback(() => {
    const pendingRoute = pendingRouteRef.current;
    const shouldSignOut = pendingSignOutRef.current;
    pendingRouteRef.current = null;
    pendingSignOutRef.current = false;

    if (pendingRoute) {
      router.push(pendingRoute as never);
      return;
    }

    if (shouldSignOut) {
      void signOut();
    }
  }, [signOut]);

  const runPendingActionAfterClose = useCallback(() => {
    if (Platform.OS === "ios") {
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      handleDismiss();
    });
  }, [handleDismiss]);

  const username = profile?.socialProfile.username?.trim();
  const profileRoute = username
    ? `/profile/${encodeURIComponent(username)}`
    : "/profile/__current__";
  const configuredName = profile?.profile.fullName?.trim();
  const fullName =
    (configuredName && !isEmailAddress(configuredName) ? configuredName : null) ||
    username ||
    "Your profile";
  const secondary =
    profile?.socialProfile.headline?.trim() ||
    (username ? `@${username}` : null) ||
    "Profile settings";
  const initials = buildAvatarInitials(fullName);
  const avatarUrl = profile?.profile.avatarUrl ?? profile?.socialProfile.avatarUrl;

  const groups = useMemo<MenuGroup[]>(
    () => [
      {
        key: "account",
        title: "Account",
        rows: [
          {
            key: "career-profile",
            label: "Career setup",
            icon: "briefcase",
            route: "/onboarding?resume=1",
          },
          { key: "privacy", label: "Privacy", icon: "lock", route: "/settings/privacy" },
          {
            key: "calendar-sync",
            label: "Integrations",
            icon: "calendar-plus-o",
            route: "/settings/calendar",
          },
          { key: "theme", label: "Theme", icon: "paint-brush", route: "/settings/theme" },
          {
            key: "subscription",
            label: "Subscription",
            icon: "credit-card",
            route: "/paywall",
          },
          {
            key: "all-settings",
            label: "All settings",
            icon: "th-large",
            route: "/settings/all",
          },
        ],
      },
      {
        key: "support",
        title: "Support",
        rows: [
          {
            key: "notification-preferences",
            label: "Notification preferences",
            icon: "bell-o",
            route: "/notifications/preferences",
          },
          {
            key: "blocked-users",
            label: "Blocked users",
            icon: "ban",
            route: "/settings/blocked-users",
          },
          {
            key: "sign-out",
            label: "Sign out",
            icon: "sign-out",
            destructive: true,
            onPress: () => {
              haptics.warning();
              showActionSheet({
                title: "Sign out?",
                message: "You can sign back in at any time.",
                options: [
                  {
                    label: "Sign out",
                    destructive: true,
                    onPress: () => {
                      pendingSignOutRef.current = true;
                      close();
                      runPendingActionAfterClose();
                    },
                  },
                ],
              });
            },
          },
        ],
      },
    ],
    [close, runPendingActionAfterClose],
  );

  useEffect(() => {
    if (visible) {
      haptics.selection();
    }
  }, [visible]);

  const go = useCallback((route: string) => {
    haptics.selection();
    pendingRouteRef.current = route;
    close();
    runPendingActionAfterClose();
  }, [close, runPendingActionAfterClose]);

  function handleRowPress(row: MenuRow) {
    if (row.onPress) {
      row.onPress();
      return;
    }

    if (row.route) {
      go(row.route);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onDismiss={handleDismiss}
      onRequestClose={close}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={close}>
        <BlurView
          intensity={28}
          tint={isDark ? "systemThickMaterialDark" : "systemThinMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.backdropDim} />
      </Pressable>
      <View
        style={[
          styles.panel,
          {
            width: panelWidth,
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View profile"
            onPress={() => go(profileRoute)}
            style={({ pressed }) => [
              styles.profileBlock,
              {
                borderBottomColor: tokens.colors.divider,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            {isSafeAvatarUrl(avatarUrl) ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  {
                    backgroundColor: tokens.colors.accentSoft,
                    borderColor: tokens.colors.borderStrong,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.avatarInitials,
                    { color: tokens.colors.accent, fontFamily: tokens.typography.sans },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text
                numberOfLines={1}
                style={[
                  styles.profileName,
                  { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                ]}
              >
                {fullName}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.profileMeta,
                  { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
                ]}
              >
                {secondary}
              </Text>
            </View>
            <View style={styles.profileAction} pointerEvents="none">
              <FontAwesome name="chevron-right" size={10} color={tokens.colors.accent} />
            </View>
          </Pressable>

          {!hasPaidAccess ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="KureCal Pro"
              onPress={() => go("/paywall")}
              style={({ pressed }) => [
                styles.upgradeBanner,
                {
                  backgroundColor: tokens.colors.accentSoft,
                  borderColor: tokens.colors.borderStrong,
                  opacity: pressed ? 0.76 : 1,
                },
              ]}
            >
              <FontAwesome name="star" size={14} color={tokens.colors.accent} />
              <View style={styles.upgradeCopy}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.upgradeTitle,
                    { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                  ]}
                >
                  KureCal Pro
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.upgradeMeta,
                    { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
                  ]}
                >
                  Upgrade recommendations and planning.
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={10} color={tokens.colors.accent} />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit event"
            onPress={() => go("/submit-event")}
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor: pressed ? tokens.colors.pillActive : tokens.colors.accent,
              },
            ]}
          >
            <FontAwesome name="plus" size={14} color={tokens.colors.textInverse} />
            <Text
              style={[
                styles.primaryActionLabel,
                { color: tokens.colors.textInverse, fontFamily: tokens.typography.sans },
              ]}
            >
              Submit event
            </Text>
          </Pressable>

          {groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text
                style={[
                  styles.groupTitle,
                  { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
                ]}
              >
                {group.title}
              </Text>
              <View
                style={[
                  styles.groupRows,
                  {
                    borderColor: tokens.colors.border,
                    backgroundColor: isDark
                      ? "rgba(18, 19, 20, 0.44)"
                      : "rgba(255, 255, 255, 0.36)",
                  },
                ]}
              >
                {group.rows.map((row, index) => {
                  const isLast = index === group.rows.length - 1;
                  return (
                    <Pressable
                      key={row.key}
                      accessibilityRole="button"
                      accessibilityLabel={row.label}
                      onPress={() => handleRowPress(row)}
                      style={({ pressed }) => [
                        styles.row,
                        {
                          backgroundColor: pressed
                            ? tokens.colors.surfaceStrong
                            : "transparent",
                          borderBottomColor: isLast ? "transparent" : tokens.colors.divider,
                        },
                      ]}
                    >
                      <FontAwesome
                        name={row.icon}
                        size={15}
                        color={row.destructive ? tokens.colors.danger : tokens.colors.textSecondary}
                        style={styles.rowIcon}
                      />
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit={row.label.length > 22}
                        minimumFontScale={0.88}
                        style={[
                          styles.rowLabel,
                          {
                            color: row.destructive
                              ? tokens.colors.danger
                              : tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {row.label}
                      </Text>
                      <FontAwesome
                        name="chevron-right"
                        size={10}
                        color={tokens.colors.textTertiary}
                        style={styles.rowChevron}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
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
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  profileBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 5,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "700",
  },
  profileMeta: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
  },
  profileAction: {
    alignItems: "center",
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  upgradeBanner: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  upgradeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  upgradeTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  upgradeMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 6,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  primaryActionLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 2,
  },
  groupRows: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 18,
    textAlign: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  rowChevron: {
    marginLeft: 4,
  },
});
