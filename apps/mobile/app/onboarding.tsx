import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CAREER_GOAL_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  deriveOptionalSectionStatus,
  hasCoreOnboardingProgress,
  sanitizeOnboardingData,
  validateOnboardingData,
  type CareerGoal,
  type LearningStyle,
} from '@kurecal/domain';
import { BottomActionBar } from '@/components/chrome/BottomActionBar';
import { KureButton } from '@/components/chrome/KureButton';
import { StepProgress } from '@/features/onboarding/controls';
import {
  MOBILE_GOAL_OPTION_VALUES,
  MOBILE_LEARNING_STYLE_VALUES,
  POPULAR_ROLE_COUNT,
  STEP_TITLES,
  VISIBLE_ROLE_GROUP_COUNT,
} from '@/features/onboarding/constants';
import {
  buildRoleGroups,
  getRoleSuggestions,
  rolePayoffText,
  toggleValue,
} from '@/features/onboarding/model';
import { clearStoredOnboardingDraft } from '@/features/onboarding/storage';
import { styles } from '@/features/onboarding/styles';
import {
  GoalsStep,
  RoleStep,
  SeniorityStep,
  SkillsStep,
  WelcomeStep,
} from '@/features/onboarding/steps';
import { useCareerOnboardingFlow } from '@/features/onboarding/useCareerOnboardingFlow';
import { useMobileAuth } from '@/hooks/useMobileAuth';
import { getMobileApiClient } from '@/lib/mobileApi';
import { useAppTheme } from '@/providers/ThemeProvider';

export default function OnboardingScreen() {
  const { refreshProfile } = useMobileAuth();
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const apiClient = useMemo(() => getMobileApiClient(), []);
  const params = useLocalSearchParams<{ resume?: string }>();
  const allowManualOpen = params.resume === '1' || params.resume === 'true';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleCompletedOnboardingDetected = useMemo(
    () => () => {
      router.replace('/(tabs)/discover');
    },
    []
  );

  const {
    bootstrap,
    isLoading,
    currentStep,
    draft,
    validationErrors,
    showOptionalPreferences,
    selectedRoleCategory,
    showAllRoles,
    showAllRoleGroups,
    showInterests,
    updateDraft,
    clearValidationError,
    validateStep,
    goBack,
    goToStep,
    goToNextStep,
    addUniqueValue,
    setShowOptionalPreferences,
    setSelectedRoleCategory,
    setShowAllRoles,
    setShowAllRoleGroups,
    setShowInterests,
  } = useCareerOnboardingFlow({
    allowManualOpen,
    onCompletedOnboardingDetected: handleCompletedOnboardingDetected,
  });

  async function finishOnboarding() {
    const validation = validateOnboardingData(draft);
    if (!validation.isValid) {
      Alert.alert('Complete the required fields', validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitized = sanitizeOnboardingData(draft);
      const optionalSectionsCompleted = deriveOptionalSectionStatus(sanitized);
      const result = await apiClient.completeCareerOnboarding({
        data: sanitized,
        optionalSectionsCompleted,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to complete onboarding');
      }

      await clearStoredOnboardingDraft();
      await refreshProfile();
      router.replace('/(tabs)/discover');
    } catch (error) {
      Alert.alert('Onboarding error', error instanceof Error ? error.message : 'Unable to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmSkip() {
    const skipNow = async () => {
      setIsSubmitting(true);
      try {
        const result = await apiClient.skipCareerOnboarding({
          optionalSectionsCompleted: deriveOptionalSectionStatus(draft),
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Unable to skip onboarding');
        }

        await clearStoredOnboardingDraft();
        await refreshProfile();
        router.replace('/(tabs)/discover');
      } catch (error) {
        Alert.alert('Onboarding error', error instanceof Error ? error.message : 'Unable to skip onboarding');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!hasCoreOnboardingProgress(draft)) {
      void skipNow();
      return;
    }

    Alert.alert(
      'Skip onboarding?',
      'Your draft will be cleared. You can complete your career profile later in settings.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Skip now', style: 'destructive', onPress: () => void skipNow() },
      ]
    );
  }

  if (isLoading || !bootstrap) {
    return (
      <View
        style={[
          styles.loadingShell,
          { backgroundColor: tokens.colors.shell, paddingTop: insets.top + 48 },
        ]}
      >
        <Text
          style={[
            styles.loadingText,
            { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
          ]}
        >
          Loading career onboarding…
        </Text>
      </View>
    );
  }

  const roleGroups = buildRoleGroups(bootstrap.roleTaxonomy);
  const activeRoleGroup =
    roleGroups.find((group) => group.key === selectedRoleCategory) ?? roleGroups[0] ?? null;
  const primaryRoleGroups = roleGroups.slice(0, VISIBLE_ROLE_GROUP_COUNT);
  const hiddenRoleGroups = roleGroups.slice(VISIBLE_ROLE_GROUP_COUNT);
  const visibleRoleGroups =
    showAllRoleGroups ||
    (activeRoleGroup && !primaryRoleGroups.some((group) => group.key === activeRoleGroup.key))
      ? roleGroups
      : primaryRoleGroups;
  const curatedRoles = activeRoleGroup?.roles.slice(0, POPULAR_ROLE_COUNT) ?? [];
  const remainingRoles = activeRoleGroup?.roles.slice(POPULAR_ROLE_COUNT) ?? [];
  const currentSkillSuggestions = getRoleSuggestions(
    bootstrap,
    'current',
    draft.step1_role?.currentRole
  );
  const mobileGoalOptions = CAREER_GOAL_OPTIONS.filter((option) =>
    MOBILE_GOAL_OPTION_VALUES.includes(option.value)
  );
  const mobileLearningStyleOptions = LEARNING_STYLE_OPTIONS.filter((option) =>
    MOBILE_LEARNING_STYLE_VALUES.includes(option.value)
  );
  const optionalPreferenceCount = draft.step4_preferences?.learningStyle?.length ?? 0;
  const selectedRolePayoff = rolePayoffText(activeRoleGroup, draft.step1_role?.currentRole);
  const currentStepTitle = STEP_TITLES[currentStep] ?? 'Progress';
  const selectedGoals = draft.step3_goals?.careerGoals ?? [];
  const selectedLearningStyles = draft.step4_preferences?.learningStyle ?? [];
  const primaryActionLabel =
    isSubmitting
      ? 'Saving…'
      : currentStep === 0
        ? 'Start onboarding'
        : currentStep === 4
          ? 'Complete'
          : 'Continue';

  async function handlePrimaryAction() {
    if (currentStep === 0) {
      goToStep(1);
      return;
    }

    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 4) {
      goToNextStep();
      return;
    }

    await finishOnboarding();
  }

  return (
    <View style={[styles.container, { backgroundColor: tokens.colors.shell }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom + 120, 140),
          paddingHorizontal: 20,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 0 ? <WelcomeStep tokens={tokens} /> : null}

        {currentStep > 0 ? (
          <View style={styles.headerBlock}>
            <StepProgress currentStep={currentStep} title={currentStepTitle} tokens={tokens} />
          </View>
        ) : null}

        {currentStep === 1 ? (
          <RoleStep
            tokens={tokens}
            visibleRoleGroups={visibleRoleGroups}
            hiddenRoleGroups={hiddenRoleGroups}
            activeRoleGroup={activeRoleGroup}
            currentRole={draft.step1_role?.currentRole}
            curatedRoles={curatedRoles}
            remainingRoles={remainingRoles}
            showAllRoles={showAllRoles}
            showAllRoleGroups={showAllRoleGroups}
            selectedRolePayoff={selectedRolePayoff}
            validationErrors={validationErrors}
            onSelectRoleCategory={setSelectedRoleCategory}
            onShowAllRoleGroups={() => setShowAllRoleGroups(true)}
            onSelectRole={(role) => {
              updateDraft('step1_role', { currentRole: role });
              clearValidationError('currentRole');
            }}
            onSetShowAllRoles={setShowAllRoles}
          />
        ) : null}

        {currentStep === 2 ? (
          <SeniorityStep
            tokens={tokens}
            seniority={draft.step1_role?.seniority}
            validationErrors={validationErrors}
            onSelectSeniority={(value) => {
              updateDraft('step1_role', { seniority: value });
              clearValidationError('seniority');
            }}
          />
        ) : null}

        {currentStep === 3 ? (
          <SkillsStep
            tokens={tokens}
            bootstrap={bootstrap}
            draft={draft}
            currentSkillSuggestions={currentSkillSuggestions}
            validationErrors={validationErrors}
            showInterests={showInterests}
            onToggleInterests={() => setShowInterests((current) => !current)}
            onAddPrimarySkill={(value) => {
              updateDraft('step2_skills', {
                primarySkills: addUniqueValue(draft.step2_skills?.primarySkills, value, { limit: 10 }),
              });
              clearValidationError('primarySkills');
            }}
            onRemovePrimarySkill={(value) =>
              updateDraft('step2_skills', {
                primarySkills: (draft.step2_skills?.primarySkills ?? []).filter((item) => item !== value),
              })
            }
            onAddInterest={(value) =>
              updateDraft('step2_skills', {
                interests: addUniqueValue(draft.step2_skills?.interests, value, { limit: 6 }),
              })
            }
            onRemoveInterest={(value) =>
              updateDraft('step2_skills', {
                interests: (draft.step2_skills?.interests ?? []).filter((item) => item !== value),
              })
            }
          />
        ) : null}

        {currentStep === 4 ? (
          <GoalsStep
            tokens={tokens}
            mobileGoalOptions={mobileGoalOptions}
            mobileLearningStyleOptions={mobileLearningStyleOptions}
            selectedGoals={selectedGoals}
            selectedLearningStyles={selectedLearningStyles}
            validationErrors={validationErrors}
            showOptionalPreferences={showOptionalPreferences}
            optionalPreferenceCount={optionalPreferenceCount}
            onToggleGoal={(value) => {
              const nextGoals = selectedGoals.includes(value)
                ? selectedGoals.filter((goal) => goal !== value)
                : [...selectedGoals, value].slice(0, 2);
              updateDraft('step3_goals', {
                careerGoals: nextGoals as CareerGoal[],
              });
              clearValidationError('careerGoals');
            }}
            onToggleOptionalPreferences={() => setShowOptionalPreferences((current) => !current)}
            onToggleLearningStyle={(value) =>
              updateDraft('step4_preferences', {
                learningStyle: toggleValue(selectedLearningStyles, value) as LearningStyle[],
              })
            }
          />
        ) : null}
      </ScrollView>

      <BottomActionBar>
        {currentStep > 0 ? (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.textAction, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text
              style={[
                styles.textActionLabel,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              Back
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={confirmSkip}
            style={({ pressed }) => [styles.textAction, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text
              style={[
                styles.textActionLabel,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              Skip for now
            </Text>
          </Pressable>
        )}

        <View style={styles.actionButtons}>
          <View style={styles.primaryAction}>
            <KureButton
              disabled={isSubmitting}
              onPress={() => void handlePrimaryAction()}
              testID="onboarding-primary-action"
            >
              {primaryActionLabel}
            </KureButton>
          </View>
        </View>
      </BottomActionBar>
    </View>
  );
}
