import { 
  CareerProfile, 
  CareerOnboardingData, 
  TeamBuildingPreferences, 
  SkillTag,
  SeniorityLevel,
  CompanySize,
  CareerGoal,
  CareerTimeframe,
  LearningStyle,
  AvailableTime,
  BudgetRange,
  NetworkingGoal,
  CareerEventType,
  CareerOptionalSectionStatus,
  CareerOptionalSectionSnoozes,
  CareerOptionalSectionTimestamps
} from '@/types/career';
import { AppProfile, Json, SupabaseClientType } from '@/types';
import * as Sentry from '@sentry/nextjs';
import { CareerImpactService } from './careerImpactService';

// Database types for career_profiles table
interface CareerProfileRow {
  user_id: string;
  created_at: string;
  updated_at: string;
  "current_role": string;
  seniority: string;
  industry: string;
  company_size: string | null;
  primary_skills: string[];
  skills_to_learn: string[];
  interests: string[];
  skill_tags: Json;
  career_goals: string[];
  timeframe: string | null;
  learning_style: string[];
  available_time: string | null;
  budget: string | null;
  networking_goals: string[];
  preferred_event_types: string[];
}

export class CareerProfileService {
  /**
   * Transform database row to CareerProfile
   */
  private static transformRowToCareerProfile(row: CareerProfileRow): CareerProfile {
    const availableTime = (row.available_time as AvailableTime | null) ?? 'moderate';
    const budget = (row.budget as BudgetRange | null) ?? 'moderate';
    const companySize = (row.company_size as CompanySize | null) ?? 'small';
    const seniority = (row.seniority as SeniorityLevel | null) ?? 'entry-level';
    const timeframe = (row.timeframe as CareerTimeframe | null) ?? 'short-term';

    const rawSkillTags = row.skill_tags as unknown;
    const skillTags = Array.isArray(rawSkillTags) ? (rawSkillTags as SkillTag[]) : [];

    return {
      userId: row.user_id,
      profileId: `profile_${row.user_id}_${Date.now()}`,
      lastUpdated: row.updated_at,
      currentRole: row["current_role"],
      seniority,
      industry: row.industry,
      companySize,
      primarySkills: Array.isArray(row.primary_skills) ? row.primary_skills : [],
      skillsToLearn: Array.isArray(row.skills_to_learn) ? row.skills_to_learn : [],
      interests: Array.isArray(row.interests) ? row.interests : [],
      skillTags,
      careerGoals: Array.isArray(row.career_goals) ? (row.career_goals as CareerGoal[]) : [],
      timeframe,
      learningStyle: Array.isArray(row.learning_style) ? (row.learning_style as LearningStyle[]) : [],
      availableTime,
      budget,
      networkingGoals: Array.isArray(row.networking_goals) ? (row.networking_goals as NetworkingGoal[]) : [],
      preferredEventTypes: Array.isArray(row.preferred_event_types) ? (row.preferred_event_types as CareerEventType[]) : []
    };
  }

  /**
   * Transform CareerProfile to database row data
   */
  private static transformCareerProfileToRow(careerProfile: CareerProfile): Partial<CareerProfileRow> {
    return {
      "current_role": careerProfile.currentRole,
      seniority: careerProfile.seniority,
      industry: careerProfile.industry,
      company_size: (careerProfile.companySize ?? 'small') as 'startup' | 'small' | 'medium' | 'large' | 'enterprise' | 'freelance',
      primary_skills: careerProfile.primarySkills ?? [],
      skills_to_learn: careerProfile.skillsToLearn ?? [],
      interests: careerProfile.interests ?? [],
      skill_tags: (careerProfile.skillTags ?? []) as unknown as Json,
      career_goals: careerProfile.careerGoals ?? [],
      timeframe: (careerProfile.timeframe ?? 'short-term') as 'immediate' | 'short-term' | 'medium-term' | 'long-term',
      learning_style: careerProfile.learningStyle ?? [],
      available_time: (careerProfile.availableTime ?? 'moderate') as 'very-limited' | 'limited' | 'moderate' | 'flexible' | 'dedicated',
      budget: (careerProfile.budget ?? 'moderate') as 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited',
      networking_goals: careerProfile.networkingGoals ?? [],
      preferred_event_types: careerProfile.preferredEventTypes ?? []
    };
  }

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
   * Get user's career profile from the career_profiles table
   */
  static async getCareerProfile(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<CareerProfile | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseClient as any)
        .from('career_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user hasn't completed career profile
          return null;
        }
        throw error;
      }

      return this.transformRowToCareerProfile(data as CareerProfileRow);
    } catch (error) {
      console.error('Error fetching career profile:', error);
      Sentry.captureException(error, { extra: { function: 'getCareerProfile', userId } });
      return null;
    }
  }

  /**
   * Get user's career profile from their preferences (legacy method for backward compatibility)
   */
  static getCareerProfileFromPreferences(userProfile: AppProfile | null): CareerProfile | null {
    if (!userProfile?.preferences) return null;
    
    const preferences = userProfile.preferences as Record<string, unknown>;
    return (preferences?.careerProfile as CareerProfile) || null;
  }

  /**
   * Save career profile to the career_profiles table
   */
  static async saveCareerProfile(
    userId: string,
    careerProfile: CareerProfile,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      console.log('[CareerProfileService] Saving career profile for userId:', userId);
      console.log('[CareerProfileService] Supabase client available:', !!supabaseClient);
      
      const rowData = this.transformCareerProfileToRow(careerProfile);
      console.log('[CareerProfileService] Transformed row data:', rowData);
      
      // Upsert career profile
      const { data, error } = await supabaseClient
        .from('career_profiles')
        .upsert({
          user_id: userId,
          ...rowData
        } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select();

      console.log('[CareerProfileService] Upsert result:', { data, error });

      if (error) throw error;

      // Invalidate career impact cache for this profile
      CareerImpactService.invalidateProfileCache(careerProfile).catch(error => {
        console.warn('Failed to invalidate career impact cache after profile update:', error);
      });
    } catch (error) {
      // Enhanced error logging to capture Supabase error details
      console.error('Error saving career profile to new table:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        errorType: error?.constructor?.name || typeof error
      });
      
      // Fallback to legacy method if new table fails
      try {
        console.log('[CareerProfileService] Falling back to legacy preferences method');
        await this.saveCareerProfileToPreferences(userId, careerProfile, supabaseClient);
        console.log('[CareerProfileService] Successfully saved to preferences');
        return;
      } catch (fallbackError) {
        // Enhanced fallback error logging
        console.error('Error saving career profile to preferences (fallback):', {
          fallbackError,
          fallbackErrorMessage: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          fallbackErrorDetails: JSON.stringify(fallbackError, Object.getOwnPropertyNames(fallbackError))
        });
        
        // Log detailed error information for both errors
        console.error('Complete error details:', {
          originalError: {
            message: error instanceof Error ? error.message : 'Unknown error',
            name: error instanceof Error ? error.name : 'Unknown',
            stack: error instanceof Error ? error.stack : undefined,
            errorType: typeof error,
            errorString: String(error),
            errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error))
          },
          fallbackError: {
            message: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            name: fallbackError instanceof Error ? fallbackError.name : 'Unknown',
            stack: fallbackError instanceof Error ? fallbackError.stack : undefined,
            errorType: typeof fallbackError,
            errorString: String(fallbackError)
          },
          userId,
          careerProfile: {
            currentRole: careerProfile?.currentRole,
            seniority: careerProfile?.seniority,
            industry: careerProfile?.industry,
            companySize: careerProfile?.companySize,
            primarySkills: careerProfile?.primarySkills?.length,
            careerGoals: careerProfile?.careerGoals?.length,
            timeframe: careerProfile?.timeframe
          }
        });
        
        Sentry.captureException(error, { 
          extra: { function: 'saveCareerProfile', userId, careerProfile, fallbackError } 
        });
        throw new Error('Failed to save career profile.');
      }
    }
  }

  /**
   * Save career profile to user preferences (legacy method for backward compatibility)
   */
  static async saveCareerProfileToPreferences(
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
        extra: { function: 'saveCareerProfileToPreferences', userId } 
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
      skillTags: data.step2_skills.skillTags || [],
      
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
      
      // Save team building preferences separately
      if (onboardingData.step6_teamBuilding) {
        const teamBuildingData: TeamBuildingPreferences = {
          skillProficiencies: onboardingData.step2_skills?.skillTags || [],
          teamRole: onboardingData.step6_teamBuilding.teamRole,
          collaborationStyle: onboardingData.step6_teamBuilding.collaborationStyle || [],
          teamSizePreference: onboardingData.step6_teamBuilding.teamSizePreference || 'flexible',
          communicationPreferences: onboardingData.step6_teamBuilding.communicationPreferences || [],
          teamGoals: onboardingData.step6_teamBuilding.teamGoals || [],
          mentorshipPreference: onboardingData.step6_teamBuilding.mentorshipPreference || 'neither',
          availabilityPattern: onboardingData.step6_teamBuilding.availabilityPattern,
          projectTypePreferences: onboardingData.step6_teamBuilding.projectTypePreferences || []
        };
        await this.saveTeamBuildingPreferences(userId, teamBuildingData, supabaseClient);
      }
      
      // Mark onboarding as completed
      const optionalStatus: CareerOptionalSectionStatus = {
        learningPreferences: Boolean(onboardingData.step4_preferences?.learningStyle?.length),
        networkingPreferences: Boolean(onboardingData.step5_networking?.networkingGoals?.length),
        teamPreferences: Boolean(onboardingData.step6_teamBuilding?.teamGoals?.length)
      };

      await this.markOnboardingCompleted(userId, supabaseClient, optionalStatus);
      
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
   * Save team building preferences to user preferences
   */
  static async saveTeamBuildingPreferences(
    userId: string,
    teamBuildingPreferences: TeamBuildingPreferences,
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

      // Merge team building preferences with existing preferences
      const currentPreferences = (currentProfile?.preferences as Record<string, unknown>) || {};
      const updatedPreferences = {
        ...currentPreferences,
        teamBuildingPreferences,
        teamBuildingPreferencesUpdatedAt: new Date().toISOString()
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
    } catch (error) {
      console.error('Error saving team building preferences:', error);
      Sentry.captureException(error, { 
        extra: { function: 'saveTeamBuildingPreferences', userId } 
      });
      throw new Error('Failed to save team building preferences.');
    }
  }

  /**
   * Get team building preferences from user profile
   */
  static getTeamBuildingPreferences(userProfile: AppProfile | null): TeamBuildingPreferences | null {
    if (!userProfile?.preferences) return null;
    
    const preferences = userProfile.preferences as Record<string, unknown>;
    return (preferences?.teamBuildingPreferences as TeamBuildingPreferences) || null;
  }

  /**
   * Complete team building onboarding for a specific hackathon
   */
  static async completeTeamBuildingOnboarding(
    hackathonId: string,
    userId: string,
    teamBuildingData: TeamBuildingPreferences,
    supabaseClient: SupabaseClientType
  ): Promise<void> {
    try {
      // Validate team building data
      this.validateTeamBuildingData(teamBuildingData);

      // Store team building preferences in profiles.preferences JSON field
      // This is a temporary solution until hackathon_participants table is created
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          preferences: {
            teamBuildingPreferences: {
              [hackathonId]: teamBuildingData
            }
          } as unknown as Json, // Temporary type assertion until proper JSON types are defined
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error completing team building onboarding:', error);
      Sentry.captureException(error, { 
        extra: { function: 'completeTeamBuildingOnboarding', hackathonId, userId } 
      });
      throw new Error('Failed to complete team building onboarding.');
    }
  }

  /**
   * Validate team building data
   */
  private static validateTeamBuildingData(data: TeamBuildingPreferences): void {
    if (!data.skillProficiencies || !Array.isArray(data.skillProficiencies)) {
      throw new Error('Skill proficiencies must be provided');
    }

    for (const skill of data.skillProficiencies) {
      if (!skill.skill || typeof skill.skill !== 'string') {
        throw new Error('Each skill must have a valid name');
      }
      if (!skill.proficiency || !['beginner', 'intermediate', 'advanced', 'expert'].includes(skill.proficiency)) {
        throw new Error('Each skill must have a valid proficiency level');
      }
    }
  }

  /**
   * Get skill proficiency data from career profile
   */
  static getSkillProficiencyData(careerProfile: CareerProfile | null): {
    skillTags: SkillTag[];
    proficiencyDistribution: Record<string, number>;
    averageExperience: number;
  } {
    if (!careerProfile?.skillTags) {
      return {
        skillTags: [],
        proficiencyDistribution: {},
        averageExperience: 0
      };
    }

    const skillTags = careerProfile.skillTags;
    
    // Count proficiency levels
    const proficiencyDistribution = skillTags.reduce((acc, tag) => {
      if (!tag.proficiency) {
        return acc;
      }
      acc[tag.proficiency] = (acc[tag.proficiency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average experience
    const averageExperience = skillTags.length > 0 
      ? skillTags.reduce((sum, tag) => sum + tag.yearsOfExperience, 0) / skillTags.length
      : 0;

    return {
      skillTags,
      proficiencyDistribution,
      averageExperience
    };
  }

  /**
   * Mark career onboarding as completed
   */
  static async markOnboardingCompleted(
    userId: string,
    supabaseClient: SupabaseClientType,
    optionalStatus?: CareerOptionalSectionStatus
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
      const existingOptionalStatus = currentPreferences?.careerOptionalSections as CareerOptionalSectionStatus | undefined;
      const existingOptionalSnoozes = currentPreferences?.careerOptionalSnoozes as CareerOptionalSectionSnoozes | undefined;
      const existingOptionalTimestamps = currentPreferences?.careerOptionalSectionTimestamps as CareerOptionalSectionTimestamps | undefined;
      const optionalSectionStatus = {
        learningPreferences: optionalStatus?.learningPreferences ?? existingOptionalStatus?.learningPreferences ?? false,
        networkingPreferences: optionalStatus?.networkingPreferences ?? existingOptionalStatus?.networkingPreferences ?? false,
        teamPreferences: optionalStatus?.teamPreferences ?? existingOptionalStatus?.teamPreferences ?? false
      };
      const timestampNow = new Date().toISOString();
      const optionalSectionTimestamps: CareerOptionalSectionTimestamps = {
        learningPreferencesCompletedAt: optionalSectionStatus.learningPreferences
          ? (existingOptionalTimestamps?.learningPreferencesCompletedAt ?? timestampNow)
          : existingOptionalTimestamps?.learningPreferencesCompletedAt,
        networkingPreferencesCompletedAt: optionalSectionStatus.networkingPreferences
          ? (existingOptionalTimestamps?.networkingPreferencesCompletedAt ?? timestampNow)
          : existingOptionalTimestamps?.networkingPreferencesCompletedAt,
        teamPreferencesCompletedAt: optionalSectionStatus.teamPreferences
          ? (existingOptionalTimestamps?.teamPreferencesCompletedAt ?? timestampNow)
          : existingOptionalTimestamps?.teamPreferencesCompletedAt
      };

      const updatedPreferences = {
        ...currentPreferences,
        careerOnboardingCompleted: true,
        careerOnboardingCompletedAt: new Date().toISOString(),
        careerOptionalSections: optionalSectionStatus,
        careerOptionalSnoozes: existingOptionalSnoozes ?? {},
        careerOptionalSectionTimestamps: optionalSectionTimestamps
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

  static async updateOptionalSections(
    userId: string,
    supabaseClient: SupabaseClientType,
    statusUpdates: Partial<CareerOptionalSectionStatus> = {},
    snoozeUpdates: Partial<CareerOptionalSectionSnoozes> = {},
    timestampUpdates: Partial<CareerOptionalSectionTimestamps> = {}
  ): Promise<void> {
    try {
      const { data: currentProfile, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentPreferences = (currentProfile?.preferences as Record<string, unknown>) || {};
      const existingStatus = (currentPreferences?.careerOptionalSections as CareerOptionalSectionStatus | undefined) ?? {
        learningPreferences: false,
        networkingPreferences: false,
        teamPreferences: false
      };
      const existingSnoozes = (currentPreferences?.careerOptionalSnoozes as CareerOptionalSectionSnoozes | undefined) ?? {};
      const existingTimestamps = (currentPreferences?.careerOptionalSectionTimestamps as CareerOptionalSectionTimestamps | undefined) ?? {};

      const timestampNow = new Date().toISOString();
      const mergedStatus: CareerOptionalSectionStatus = {
        ...existingStatus,
        ...statusUpdates
      };

      const timestampPayload: CareerOptionalSectionTimestamps = { ...existingTimestamps };
      (Object.keys(statusUpdates) as Array<keyof CareerOptionalSectionStatus>).forEach(section => {
        if (statusUpdates[section] === true) {
          const keyMap: Record<keyof CareerOptionalSectionStatus, keyof CareerOptionalSectionTimestamps> = {
            learningPreferences: 'learningPreferencesCompletedAt',
            networkingPreferences: 'networkingPreferencesCompletedAt',
            teamPreferences: 'teamPreferencesCompletedAt'
          };
          const timestampKey = keyMap[section];
          timestampPayload[timestampKey] = timestampUpdates[timestampKey] ?? timestampNow;
        }
      });

      const mergedTimestamps: CareerOptionalSectionTimestamps = {
        ...timestampPayload,
        ...timestampUpdates
      };

      const updatedPreferences = {
        ...currentPreferences,
        careerOptionalSections: mergedStatus,
        careerOptionalSnoozes: {
          ...existingSnoozes,
          ...snoozeUpdates
        },
        careerOptionalSectionTimestamps: mergedTimestamps
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
      console.error('Error updating optional sections:', error);
      Sentry.captureException(error, {
        extra: { function: 'updateOptionalSections', userId, statusUpdates, snoozeUpdates }
      });
      throw new Error('Failed to update optional section status.');
    }
  }

  /**
   * Migrate career profile data from JSONB to structured table
   */
  static async migrateCareerProfileData(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<boolean> {
    try {
      // Check if career profile already exists in new table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingProfile } = await (supabaseClient as any)
        .from('career_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        return true; // Already migrated
      }

      // Get career profile from preferences
      const { data: profile, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile found - user is new, nothing to migrate
          return false;
        }
        throw fetchError;
      }

      if (!profile) {
        return false; // No profile found
      }

      const preferences = profile?.preferences as Record<string, unknown>;
      const careerProfile = preferences?.careerProfile as CareerProfile;

      if (!careerProfile) {
        return false; // No career profile to migrate
      }

      // Save to new table
      await this.saveCareerProfile(userId, careerProfile, supabaseClient);
      return true;
    } catch (error) {
      console.error('Error migrating career profile data:', error);
      Sentry.captureException(error, { 
        extra: { function: 'migrateCareerProfileData', userId } 
      });
      return false;
    }
  }

  /**
   * Check if user has completed career onboarding
   */
  static async hasCompletedOnboarding(
    userId: string,
    supabaseClient: SupabaseClientType
  ): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseClient as any)
        .from('career_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // No career profile found
        }
        throw error;
      }

      return Boolean(data);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      Sentry.captureException(error, { extra: { function: 'hasCompletedOnboarding', userId } });
      return false;
    }
  }

  /**
   * Check if user has completed career onboarding (legacy method for backward compatibility)
   */
  static hasCompletedOnboardingFromPreferences(userProfile: AppProfile | null): boolean {
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
