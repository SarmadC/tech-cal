export const ROLE_CATEGORIES = {
  ENGINEERING: 'Engineering',
  DATA_AI: 'Data & AI',
  PRODUCT_DESIGN: 'Product & Design',
  LEADERSHIP: 'Leadership & Strategy',
} as const;

export const ROLE_TAXONOMY = {
  [ROLE_CATEGORIES.ENGINEERING]: [
    'Software Engineer',
    'Frontend Engineer',
    'Backend Engineer',
    'Full Stack Engineer',
    'Mobile Engineer (iOS/Android)',
    'Platform Engineer',
    'Solutions Engineer',
    'DevOps Engineer',
    'Site Reliability Engineer',
    'QA Engineer',
    'Security Engineer',
  ],
  [ROLE_CATEGORIES.DATA_AI]: [
    'Data Scientist',
    'Data Analyst',
    'Data Engineer',
    'AI Engineer',
    'Analytics Engineer',
    'ML Engineer',
    'AI Research Scientist',
  ],
  [ROLE_CATEGORIES.PRODUCT_DESIGN]: [
    'Product Manager',
    'Product Designer',
    'Product Owner',
    'UX Designer',
    'UI Designer',
    'UX Researcher',
    'Technical Product Manager',
    'Technical Program Manager',
    'Program Manager',
    'Product Marketing Manager',
    'Growth Marketer',
  ],
  [ROLE_CATEGORIES.LEADERSHIP]: [
    'Founder',
    'Entrepreneur / Startup Operator',
    'Engineering Manager',
    'Technical Lead',
    'Product Director',
    'VP of Engineering',
    'CTO',
    'Solutions Architect',
    'Business Operations Manager',
    'Developer Relations Manager',
    'Community Manager',
    'Customer Success Manager',
    'Developer Relations',
    'Technical Writer',
  ],
} as const;

export const INTEREST_AREAS = [
  'Artificial Intelligence & Machine Learning',
  'Web Development',
  'Mobile Development',
  'Cloud Computing',
  'DevOps & Infrastructure',
  'Data Science & Analytics',
  'Cybersecurity',
  'Blockchain & Web3',
  'Game Development',
  'UI/UX Design',
  'Product Management',
  'Digital Marketing',
  'E-commerce',
  'FinTech',
  'HealthTech',
  'EdTech',
  'CleanTech',
  'AR/VR',
  'IoT (Internet of Things)',
  'Quantum Computing',
  'Robotics',
  'Open Source',
  'Technical Writing',
  'Developer Relations',
  'Startup & Entrepreneurship',
  'Leadership & Management',
  'Agile & Scrum',
  'System Design',
  'Performance Optimization',
  'Testing & QA',
] as const;

export const LEARNING_PATH_TRACKS = [
  'Data Engineering',
  'Machine Learning',
  'Backend Engineering',
  'Frontend Engineering',
  'DevOps & Platform',
  'Product Engineering',
  'Leadership & Strategy',
] as const;

export type LearningPathTrack = (typeof LEARNING_PATH_TRACKS)[number];

export type SkillProficiency = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface SkillTag {
  skill: string;
  proficiency?: SkillProficiency;
  yearsOfExperience: number;
  lastUsed: string;
  category?: string;
  order?: number;
  pendingProficiency?: boolean;
}

export interface CareerOptionalSectionStatus {
  learningPreferences: boolean;
  networkingPreferences: boolean;
  teamPreferences: boolean;
}

export interface CareerOptionalSectionSnoozes {
  learningPreferences?: string;
  networkingPreferences?: string;
  teamPreferences?: string;
}

export interface CareerOptionalSectionTimestamps {
  learningPreferencesCompletedAt?: string;
  networkingPreferencesCompletedAt?: string;
  teamPreferencesCompletedAt?: string;
}

export type SeniorityLevel =
  | 'student'
  | 'entry-level'
  | 'junior'
  | 'mid-level'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'lead'
  | 'manager'
  | 'senior-manager'
  | 'director'
  | 'vp'
  | 'cto'
  | 'founder'
  | 'consultant'
  | 'career-changer';

export type CompanySize =
  | 'startup'
  | 'small'
  | 'medium'
  | 'large'
  | 'enterprise'
  | 'freelance'
  | 'consulting';

export type CareerGoal =
  | 'skill-development'
  | 'career-advancement'
  | 'role-transition'
  | 'leadership-growth'
  | 'entrepreneurship'
  | 'consulting'
  | 'specialization'
  | 'generalization'
  | 'networking'
  | 'industry-change'
  | 'work-life-balance'
  | 'salary-increase';

export type CareerTimeframe = 'immediate' | 'short-term' | 'medium-term' | 'long-term';

export type LearningStyle =
  | 'hands-on'
  | 'theoretical'
  | 'interactive'
  | 'networking'
  | 'case-studies'
  | 'peer-learning';

export type AvailableTime =
  | 'very-limited'
  | 'limited'
  | 'moderate'
  | 'flexible'
  | 'dedicated';

export type BudgetRange = 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';

export type NetworkingGoal =
  | 'find-mentors'
  | 'find-mentees'
  | 'find-peers'
  | 'find-collaborators'
  | 'find-customers'
  | 'find-employers'
  | 'find-employees'
  | 'industry-insights'
  | 'thought-leadership';

export type CareerEventType =
  | 'conference'
  | 'workshop'
  | 'meetup'
  | 'webinar'
  | 'hackathon'
  | 'summit'
  | 'bootcamp'
  | 'certification'
  | 'panel'
  | 'keynote'
  | 'networking'
  | 'trade-show';

export type TeamRole =
  | 'frontend-developer'
  | 'backend-developer'
  | 'full-stack-developer'
  | 'mobile-developer'
  | 'ui-ux-designer'
  | 'product-manager'
  | 'data-scientist'
  | 'devops-engineer'
  | 'qa-engineer'
  | 'tech-lead'
  | 'project-manager'
  | 'flexible';

export type CollaborationStyle =
  | 'structured'
  | 'iterative'
  | 'autonomous'
  | 'pair-driven'
  | 'async-friendly';

export type TeamSizePreference = 'solo' | 'small-team' | 'large-team' | 'flexible';

export type MentorshipPreference = 'mentor' | 'mentee' | 'both' | 'neither';

export type AvailabilityPattern = 'weekdays' | 'evenings' | 'weekends' | 'flexible';

export type CommunicationPreference =
  | 'slack'
  | 'discord'
  | 'email'
  | 'video-calls'
  | 'in-person'
  | 'async-docs';

export interface CareerOnboardingData {
  step1_role: {
    currentRole: string;
    seniority: SeniorityLevel;
    industry: string;
    companySize: CompanySize;
  };
  step2_skills: {
    primarySkills: string[];
    skillsToLearn: string[];
    interests: string[];
    skillTags?: SkillTag[];
  };
  step3_goals: {
    careerGoals: CareerGoal[];
    timeframe: CareerTimeframe;
  };
  step4_preferences: {
    targetPath?: LearningPathTrack | string;
    learningStyle: LearningStyle[];
    availableTime: AvailableTime;
    budget: BudgetRange;
  };
  step5_networking: {
    networkingGoals: NetworkingGoal[];
    preferredEventTypes: CareerEventType[];
  };
  step6_teamBuilding: {
    teamRole: TeamRole;
    collaborationStyle: CollaborationStyle[];
    teamSizePreference: TeamSizePreference;
    communicationPreferences: CommunicationPreference[];
    teamGoals: string[];
    mentorshipPreference: MentorshipPreference;
    availabilityPattern?: AvailabilityPattern;
    projectTypePreferences: string[];
  };
}

export interface OnboardingTaxonomyOption {
  value: string;
  label: string;
  category?: string;
  keywords?: string[];
}

export interface OnboardingTaxonomyData {
  skillOptions: OnboardingTaxonomyOption[];
  interestOptions: OnboardingTaxonomyOption[];
  roleSuggestions: Record<string, Partial<Record<'current' | 'learn', string[]>>>;
  source: 'fallback' | 'remote' | 'hybrid';
}

export interface MobileCareerOnboardingBootstrap {
  hasCompletedOnboarding: boolean;
  profileExists: boolean;
  draft: Partial<CareerOnboardingData>;
  optionalSections: CareerOptionalSectionStatus | null;
  optionalSectionSnoozes: CareerOptionalSectionSnoozes | null;
  optionalSectionTimestamps: CareerOptionalSectionTimestamps | null;
  taxonomy: OnboardingTaxonomyData;
  roleTaxonomy: Record<string, string[]>;
}

export interface MobileCareerOnboardingCompletePayload {
  data: CareerOnboardingData;
  optionalSectionsCompleted?: CareerOptionalSectionStatus;
}

export interface MobileCareerOnboardingSkipPayload {
  optionalSectionsCompleted?: CareerOptionalSectionStatus;
}

export const SENIORITY_OPTIONS: Array<{ value: SeniorityLevel; label: string }> = [
  { value: 'student', label: 'Student' },
  { value: 'entry-level', label: 'Entry-level (0-2 years)' },
  { value: 'junior', label: 'Junior (2-4 years)' },
  { value: 'mid-level', label: 'Mid-level (4-7 years)' },
  { value: 'senior', label: 'Senior (7-12 years)' },
  { value: 'staff', label: 'Staff (12+ years)' },
  { value: 'principal', label: 'Principal (15+ years)' },
  { value: 'lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP / Executive' },
  { value: 'founder', label: 'Founder / Entrepreneur' },
];

export const COMPANY_SIZE_OPTIONS: Array<{ value: CompanySize; label: string }> = [
  { value: 'startup', label: 'Startup (< 50 employees)' },
  { value: 'small', label: 'Small (50-200 employees)' },
  { value: 'medium', label: 'Medium (200-1000 employees)' },
  { value: 'large', label: 'Large (1000-10000 employees)' },
  { value: 'enterprise', label: 'Enterprise (10000+ employees)' },
  { value: 'freelance', label: 'Freelance / Independent' },
  { value: 'consulting', label: 'Consulting firm' },
];

export const CAREER_GOAL_OPTIONS: Array<{ value: CareerGoal; label: string; description: string }> = [
  { value: 'skill-development', label: 'Learn New Skills', description: 'Build technical depth.' },
  { value: 'role-transition', label: 'Change Roles', description: 'Move into a new role.' },
  { value: 'leadership-growth', label: 'Develop Leadership', description: 'Grow management skills.' },
  { value: 'networking', label: 'Build Network', description: 'Meet peers and mentors.' },
  { value: 'career-advancement', label: 'Get Promoted', description: 'Increase scope and progression.' },
  { value: 'salary-increase', label: 'Increase Compensation', description: 'Improve your earning trajectory.' },
];

export const CAREER_TIMEFRAME_OPTIONS: Array<{
  value: CareerTimeframe;
  label: string;
  description: string;
}> = [
  { value: 'immediate', label: 'Immediate', description: '0-6 months' },
  { value: 'short-term', label: 'Short-term', description: '6-18 months' },
  { value: 'medium-term', label: 'Medium-term', description: '1-3 years' },
  { value: 'long-term', label: 'Long-term', description: '3+ years' },
];

export const LEARNING_STYLE_OPTIONS: Array<{
  value: LearningStyle;
  label: string;
  description: string;
}> = [
  { value: 'hands-on', label: 'Hands-on Workshops', description: 'Build things in real-time.' },
  { value: 'theoretical', label: 'Lectures & Presentations', description: 'Deep dive into concepts.' },
  { value: 'interactive', label: 'Discussions & Q&A', description: 'Share and debate ideas.' },
  { value: 'networking', label: 'Networking Focus', description: 'Meet new people while learning.' },
  { value: 'case-studies', label: 'Case Studies', description: 'Learn from real-world examples.' },
  { value: 'peer-learning', label: 'Peer Learning', description: 'Learn alongside peers.' },
];

export const NETWORKING_GOAL_OPTIONS: Array<{
  value: NetworkingGoal;
  label: string;
  description: string;
}> = [
  { value: 'find-mentors', label: 'Find Mentors', description: 'Connect with experienced leaders.' },
  { value: 'find-peers', label: 'Meet Peers', description: 'Build relationships at your level.' },
  { value: 'find-collaborators', label: 'Find Collaborators', description: 'Find people to build with.' },
  { value: 'find-employers', label: 'Find Employers', description: 'Meet hiring teams.' },
];

export const CAREER_EVENT_TYPE_OPTIONS: Array<{ value: CareerEventType; label: string }> = [
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'summit', label: 'Summit' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'certification', label: 'Certification' },
  { value: 'panel', label: 'Panel' },
  { value: 'keynote', label: 'Keynote' },
  { value: 'networking', label: 'Networking' },
  { value: 'trade-show', label: 'Trade Show' },
];

export const AVAILABLE_TIME_OPTIONS: Array<{ value: AvailableTime; label: string }> = [
  { value: 'very-limited', label: '< 2 hrs/month' },
  { value: 'limited', label: '2-8 hrs/month' },
  { value: 'moderate', label: '8-20 hrs/month' },
  { value: 'flexible', label: '20+ hrs/month' },
  { value: 'dedicated', label: 'Can take time off' },
];

export const BUDGET_OPTIONS: Array<{ value: BudgetRange; label: string }> = [
  { value: 'free-only', label: 'Free only' },
  { value: 'low', label: '$1-100/month' },
  { value: 'moderate', label: '$100-500/month' },
  { value: 'high', label: '$500-2000/month' },
  { value: 'unlimited', label: 'No budget cap' },
];

export const TEAM_ROLE_OPTIONS: Array<{ value: TeamRole; label: string }> = [
  { value: 'frontend-developer', label: 'Frontend Developer' },
  { value: 'backend-developer', label: 'Backend Developer' },
  { value: 'full-stack-developer', label: 'Full Stack Developer' },
  { value: 'mobile-developer', label: 'Mobile Developer' },
  { value: 'ui-ux-designer', label: 'UI / UX Designer' },
  { value: 'product-manager', label: 'Product Manager' },
  { value: 'data-scientist', label: 'Data Scientist' },
  { value: 'devops-engineer', label: 'DevOps Engineer' },
  { value: 'qa-engineer', label: 'QA Engineer' },
  { value: 'tech-lead', label: 'Tech Lead' },
  { value: 'project-manager', label: 'Project Manager' },
  { value: 'flexible', label: 'Flexible' },
];

export const MAX_CAREER_GOALS = 2;
export const VISIBLE_ONBOARDING_STEP_COUNT = 3;

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeCareerGoals(goals: CareerGoal[] = []): CareerGoal[] {
  return Array.from(new Set(goals)).slice(0, MAX_CAREER_GOALS);
}

export function clampCareerOnboardingStep(step?: number): number {
  if (!Number.isFinite(step)) {
    return 0;
  }

  return Math.max(0, Math.min(VISIBLE_ONBOARDING_STEP_COUNT, step as number));
}

export function validateOnboardingData(data: Partial<CareerOnboardingData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.step1_role?.currentRole) {
    errors.push('Current role is required');
  }
  if (!data.step1_role?.seniority) {
    errors.push('Seniority level is required');
  }

  if ((data.step2_skills?.primarySkills?.length ?? 0) < 2) {
    errors.push('Please add at least 2 current skills');
  }

  const careerGoals = normalizeCareerGoals(data.step3_goals?.careerGoals ?? []);
  if (!careerGoals.length) {
    errors.push('At least one career goal is required');
  }
  if ((data.step3_goals?.careerGoals?.length ?? 0) > MAX_CAREER_GOALS) {
    errors.push('Choose up to 2 career goals');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function deriveOptionalSectionStatus(
  data: Partial<CareerOnboardingData>
): CareerOptionalSectionStatus {
  return {
    learningPreferences: Boolean((data.step4_preferences?.learningStyle?.length ?? 0) > 0),
    networkingPreferences: Boolean(
      (data.step5_networking?.networkingGoals?.length ?? 0) > 0 ||
        (data.step5_networking?.preferredEventTypes?.length ?? 0) > 0
    ),
    teamPreferences: Boolean(data.step6_teamBuilding?.teamRole),
  };
}

export function hasCoreOnboardingProgress(data: Partial<CareerOnboardingData>): boolean {
  return Boolean(
    data.step1_role?.currentRole ||
      (data.step2_skills?.primarySkills?.length ?? 0) > 0 ||
      (data.step3_goals?.careerGoals?.length ?? 0) > 0 ||
      data.step3_goals?.timeframe
  );
}

export function normalizeOnboardingDraftData(
  data: Partial<CareerOnboardingData>
): Partial<CareerOnboardingData> {
  return {
    ...data,
    step2_skills: data.step2_skills
      ? {
          ...data.step2_skills,
          primarySkills: dedupe(data.step2_skills.primarySkills ?? []),
          skillsToLearn: dedupe(data.step2_skills.skillsToLearn ?? []),
          interests: dedupe(data.step2_skills.interests ?? []),
        }
      : data.step2_skills,
    step3_goals: data.step3_goals
      ? {
          ...data.step3_goals,
          careerGoals: normalizeCareerGoals(data.step3_goals.careerGoals ?? []),
        }
      : data.step3_goals,
  };
}

export function sanitizeOnboardingData(data: Partial<CareerOnboardingData>): CareerOnboardingData {
  const normalized = normalizeOnboardingDraftData(data);

  return {
    step1_role: {
      currentRole: normalized.step1_role?.currentRole ?? '',
      seniority: normalized.step1_role?.seniority ?? 'mid-level',
      industry: normalized.step1_role?.industry ?? '',
      companySize: normalized.step1_role?.companySize ?? 'medium',
    },
    step2_skills: {
      primarySkills: dedupe(normalized.step2_skills?.primarySkills ?? []),
      skillsToLearn: dedupe(normalized.step2_skills?.skillsToLearn ?? []),
      interests: dedupe(normalized.step2_skills?.interests ?? []),
      skillTags: normalized.step2_skills?.skillTags ?? [],
    },
    step3_goals: {
      careerGoals: normalizeCareerGoals(normalized.step3_goals?.careerGoals ?? []),
      timeframe: normalized.step3_goals?.timeframe ?? 'medium-term',
    },
    step4_preferences: {
      targetPath: normalized.step4_preferences?.targetPath,
      learningStyle: normalized.step4_preferences?.learningStyle ?? [],
      availableTime: normalized.step4_preferences?.availableTime ?? 'moderate',
      budget: normalized.step4_preferences?.budget ?? 'moderate',
    },
    step5_networking: {
      networkingGoals: normalized.step5_networking?.networkingGoals ?? [],
      preferredEventTypes: normalized.step5_networking?.preferredEventTypes ?? [],
    },
    step6_teamBuilding: {
      teamRole: normalized.step6_teamBuilding?.teamRole ?? 'flexible',
      collaborationStyle: normalized.step6_teamBuilding?.collaborationStyle ?? [],
      teamSizePreference: normalized.step6_teamBuilding?.teamSizePreference ?? 'flexible',
      communicationPreferences: normalized.step6_teamBuilding?.communicationPreferences ?? [],
      teamGoals: dedupe(normalized.step6_teamBuilding?.teamGoals ?? []),
      mentorshipPreference: normalized.step6_teamBuilding?.mentorshipPreference ?? 'neither',
      availabilityPattern: normalized.step6_teamBuilding?.availabilityPattern,
      projectTypePreferences: dedupe(normalized.step6_teamBuilding?.projectTypePreferences ?? []),
    },
  };
}
