'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CareerProfile } from '@/types/career';

// Import type-safe section definition
import type { QuickEditSection } from '../sections';

// Defines the structure of a draft update
type DraftUpdate = Partial<CareerProfile>;

// Configuration for default values by section
const DEFAULT_VALUES: Record<QuickEditSection, Partial<CareerProfile>> = {
  role: {
    currentRole: '',
    seniority: undefined,
    industry: '',
    companySize: undefined
  },
  skills: {
    primarySkills: [],
    skillsToLearn: [],
    interests: []
  },
  goals: {
    careerGoals: [],
    timeframe: 'immediate'
  },
  learning: {
    learningStyle: [],
    availableTime: 'moderate',
    budget: 'moderate'
  },
  networking: {
    networkingGoals: [],
    preferredEventTypes: []
  },
  team: {
    preferredEventTypes: []
  }
};

// Validation function type
type ValidationFunction = (draft: DraftUpdate) => boolean;

// Hook configuration interface
interface UseQuickEditFormOptions {
  initialProfile: CareerProfile | undefined;
  section: QuickEditSection;
  validate?: ValidationFunction;
  onSave?: (updates: DraftUpdate) => Promise<void>;
}

export function useQuickEditForm({
  initialProfile, 
  section, 
  validate = () => true,
  onSave
}: UseQuickEditFormOptions) {
  // Create initial draft with defaults merged with initial profile
  const initialDraft = useMemo(() => {
    const sectionDefaults = DEFAULT_VALUES[section];
    return {
      ...sectionDefaults,
      ...(initialProfile || {})
    };
  }, [initialProfile, section]);

  // State for draft updates with reset on profile/section change
  const [draft, setDraft] = useState<DraftUpdate>(initialDraft);
  const draftRef = useRef<DraftUpdate>(initialDraft);
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // React to changes in initial profile or section
  useEffect(() => {
    if (isDirtyRef.current) return;  // don't clobber user's edits
    const newDraft = {
      ...DEFAULT_VALUES[section],
      ...(initialProfile || {})
    };
    
    draftRef.current = newDraft;
    setDraft(newDraft);
    setIsDirty(false);
    setSaveError(null);
  }, [initialProfile, section]);

  // Immediate update function for controlled inputs
  const updateDraft = useCallback((updates: DraftUpdate) => {
    const nextDraft = { ...draftRef.current, ...updates };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    isDirtyRef.current = true;
    setIsDirty(true);
    setSaveError(null);
  }, []);

  // Structured save function that handles validation and saving
  const saveDraft = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      const latestDraft = draftRef.current;
      
      // Validate draft
      if (!validate(latestDraft)) {
        setSaveError('Validation failed. Please check your inputs.');
        return false;
      }

      // Perform immediate save without debounce
      if (onSave) {
        await onSave(latestDraft);
      }

      isDirtyRef.current = false;
      setIsDirty(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      setSaveError(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [validate, onSave]);

  // Reset draft to initial state
  const resetDraft = useCallback(() => {
    draftRef.current = initialDraft;
    setDraft(initialDraft);
    isDirtyRef.current = false;
    setIsDirty(false);
    setSaveError(null);
  }, [initialDraft]);

  // Return hook utilities
  return {
    draft,
    updateDraft,
    resetDraft,
    saveDraft,
    isDirty,
    isSaving,
    saveError
  };
}

// Example validation function for role section
export const validateRoleSection = (draft: Partial<CareerProfile>): boolean => {
  const { currentRole, seniority, industry, companySize } = draft;
  return !!(
    currentRole && 
    currentRole.trim().length > 0 && 
    seniority && 
    industry && 
    companySize
  );
};

// Example validation function for skills section
export const validateSkillsSection = (draft: Partial<CareerProfile>): boolean => {
  const { primarySkills, skillsToLearn } = draft;
  return !!(
    primarySkills && primarySkills.length > 0 &&
    skillsToLearn && skillsToLearn.length > 0
  );
};

// Additional validation functions can be added for other sections
