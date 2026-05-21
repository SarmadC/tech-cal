import { useEffect, useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import type { MobileProfileUpdate } from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDetailScaffold,
  SettingsFieldLabel,
  SettingsGroup,
} from "../../src/components/settings/mobile-settings-ui";
import { useAuth } from "../../src/context/AuthProvider";
import { updateMobileProfile } from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsProfileRoute() {
  const { profile, refreshProfile } = useAuth();
  const { tokens } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<MobileProfileUpdate>({
    fullName: null,
    headline: null,
    timezone: null,
    username: null,
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraft({
      fullName: profile.profile.fullName ?? null,
      headline: profile.socialProfile.headline ?? null,
      timezone: profile.profile.timezone ?? null,
      username: profile.socialProfile.username ?? null,
    });
  }, [profile]);

  async function handleSave() {
    setSaving(true);

    try {
      await updateMobileProfile(draft);
      await refreshProfile();
      Alert.alert("Profile saved", "Your mobile profile settings are updated.");
    } catch (nextError) {
      Alert.alert(
        "Save failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to save your profile",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: tokens.colors.input,
      borderColor: tokens.colors.borderStrong,
      color: tokens.colors.textPrimary,
      fontFamily: tokens.typography.sans,
    },
  ];

  return (
    <SettingsDetailScaffold
      footer={
        <SettingsButton
          disabled={saving}
          label={saving ? "Saving..." : "Save profile"}
          onPress={() => {
            void handleSave();
          }}
        />
      }
      subtitle="Identity"
      title="Profile fields"
    >
      <SettingsGroup style={styles.formGroup}>
        <View style={styles.field}>
          <SettingsFieldLabel>Full name</SettingsFieldLabel>
          <TextInput
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, fullName: value || null }))
            }
            placeholder="Full name"
            placeholderTextColor={tokens.colors.textTertiary}
            style={inputStyle}
            value={draft.fullName ?? ""}
          />
        </View>

        <View style={styles.field}>
          <SettingsFieldLabel helper="Current username.">
            Username
          </SettingsFieldLabel>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, username: value || null }))
            }
            placeholder="Username"
            placeholderTextColor={tokens.colors.textTertiary}
            style={inputStyle}
            value={draft.username ?? ""}
          />
        </View>

        <View style={styles.field}>
          <SettingsFieldLabel>Headline</SettingsFieldLabel>
          <TextInput
            multiline
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, headline: value || null }))
            }
            placeholder="Headline"
            placeholderTextColor={tokens.colors.textTertiary}
            style={[inputStyle, styles.multilineInput]}
            textAlignVertical="top"
            value={draft.headline ?? ""}
          />
        </View>

        <View style={styles.field}>
          <SettingsFieldLabel>Timezone</SettingsFieldLabel>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, timezone: value || null }))
            }
            placeholder="America/Denver"
            placeholderTextColor={tokens.colors.textTertiary}
            style={inputStyle}
            value={draft.timezone ?? ""}
          />
        </View>
      </SettingsGroup>
    </SettingsDetailScaffold>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    gap: 18,
    padding: 16,
  },
  field: {
    gap: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 17,
    fontWeight: "600",
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 112,
  },
});
