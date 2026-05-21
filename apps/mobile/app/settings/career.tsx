import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  SettingsButton,
  SettingsDetailScaffold,
  SettingsFieldLabel,
  SettingsGroup,
} from "../../src/components/settings/mobile-settings-ui";
import { useAuth } from "../../src/context/AuthProvider";
import { formatCareerSummary } from "../../src/lib/settingsPresentation";
import { useAppTheme } from "../../src/providers/ThemeProvider";

export default function SettingsCareerRoute() {
  const { hasCompletedOnboarding, profile } = useAuth();
  const { tokens } = useAppTheme();
  const careerSummary = formatCareerSummary(profile?.careerProfile);
  const skills = profile?.careerProfile?.primarySkills ?? [];

  return (
    <SettingsDetailScaffold
      footer={
        <SettingsButton
          label={
            hasCompletedOnboarding
              ? "Edit career profile"
              : "Complete onboarding"
          }
          onPress={() =>
            router.push({
              pathname: "../onboarding",
              params: { resume: "1" },
            } as never)
          }
        />
      }
      subtitle="Career"
      title="Recommendation inputs"
    >
      <SettingsGroup style={styles.group}>
        <SettingsFieldLabel>Current inputs</SettingsFieldLabel>
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {hasCompletedOnboarding
            ? (careerSummary ?? "Career profile completed.")
            : "Finish onboarding"}
        </Text>
        <Text
          style={[
            styles.description,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {hasCompletedOnboarding
            ? "These inputs tune your event recommendations, networking prompts, and calendar prioritization."
            : "Complete onboarding to unlock personalized recommendations."}
        </Text>

        {skills.length ? (
          <View style={styles.chipRow}>
            {skills.slice(0, 8).map((skill) => (
              <View
                key={skill}
                style={[
                  styles.chip,
                  {
                    backgroundColor: tokens.colors.surfaceStrong,
                    borderColor: tokens.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {skill}
                </Text>
              </View>
            ))}
          </View>
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
});
