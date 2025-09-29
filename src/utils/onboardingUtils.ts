import { CareerOnboardingData, SkillTag, SkillProficiency } from '@/types/career';

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
  
  // Validate skill tags if primary skills are selected
  if (data.step2_skills?.primarySkills?.length) {
    const skillTags = data.step2_skills.skillTags || [];
    const skillsWithoutTags = data.step2_skills.primarySkills.filter(
      skill => !skillTags.some(tag => tag.skill === skill)
    );
    if (skillsWithoutTags.length > 0) {
      errors.push(`Proficiency rating required for: ${skillsWithoutTags.join(', ')}`);
    }
  }

  // Step 3: Goals
  if (!data.step3_goals?.careerGoals?.length) {
    errors.push('At least one career goal is required');
  }

  // Step 4: Learning preferences
  if (!data.step4_preferences?.learningStyle) {
    errors.push('Learning style is required');
  }

  // Step 5: Availability
  if (!data.step4_preferences?.availableTime) {
    errors.push('Time commitment is required');
  }

  // Step 6: Team building (optional but validate if present)
  if (data.step6_teamBuilding) {
    if (data.step6_teamBuilding.teamRole && !data.step6_teamBuilding.teamRole.trim()) {
      errors.push('Team role cannot be empty if specified');
    }
    if (data.step6_teamBuilding.teamGoals && data.step6_teamBuilding.teamGoals.length === 0) {
      errors.push('At least one team goal is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes onboarding data by providing defaults and cleaning up values
 */
export function sanitizeOnboardingData(data: Partial<CareerOnboardingData>): CareerOnboardingData {
  return {
    step1_role: {
      currentRole: data.step1_role?.currentRole || '',
      seniority: data.step1_role?.seniority || 'mid-level',
      industry: data.step1_role?.industry || '',
      companySize: data.step1_role?.companySize || 'medium'
    },
    step2_skills: {
      primarySkills: data.step2_skills?.primarySkills || [],
      skillsToLearn: data.step2_skills?.skillsToLearn || [],
      interests: data.step2_skills?.interests || [],
      skillTags: data.step2_skills?.skillTags || []
    },
    step3_goals: {
      careerGoals: data.step3_goals?.careerGoals || [],
      timeframe: data.step3_goals?.timeframe || 'medium-term'
    },
    step4_preferences: {
      learningStyle: data.step4_preferences?.learningStyle || [],
      availableTime: data.step4_preferences?.availableTime || 'moderate',
      budget: data.step4_preferences?.budget || 'moderate'
    },
    step5_networking: {
      networkingGoals: data.step5_networking?.networkingGoals || [],
      preferredEventTypes: data.step5_networking?.preferredEventTypes || []
    },
    step6_teamBuilding: {
      teamRole: data.step6_teamBuilding?.teamRole || 'flexible',
      collaborationStyle: data.step6_teamBuilding?.collaborationStyle || [],
      teamSizePreference: data.step6_teamBuilding?.teamSizePreference || 'flexible',
      communicationPreferences: data.step6_teamBuilding?.communicationPreferences || [],
      teamGoals: data.step6_teamBuilding?.teamGoals || [],
      mentorshipPreference: data.step6_teamBuilding?.mentorshipPreference || 'neither',
      availabilityPattern: data.step6_teamBuilding?.availabilityPattern || undefined,
      projectTypePreferences: data.step6_teamBuilding?.projectTypePreferences || []
    }
  };
}

/**
 * Creates default skill tags for selected skills
 */
export function createDefaultSkillTags(skills: string[]): SkillTag[] {
  return skills.map(skill => ({
    skill,
    proficiency: 'intermediate' as SkillProficiency,
    yearsOfExperience: 2,
    lastUsed: new Date().toISOString(),
    category: getSkillCategory(skill)
  }));
}

/**
 * Synchronizes primary skills with skill tags
 */
export function synchronizeSkillTags(
  primarySkills: string[],
  existingSkillTags: SkillTag[]
): SkillTag[] {
  const existingSkills = new Set(existingSkillTags.map(tag => tag.skill));
  
  // Add new skills with default proficiency
  const newSkills = primarySkills.filter(skill => !existingSkills.has(skill));
  const newSkillTags = createDefaultSkillTags(newSkills);
  
  // Keep existing skill tags for skills that are still selected
  const keptSkillTags = existingSkillTags.filter(tag => 
    primarySkills.includes(tag.skill)
  );
  
  return [...keptSkillTags, ...newSkillTags];
}

/**
 * Get skill category based on skill name
 */
export function getSkillCategory(skill: string): string {
  const skillLower = skill.toLowerCase();
  
  if (skillLower.includes('javascript') || skillLower.includes('typescript') || skillLower.includes('react') || skillLower.includes('vue') || skillLower.includes('angular')) {
    return 'Frontend';
  }
  if (skillLower.includes('python') || skillLower.includes('java') || skillLower.includes('node') || skillLower.includes('php') || skillLower.includes('ruby')) {
    return 'Backend';
  }
  if (skillLower.includes('sql') || skillLower.includes('database') || skillLower.includes('mongodb') || skillLower.includes('postgresql')) {
    return 'Database';
  }
  if (skillLower.includes('aws') || skillLower.includes('docker') || skillLower.includes('kubernetes') || skillLower.includes('devops')) {
    return 'DevOps';
  }
  if (skillLower.includes('design') || skillLower.includes('ui') || skillLower.includes('ux') || skillLower.includes('figma')) {
    return 'Design';
  }
  
  return 'Other';
}

/**
 * Validate skill tags
 */
export function validateSkillTags(skillTags: SkillTag[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  for (const tag of skillTags) {
    if (!tag.skill || typeof tag.skill !== 'string') {
      errors.push('Each skill must have a valid name');
    }
    if (!tag.proficiency || !['beginner', 'intermediate', 'advanced', 'expert'].includes(tag.proficiency)) {
      errors.push(`Invalid proficiency level for skill: ${tag.skill}`);
    }
    if (typeof tag.yearsOfExperience !== 'number' || tag.yearsOfExperience < 0) {
      errors.push(`Invalid years of experience for skill: ${tag.skill}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}