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
      // Current Role Information
      currentRole: typeof career.currentRole === 'string' ? career.currentRole : '',
      seniority: (typeof career.seniority === 'string' ? career.seniority : 'entry-level') as 'entry-level' | 'junior' | 'mid-level' | 'senior' | 'lead' | 'principal' | 'executive',
      industry: typeof career.industry === 'string' ? career.industry : '',
      companySize: (typeof career.companySize === 'string' ? career.companySize : 'small') as 'startup' | 'small' | 'medium' | 'large' | 'enterprise',
      
      // Skills and Interests
      primarySkills: Array.isArray(career.primarySkills) ? career.primarySkills.filter(s => typeof s === 'string') : [],
      skillsToLearn: Array.isArray(career.skillsToLearn) ? career.skillsToLearn.filter(s => typeof s === 'string') : [],
      interests: Array.isArray(career.interests) ? career.interests.filter(i => typeof i === 'string') : [],
      
      // Career Goals
      careerGoals: Array.isArray(career.careerGoals) ? career.careerGoals.filter(g => typeof g === 'string') : [],
      timeframe: (typeof career.timeframe === 'string' ? career.timeframe : 'short-term') as 'immediate' | 'short-term' | 'medium-term' | 'long-term',
      
      // Learning Preferences
      learningStyle: Array.isArray(career.learningStyle) ? career.learningStyle.filter(l => typeof l === 'string') : [],
      availableTime: (typeof career.availableTime === 'string' ? career.availableTime : 'moderate') as 'low' | 'moderate' | 'high',
      budget: (typeof career.budget === 'string' ? career.budget : 'low') as 'free' | 'low' | 'moderate' | 'high',
      
      // Networking Preferences
      networkingGoals: Array.isArray(career.networkingGoals) ? career.networkingGoals.filter(g => typeof g === 'string') : [],
      preferredEventTypes: Array.isArray(career.preferredEventTypes) ? career.preferredEventTypes.filter(t => typeof t === 'string') : [],
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

/**
 * Check if user profile is empty (no skills, interests, or goals)
 * This is profile-based cold start detection - checks if profile has meaningful data.
 * 
 * Note: This is different from interaction-based cold start (see behavioralBoostUtils.ts)
 * which checks if user has < 3 interactions. Both can be true for a new user.
 */
export function isProfileEmpty(userProfile: AppProfile | null): boolean {
  if (!userProfile) return true;
  
  const careerProfile = extractCareerProfile(userProfile);
  if (!careerProfile) return true;
  
  // Check if profile is essentially empty (no meaningful data)
  const hasSkills = (careerProfile.primarySkills?.length ?? 0) > 0 || 
                   (careerProfile.skillsToLearn?.length ?? 0) > 0;
  const hasInterests = (careerProfile.interests?.length ?? 0) > 0;
  const hasGoals = (careerProfile.careerGoals?.length ?? 0) > 0;
  
  // Profile is empty if user has no skills, interests, or goals
  return !hasSkills && !hasInterests && !hasGoals;
}

/**
 * @deprecated Use isProfileEmpty() instead. This name was ambiguous.
 * Kept for backward compatibility - will be removed in future version.
 */
export function isColdStartUser(userProfile: AppProfile | null): boolean {
  return isProfileEmpty(userProfile);
}
