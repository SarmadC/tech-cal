import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileProfileUpdate, ProfileVisibility } from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDetailScaffold,
  SettingsFieldLabel,
  SettingsGroup,
  SettingsSwitchRow,
} from "../../src/components/settings/mobile-settings-ui";
import { useAuth } from "../../src/context/AuthProvider";
import { updateMobileProfile } from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

const VISIBILITY_OPTIONS: Array<{
  description: string;
  label: string;
  value: ProfileVisibility;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can see your profile details.",
  },
  {
    value: "connections",
    label: "Connections",
    description: "Approved connections can view your profile.",
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone can view your public profile card.",
  },
];

export default function SettingsPrivacyRoute() {
  const { profile, refreshProfile } = useAuth();
  const { tokens } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<MobileProfileUpdate>({
    profileVisibility: "private",
    showAttendance: false,
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraft({
      profileVisibility: profile.socialProfile.profileVisibility,
      showAttendance: profile.socialProfile.showAttendance,
    });
  }, [profile]);

  async function handleSave() {
    setSaving(true);

    try {
      await updateMobileProfile(draft);
      await refreshProfile();
      Alert.alert("Privacy saved", "Your visibility settings are updated.");
    } catch (nextError) {
      Alert.alert(
        "Save failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to save your privacy settings",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsDetailScaffold
      footer={
        <SettingsButton
          disabled={saving}
          label={saving ? "Saving..." : "Save privacy"}
          onPress={() => {
            void handleSave();
          }}
        />
      }
      subtitle="Privacy"
      title="Visibility and attendance"
    >
      <SettingsGroup style={styles.group}>
        <SettingsFieldLabel>Profile visibility</SettingsFieldLabel>
        <View style={styles.segmentRow}>
          {VISIBILITY_OPTIONS.map((option) => {
            const selected = draft.profileVisibility === option.value;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option.value}
                onPress={() =>
                  setDraft((current) => ({
                    ...current,
                    profileVisibility: option.value,
                  }))
                }
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
                  numberOfLines={2}
                  style={[
                    styles.segmentLabel,
                    {
                      color: selected
                        ? tokens.colors.textPrimary
                        : tokens.colors.textSecondary,
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
            VISIBILITY_OPTIONS.find(
              (option) => option.value === draft.profileVisibility,
            )?.description
          }
        </Text>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsSwitchRow
          icon="person.2"
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, showAttendance: value }))
          }
          subtitle="Show saved-event attendance to approved profile viewers."
          title="Show attendance"
          value={draft.showAttendance ?? false}
        />
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
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
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
