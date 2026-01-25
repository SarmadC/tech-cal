import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { CareerProfileService } from '@/services/careerProfileService';
import { MemoizedProfileService } from '@/services/memoizedProfileService';
import { CareerProfile, CareerOnboardingData, CareerOptionalSectionStatus, CareerOptionalSectionSnoozes, CareerOptionalSectionTimestamps } from '@/types/career';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface UseCareerProfileReturn {
  careerProfile: CareerProfile | null;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
  saveCareerProfile: (profile: CareerProfile) => Promise<void>;
  completeOnboarding: (data: CareerOnboardingData, optionalStatus?: CareerOptionalSectionStatus) => Promise<void>;
  refreshProfile: () => Promise<void>;
  optionalSections: CareerOptionalSectionStatus | null;
  optionalSectionSnoozes: CareerOptionalSectionSnoozes | null;
  optionalSectionTimestamps: CareerOptionalSectionTimestamps | null;
  markOptionalSectionComplete: (section: keyof CareerOptionalSectionStatus) => Promise<void>;
  snoozeOptionalSection: (section: keyof CareerOptionalSectionStatus, days?: number) => Promise<string | void>;
}

/**
 * Custom hook for managing career profiles with automatic migration
 * Handles both new structured table and legacy JSONB data
 */
export function useCareerProfile(): UseCareerProfileReturn {
  const { user, profile, refreshProfile: refreshAuthProfile } = useAuth();
  const preferencesRecord = profile?.preferences as Record<string, unknown> | undefined;
  const optionalSections = preferencesRecord?.careerOptionalSections as CareerOptionalSectionStatus | undefined;
  const optionalSectionSnoozes = preferencesRecord?.careerOptionalSnoozes as CareerOptionalSectionSnoozes | undefined;
  const optionalSectionTimestamps = preferencesRecord?.careerOptionalSectionTimestamps as CareerOptionalSectionTimestamps | undefined;
  const { supabase, isReady } = useSupabaseSafe();
  const { showSuccess } = useSnackbar();
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load career profile with automatic migration
  const loadCareerProfile = useCallback(async () => {
    if (!user?.id || !supabase || !isReady) {
      if (isLoading && (!user?.id || !supabase) && isReady) {
         // Only unset loading if we are essentially "done" checking (auth didn't provide user)
         // But if we are just waiting for 'isReady', we might want to keep loading?
         // Actually, simplest is to just stop loading. If dependencies change, it will restart.
         setIsLoading(false);
      } else if (!isReady) {
          // If not ready, keep loading? 
          // If we allow it to return without setting false, it hangs if it never becomes ready.
          // But SupabaseProvider sets ready.
          // Let's stick to safe pattern: if we can't fetch, we aren't loading.
          setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try to get from new structured table
      let careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
      
      if (!careerProfile) {
        // Only attempt migration if user has an existing profile with preferences
        if (profile?.preferences) {
          const migrated = await CareerProfileService.migrateCareerProfileData(user.id, supabase);
          if (migrated) {
            // Retry getting from new table after migration
            careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
          }
        }
        
        // If still no career profile, try legacy method as fallback
        if (!careerProfile) {
          careerProfile = CareerProfileService.getCareerProfileFromPreferences(profile);
        }
      }

      setCareerProfile(careerProfile);
      
      // Check if onboarding is completed - either has career profile OR marked as completed in preferences
      const hasCareerProfile = !!careerProfile;
      const hasCompletedInPreferences = profile?.preferences && 
        typeof profile.preferences === 'object' && 
        'careerOnboardingCompleted' in profile.preferences && 
        profile.preferences.careerOnboardingCompleted === true;
      
      setHasCompletedOnboarding(Boolean(hasCareerProfile || hasCompletedInPreferences));
    } catch (err) {
      console.error('Error loading career profile:', err);
      setError('Failed to load career profile');
      
      // Fallback to legacy method on error
      if (profile) {
        const legacyProfile = CareerProfileService.getCareerProfileFromPreferences(profile);
        setCareerProfile(legacyProfile);
        
        // Check preferences for completion status
        const hasCompletedInPreferences = profile.preferences && 
          typeof profile.preferences === 'object' && 
          'careerOnboardingCompleted' in profile.preferences && 
          profile.preferences.careerOnboardingCompleted === true;
        
        setHasCompletedOnboarding(Boolean(legacyProfile || hasCompletedInPreferences));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase, isReady, profile]);

  // Save career profile
  const saveCareerProfile = useCallback(async (profile: CareerProfile) => {
    if (!user?.id || !supabase) {
      throw new Error('User not authenticated or Supabase not available');
    }

    try {
      await CareerProfileService.saveCareerProfile(user.id, profile, supabase);
      setCareerProfile(profile);
      setHasCompletedOnboarding(true);
      
      // Invalidate cache
      MemoizedProfileService.invalidateUser(user.id);
    } catch (err) {
      console.error('Error saving career profile:', err);
      throw new Error('Failed to save career profile');
    }
  }, [user?.id, supabase]);

  // Complete onboarding
  const completeOnboarding = useCallback(async (data: CareerOnboardingData, optionalStatus?: CareerOptionalSectionStatus) => {
    if (!user?.id || !supabase) {
      throw new Error('User not authenticated or Supabase not available');
    }

    try {
      const careerProfile = CareerProfileService.onboardingDataToCareerProfile(data, user.id);
      await CareerProfileService.saveCareerProfile(user.id, careerProfile, supabase);
      await CareerProfileService.markOnboardingCompleted(user.id, supabase, optionalStatus);
      
      setCareerProfile(careerProfile);
      setHasCompletedOnboarding(true);
      
      // Invalidate cache
      MemoizedProfileService.invalidateUser(user.id);
      
      showSuccess('Career profile completed successfully!');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw new Error('Failed to complete onboarding');
    }
  }, [user?.id, supabase, showSuccess]);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    await loadCareerProfile();
  }, [loadCareerProfile]);

  const markOptionalSectionComplete = useCallback(async (section: keyof CareerOptionalSectionStatus) => {
    if (!user?.id || !supabase) return;
    try {
      const timestampKeyMap: Record<keyof CareerOptionalSectionStatus, keyof CareerOptionalSectionTimestamps> = {
        learningPreferences: 'learningPreferencesCompletedAt',
        networkingPreferences: 'networkingPreferencesCompletedAt',
        teamPreferences: 'teamPreferencesCompletedAt'
      };
      await CareerProfileService.updateOptionalSections(
        user.id,
        supabase,
        { [section]: true },
        {},
        { [timestampKeyMap[section]]: new Date().toISOString() }
      );
      await refreshProfile();
      await refreshAuthProfile();
    } catch (error) {
      console.error('Failed to mark optional section complete:', error);
    }
  }, [user?.id, supabase, refreshProfile, refreshAuthProfile]);

  const snoozeOptionalSection = useCallback(async (section: keyof CareerOptionalSectionStatus, days: number = 7) => {
    if (!user?.id || !supabase) return;
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + days);
      await CareerProfileService.updateOptionalSections(
        user.id,
        supabase,
        {},
        { [section]: snoozeUntil.toISOString() }
      );
      await refreshProfile();
      await refreshAuthProfile();
      return snoozeUntil.toISOString();
    } catch (error) {
      console.error('Failed to snooze optional section prompt:', error);
    }
  }, [user?.id, supabase, refreshProfile, refreshAuthProfile]);

  // Load profile on mount and when dependencies change
  useEffect(() => {
    loadCareerProfile();
  }, [loadCareerProfile]);

  return {
    careerProfile,
    hasCompletedOnboarding,
    isLoading,
    error,
    saveCareerProfile,
    completeOnboarding,
    refreshProfile,
    optionalSections: optionalSections ?? null,
    optionalSectionSnoozes: optionalSectionSnoozes ?? null,
    markOptionalSectionComplete,
    snoozeOptionalSection,
    optionalSectionTimestamps: optionalSectionTimestamps ?? null,
  };
}
