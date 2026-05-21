import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import type {
  MobileCalendarConnectionStatus,
  NormalizedSubscription,
} from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDetailScaffold,
  SettingsDivider,
  SettingsFieldLabel,
  SettingsGroup,
  SettingsRow,
} from "../../src/components/settings/mobile-settings-ui";
import { getDeviceCalendarPermissionStatus } from "../../src/lib/deviceCalendarSync";
import { startGoogleCalendarOAuth } from "../../src/lib/googleCalendarOAuth";
import {
  bulkSyncMobileGoogleCalendar,
  disconnectMobileGoogleCalendar,
  loadMobileGoogleCalendarStatus,
  loadMobileSubscriptionStatus,
} from "../../src/lib/mobileApi";
import { hasPaidAccess } from "../../src/lib/settingsPresentation";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsCalendarRoute() {
  const { tokens } = useAppTheme();
  const [subscription, setSubscription] =
    useState<NormalizedSubscription | null>(null);
  const [googleCalendarStatus, setGoogleCalendarStatus] =
    useState<MobileCalendarConnectionStatus | null>(null);
  const [appleCalendarPermission, setAppleCalendarPermission] =
    useState("unknown");
  const [loading, setLoading] = useState(false);
  const platformSettingsLabel =
    Platform.OS === "ios" ? "iOS Settings" : "your device settings";

  const refreshCalendarIntegrations = useCallback(async () => {
    const [nextSubscription, nextGoogleStatus, nextApplePermission] =
      await Promise.all([
        loadMobileSubscriptionStatus().catch(() => null),
        loadMobileGoogleCalendarStatus().catch(() => null),
        getDeviceCalendarPermissionStatus().catch(() => "unknown"),
      ]);

    setSubscription(nextSubscription);
    setGoogleCalendarStatus(nextGoogleStatus);
    setAppleCalendarPermission(nextApplePermission);
  }, []);

  useEffect(() => {
    void refreshCalendarIntegrations();
  }, [refreshCalendarIntegrations]);

  async function handleConnectGoogleCalendar() {
    if (loading) {
      return;
    }

    if (!hasPaidAccess(subscription)) {
      router.push("../paywall" as never);
      return;
    }

    setLoading(true);

    try {
      const connected = await startGoogleCalendarOAuth();
      if (!connected) {
        Alert.alert(
          "Google Calendar authorization cancelled",
          "No changes were made to your calendar integration.",
        );
        return;
      }

      await bulkSyncMobileGoogleCalendar().catch((syncError) => {
        console.warn("Initial Google Calendar bulk sync failed", syncError);
      });
      await refreshCalendarIntegrations();
      Alert.alert(
        "Google Calendar connected",
        "Saved and attending events can now sync to Google Calendar.",
      );
    } catch (nextError) {
      Alert.alert(
        "Google Calendar connection failed",
        nextError instanceof Error ? nextError.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnectGoogleCalendar() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const nextStatus = await disconnectMobileGoogleCalendar();
      setGoogleCalendarStatus(nextStatus);
      Alert.alert(
        "Google Calendar disconnected",
        "New event changes will no longer sync to Google Calendar.",
      );
    } catch (nextError) {
      Alert.alert(
        "Disconnect failed",
        nextError instanceof Error ? nextError.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatGoogleCalendarDescription() {
    if (!hasPaidAccess(subscription)) {
      return "Upgrade to sync saved and attending events across devices.";
    }

    if (!googleCalendarStatus) {
      return "Checking Google Calendar connection.";
    }

    if (googleCalendarStatus.connected && googleCalendarStatus.isActive) {
      const syncStatus = googleCalendarStatus.lastSyncStatus
        ? ` Last sync: ${googleCalendarStatus.lastSyncStatus}.`
        : "";
      return `Connected to ${googleCalendarStatus.calendarId ?? "Google Calendar"}.${syncStatus}`;
    }

    if (googleCalendarStatus.status === "needs_reauth") {
      return "Reconnect Google Calendar to refresh calendar permissions.";
    }

    if (googleCalendarStatus.status === "failed") {
      return (
        googleCalendarStatus.lastSyncError ?? "Google Calendar sync failed."
      );
    }

    return "Connect Google Calendar for cross-device calendar sync.";
  }

  function formatDeviceCalendarDescription() {
    if (appleCalendarPermission === "granted") {
      return "Device Calendar saves are enabled on this device. Default reminder: 15 minutes before start.";
    }

    if (appleCalendarPermission === "denied") {
      return `Calendar access is denied. Enable access in ${platformSettingsLabel} to save local events.`;
    }

    return "Device Calendar saves happen locally on this device when you add an event.";
  }

  const googleConnected = Boolean(
    googleCalendarStatus?.connected && googleCalendarStatus.isActive,
  );

  return (
    <SettingsDetailScaffold
      subtitle="Sync"
      title="Calendar integrations"
    >
      <SettingsGroup style={styles.group}>
        <SettingsFieldLabel>Google Calendar</SettingsFieldLabel>
        <Text
          style={[
            styles.description,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {formatGoogleCalendarDescription()}
        </Text>
        <SettingsButton
          disabled={loading}
          label={
            loading
              ? "Working..."
              : googleConnected
                ? "Disconnect Google"
                : hasPaidAccess(subscription)
                  ? "Connect Google"
                  : "Upgrade to sync"
          }
          onPress={() => {
            void (googleConnected
              ? handleDisconnectGoogleCalendar()
              : handleConnectGoogleCalendar());
          }}
          variant={googleConnected ? "secondary" : "primary"}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="calendar"
          rightLabel={
            appleCalendarPermission === "granted"
              ? "Enabled"
              : appleCalendarPermission === "denied"
                ? "Denied"
                : "Local"
          }
          showChevron={false}
          subtitle={formatDeviceCalendarDescription()}
          title="Device Calendar"
        />
        <SettingsDivider />
        <SettingsRow
          icon="arrow.clockwise"
          onPress={() => {
            void refreshCalendarIntegrations();
          }}
          title="Refresh status"
        />
      </SettingsGroup>
    </SettingsDetailScaffold>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 12,
    padding: 16,
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
