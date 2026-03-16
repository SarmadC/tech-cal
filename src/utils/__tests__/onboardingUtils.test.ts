import { describe, expect, it } from 'vitest';

import {
  clampCareerOnboardingStep,
  deriveOptionalSectionStatus,
  mergeSkillStepData,
  sanitizeOnboardingData,
  validateOnboardingData,
} from '@/utils/onboardingUtils';

describe('onboardingUtils', () => {
  it('preserves targetPath when sanitizing onboarding data', () => {
    const sanitized = sanitizeOnboardingData({
      step1_role: {
        currentRole: 'Software Engineer',
        seniority: 'mid-level',
        industry: '',
        companySize: 'medium',
      },
      step2_skills: {
        primarySkills: ['React', 'TypeScript'],
        skillsToLearn: [],
        interests: [],
      },
      step3_goals: {
        careerGoals: ['skill-development'],
        timeframe: 'medium-term',
      },
      step4_preferences: {
        targetPath: 'AI Engineering',
        learningStyle: ['hands-on'],
        availableTime: 'moderate',
        budget: 'moderate',
      },
    });

    expect(sanitized.step4_preferences.targetPath).toBe('AI Engineering');
  });

  it('synchronizes skill tags from primary skills while preserving existing metadata', () => {
    const merged = mergeSkillStepData(
      {
        primarySkills: ['React'],
        skillsToLearn: [],
        interests: [],
        skillTags: [{
          skill: 'React',
          proficiency: 'advanced',
          yearsOfExperience: 6,
          lastUsed: '2025-01-01T00:00:00.000Z',
          category: 'Frontend',
          order: 0,
        }],
      },
      {
        primarySkills: ['React', 'TypeScript'],
      }
    );

    expect(merged.primarySkills).toEqual(['React', 'JavaScript/TypeScript']);
    expect(merged.skillTags?.map(tag => tag.skill)).toEqual(['React', 'JavaScript/TypeScript']);
    expect(merged.skillTags?.find(tag => tag.skill === 'React')?.proficiency).toBe('advanced');
    expect(merged.skillTags?.find(tag => tag.skill === 'JavaScript/TypeScript')?.pendingProficiency).toBe(true);
  });

  it('treats team role selection as the team optional-section completion signal', () => {
    expect(deriveOptionalSectionStatus({
      step4_preferences: { learningStyle: ['hands-on'] } as never,
      step5_networking: { networkingGoals: ['find-peers'] } as never,
      step6_teamBuilding: { teamRole: 'flexible' } as never,
    })).toEqual({
      learningPreferences: true,
      networkingPreferences: true,
      teamPreferences: true,
    });

    expect(deriveOptionalSectionStatus({
      step6_teamBuilding: { teamRole: 'flexible' } as never,
    })).toEqual({
      learningPreferences: false,
      networkingPreferences: false,
      teamPreferences: true,
    });
  });

  it('does not treat a hidden target path as completed learning preferences', () => {
    expect(deriveOptionalSectionStatus({
      step4_preferences: { targetPath: 'Machine Learning' } as never,
    })).toEqual({
      learningPreferences: false,
      networkingPreferences: false,
      teamPreferences: false,
    });
  });

  it('requires a timeline and enforces the goal cap for step 3 completion', () => {
    const validation = validateOnboardingData({
      step1_role: {
        currentRole: 'Software Engineer',
        seniority: 'mid-level',
      } as never,
      step2_skills: {
        primarySkills: ['React', 'TypeScript'],
      } as never,
      step3_goals: {
        careerGoals: ['skill-development', 'networking', 'leadership-growth'],
      } as never,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Choose up to 2 career goals');
    expect(validation.errors).toContain('Please choose a timeline');
  });

  it('does not require legacy team goals for optional team preferences', () => {
    const validation = validateOnboardingData({
      step1_role: {
        currentRole: 'Software Engineer',
        seniority: 'mid-level',
      } as never,
      step2_skills: {
        primarySkills: ['React', 'TypeScript'],
      } as never,
      step3_goals: {
        careerGoals: ['networking'],
        timeframe: 'medium-term',
      } as never,
      step6_teamBuilding: {
        teamRole: 'flexible',
        teamGoals: [],
      } as never,
    });

    expect(validation.errors).not.toContain('At least one team goal is required');
  });

  it('clamps legacy saved steps back into the visible 3-step flow', () => {
    expect(clampCareerOnboardingStep(0)).toBe(0);
    expect(clampCareerOnboardingStep(2)).toBe(2);
    expect(clampCareerOnboardingStep(5)).toBe(3);
  });
});
