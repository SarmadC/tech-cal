
import { CareerProfile, CareerOptionalSectionStatus } from '@/types/career';

export const DEFAULT_OPTIONAL_STATUS: CareerOptionalSectionStatus = {
  learningPreferences: false,
  networkingPreferences: false,
  teamPreferences: false
};

/**
 * Calculates the percentage of the career profile that is completed.
 * Includes both core sections (role, skills, goals) and optional sections.
 */
export function calculateCareerProfileCompletion(
  profile: CareerProfile | null, 
  optionalSections: CareerOptionalSectionStatus | null
): number {
    if (!profile) return 0;
    
    const optionalStatus = optionalSections ?? DEFAULT_OPTIONAL_STATUS;
    const optionalSectionEntries = Object.entries(optionalStatus) as Array<[keyof CareerOptionalSectionStatus, boolean]>;

    // Core sections
    const coreSections = [
      { name: 'role', completed: !!(profile?.currentRole && profile?.seniority && profile?.industry && profile?.companySize) },
      { name: 'skills', completed: !!(profile?.primarySkills && profile.primarySkills.length > 0) },
      { name: 'goals', completed: !!(profile?.careerGoals && profile.careerGoals.length > 0 && profile?.timeframe) }
    ];
    
    // Optional sections
    const optionalSectionsData = optionalSectionEntries.map(([key, completed]) => ({ name: key, completed }));
    const allSections = [...coreSections, ...optionalSectionsData];
    const completedSections = allSections.filter(section => section.completed).length;
    const totalSections = allSections.length;
    
    return totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0;
}
