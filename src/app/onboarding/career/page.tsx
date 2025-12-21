'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Target, MapPin, Lightning } from '@phosphor-icons/react';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { useAuth } from '@/contexts';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { ProfileService } from '@/services/profileService';
import { CareerOnboardingData, CareerOptionalSectionStatus } from '@/types/career';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import OnboardingErrorBoundary from '@/components/onboarding/OnboardingErrorBoundary';
import { useSnackbar } from '@/contexts/SnackbarContext';

export default function CareerOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo } = useSnackbar();
  const { user, profile } = useAuth();
  const { supabase, isReady } = useSupabaseSafe();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmitData, setLastSubmitData] = useState<{
    data: CareerOnboardingData;
    options?: { optionalSectionsCompleted: CareerOptionalSectionStatus };
  } | null>(null);
  
  const {
    hasCompletedOnboarding,
    isLoading,
    completeOnboarding
  } = useCareerProfile();

  // Check if user was redirected from middleware
  useEffect(() => {
    const fromMiddleware = searchParams.get('from') === 'middleware';
    if (fromMiddleware && !hasCompletedOnboarding) {
      setShowWelcomeMessage(true);
      showInfo('Complete your profile to get personalized event recommendations!');
    }
  }, [searchParams, hasCompletedOnboarding, showInfo]);

  // Create profile if missing
  useEffect(() => {
    const createProfileIfMissing = async () => {
      if (!user?.id || !supabase || !isReady || profile || isCreatingProfile) {
        return;
      }

      // Check if profile exists
      try {
        await ProfileService.getProfile(user.id, supabase);
        // Profile exists, no need to create
        return;
      } catch (error) {
        // Profile doesn't exist, create it
        if (error instanceof Error && error.name === 'ProfileNotFoundError') {
          console.log('[CareerOnboarding] Profile not found, creating new profile for user:', user.id);
          setIsCreatingProfile(true);
          try {
            const newProfile = await ProfileService.createProfile({
              id: user.id,
              fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatarUrl: user.user_metadata?.avatar_url || null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              preferences: {}
            }, supabase);
            
            console.log('[CareerOnboarding] Profile created successfully:', newProfile);
            
            // Refresh auth context to get the new profile
            window.dispatchEvent(new CustomEvent('profile-updated'));
            showSuccess('Profile created successfully!');
          } catch (createError) {
            console.error('[CareerOnboarding] Error creating profile:', createError);
            showError('Failed to create profile. Please refresh the page.');
          } finally {
            setIsCreatingProfile(false);
          }
        } else {
          // Some other error occurred
          console.error('[CareerOnboarding] Unexpected error checking profile:', error);
          showError('An error occurred while loading your profile. Please refresh the page.');
        }
      }
    };

    createProfileIfMissing();
  }, [user?.id, user?.email, user?.user_metadata?.full_name, user?.user_metadata?.avatar_url, supabase, isReady, profile, isCreatingProfile, showSuccess, showError]);

  // Redirect if user has already completed onboarding
  React.useEffect(() => {
    if (!isLoading && hasCompletedOnboarding) {
      router.push('/discover');
      return;
    }
  }, [hasCompletedOnboarding, isLoading, router]);

  // Listen for profile updates to handle the case where onboarding was just completed
  React.useEffect(() => {
    const handleProfileUpdate = () => {
      // Force a re-render by updating a state or refetching profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [queryClient]);

  const handleComplete = async (
    data: CareerOnboardingData,
    options?: { optionalSectionsCompleted: CareerOptionalSectionStatus }
  ) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setLastSubmitData({ data, options });

    try {
      await completeOnboarding(data, options?.optionalSectionsCompleted);

      // Invalidate profile queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });

      // Trigger auth context refresh
      window.dispatchEvent(new CustomEvent('profile-updated'));

      showSuccess('Career profile completed! Discovering personalized events...');

      // Redirect to discover page
      router.push('/discover');
    } catch (error) {
      console.error('Career onboarding error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to save career profile. Please check your connection and try again.';
      setSubmitError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (lastSubmitData) {
      handleComplete(lastSubmitData.data, lastSubmitData.options);
    }
  };

  const handleSkip = async () => {
    // Ensure profile exists before skipping
    if (user?.id && supabase && !profile) {
      try {
        await ProfileService.createProfile({
          id: user.id,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          avatarUrl: user.user_metadata?.avatar_url || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            careerOnboardingCompleted: true,
            careerOnboardingCompletedAt: new Date().toISOString(),
            careerOnboardingSkipped: true
          }
        }, supabase);
        
        // Refresh auth context to get the new profile
        window.dispatchEvent(new CustomEvent('profile-updated'));
      } catch (error) {
        console.error('[CareerOnboarding] Error creating profile on skip:', error);
        showError('Failed to set up your profile. Please try again.');
        return;
      }
    } else if (user?.id && supabase && profile) {
      // If profile exists but user is skipping, mark onboarding as completed
      try {
        await ProfileService.updateProfile(user.id, {
          preferences: {
            ...(profile.preferences as Record<string, unknown> || {}),
            careerOnboardingCompleted: true,
            careerOnboardingCompletedAt: new Date().toISOString(),
            careerOnboardingSkipped: true
          }
        }, supabase);
        
        // Refresh auth context to get the updated profile
        window.dispatchEvent(new CustomEvent('profile-updated'));
      } catch (error) {
        console.error('[CareerOnboarding] Error updating profile on skip:', error);
        showError('Failed to update your profile. Please try again.');
        return;
      }
    }
    
    showInfo('You can complete your career profile later in settings');
    router.push('/discover');
  };

  // Show loading state while creating profile or loading career profile
  if (isCreatingProfile || (isLoading && !profile)) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {isCreatingProfile ? 'Setting up your profile...' : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Banner (shown when redirected from middleware) */}
        {showWelcomeMessage && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-muted-foreground mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-foreground">
                  One Quick Step to Get Started
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Complete your career profile to unlock personalized event recommendations tailored to your goals and interests.
                  This only takes 2-3 minutes and will dramatically improve your experience.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to KureCal
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Let&apos;s personalize your experience by learning about your career goals and interests.
            This helps us recommend the most relevant events for your professional development.
          </p>
        </div>

        {/* Network Error with Retry */}
        {submitError && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-medium text-destructive">Connection Error</h4>
                <p className="text-sm text-destructive/80 mt-1">{submitError}</p>
              </div>
              <button
                onClick={handleRetry}
                disabled={isSubmitting}
                className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Onboarding Component */}
        <OnboardingErrorBoundary>
          <div className="relative">
            {isSubmitting && (
              <div className="absolute inset-0 backdrop-blur-sm bg-background/60 flex items-center justify-center z-10 rounded-xl">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Saving your career profile...</p>
                </div>
              </div>
            )}

            <CareerOnboarding
              onComplete={handleComplete}
              onSkip={handleSkip}
              className=""
            />
          </div>
        </OnboardingErrorBoundary>

        {/* Benefits Section */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Why complete your career profile?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Target size={20} className="text-foreground" weight="regular" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Personalized Recommendations</h4>
              <p className="text-sm text-muted-foreground">
                Get event suggestions tailored to your experience level and career goals
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <MapPin size={20} className="text-foreground" weight="regular" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Location-Aware</h4>
              <p className="text-sm text-muted-foreground">
                See events near you and virtual options that fit your schedule
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Lightning size={20} className="text-foreground" weight="regular" />
              </div>
              <h4 className="font-medium text-foreground mb-2">Smart Discovery</h4>
              <p className="text-sm text-muted-foreground">
                Discover trending events and opportunities you might have missed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
