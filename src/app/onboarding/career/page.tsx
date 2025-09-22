'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts';
import { CareerOnboardingData } from '@/types/career';
import { CareerProfileService } from '@/services/careerProfileService';
import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import CareerOnboarding from '@/components/onboarding/CareerOnboarding';
import { toast } from 'sonner';

export default function CareerOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { supabase, isReady } = useSupabaseSafe();

  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user has already completed onboarding
    if (profile && CareerProfileService.hasCompletedOnboarding(profile)) {
      router.push('/dashboard');
      return;
    }
  }, [user, profile, router]);

  // Listen for profile updates to handle the case where onboarding was just completed
  React.useEffect(() => {
    const handleProfileUpdate = () => {
      // Force a re-render by updating a state or refetching profile data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('profile-updated', handleProfileUpdate);
  }, [queryClient, user?.id]);

  // Wait for Supabase client to be ready
  if (!isReady || !supabase) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  // Show loading if supabase client is not ready yet
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleComplete = async (data: CareerOnboardingData) => {
    if (!user?.id) {
      toast.error('Authentication required');
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await CareerProfileService.completeCareerOnboarding(user.id, data, supabase);
      
      // Invalidate profile queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      // Trigger auth context refresh
      window.dispatchEvent(new CustomEvent('profile-updated'));
      
      toast.success('Career profile completed! Discovering personalized events...');
      
      // Redirect to calendar with discovery view
      router.push('/calendar?view=discover');
    } catch (error) {
      console.error('Career onboarding error:', error);
      toast.error('Failed to save career profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    toast.info('You can complete your career profile later in settings');
    router.push('/dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to TechCalendar! 🎉
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Let&apos;s personalize your experience by learning about your career goals and interests. 
            This helps us recommend the most relevant events for your professional development.
          </p>
        </div>

        {/* Onboarding Component */}
        <div className="relative">
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Saving your career profile...</p>
              </div>
            </div>
          )}
          
          <CareerOnboarding
            onComplete={handleComplete}
            onSkip={handleSkip}
            className="bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Benefits Section */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Why complete your career profile?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-3">🎯</div>
              <h4 className="font-semibold text-gray-900 mb-2">Personalized Recommendations</h4>
              <p className="text-sm text-gray-600">
                Get event suggestions tailored to your experience level and career goals
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-3">📍</div>
              <h4 className="font-semibold text-gray-900 mb-2">Location-Aware</h4>
              <p className="text-sm text-gray-600">
                See events near you and virtual options that fit your schedule
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-3">⚡</div>
              <h4 className="font-semibold text-gray-900 mb-2">Smart Discovery</h4>
              <p className="text-sm text-gray-600">
                Discover trending events and opportunities you might have missed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
