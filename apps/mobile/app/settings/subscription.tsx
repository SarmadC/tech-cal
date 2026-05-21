import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import type { NormalizedSubscription } from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDetailScaffold,
  SettingsFieldLabel,
  SettingsGroup,
} from "../../src/components/settings/mobile-settings-ui";
import { loadMobileSubscriptionStatus } from "../../src/lib/mobileApi";
import {
  formatSubscriptionSummary,
  hasPaidAccess,
} from "../../src/lib/settingsPresentation";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsSubscriptionRoute() {
  const { tokens } = useAppTheme();
  const [subscription, setSubscription] =
    useState<NormalizedSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshSubscription() {
    setLoading(true);

    try {
      const nextSubscription = await loadMobileSubscriptionStatus();
      setSubscription(nextSubscription);
      setError(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to refresh your subscription",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSubscription();
  }, []);

  return (
    <SettingsDetailScaffold
      footer={
        <SettingsButton
          label={hasPaidAccess(subscription) ? "Manage subscription" : "Unlock KureCal Pro"}
          onPress={() => router.push("../paywall" as never)}
        />
      }
      subtitle="Billing"
      title="KureCal Pro"
    >
      <SettingsGroup style={styles.group}>
        <SettingsFieldLabel>Plan</SettingsFieldLabel>
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {loading && !subscription
            ? "Checking access..."
            : formatSubscriptionSummary(subscription)}
        </Text>
        <Text
          style={[
            styles.description,
            {
              color: error ? tokens.colors.danger : tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {error
            ? error
            : hasPaidAccess(subscription)
              ? "Your mobile upgrade flow is active. Manage renewals, restore access, or review your plan from the native paywall."
              : "Upgrade to unlock full recommendations, calendar sync, and unlimited saved events inside the Expo app."}
        </Text>
        {error ? (
          <SettingsButton
            label="Refresh status"
            onPress={() => {
              void refreshSubscription();
            }}
            variant="secondary"
          />
        ) : null}
      </SettingsGroup>
    </SettingsDetailScaffold>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 12,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
