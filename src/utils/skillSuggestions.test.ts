import { describe, expect, it } from 'vitest';

import { buildSkillOptionList } from './skillTaxonomy';
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
});
