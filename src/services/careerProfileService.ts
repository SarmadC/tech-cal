'use client';

// Removed unused imports - using SupabaseClientType from types
import { CareerProfile, CareerOnboardingData } from '@/types/career';
import { AppProfile, Json, SupabaseClientType } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { CareerImpactService } from './careerImpactService';

// SupabaseClientType now imported from types

export class CareerProfileService {
  /**
   * Get user profile by user ID
   */
  static async getUserProfile(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<AppProfile> {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Profile not found');

      // Transform to AppProfile (simplified transformation)
      return {
        id: data.id,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        timezone: data.timezone,
        preferences: data.preferences
      } as AppProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Sentry.captureException(error, { extra: { function: 'getUserProfile', userId } });
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Get user's career profile from their preferences
   */
  static getCareerProfile(userProfile: AppProfile | null): CareerProfile | null {
    if (!userProfile?.preferences) return null;
    
    const preferences = userProfile.preferences as Record<string, unknown>;
    return (preferences?.careerProfile as CareerProfile) || null;
  }

  /**
   * Save career profile to user preferences
   */
  static async saveCareerProfile(
    userId: string,
    careerProfile: CareerProfile,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      // Get current preferences
      const { data: currentProfile, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Merge career profile with existing preferences
      const currentPreferences = (currentProfile?.preferences as Record<string, unknown>) || {};
      const updatedPreferences = {
        ...currentPreferences,
        careerProfile,
        careerProfileUpdatedAt: new Date().toISOString()
      };

      // Update preferences in database
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          preferences: updatedPreferences as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Invalidate career impact cache for this profile
      CareerImpactService.invalidateProfileCache(careerProfile).catch(error => {
        console.warn('Failed to invalidate career impact cache after profile update:', error);
      });
    } catch (error) {
      console.error('Error saving career profile:', error);
      Sentry.captureException(error, { 
        extra: { function: 'saveCareerProfile', userId } 
      });
      throw new Error('Failed to save career profile.');
    }
  }

  /**
   * Convert onboarding data to career profile
   */
  static onboardingDataToCareerProfile(data: CareerOnboardingData, userId: string): CareerProfile {
    return {
      // Required user context
      userId,
      profileId: `profile_${userId}_${Date.now()}`,
      lastUpdated: new Date().toISOString(),
      
      // Career profile data
      currentRole: data.step1_role.currentRole,
      seniority: data.step1_role.seniority,
      industry: data.step1_role.industry || 'technology',
      companySize: data.step1_role.companySize,
      
      primarySkills: data.step2_skills.primarySkills,
      skillsToLearn: data.step2_skills.skillsToLearn,
      interests: data.step2_skills.interests,
      
      careerGoals: data.step3_goals.careerGoals,
      timeframe: data.step3_goals.timeframe,
      
      learningStyle: data.step4_preferences.learningStyle,
      availableTime: data.step4_preferences.availableTime,
      budget: data.step4_preferences.budget,
      
      networkingGoals: data.step5_networking.networkingGoals,
      preferredEventTypes: data.step5_networking.preferredEventTypes,
    };
  }

  /**
   * Complete career onboarding process
   */
  static async completeCareerOnboarding(
    userId: string,
    onboardingData: CareerOnboardingData,
    supabaseClient: SupabaseClientType
  ): Promise<CareerProfile> {
    try {
      const careerProfile = this.onboardingDataToCareerProfile(onboardingData, userId);
      await this.saveCareerProfile(userId, careerProfile, supabaseClient);
      
      // Mark onboarding as completed
      await this.markOnboardingCompleted(userId, supabaseClient);
      
      return careerProfile;
    } catch (error) {
      console.error('Error completing career onboarding:', error);
      Sentry.captureException(error, { 
        extra: { function: 'completeCareerOnboarding', userId } 
      });
      throw new Error('Failed to complete career onboarding.');
    }
  }

  /**
   * Mark career onboarding as completed
   */
  static async markOnboardingCompleted(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      // Get current preferences
      const { data: currentProfile, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentPreferences = (currentProfile?.preferences as Record<string, unknown>) || {};
      const updatedPreferences = {
        ...currentPreferences,
        careerOnboardingCompleted: true,
        careerOnboardingCompletedAt: new Date().toISOString()
      };

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          preferences: updatedPreferences as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error marking onboarding completed:', error);
      Sentry.captureException(error, { 
        extra: { function: 'markOnboardingCompleted', userId } 
      });
      throw new Error('Failed to mark onboarding as completed.');
    }
  }

  /**
   * Check if user has completed career onboarding
   */
  static hasCompletedOnboarding(userProfile: AppProfile | null): boolean {
    if (!userProfile?.preferences) return false;
    
    const preferences = userProfile.preferences as Record<string, unknown>;
    return Boolean(preferences?.careerOnboardingCompleted);
  }

  /**
   * Get career insights for user
   */
  static getCareerInsights(careerProfile: CareerProfile | null): {
    skillGaps: string[];
    recommendedEventTypes: string[];
    careerStage: string;
    nextSteps: string[];
  } {
    if (!careerProfile) {
      return {
        skillGaps: [],
        recommendedEventTypes: ['conference', 'workshop'],
        careerStage: 'unknown',
        nextSteps: ['Complete your career profile for personalized insights']
      };
    }

    const skillGaps = careerProfile.skillsToLearn || [];
    
    // Recommend event types based on career goals
    const recommendedEventTypes: string[] = [];
    careerProfile.careerGoals.forEach(goal => {
      switch (goal) {
        case 'skill-development':
          recommendedEventTypes.push('workshop', 'bootcamp', 'training');
          break;
        case 'networking':
          recommendedEventTypes.push('networking', 'meetup', 'conference');
          break;
        case 'leadership-growth':
          recommendedEventTypes.push('summit', 'panel', 'keynote');
          break;
        case 'entrepreneurship':
          recommendedEventTypes.push('startup', 'pitch', 'business');
          break;
      }
    });

    // Determine career stage
    let careerStage = 'developing';
    if (['director', 'vp', 'cto'].includes(careerProfile.seniority)) {
      careerStage = 'leadership';
    } else if (['senior', 'staff', 'principal'].includes(careerProfile.seniority)) {
      careerStage = 'senior';
    } else if (['mid-level'].includes(careerProfile.seniority)) {
      careerStage = 'growing';
    } else if (['entry-level', 'junior'].includes(careerProfile.seniority)) {
      careerStage = 'learning';
    }

    // Generate next steps
    const nextSteps: string[] = [];
    if (skillGaps.length > 0) {
      nextSteps.push(`Focus on learning ${skillGaps.slice(0, 2).join(' and ')}`);
    }
    if (careerProfile.careerGoals.includes('networking')) {
      nextSteps.push('Attend networking events to build professional connections');
    }
    if (careerProfile.careerGoals.includes('career-advancement')) {
      nextSteps.push('Look for leadership and management learning opportunities');
    }

    return {
      skillGaps,
      recommendedEventTypes: [...new Set(recommendedEventTypes)],
      careerStage,
      nextSteps
    };
  }
}
