import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { BlockedUserSummary } from "@kurecal/domain";

import {
  SettingsAvatar,
  SettingsButton,
  SettingsDetailScaffold,
  SettingsGroup,
} from "../../src/components/settings/mobile-settings-ui";
import {
  loadMobileBlockedUsers,
  unblockMobileUser,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

function buildInitials(user: BlockedUserSummary) {
  const source = user.fullName || user.username || "Blocked user";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function isSafeAvatarUrl(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export default function BlockedUsersSettingsRoute() {
  const { tokens } = useAppTheme();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    setError(null);
    const users = await loadMobileBlockedUsers();
    setBlockedUsers(users);
  }, []);

  useEffect(() => {
    let active = true;

    loadBlockedUsers()
      .catch((nextError) => {
        if (!active) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load blocked users",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadBlockedUsers]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadBlockedUsers();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to refresh blocked users",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function confirmUnblock(user: BlockedUserSummary) {
    const label = user.fullName || user.username || "this user";

    Alert.alert("Unblock user", `Allow ${label} to appear again?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        style: "destructive",
        onPress: () => {
          void handleUnblock(user);
        },
      },
    ]);
  }

  async function handleUnblock(user: BlockedUserSummary) {
    const previous = blockedUsers;
    setPendingId(user.id);
    setBlockedUsers((current) => current.filter((item) => item.id !== user.id));

    try {
      await unblockMobileUser(user.id);
    } catch (nextError) {
      setBlockedUsers(previous);
      Alert.alert(
        "Unblock failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to unblock this user",
      );
    } finally {
      setPendingId(null);
    }
  }

  const content =
    loading && blockedUsers.length === 0 ? (
      <Text
        style={[
          styles.stateText,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        Loading blocked users...
      </Text>
    ) : error ? (
      <View style={styles.stateStack}>
        <Text
          style={[
            styles.stateText,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {error}
        </Text>
        <SettingsButton
          disabled={refreshing}
          label={refreshing ? "Retrying..." : "Retry"}
          onPress={() => {
            void refresh();
          }}
          variant="secondary"
        />
      </View>
    ) : blockedUsers.length === 0 ? (
      <Text
        style={[
          styles.stateText,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        You have not blocked anyone.
      </Text>
    ) : (
      blockedUsers.map((user) => (
        <BlockedUserRow
          disabled={pendingId === user.id}
          key={user.id}
          onUnblock={() => confirmUnblock(user)}
          user={user}
        />
      ))
    );

  return (
    <SettingsDetailScaffold
      action={
        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          onPress={() => {
            void refresh();
          }}
          style={({ pressed }) => [
            styles.refreshButton,
            {
              borderColor: tokens.colors.border,
              backgroundColor: tokens.colors.input,
            },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text
            style={[
              styles.refreshText,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {refreshing ? "..." : "Refresh"}
          </Text>
        </Pressable>
      }
      subtitle="Privacy"
      title="Blocked users"
    >
      <SettingsGroup style={styles.group}>{content}</SettingsGroup>
    </SettingsDetailScaffold>
  );
}

function BlockedUserRow({
  disabled,
  onUnblock,
  user,
}: {
  disabled: boolean;
  onUnblock: () => void;
  user: BlockedUserSummary;
}) {
  const { tokens } = useAppTheme();
  const title = user.fullName || user.username || "Blocked user";
  const subtitle = user.headline || (user.username ? `@${user.username}` : "Blocked profile");

  return (
    <View style={[styles.row, { borderBottomColor: tokens.colors.divider }]}>
      {isSafeAvatarUrl(user.avatarUrl) ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
      ) : (
        <SettingsAvatar initials={buildInitials(user)} size={44} />
      )}
      <View style={styles.rowCopy}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.rowSubtitle,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onUnblock}
        style={({ pressed }) => [
          styles.unblockButton,
          {
            borderColor: tokens.colors.borderStrong,
          },
          pressed ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
      >
        <Text
          style={[
            styles.unblockButtonText,
            {
              color: tokens.colors.danger,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {disabled ? "..." : "Unblock"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    padding: 0,
  },
  stateStack: {
    gap: 12,
    padding: 16,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  rowSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  avatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  refreshButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  unblockButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 82,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  unblockButtonText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.45,
  },
});
