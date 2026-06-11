import { useEffect, useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  MobileCareerOnboardingBootstrap,
  MobileCareerOnboardingData,
} from '@kurecal/domain';

import { ScreenStateView } from '../src/components/ScreenStateView';
import { useAuth } from '../src/context/AuthProvider';
import {
  completeMobileCareerOnboarding,
  loadMobileCareerOnboardingBootstrap,
  skipMobileCareerOnboarding,
} from '../src/lib/mobileApi';

const GOAL_OPTIONS = [
  { value: 'skill-development', label: 'Learn new skills' },
  { value: 'role-transition', label: 'Change roles' },
  { value: 'leadership-growth', label: 'Develop leadership' },
  { value: 'networking', label: 'Build your network' },
] as const;

const TIMEFRAME_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'short-term', label: 'Short-term' },
  { value: 'medium-term', label: 'Medium-term' },
  { value: 'long-term', label: 'Long-term' },
] as const;

const LEARNING_STYLE_OPTIONS = [
  { value: 'hands-on', label: 'Hands-on' },
  { value: 'theoretical', label: 'Lectures' },
  { value: 'interactive', label: 'Discussion' },
  { value: 'networking', label: 'Networking' },
] as const;

const NETWORKING_GOAL_OPTIONS = [
  { value: 'find-mentors', label: 'Find mentors' },
  { value: 'find-peers', label: 'Meet peers' },
  { value: 'find-collaborators', label: 'Find collaborators' },
] as const;

const SENIORITY_OPTIONS = [
  'student',
  'entry-level',
  'junior',
  'mid-level',
  'senior',
  'staff',
  'lead',
  'manager',
  'director',
  'vp',
  'founder',
] as const;

function buildEmptyDraft(): MobileCareerOnboardingData {
  return {
    step1_role: {
      currentRole: '',
      seniority: 'mid-level',
      industry: '',
      companySize: 'medium',
    },
    step2_skills: {
      primarySkills: [],
      skillsToLearn: [],
      interests: [],
    },
    step3_goals: {
      careerGoals: [],
      timeframe: 'medium-term',
    },
    step4_preferences: {
      targetPath: '',
      learningStyle: [],
      availableTime: 'moderate',
      budget: 'moderate',
    },
    step5_networking: {
      networkingGoals: [],
      preferredEventTypes: [],
    },
    step6_teamBuilding: {
      teamRole: 'flexible',
      collaborationStyle: [],
      teamSizePreference: 'flexible',
      communicationPreferences: [],
      teamGoals: [],
      mentorshipPreference: 'neither',
      availabilityPattern: null,
      projectTypePreferences: [],
    },
  };
}

function parseDelimitedList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function listToText(values: string[]) {
  return values.join(', ');
}

function toggleValue(values: string[], candidate: string, max?: number) {
  const exists = values.includes(candidate);
  if (exists) {
    return values.filter((value) => value !== candidate);
  }

  if (max && values.length >= max) {
    return [...values.slice(1), candidate];
  }

  return [...values, candidate];
}

function formatSeniority(label: string) {
  return label
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getStepError(step: number, draft: MobileCareerOnboardingData) {
  if (step === 0) {
    if (!draft.step1_role.currentRole.trim()) {
      return 'Choose your current role.';
    }
    if (!draft.step1_role.seniority.trim()) {
      return 'Choose your seniority.';
    }
    return null;
  }

  if (step === 1) {
    if (draft.step2_skills.primarySkills.length < 2) {
      return 'Add at least two current skills.';
    }
    return null;
  }

  if (step === 2) {
    if (draft.step3_goals.careerGoals.length === 0) {
      return 'Choose at least one career goal.';
    }
    if (!draft.step3_goals.timeframe.trim()) {
      return 'Choose a timeline.';
    }
  }

  return null;
}

export default function OnboardingScreen() {
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const allowManualOpen = resume === '1' || resume === 'true';
  const { profile, refreshProfile } = useAuth();
  const [bootstrap, setBootstrap] = useState<MobileCareerOnboardingBootstrap | null>(
    null
  );
  const [draft, setDraft] = useState<MobileCareerOnboardingData>(buildEmptyDraft());
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoleGroup, setActiveRoleGroup] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadBootstrap() {
      setLoading(true);
      try {
        const nextBootstrap = await loadMobileCareerOnboardingBootstrap();
        if (cancelled) {
          return;
        }

        setBootstrap(nextBootstrap);
        setDraft(nextBootstrap.initialData ?? buildEmptyDraft());
        setActiveRoleGroup(nextBootstrap.taxonomy.roleGroups[0]?.key ?? '');
        setError(null);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load onboarding'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bootstrap?.status.onboarded && !allowManualOpen) {
      router.replace('./(tabs)/discover');
    }
  }, [allowManualOpen, bootstrap?.status.onboarded]);

  const visibleRoleGroup =
    bootstrap?.taxonomy.roleGroups.find((group) => group.key === activeRoleGroup) ??
    bootstrap?.taxonomy.roleGroups[0] ??
    null;

  const currentSkillSuggestions = useMemo(() => {
    if (!bootstrap || !draft.step1_role.currentRole.trim()) {
      return [];
    }

    return (
      bootstrap.taxonomy.roleSuggestions[draft.step1_role.currentRole]?.current ?? []
    );
  }, [bootstrap, draft.step1_role.currentRole]);

  const learnSkillSuggestions = useMemo(() => {
    if (!bootstrap || !draft.step1_role.currentRole.trim()) {
      return [];
    }

    return (
      bootstrap.taxonomy.roleSuggestions[draft.step1_role.currentRole]?.learn ?? []
    ).filter((skill) => !draft.step2_skills.primarySkills.includes(skill));
  }, [bootstrap, draft.step1_role.currentRole, draft.step2_skills.primarySkills]);

  async function handleSkip() {
    Alert.alert(
      'Skip career setup?',
      'You can finish your career profile later from the Profile tab.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Skip now',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setSubmitting(true);
              try {
                await skipMobileCareerOnboarding();
                await refreshProfile();
                router.replace('./(tabs)/discover');
              } catch (nextError) {
                Alert.alert(
                  'Unable to skip',
                  nextError instanceof Error
                    ? nextError.message
                    : 'Unable to skip onboarding'
                );
              } finally {
                setSubmitting(false);
              }
            })();
          },
        },
      ]
    );
  }

  async function handleContinue() {
    const stepError = getStepError(currentStep, draft);
    if (stepError) {
      Alert.alert('Complete this step', stepError);
      return;
    }

    if (currentStep < 2) {
      setCurrentStep((step) => step + 1);
      return;
    }

    setSubmitting(true);
    try {
      await completeMobileCareerOnboarding(draft);
      await refreshProfile();
      router.replace('./(tabs)/discover');
    } catch (nextError) {
      Alert.alert(
        'Unable to save profile',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to complete onboarding'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Preparing onboarding"
              description="Loading your career profile bootstrap and role suggestions."
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error || !bootstrap) {
    return (
      <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Onboarding unavailable"
              description={error ?? 'Unable to load mobile onboarding.'}
              onRetry={() => {
                router.replace('./onboarding');
              }}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#04151f', '#031018', '#02060b']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroRow}>
              {allowManualOpen ? (
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed ? styles.backButtonPressed : null,
                  ]}
                >
                  <Text style={styles.backLabel}>Back</Text>
                </Pressable>
              ) : <View />}
              <Text style={styles.stepMeta}>Step {currentStep + 1} of 3</Text>
            </View>
            <Text style={styles.eyebrow}>Career setup</Text>
            <Text style={styles.title}>
              {profile?.profile.fullName
                ? `Shape the feed for ${profile.profile.fullName}`
                : 'Tell KureCal what you are building toward'}
            </Text>
            <Text style={styles.subtitle}>
              This tunes recommendations, saved-event context, and your mobile profile.
            </Text>
          </View>

          {currentStep === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your role today</Text>
              <Text style={styles.cardBody}>
                Pick the role family that fits best, then choose your current title and level.
              </Text>

              <View style={styles.chipRow}>
                {bootstrap.taxonomy.roleGroups.map((group) => (
                  <Pressable
                    key={group.key}
                    onPress={() => setActiveRoleGroup(group.key)}
                    style={({ pressed }) => [
                      styles.choiceChip,
                      activeRoleGroup === group.key ? styles.choiceChipSelected : null,
                      pressed ? styles.choiceChipPressed : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{group.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.optionStack}>
                {visibleRoleGroup?.roles.map((role) => {
                  const selected = draft.step1_role.currentRole === role;
                  return (
                    <Pressable
                      key={role}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step1_role: {
                            ...current.step1_role,
                            currentRole: role,
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.optionCard,
                        selected ? styles.optionCardSelected : null,
                        pressed ? styles.optionCardPressed : null,
                      ]}
                    >
                      <Text style={styles.optionTitle}>{role}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Seniority</Text>
              <View style={styles.chipRow}>
                {SENIORITY_OPTIONS.map((option) => {
                  const selected = draft.step1_role.seniority === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step1_role: {
                            ...current.step1_role,
                            seniority: option,
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.choiceChip,
                        selected ? styles.choiceChipSelected : null,
                        pressed ? styles.choiceChipPressed : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>
                        {formatSeniority(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                onChangeText={(value) =>
                  setDraft((current) => ({
                    ...current,
                    step1_role: {
                      ...current.step1_role,
                      industry: value,
                    },
                  }))
                }
                placeholder="Industry focus (optional)"
                placeholderTextColor="#64748b"
                style={styles.input}
                value={draft.step1_role.industry}
              />
            </View>
          ) : null}

          {currentStep === 1 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Skills and interests</Text>
              <Text style={styles.cardBody}>
                Add the skills you already use plus a few areas you want to grow into.
              </Text>

              <Text style={styles.sectionLabel}>Current skills</Text>
              <TextInput
                onChangeText={(value) =>
                  setDraft((current) => ({
                    ...current,
                    step2_skills: {
                      ...current.step2_skills,
                      primarySkills: parseDelimitedList(value),
                    },
                  }))
                }
                placeholder="React, TypeScript, Product strategy"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.multilineInput]}
                multiline
                value={listToText(draft.step2_skills.primarySkills)}
              />
              {currentSkillSuggestions.length > 0 ? (
                <View style={styles.chipRow}>
                  {currentSkillSuggestions.slice(0, 8).map((skill) => (
                    <Pressable
                      key={skill}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step2_skills: {
                            ...current.step2_skills,
                            primarySkills: toggleValue(
                              current.step2_skills.primarySkills,
                              skill
                            ),
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.choiceChip,
                        draft.step2_skills.primarySkills.includes(skill)
                          ? styles.choiceChipSelected
                          : null,
                        pressed ? styles.choiceChipPressed : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>{skill}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Skills to learn</Text>
              <TextInput
                onChangeText={(value) =>
                  setDraft((current) => ({
                    ...current,
                    step2_skills: {
                      ...current.step2_skills,
                      skillsToLearn: parseDelimitedList(value),
                    },
                  }))
                }
                placeholder="AI product design, systems thinking"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.multilineInput]}
                multiline
                value={listToText(draft.step2_skills.skillsToLearn)}
              />
              {learnSkillSuggestions.length > 0 ? (
                <View style={styles.chipRow}>
                  {learnSkillSuggestions.slice(0, 8).map((skill) => (
                    <Pressable
                      key={skill}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step2_skills: {
                            ...current.step2_skills,
                            skillsToLearn: toggleValue(
                              current.step2_skills.skillsToLearn,
                              skill
                            ),
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.choiceChip,
                        draft.step2_skills.skillsToLearn.includes(skill)
                          ? styles.choiceChipSelected
                          : null,
                        pressed ? styles.choiceChipPressed : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>{skill}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Interest areas</Text>
              <TextInput
                onChangeText={(value) =>
                  setDraft((current) => ({
                    ...current,
                    step2_skills: {
                      ...current.step2_skills,
                      interests: parseDelimitedList(value),
                    },
                  }))
                }
                placeholder="Developer tools, AI, design systems"
                placeholderTextColor="#64748b"
                style={[styles.input, styles.multilineInput]}
                multiline
                value={listToText(draft.step2_skills.interests)}
              />
              <View style={styles.chipRow}>
                {bootstrap.taxonomy.interestOptions.slice(0, 10).map((interest) => (
                  <Pressable
                    key={interest.value}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        step2_skills: {
                          ...current.step2_skills,
                          interests: toggleValue(
                            current.step2_skills.interests,
                            interest.value
                          ),
                        },
                      }))
                    }
                    style={({ pressed }) => [
                      styles.choiceChip,
                      draft.step2_skills.interests.includes(interest.value)
                        ? styles.choiceChipSelected
                        : null,
                      pressed ? styles.choiceChipPressed : null,
                    ]}
                  >
                    <Text style={styles.choiceChipLabel}>{interest.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {currentStep === 2 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Goals and rhythm</Text>
              <Text style={styles.cardBody}>
                Set the outcomes you care about so recommendations feel intentional, not generic.
              </Text>

              <Text style={styles.sectionLabel}>Career goals</Text>
              <View style={styles.optionStack}>
                {GOAL_OPTIONS.map((goal) => {
                  const selected = draft.step3_goals.careerGoals.includes(goal.value);
                  return (
                    <Pressable
                      key={goal.value}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step3_goals: {
                            ...current.step3_goals,
                            careerGoals: toggleValue(
                              current.step3_goals.careerGoals,
                              goal.value,
                              2
                            ),
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.optionCard,
                        selected ? styles.optionCardSelected : null,
                        pressed ? styles.optionCardPressed : null,
                      ]}
                    >
                      <Text style={styles.optionTitle}>{goal.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Timeline</Text>
              <View style={styles.chipRow}>
                {TIMEFRAME_OPTIONS.map((option) => {
                  const selected = draft.step3_goals.timeframe === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step3_goals: {
                            ...current.step3_goals,
                            timeframe: option.value,
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.choiceChip,
                        selected ? styles.choiceChipSelected : null,
                        pressed ? styles.choiceChipPressed : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Learning style</Text>
              <View style={styles.chipRow}>
                {LEARNING_STYLE_OPTIONS.map((option) => {
                  const selected = draft.step4_preferences.learningStyle.includes(
                    option.value
                  );
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step4_preferences: {
                            ...current.step4_preferences,
                            learningStyle: toggleValue(
                              current.step4_preferences.learningStyle,
                              option.value
                            ),
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.choiceChip,
                        selected ? styles.choiceChipSelected : null,
                        pressed ? styles.choiceChipPressed : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Networking goals</Text>
              <View style={styles.chipRow}>
                {NETWORKING_GOAL_OPTIONS.map((option) => {
                  const selected = draft.step5_networking.networkingGoals.includes(
                    option.value
                  );
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          step5_networking: {
                            ...current.step5_networking,
                            networkingGoals: toggleValue(
                              current.step5_networking.networkingGoals,
                              option.value
                            ),
                          },
                        }))
                      }
                      style={({ pressed }) => [
                        styles.choiceChip,
                        selected ? styles.choiceChipSelected : null,
                        pressed ? styles.choiceChipPressed : null,
                      ]}
                    >
                      <Text style={styles.choiceChipLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.footer}>
            <View style={styles.footerRow}>
              {currentStep > 0 ? (
                <Pressable
                  onPress={() => setCurrentStep((step) => Math.max(0, step - 1))}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.secondaryButtonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>Back</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    void handleSkip();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.secondaryButtonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>Skip for now</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  void handleContinue();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : null,
                ]}
              >
                <Text style={styles.primaryButtonLabel}>
                  {submitting
                    ? 'Saving…'
                    : currentStep === 2
                      ? 'Complete setup'
                      : 'Continue'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 14,
  },
  backButtonPressed: {
    opacity: 0.84,
  },
  backLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'rgba(7, 15, 23, 0.9)',
    borderColor: 'rgba(148, 163, 184, 0.12)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  cardBody: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  choiceChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.14)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  choiceChipPressed: {
    opacity: 0.88,
  },
  choiceChipSelected: {
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
    borderColor: 'rgba(45, 212, 191, 0.34)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  content: {
    gap: 18,
    padding: 22,
  },
  eyebrow: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  footer: {
    paddingBottom: 24,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gradient: {
    flex: 1,
  },
  hero: {
    gap: 12,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.74)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 16,
    borderWidth: 1,
    color: '#f8fafc',
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  optionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionCardPressed: {
    opacity: 0.9,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
    borderColor: 'rgba(45, 212, 191, 0.34)',
  },
  optionStack: {
    gap: 10,
  },
  optionTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2dd4bf',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonLabel: {
    color: '#042f2e',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonPressed: {
    opacity: 0.86,
  },
  sectionLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  stepMeta: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 38,
  },
});
