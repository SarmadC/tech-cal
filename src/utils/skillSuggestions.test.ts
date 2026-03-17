import { describe, expect, it } from 'vitest';

import { buildSkillOptionList, getCanonicalSkillMeta } from './skillTaxonomy';
import { getSkillsForRole, getSuggestedSkillsToLearn } from './skillSuggestions';

describe('skill suggestions', () => {
  it('returns design-focused skills for UX roles', () => {
    expect(getSkillsForRole('UX Designer')).toEqual([
      'Figma',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'Accessibility',
      'Usability Testing',
    ]);

    expect(getSkillsForRole('UI Designer')).toContain('Figma');
  });

  it('suggests complementary UX skills to learn', () => {
    expect(getSuggestedSkillsToLearn(['Figma'], 'UX Designer')).toEqual([
      'Design Systems',
      'Prototyping',
      'Accessibility',
      'User Research',
      'Framer',
    ]);
  });

  it('includes design tools in the selectable skill taxonomy', () => {
    const options = buildSkillOptionList();

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Figma', label: 'Figma', category: 'DESIGN_RESEARCH_TOOLS' }),
        expect.objectContaining({ value: 'User Research', label: 'User Research', category: 'DESIGN_RESEARCH_TOOLS' }),
        expect.objectContaining({ value: 'Accessibility', label: 'Accessibility', category: 'DESIGN_RESEARCH_TOOLS' }),
      ])
    );
  });

  it('includes cross-functional onboarding skills in the selectable taxonomy', () => {
    const options = buildSkillOptionList();

    expect(options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Product Strategy', category: 'PRODUCT_STRATEGY' }),
        expect.objectContaining({ value: 'Go-to-Market', category: 'PRODUCT_STRATEGY' }),
        expect.objectContaining({ value: 'Community Strategy', category: 'GROWTH_COMMUNITY' }),
        expect.objectContaining({ value: 'Business Operations', category: 'BUSINESS_OPERATIONS' }),
      ])
    );
  });

  it('canonicalizes the new business-skill aliases', () => {
    expect(getCanonicalSkillMeta('GTM')?.name).toBe('Go-to-Market');
    expect(getCanonicalSkillMeta('BizOps')?.name).toBe('Business Operations');
    expect(getCanonicalSkillMeta('CSM')?.name).toBe('Customer Success');
    expect(getCanonicalSkillMeta('PgM')?.name).toBe('Program Management');
    expect(getCanonicalSkillMeta('Speaking')?.name).toBe('Public Speaking');
    expect(getCanonicalSkillMeta('Strategy')?.name).toBe('Strategic Planning');
    expect(getCanonicalSkillMeta('BizDev')?.name).toBe('Business Development');
  });

  it('returns founder-focused current skill suggestions', () => {
    expect(getSkillsForRole('Founder')).toEqual([
      'Product Strategy',
      'Customer Discovery',
      'Go-to-Market',
      'Fundraising',
      'Business Operations',
      'Strategic Planning',
      'Partnerships',
    ]);
  });

  it('returns role-based learning suggestions for new cross-functional roles', () => {
    expect(getSuggestedSkillsToLearn([], 'Product Marketing Manager')).toEqual([
      'Go-to-Market',
      'Pricing & Packaging',
      'Content Strategy',
      'Growth Marketing',
      'Experiment Design',
      'Competitive Analysis',
      'Stakeholder Management',
    ]);

    expect(getSuggestedSkillsToLearn([], 'Developer Relations Manager')).toEqual([
      'Community Strategy',
      'Program Design',
      'Event Programming',
      'Public Speaking',
      'Partnerships',
      'Customer Success',
      'Stakeholder Management',
    ]);

    expect(getSuggestedSkillsToLearn([], 'Technical Program Manager')).toEqual([
      'Program Management',
      'Roadmapping',
      'Stakeholder Management',
      'Executive Communication',
      'Facilitation',
      'Business Operations',
      'Strategic Planning',
    ]);
  });

  it('filters out skills the user already selected from explicit learning suggestions', () => {
    expect(getSuggestedSkillsToLearn(['Go-to-Market', 'Fundraising'], 'Founder')).toEqual([
      'Product Strategy',
      'Customer Discovery',
      'Business Operations',
      'Strategic Planning',
      'Partnerships',
    ]);
  });
});
