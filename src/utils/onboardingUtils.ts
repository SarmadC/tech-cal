import { CareerOnboardingData } from '@/types/career';

/**
 * Validates that onboarding data is complete and properly formatted
 */
export function validateOnboardingData(data: Partial<CareerOnboardingData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Step 1: Role information
  if (!data.step1_role?.currentRole) {
    errors.push('Current role is required');
  }
  if (!data.step1_role?.seniority) {
    errors.push('Seniority level is required');
  }
  if (!data.step1_role?.industry) {
    errors.push('Industry is required');
  }

  // Step 2: Skills (at least one field should have selections)
  const hasSkills = 
    (data.step2_skills?.primarySkills?.length || 0) > 0 ||
    (data.step2_skills?.skillsToLearn?.length || 0) > 0 ||
    (data.step2_skills?.interests?.length || 0) > 0;
  
  if (!hasSkills) {
    errors.push('At least one skill, learning goal, or interest is required');
  }

  // Step 3: Career goals
  if (!data.step3_goals?.careerGoals?.length) {
    errors.push('At least one career goal is required');
  }

  // Step 4: Learning preferences
  if (!data.step4_preferences?.learningStyle?.length) {
    errors.push('At least one learning style is required');
  }

  // Step 5: Networking goals
  if (!data.step5_networking?.networkingGoals?.length) {
    errors.push('At least one networking goal is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes and normalizes onboarding data
 */
export function sanitizeOnboardingData(data: Partial<CareerOnboardingData>): CareerOnboardingData {
  return {
    step1_role: {
      currentRole: data.step1_role?.currentRole || '',
      seniority: data.step1_role?.seniority || 'entry-level',
      industry: data.step1_role?.industry || 'Technology/Software',
      companySize: data.step1_role?.companySize || 'startup'
    },
    step2_skills: {
      primarySkills: data.step2_skills?.primarySkills || [],
      skillsToLearn: data.step2_skills?.skillsToLearn || [],
      interests: data.step2_skills?.interests || []
    },
    step3_goals: {
      careerGoals: data.step3_goals?.careerGoals || [],
      timeframe: data.step3_goals?.timeframe || 'medium-term'
    },
    step4_preferences: {
      learningStyle: data.step4_preferences?.learningStyle || [],
      availableTime: data.step4_preferences?.availableTime || 'moderate',
      budget: data.step4_preferences?.budget || 'low'
    },
    step5_networking: {
      networkingGoals: data.step5_networking?.networkingGoals || [],
      preferredEventTypes: data.step5_networking?.preferredEventTypes || []
    }
  };
}

/**
 * Gets a summary of selected skills for display
 */
export function getSkillsSummary(data: Partial<CareerOnboardingData>): {
  currentSkills: string[];
  learningGoals: string[];
  interests: string[];
} {
  return {
    currentSkills: data.step2_skills?.primarySkills || [],
    learningGoals: data.step2_skills?.skillsToLearn || [],
    interests: data.step2_skills?.interests || []
  };
}
