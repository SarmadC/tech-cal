import { describe, expect, it, vi } from 'vitest';

import {
  buildOnboardingTaxonomyData,
  fetchOnboardingTaxonomy,
  getCurrentSkillSuggestionsForRole,
  getFallbackOnboardingTaxonomy,
  getLearningSkillSuggestionsForRole,
} from '../onboardingTaxonomyService';

describe('onboardingTaxonomyService', () => {
  it('returns the bundled fallback taxonomy when remote data is unavailable', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: null,
          error: { message: 'relation does not exist' },
        })),
      })),
    } as never;

    const taxonomy = await fetchOnboardingTaxonomy(supabase);

    expect(taxonomy.source).toBe('fallback');
    expect(taxonomy.skillOptions).toEqual(getFallbackOnboardingTaxonomy().skillOptions);
    expect(taxonomy.interestOptions).toEqual(getFallbackOnboardingTaxonomy().interestOptions);
  });

  it('hydrates remote taxonomy rows and canonicalizes alias-based role suggestions', () => {
    const taxonomy = buildOnboardingTaxonomyData({
      skillRows: [
        {
          name: 'JavaScript/TypeScript',
          category: 'PROGRAMMING_LANGUAGES',
          sort_order: 1,
          is_active: true,
        },
        {
          name: 'Python',
          category: 'PROGRAMMING_LANGUAGES',
          sort_order: 2,
          is_active: true,
        },
      ],
      aliasRows: [
        { skill_name: 'JavaScript/TypeScript', alias: 'JavaScript' },
        { skill_name: 'JavaScript/TypeScript', alias: 'TypeScript' },
      ],
      interestRows: [
        { name: 'Developer Relations', sort_order: 1, is_active: true },
      ],
      roleSuggestionRows: [
        {
          role: 'Software Engineer',
          kind: 'current',
          skill_name: 'JavaScript',
          rank: 1,
          is_active: true,
        },
        {
          role: 'Software Engineer',
          kind: 'current',
          skill_name: 'Python',
          rank: 2,
          is_active: true,
        },
      ],
    });

    expect(taxonomy.source).toBe('remote');
    expect(taxonomy.skillOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'JavaScript/TypeScript',
          keywords: expect.arrayContaining(['JavaScript', 'TypeScript']),
        }),
      ])
    );
    expect(taxonomy.interestOptions).toEqual([
      { value: 'Developer Relations', label: 'Developer Relations' },
    ]);

    expect(getCurrentSkillSuggestionsForRole(taxonomy, 'software developer')).toEqual([
      'JavaScript/TypeScript',
      'Python',
    ]);
  });

  it('falls back to dynamic learning suggestions when remote learn mappings are missing', () => {
    const taxonomy = getFallbackOnboardingTaxonomy();

    expect(getCurrentSkillSuggestionsForRole(taxonomy, 'UX Designer')).toEqual([
      'Figma',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'Accessibility',
      'Usability Testing',
    ]);

    expect(getLearningSkillSuggestionsForRole(taxonomy, ['Figma'], 'UX Designer')).toEqual([
      'Design Systems',
      'Prototyping',
      'Accessibility',
      'User Research',
      'Framer',
    ]);
  });
});
