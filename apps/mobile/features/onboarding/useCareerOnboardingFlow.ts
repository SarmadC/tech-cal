import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import type { CareerOnboardingData, MobileCareerOnboardingBootstrap } from '@kurecal/domain';
import { getMobileApiClient } from '@/lib/mobileApi';
import {
  addUniqueValue,
  buildRoleGroups,
  getInitialRoleCategory,
  mergeOnboardingDrafts,
  validateOnboardingStep,
} from '@/features/onboarding/model';
import { readStoredOnboardingDraft, writeStoredOnboardingDraft } from '@/features/onboarding/storage';
import type { StepIndex, ValidationErrors } from '@/features/onboarding/types';

interface UseCareerOnboardingFlowOptions {
  allowManualOpen: boolean;
  onCompletedOnboardingDetected: () => void;
}

export function useCareerOnboardingFlow({
  allowManualOpen,
  onCompletedOnboardingDetected,
}: UseCareerOnboardingFlowOptions) {
  const apiClient = useMemo(() => getMobileApiClient(), []);
  const [bootstrap, setBootstrap] = useState<MobileCareerOnboardingBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [draft, setDraft] = useState<Partial<CareerOnboardingData>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showOptionalPreferences, setShowOptionalPreferences] = useState(false);
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string | null>(null);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [showAllRoleGroups, setShowAllRoleGroups] = useState(false);
  const [showInterests, setShowInterests] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapOnboarding() {
      try {
        const [response, localDraft] = await Promise.all([
          apiClient.getCareerOnboarding(),
          readStoredOnboardingDraft(),
        ]);

        if (!isMounted) {
          return;
        }

        if (!response.success || !response.data) {
          throw new Error(response.error ?? 'Unable to load onboarding');
        }

        const onboardingData = response.data;

        if (onboardingData.hasCompletedOnboarding && !allowManualOpen) {
          onCompletedOnboardingDetected();
          return;
        }

        const mergedDraft = mergeOnboardingDrafts(onboardingData.draft, localDraft);
        const roleGroups = buildRoleGroups(onboardingData.roleTaxonomy);

        setBootstrap(onboardingData);
        setDraft(mergedDraft);
        setSelectedRoleCategory(getInitialRoleCategory(roleGroups, mergedDraft));
        setShowOptionalPreferences(
          Boolean(
            onboardingData.optionalSections?.learningPreferences ||
              onboardingData.optionalSections?.networkingPreferences ||
              onboardingData.optionalSections?.teamPreferences
          )
        );
        setShowInterests(Boolean(mergedDraft.step2_skills?.interests?.length));
      } catch (error) {
        Alert.alert('Onboarding error', error instanceof Error ? error.message : 'Unable to load onboarding');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapOnboarding();

    return () => {
      isMounted = false;
    };
  }, [allowManualOpen, apiClient, onCompletedOnboardingDetected]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void writeStoredOnboardingDraft(draft);
  }, [draft, isLoading]);

  function updateDraft<K extends keyof CareerOnboardingData>(
    key: K,
    nextValue: Partial<CareerOnboardingData[K]>
  ) {
    setDraft((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...nextValue,
      },
    }));
  }

  function clearValidationError(field: keyof ValidationErrors) {
    setValidationErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  function validateStep(step: StepIndex) {
    const nextErrors = validateOnboardingStep(step, draft);
    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goBack() {
    setCurrentStep((current) => Math.max(0, current - 1) as StepIndex);
  }

  function goToStep(step: StepIndex) {
    setCurrentStep(step);
  }

  function goToNextStep() {
    setCurrentStep((current) => Math.min(4, current + 1) as StepIndex);
  }

  return {
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
    goToNextStep,
    goToStep,
    addUniqueValue,
    setShowOptionalPreferences,
    setSelectedRoleCategory,
    setShowAllRoles,
    setShowAllRoleGroups,
    setShowInterests,
  };
}
