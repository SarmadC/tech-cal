// Type guards for safe profile data access
import { AppProfile } from '@/types';

export interface CareerProfile {
  industry?: string;
  interests?: string[];
  seniority?: string;
  timeframe?: string;
  careerGoals?: string[];
  companySize?: string;
  currentRole?: string;
  availableTime?: string;
  learningStyle?: string[];
  primarySkills?: string[];
  skillsToLearn?: string[];
  networkingGoals?: string[];
  preferredEventTypes?: string[];
  budget?: string;
}

export interface SafeProfileData {
  careerProfile: CareerProfile | null;
  recommendationPreferences: Record<string, unknown> | null;
}

/**
 * Safely extract career profile from user profile
 */
export function extractCareerProfile(userProfile: AppProfile | null): CareerProfile | null {
  if (!userProfile?.preferences) return null;

  try {
    const preferences = userProfile.preferences as Record<string, unknown>;
    const careerData = preferences.careerProfile;

    if (!careerData || typeof careerData !== 'object') return null;

    const career = careerData as Record<string, unknown>;

    return {
      industry: typeof career.industry === 'string' ? career.industry : undefined,
      interests: Array.isArray(career.interests) ? career.interests.filter(i => typeof i === 'string') : [],
      seniority: typeof career.seniority === 'string' ? career.seniority : undefined,
      timeframe: typeof career.timeframe === 'string' ? career.timeframe : undefined,
      careerGoals: Array.isArray(career.careerGoals) ? career.careerGoals.filter(g => typeof g === 'string') : [],
      companySize: typeof career.companySize === 'string' ? career.companySize : undefined,
      currentRole: typeof career.currentRole === 'string' ? career.currentRole : undefined,
      availableTime: typeof career.availableTime === 'string' ? career.availableTime : undefined,
      learningStyle: Array.isArray(career.learningStyle) ? career.learningStyle.filter(l => typeof l === 'string') : [],
      primarySkills: Array.isArray(career.primarySkills) ? career.primarySkills.filter(s => typeof s === 'string') : [],
      skillsToLearn: Array.isArray(career.skillsToLearn) ? career.skillsToLearn.filter(s => typeof s === 'string') : [],
      networkingGoals: Array.isArray(career.networkingGoals) ? career.networkingGoals.filter(g => typeof g === 'string') : [],
      preferredEventTypes: Array.isArray(career.preferredEventTypes) ? career.preferredEventTypes.filter(t => typeof t === 'string') : [],
      budget: typeof career.budget === 'string' ? career.budget : undefined,
    };
  } catch (error) {
    console.error('Error extracting career profile:', error);
    return null;
  }
}

/**
 * Safely extract recommendation preferences
 */
export function extractRecommendationPreferences(userProfile: AppProfile | null): Record<string, unknown> | null {
  if (!userProfile?.preferences) return null;

  try {
    const preferences = userProfile.preferences as Record<string, unknown>;
    const recPrefs = preferences.recommendation_preferences;

    if (!recPrefs || typeof recPrefs !== 'object') return null;

    return recPrefs as Record<string, unknown>;
  } catch (error) {
    console.error('Error extracting recommendation preferences:', error);
    return null;
  }
}

/**
 * Type guard to check if career profile is complete
 */
export function hasCompleteCareerProfile(careerProfile: CareerProfile | null): boolean {
  if (!careerProfile) return false;

  return !!(
    careerProfile.primarySkills?.length &&
    careerProfile.interests?.length &&
    careerProfile.seniority &&
    careerProfile.careerGoals?.length
  );
}
