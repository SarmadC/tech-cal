import { describe, expect, it } from '@jest/globals';
import {
  buildRoleGroups,
  getInitialRoleCategory,
  mergeOnboardingDrafts,
  validateOnboardingStep,
} from '../features/onboarding/model';

describe('onboarding model helpers', () => {
  it('merges local nested draft values over the remote draft', () => {
    const merged = mergeOnboardingDrafts(
      {
        step1_role: {
          currentRole: 'Software Engineer',
          seniority: 'mid-level',
          industry: 'Software',
          companySize: 'medium',
        },
        step2_skills: {
          primarySkills: ['TypeScript'],
          skillsToLearn: [],
          interests: [],
        },
      },
      {
        step2_skills: {
          primarySkills: ['React'],
          skillsToLearn: [],
          interests: ['AI'],
        },
      }
    );

    expect(merged.step1_role?.currentRole).toBe('Software Engineer');
    expect(merged.step2_skills?.primarySkills).toEqual(['React']);
    expect(merged.step2_skills?.interests).toEqual(['AI']);
  });

  it('validates required fields by onboarding step', () => {
    expect(validateOnboardingStep(1, {})).toEqual({
      currentRole: 'Current role is required.',
    });
    expect(validateOnboardingStep(2, {})).toEqual({
      seniority: 'Seniority is required.',
    });
    expect(
      validateOnboardingStep(3, {
        step2_skills: {
          primarySkills: ['TypeScript'],
          skillsToLearn: [],
          interests: [],
        },
      })
    ).toEqual({
      primarySkills: 'Add at least 2 topics you want to learn about.',
    });
  });

  it('derives the initial role category from the current role', () => {
    const roleGroups = buildRoleGroups({
      Engineering: ['Software Engineer'],
      'Data & AI': ['Data Scientist'],
      'Product & Design': ['Product Manager', 'Product Designer'],
      'Leadership & Strategy': [],
    });

    expect(
      getInitialRoleCategory(roleGroups, {
        step1_role: {
          currentRole: 'Product Designer',
          seniority: 'mid-level',
          industry: 'Software',
          companySize: 'medium',
        },
      })
    ).toBe('product');
  });
});
