import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
    View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import type {
    MobileCalendarConnectionStatus,
    NormalizedSubscription,
} from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDetailScaffold,
} from "../../src/components/settings/mobile-settings-ui";
import { startGoogleCalendarOAuth } from "../../src/lib/googleCalendarOAuth";
import {
    bulkSyncMobileGoogleCalendar,
    disconnectMobileGoogleCalendar,
    loadMobileGoogleCalendarStatus,
    loadMobileSubscriptionStatus,
} from "../../src/lib/mobileApi";
import { hasPaidAccess } from "../../src/lib/settingsPresentation";
import { useAppTheme } from "../../src/providers/ThemeProvider";

function GoogleMark({ size = 22 }: { size?: number }) {
    return (
        <Svg height={size} viewBox="0 0 24 24" width={size}>
            <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <Path
                d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.98 10.98 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </Svg>
    );
}

export default function SettingsCalendarRoute() {
    const { tokens } = useAppTheme();
  const [subscription, setSubscription] =
    useState<NormalizedSubscription | null>(null);
  const [googleCalendarStatus, setGoogleCalendarStatus] =
    useState<MobileCalendarConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingGoogleCalendar, setSyncingGoogleCalendar] = useState(false);

  const refreshCalendarIntegrations = useCallback(async () => {
    const [nextSubscription, nextGoogleStatus] = await Promise.all([
      loadMobileSubscriptionStatus().catch(() => null),
      loadMobileGoogleCalendarStatus().catch(() => null),
    ]);

    setSubscription(nextSubscription);
    setGoogleCalendarStatus(nextGoogleStatus);
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

    async function handleSyncGoogleCalendar() {
        if (loading || syncingGoogleCalendar) {
            return;
        }

        setSyncingGoogleCalendar(true);

        try {
            const result = await bulkSyncMobileGoogleCalendar();
            await refreshCalendarIntegrations();
            Alert.alert(
                "Google Calendar synced",
                result.total > 0
                    ? `Synced ${result.synced} of ${result.total} saved and attending events.`
                    : "Your saved and attending events are up to date.",
            );
        } catch (nextError) {
            Alert.alert(
                "Calendar sync failed",
                nextError instanceof Error ? nextError.message : "Please try again.",
            );
        } finally {
            setSyncingGoogleCalendar(false);
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

  const googleConnected = Boolean(
        googleCalendarStatus?.connected && googleCalendarStatus.isActive,
    );

    function formatLastSync() {
        if (!googleCalendarStatus?.lastSyncAt) {
            return googleCalendarStatus?.lastSyncStatus === "success"
                ? "Synced successfully"
                : "Ready to sync";
        }

        const syncTime = new Date(googleCalendarStatus.lastSyncAt);
        const elapsedMinutes = Math.max(
            0,
            Math.floor((Date.now() - syncTime.getTime()) / 60000),
        );

        if (elapsedMinutes < 1) {
            return "Synced just now";
        }

        if (elapsedMinutes < 60) {
            return `Synced ${elapsedMinutes}m ago`;
        }

        return `Synced ${syncTime.toLocaleDateString()}`;
    }

    return (
        <SettingsDetailScaffold
            title="Integrations"
        >
            <View>
                <View style={[styles.sectionDivider, { backgroundColor: tokens.colors.divider }]} />
                <View style={styles.googleRow}>
                    <View
                        style={[
                            styles.googleMarkFrame,
                            {
                                backgroundColor: tokens.colors.surfaceMuted,
                                borderColor: tokens.colors.borderStrong,
                            },
                        ]}
                    >
                        <GoogleMark />
                    </View>
                    <View style={styles.googleCopy}>
                        <View style={styles.googleTitleRow}>
                            <Text
                                style={[
                                    styles.googleTitle,
                                    {
                                        color: tokens.colors.textPrimary,
                                        fontFamily: tokens.typography.sans,
                                    },
                                ]}
                            >
                                Google Calendar
                            </Text>
                            {googleConnected ? (
                                <View
                                    accessibilityLabel="Connected"
                                    style={[
                                        styles.connectedDot,
                                        { backgroundColor: tokens.colors.success },
                                    ]}
                                />
                            ) : null}
                        </View>
                        <Text
                            numberOfLines={1}
                            selectable
                            style={[
                                styles.googleSubtitle,
                                {
                                    color: tokens.colors.textTertiary,
                                    fontFamily: tokens.typography.sans,
                                },
                            ]}
                        >
                            {googleConnected
                                ? googleCalendarStatus?.calendarId ?? "Connected"
                                : formatGoogleCalendarDescription()}
                        </Text>
                    </View>

                    {googleConnected ? (
                        <View style={styles.googleActions}>
                            <Pressable
                                accessibilityLabel="Sync Google Calendar now"
                                accessibilityHint={formatLastSync()}
                                accessibilityRole="button"
                                disabled={loading || syncingGoogleCalendar}
                                onPress={() => {
                                    void handleSyncGoogleCalendar();
                                }}
                                style={({ pressed }) => [
                                    styles.syncButton,
                                    {
                                        backgroundColor: tokens.colors.surfaceMuted,
                                        borderColor: tokens.colors.borderStrong,
                                    },
                                    pressed ? styles.pressed : null,
                                    loading || syncingGoogleCalendar ? styles.disabled : null,
                                ]}
                            >
                                {syncingGoogleCalendar ? (
                                    <ActivityIndicator
                                        color={tokens.colors.textTertiary}
                                        size="small"
                                    />
                                ) : (
                                    <SymbolView
                                        name="arrow.clockwise"
                                        size={17}
                                        tintColor={tokens.colors.textTertiary}
                                        type="monochrome"
                                    />
                                )}
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                disabled={loading || syncingGoogleCalendar}
                                onPress={() => {
                                    void handleDisconnectGoogleCalendar();
                                }}
                                style={({ pressed }) => [
                                    styles.disconnectButton,
                                    {
                                        backgroundColor:
                                            tokens.mode === "dark"
                                                ? "rgba(255, 180, 171, 0.12)"
                                                : "rgba(220, 38, 38, 0.09)",
                                        borderColor:
                                            tokens.mode === "dark"
                                                ? "rgba(255, 180, 171, 0.22)"
                                                : "rgba(220, 38, 38, 0.18)",
                                    },
                                    pressed ? styles.pressed : null,
                                    loading || syncingGoogleCalendar ? styles.disabled : null,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.disconnectLabel,
                                        {
                                            color: tokens.colors.danger,
                                            fontFamily: tokens.typography.sans,
                                        },
                                    ]}
                                >
                                    {loading ? "Disconnecting..." : "Disconnect"}
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <SettingsButton
                            disabled={loading}
                            label={
                                loading
                                    ? "Working..."
                                    : hasPaidAccess(subscription)
                                        ? "Connect"
                                        : "Upgrade"
                            }
                            onPress={() => {
                                void handleConnectGoogleCalendar();
                            }}
                        />
          )}
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
    googleRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    googleMarkFrame: {
        alignItems: "center",
        borderRadius: 8,
        borderWidth: 1,
        height: 40,
        justifyContent: "center",
        width: 40,
    },
    googleCopy: {
        flex: 1,
        gap: 3,
        minWidth: 0,
    },
    googleTitleRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    googleTitle: {
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
    },
    connectedDot: {
        borderRadius: 5,
        height: 8,
        width: 8,
    },
    googleSubtitle: {
        fontSize: 13,
        fontWeight: "400",
        lineHeight: 18,
    },
    googleActions: {
        flexDirection: "row",
        flexShrink: 0,
        gap: 6,
    },
    syncButton: {
        alignItems: "center",
        borderRadius: 7,
        borderWidth: 1,
        height: 34,
        justifyContent: "center",
        width: 36,
    },
    disconnectButton: {
        alignItems: "center",
        borderRadius: 7,
        borderWidth: 1,
        height: 34,
        justifyContent: "center",
        minWidth: 92,
        paddingHorizontal: 10,
    },
    disconnectLabel: {
        fontSize: 13,
        fontWeight: "600",
        lineHeight: 20,
    },
    pressed: {
        opacity: 0.76,
        transform: [{ scale: 0.992 }],
    },
    disabled: {
        opacity: 0.48,
    },
});
