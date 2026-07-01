import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { MobileProfileUpdate } from "@kurecal/domain";

import {
  SettingsButton,
  SettingsDetailScaffold,
} from "../../src/components/settings/mobile-settings-ui";
import { useAuth } from "../../src/context/AuthProvider";
import { updateMobileProfile } from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsProfileRoute() {
  const { profile, refreshProfile } = useAuth();
  const { tokens } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "fullName" | "username" | "headline" | "bio" | null
  >(null);
  const [draft, setDraft] = useState<MobileProfileUpdate>({
    bio: null,
    fullName: null,
    headline: null,
    username: null,
  });

  useEffect(() => {
    if (!profile) {
      return;
    }

    setDraft({
      bio: profile.socialProfile.bio ?? null,
      fullName: profile.profile.fullName ?? null,
      headline: profile.socialProfile.headline ?? null,
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
      fontSize: tokens.typography.body,
      borderRadius: tokens.radius.md,
    },
  ];

  return (
    <SettingsDetailScaffold
      footer={
        <View style={styles.footerButton}>
          <SettingsButton
            disabled={saving}
            label={saving ? "Saving..." : "Save profile"}
            onPress={() => {
              void handleSave();
            }}
          />
        </View>
      }
      title="Profile fields"
    >
      <View style={styles.formGroup}>
        <View style={styles.field}>
          <ProfileFieldLabel label="Full name" />
          <TextInput
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, fullName: value || null }))
            }
            onFocus={() => setFocusedField("fullName")}
            onBlur={() => setFocusedField(null)}
            placeholder="Full name"
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              inputStyle,
              focusedField === "fullName"
                ? { borderColor: tokens.colors.accent }
                : null,
            ]}
            value={draft.fullName ?? ""}
          />
        </View>

        <View style={styles.field}>
          <ProfileFieldLabel
            helper="Shown on your public profile URL."
            label="Username"
          />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, username: value || null }))
            }
            onFocus={() => setFocusedField("username")}
            onBlur={() => setFocusedField(null)}
            placeholder="Username"
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              inputStyle,
              focusedField === "username"
                ? { borderColor: tokens.colors.accent }
                : null,
            ]}
            value={draft.username ?? ""}
          />
        </View>

        <View style={styles.field}>
          <ProfileFieldLabel
            helper="Your role, team, or professional label."
            label="Role headline"
          />
          <TextInput
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, headline: value || null }))
            }
            onFocus={() => setFocusedField("headline")}
            onBlur={() => setFocusedField(null)}
            placeholder="Data Analyst at Explore Edmonton"
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              inputStyle,
              focusedField === "headline"
                ? { borderColor: tokens.colors.accent }
                : null,
            ]}
            value={draft.headline ?? ""}
          />
        </View>

        <View style={styles.field}>
          <ProfileFieldLabel
            helper="One or two sentences visitors see under your name."
            label="About"
          />
          <TextInput
            maxLength={220}
            multiline
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, bio: value || null }))
            }
            onFocus={() => setFocusedField("bio")}
            onBlur={() => setFocusedField(null)}
            placeholder="Unlocking stories through data. Building bridges in the tech ecosystem."
            placeholderTextColor={tokens.colors.textTertiary}
            style={[
              inputStyle,
              styles.bioInput,
              focusedField === "bio"
                ? { borderColor: tokens.colors.accent }
                : null,
            ]}
            textAlignVertical="top"
            value={draft.bio ?? ""}
          />
        </View>
      </View>
    </SettingsDetailScaffold>
  );
}

function ProfileFieldLabel({
  helper,
  label,
}: {
  helper?: string;
  label: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.labelWrap}>
      <Text
        style={[
          styles.label,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
      {helper ? (
        <Text
          style={[
            styles.helper,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  formGroup: {
    gap: 12,
  },
  field: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    fontWeight: "400",
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  labelWrap: {
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 0,
  },
  helper: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  bioInput: {
    minHeight: 96,
  },
  footerButton: {
    marginHorizontal: 16,
  },
});
