import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { CareerProfileService } from '@/services/careerProfileService';
import { MemoizedProfileService } from '@/services/memoizedProfileService';
import { CareerProfile, CareerOnboardingData } from '@/types/career';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface UseCareerProfileReturn {
  careerProfile: CareerProfile | null;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
  saveCareerProfile: (profile: CareerProfile) => Promise<void>;
  completeOnboarding: (data: CareerOnboardingData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * Custom hook for managing career profiles with automatic migration
 * Handles both new structured table and legacy JSONB data
 */
export function useCareerProfile(): UseCareerProfileReturn {
  const { user, profile } = useAuth();
  const { supabase, isReady } = useSupabaseSafe();
  const { showSuccess } = useSnackbar();
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load career profile with automatic migration
  const loadCareerProfile = useCallback(async () => {
    if (!user?.id || !supabase || !isReady) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try to get from new structured table
      let profile = await CareerProfileService.getCareerProfile(user.id, supabase);
      
      if (!profile) {
        // If not found in new table, try to migrate from JSONB
        const migrated = await CareerProfileService.migrateCareerProfileData(user.id, supabase);
        if (migrated) {
          // Retry getting from new table after migration
          profile = await CareerProfileService.getCareerProfile(user.id, supabase);
        } else {
          // Fallback to legacy method if no data to migrate
          profile = CareerProfileService.getCareerProfileFromPreferences(profile);
        }
      }

      setCareerProfile(profile);
      setHasCompletedOnboarding(!!profile);
    } catch (err) {
      console.error('Error loading career profile:', err);
      setError('Failed to load career profile');
      
      // Fallback to legacy method on error
      if (profile) {
        const legacyProfile = CareerProfileService.getCareerProfileFromPreferences(profile);
        setCareerProfile(legacyProfile);
        setHasCompletedOnboarding(!!legacyProfile);
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
  const completeOnboarding = useCallback(async (data: CareerOnboardingData) => {
    if (!user?.id || !supabase) {
      throw new Error('User not authenticated or Supabase not available');
    }

    try {
      const careerProfile = CareerProfileService.onboardingDataToCareerProfile(data, user.id);
      await CareerProfileService.saveCareerProfile(user.id, careerProfile, supabase);
      await CareerProfileService.markOnboardingCompleted(user.id, supabase);
      
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
  };
}
