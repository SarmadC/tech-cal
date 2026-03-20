'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { useAuth } from '@/contexts';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { ProfileService } from '@/services/profileService';
import { CareerOnboardingData, CareerOptionalSectionStatus } from '@/types/career';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import OnboardingErrorBoundary from '@/components/onboarding/OnboardingErrorBoundary';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { motion } from 'framer-motion';
import { MobileCareerOnboarding } from '@/components/onboarding/mobile/MobileCareerOnboarding';
import { useIsMobile } from '@/hooks/useDeviceDetection';
import { usePostHog } from 'posthog-js/react';
import { filteredEventKeys } from '@/lib/queryKeys';

function CareerOnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { showSuccess, showError, showInfo } = useSnackbar();
    const { user, profile, refreshProfile: refreshAuthProfile } = useAuth();
    const { supabase, isReady } = useSupabaseSafe();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    const isMobile = useIsMobile();
    const posthog = usePostHog();

    const {
        hasCompletedOnboarding,
        isLoading,
        completeOnboarding
    } = useCareerProfile();

    // Check if user was redirected from middleware
    useEffect(() => {
        const fromMiddleware = searchParams.get('from') === 'middleware';
        if (fromMiddleware && !hasCompletedOnboarding) {
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
                return;
            } catch (error) {
                if (error instanceof Error && error.name === 'ProfileNotFoundError') {
                    setIsCreatingProfile(true);
                    try {
                        await ProfileService.createProfile({
                            id: user.id,
                            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                            avatarUrl: user.user_metadata?.avatar_url || null,
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            preferences: {}
                        }, supabase);

                        window.dispatchEvent(new CustomEvent('profile-updated'));
                        showSuccess('Profile created successfully!');
                    } catch (createError) {
                        console.error('[CareerOnboarding] Error creating profile:', createError);
                        showError('Failed to create profile. Please refresh the page.');
                    } finally {
                        setIsCreatingProfile(false);
                    }
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

    const handleComplete = async (
        data: CareerOnboardingData,
        options?: { optionalSectionsCompleted: CareerOptionalSectionStatus }
    ) => {
        setIsSubmitting(true);

        try {
            await completeOnboarding(data, options?.optionalSectionsCompleted);
            await refreshAuthProfile();
            await queryClient.invalidateQueries({ queryKey: ['profile'] });
            await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
            await queryClient.invalidateQueries({ queryKey: filteredEventKeys.all });
            window.dispatchEvent(new CustomEvent('profile-updated'));
            posthog?.capture('onboarding_completed', { device: isMobile ? 'mobile' : 'desktop' });
            showSuccess('Career profile completed! Discovering personalized events...');
            router.push('/discover');
        } catch (error) {
            console.error('Career onboarding error:', error);
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to save career profile. Please check your connection and try again.';
            showError(errorMessage);
        } finally {
            setIsSubmitting(false);
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
                window.dispatchEvent(new CustomEvent('profile-updated'));
            } catch (error) {
                console.error('[CareerOnboarding] Error creating profile on skip:', error);
                showError('Failed to set up your profile. Please try again.');
                return;
            }
        } else if (user?.id && supabase && profile) {
            try {
                await ProfileService.updateProfile(user.id, {
                    preferences: {
                        ...(profile.preferences as Record<string, unknown> || {}),
                        careerOnboardingCompleted: true,
                        careerOnboardingCompletedAt: new Date().toISOString(),
                        careerOnboardingSkipped: true
                    }
                }, supabase);
                window.dispatchEvent(new CustomEvent('profile-updated'));
            } catch (error) {
                console.error('[CareerOnboarding] Error updating profile on skip:', error);
                showError('Failed to update your profile. Please try again.');
                return;
            }
        }

        posthog?.capture('onboarding_skipped', { device: isMobile ? 'mobile' : 'desktop', had_existing_profile: !!profile });
        showInfo('You can complete your career profile later in settings');
        router.push('/discover');
    };

    if (isCreatingProfile || (isLoading && !profile)) {
        return (
            <div className="responsive-page-shell min-h-[100dvh] bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                    <p className="text-muted-foreground text-sm font-medium">
                        {isCreatingProfile ? 'Setting up your profile...' : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="responsive-page-shell min-h-[100dvh] bg-background transition-colors duration-300 dark:bg-[#08090a]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />

            <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-20">
                <OnboardingErrorBoundary>
                    <div className="relative">
                        {isSubmitting && (
                            <div className="absolute inset-0 backdrop-blur-[2px] bg-background/50 flex items-center justify-center z-50 rounded-xl transition-all duration-300">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground mx-auto mb-3"></div>
                                    <p className="text-sm font-medium text-foreground">Saving profile...</p>
                                </div>
                            </div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                            {isMobile ? (
                                <MobileCareerOnboarding
                                    onComplete={handleComplete}
                                    onSkip={handleSkip}
                                    className=""
                                />
                            ) : (
                                <CareerOnboarding
                                    onComplete={handleComplete}
                                    onSkip={handleSkip}
                                    className=""
                                />
                            )}
                        </motion.div>
                    </div>
                </OnboardingErrorBoundary>
            </div>
        </div>
    );
}

// Wrap in Suspense to handle useSearchParams() in Next.js 15+
export default function CareerOnboardingPage() {
    return (
        <Suspense fallback={
            <div className="responsive-page-shell min-h-[100dvh] bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                    <p className="text-muted-foreground text-sm font-medium">Loading...</p>
                </div>
            </div>
        }>
            <CareerOnboardingContent />
        </Suspense>
    );
}
