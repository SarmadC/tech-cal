import type { CareerGoal, LearningStyle, SeniorityLevel } from '@kurecal/domain';

export const DRAFT_STORAGE_KEY = 'career-onboarding-draft-v1';

export const STEP_COUNT = 4;
export const ROLE_LABEL = 'Current role';
export const SENIORITY_LABEL = 'Seniority';
export const GOAL_LABEL = 'Career goals';
export const POPULAR_ROLE_COUNT = 4;
export const VISIBLE_ROLE_GROUP_COUNT = 4;
export const STEP_TITLES = ['Welcome', 'Role', 'Seniority', 'Skills', 'Goals'] as const;

export const MOBILE_GOAL_OPTION_VALUES: CareerGoal[] = [
  'skill-development',
  'role-transition',
  'leadership-growth',
  'networking',
  'career-advancement',
] as const;

export const MOBILE_LEARNING_STYLE_VALUES: LearningStyle[] = [
  'hands-on',
  'theoretical',
  'networking',
];

export const CURATED_SENIORITY_OPTIONS = [
  { value: 'student', label: 'Student / exploring', description: 'Still learning or evaluating paths.' },
  { value: 'junior', label: 'Early career', description: 'Up to 4 years of hands-on experience.' },
  { value: 'mid-level', label: 'Mid-level', description: 'Typically 4 to 7 years of experience.' },
  { value: 'senior', label: 'Senior', description: 'Typically 7 to 12 years with broader ownership.' },
  { value: 'lead', label: 'Leadership', description: 'Team lead, manager, director, or VP scope.' },
  { value: 'founder', label: 'Founder', description: 'Building or running a company.' },
] as const satisfies readonly {
  value: SeniorityLevel;
  label: string;
  description: string;
}[];
