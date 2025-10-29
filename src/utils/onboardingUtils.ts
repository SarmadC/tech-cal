import { CareerOnboardingData, SkillTag } from '@/types/career';
import {
  getSkillCategory as getCanonicalSkillCategory,
  mapSkillsToCanonical,
  normalizeSkillName,
  resolveCanonicalSkillName
} from '@/utils/skillTaxonomy';
import { deduplicateSkills, normalizeForComparison } from '@/utils/skillSuggestions';

/**
 * Validates that onboarding data is complete and properly formatted
 */
export function validateOnboardingData(data: Partial<CareerOnboardingData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Step 1: Role information (only Current Role and Experience Level required)
  if (!data.step1_role?.currentRole) {
    errors.push('Current role is required');
  }
  if (!data.step1_role?.seniority) {
    errors.push('Seniority level is required');
  }
  // Industry and Company Size are now optional (progressive profiling)

  // Step 2: Skills - require at least 2 current skills
  const primarySkills = data.step2_skills?.primarySkills || [];
  if (primarySkills.length < 2) {
    errors.push('Please add at least 2 current skills');
  }
  
  // Check for within-field duplicates in current skills
  const normPrimary = primarySkills.map(normalizeForComparison);
  if (new Set(normPrimary).size !== normPrimary.length) {
    errors.push('Duplicate skills detected in Current Skills');
  }
  
  // Check for within-field duplicates in skills to learn
  const skillsToLearn = data.step2_skills?.skillsToLearn || [];
  const normToLearn = skillsToLearn.map(normalizeForComparison);
  if (new Set(normToLearn).size !== normToLearn.length) {
    errors.push('Duplicate skills detected in Skills to Learn');
  }
  
  // Check for within-field duplicates in interests
  const interests = data.step2_skills?.interests || [];
  const normInterests = interests.map(normalizeForComparison);
  if (new Set(normInterests).size !== normInterests.length) {
    errors.push('Duplicate entries detected in Areas of Interest');
  }
  
  // Cross-field duplicate warning (non-blocking, just informational)
  const dedupe = deduplicateSkills(primarySkills, skillsToLearn, interests);
  if (!dedupe.isValid) {
    const dupeList = dedupe.crossFieldDuplicates.map(d => d.skill).join(', ');
    errors.push(`Note: ${dupeList} appear${dedupe.crossFieldDuplicates.length === 1 ? 's' : ''} in multiple fields`);
  }
  
  // Skills to learn and interests are optional (progressive profiling)
  // No proficiency validation (removed)

  // Step 3: Goals
  if (!data.step3_goals?.careerGoals?.length) {
    errors.push('At least one career goal is required');
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
      primarySkills: mapSkillsToCanonical(data.step2_skills?.primarySkills || []),
      skillsToLearn: mapSkillsToCanonical(data.step2_skills?.skillsToLearn || []),
      interests: data.step2_skills?.interests || [],
      // Keep skillTags for backward compatibility, but don't require proficiency
      skillTags: (data.step2_skills?.skillTags || [])
        .filter(tag => Boolean(tag?.skill))
        .map((tag, index) => {
          const canonicalSkill = resolveCanonicalSkillName(tag.skill);
          const { pendingProficiency: _pending, ...rest } = tag;
          return {
            ...rest,
            skill: canonicalSkill,
            category: getCanonicalSkillCategory(canonicalSkill),
            order: tag.order ?? index
          };
        })
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
  const canonicalSkills = mapSkillsToCanonical(skills);
  return canonicalSkills.map((skill, index) => ({
    skill,
    proficiency: undefined,
    yearsOfExperience: 0,
    lastUsed: new Date().toISOString(),
    category: getCanonicalSkillCategory(skill),
    pendingProficiency: true,
    order: index
  }));
}

/**
 * Synchronizes primary skills with skill tags
 */
export function synchronizeSkillTags(
  primarySkills: string[],
  existingSkillTags: SkillTag[]
): SkillTag[] {
  const canonicalSkills = mapSkillsToCanonical(primarySkills);
  const tagLookup = new Map<string, SkillTag>(
    existingSkillTags.map(tag => [normalizeSkillName(tag.skill), tag])
  );

  return canonicalSkills.map((skill, index) => {
    const normalizedSkill = normalizeSkillName(skill);
    const existingTag = tagLookup.get(normalizedSkill);
    const baseTag: SkillTag = {
      skill,
      proficiency: undefined,
      yearsOfExperience: 0,
      lastUsed: new Date().toISOString(),
      category: getCanonicalSkillCategory(skill),
      pendingProficiency: true,
      order: index
    };

    if (existingTag) {
      const { pendingProficiency: _pending, ...restExisting } = existingTag;
      return {
        ...baseTag,
        ...restExisting,
        skill: baseTag.skill,
        category: baseTag.category,
        pendingProficiency: !existingTag.proficiency,
        order: index
      };
    }

    return baseTag;
  });
}

/**
 * Get skill category based on skill name
 */
export function getSkillCategory(skill: string): string {
  return getCanonicalSkillCategory(skill);
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
    const canonicalSkill = resolveCanonicalSkillName(tag.skill);

    if (!tag.skill || typeof tag.skill !== 'string') {
      errors.push('Each skill must have a valid name');
    }
    if (!tag.proficiency || !['beginner', 'intermediate', 'advanced', 'expert'].includes(tag.proficiency)) {
      errors.push(`Missing or invalid proficiency level for skill: ${canonicalSkill}`);
    }
    if (typeof tag.yearsOfExperience !== 'number' || tag.yearsOfExperience < 0) {
      errors.push(`Invalid years of experience for skill: ${canonicalSkill}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
