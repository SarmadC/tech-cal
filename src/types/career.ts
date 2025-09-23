// Career and Professional Development Types

// Predefined Role Taxonomy for Peer Comparison
export const ROLE_CATEGORIES = {
  ENGINEERING: 'Engineering',
  DATA_AI: 'Data & AI',
  PRODUCT_DESIGN: 'Product & Design',
  LEADERSHIP: 'Leadership & Strategy'
} as const;

export const ROLE_TAXONOMY = {
  [ROLE_CATEGORIES.ENGINEERING]: [
    'Frontend Engineer',
    'Backend Engineer',
    'Full Stack Engineer',
    'Mobile Engineer (iOS/Android)',
    'DevOps Engineer',
    'Site Reliability Engineer',
    'QA Engineer',
    'Security Engineer'
  ],
  [ROLE_CATEGORIES.DATA_AI]: [
    'Data Scientist',
    'Data Analyst',
    'Data Engineer',
    'ML Engineer',
    'AI Research Scientist'
  ],
  [ROLE_CATEGORIES.PRODUCT_DESIGN]: [
    'Product Manager',
    'Product Owner',
    'UX Designer',
    'UI Designer',
    'UX Researcher',
    'Technical Product Manager'
  ],
  [ROLE_CATEGORIES.LEADERSHIP]: [
    'Engineering Manager',
    'Technical Lead',
    'Product Director',
    'VP of Engineering',
    'CTO',
    'Solutions Architect',
    'Developer Relations',
    'Technical Writer'
  ]
} as const;

// Flattened list for easy access
export const ALL_PREDEFINED_ROLES = Object.values(ROLE_TAXONOMY).flat();

// Company size categories
export const COMPANY_SIZE_OPTIONS = [
  { value: 'startup', label: 'Startup (< 50 employees)' },
  { value: 'small', label: 'Small (50-200 employees)' },
  { value: 'medium', label: 'Medium (200-1000 employees)' },
  { value: 'large', label: 'Large (1000-10000 employees)' },
  { value: 'enterprise', label: 'Enterprise (10000+ employees)' },
  { value: 'freelance', label: 'Freelance/Independent' }
] as const;

// Enhanced seniority levels
export const SENIORITY_LEVELS = [
  { value: 'student', label: 'Student' },
  { value: 'entry-level', label: 'Entry Level (0-2 years)' },
  { value: 'junior', label: 'Junior (2-4 years)' },
  { value: 'mid-level', label: 'Mid-level (4-7 years)' },
  { value: 'senior', label: 'Senior (7-12 years)' },
  { value: 'staff', label: 'Staff (12+ years)' },
  { value: 'principal', label: 'Principal (15+ years)' },
  { value: 'lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP/Executive' },
  { value: 'founder', label: 'Founder/Entrepreneur' }
] as const;

// Industry focus options
export const INDUSTRY_FOCUS = [
  'Technology/Software',
  'Healthcare/Biotech',
  'Finance/FinTech',
  'E-commerce/Retail',
  'Gaming/Entertainment',
  'Education/EdTech',
  'Energy/CleanTech',
  'Aerospace/Defense',
  'Consulting',
  'Startup/Early Stage',
  'Non-Profit/Government',
  'Other'
] as const;

// Role-specific event scoring weights
export const ROLE_EVENT_WEIGHTS = {
  [ROLE_CATEGORIES.ENGINEERING]: {
    'technical': 1.0,
    'workshop': 0.9,
    'conference': 0.8,
    'hackathon': 0.8,
    'certification': 0.7,
    'networking': 0.4,
    'business': 0.3
  },
  [ROLE_CATEGORIES.DATA_AI]: {
    'technical': 1.0,
    'research': 0.9,
    'conference': 0.8,
    'workshop': 0.8,
    'certification': 0.7,
    'networking': 0.5,
    'business': 0.4
  },
  [ROLE_CATEGORIES.PRODUCT_DESIGN]: {
    'business': 1.0,
    'user-research': 0.9,
    'design': 0.9,
    'strategy': 0.8,
    'conference': 0.7,
    'networking': 0.6,
    'technical': 0.4
  },
  [ROLE_CATEGORIES.LEADERSHIP]: {
    'leadership': 1.0,
    'strategy': 0.9,
    'business': 0.8,
    'management': 0.8,
    'networking': 0.7,
    'conference': 0.6,
    'technical': 0.5
  }
} as const;

// Minimum cohort sizes for reliable comparison
export const COHORT_REQUIREMENTS = {
  MINIMUM_VIABLE: 10,
  SMALL_SAMPLE: 50,
  CONFIDENT_SAMPLE: 100
} as const;

// Common timezone options organized by region
export const TIMEZONE_OPTIONS = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (CT)', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'North America' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', region: 'North America' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', region: 'North America' },
  { value: 'America/Toronto', label: 'Toronto (Eastern)', region: 'North America' },
  { value: 'America/Vancouver', label: 'Vancouver (Pacific)', region: 'North America' },

  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET/EEST)', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', region: 'Europe' },

  // Asia Pacific
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', region: 'Asia Pacific' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', region: 'Asia Pacific' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', region: 'Asia Pacific' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', region: 'Asia Pacific' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia Pacific' },
  { value: 'Asia/Taipei', label: 'Taipei (CST)', region: 'Asia Pacific' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', region: 'Asia Pacific' },
  { value: 'Asia/Manila', label: 'Manila (PST)', region: 'Asia Pacific' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)', region: 'Asia Pacific' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Asia Pacific' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)', region: 'Asia Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)', region: 'Asia Pacific' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: 'Asia Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)', region: 'Asia Pacific' },

  // South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', region: 'South America' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)', region: 'South America' },
  { value: 'America/Lima', label: 'Lima (PET)', region: 'South America' },
  { value: 'America/Bogota', label: 'Bogotá (COT)', region: 'South America' },

  // Africa & Middle East
  { value: 'Africa/Cairo', label: 'Cairo (EET)', region: 'Africa & Middle East' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', region: 'Africa & Middle East' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', region: 'Africa & Middle East' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)', region: 'Africa & Middle East' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)', region: 'Africa & Middle East' },

  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'UTC' }
] as const;

export interface CareerProfile {
  // User context (required for database operations)
  userId: string;
  profileId: string;
  lastUpdated: string;
  
  // Current Role Information
  currentRole: string;
  seniority: SeniorityLevel;
  industry: string;
  companySize: CompanySize;
  
  // Skills and Interests
  primarySkills: string[];
  skillsToLearn: string[];
  interests: string[];
  
  // Career Goals
  careerGoals: CareerGoal[];
  timeframe: CareerTimeframe;
  
  // Learning Preferences
  learningStyle: LearningStyle[];
  availableTime: AvailableTime;
  budget: BudgetRange;
  
  // Networking Preferences
  networkingGoals: NetworkingGoal[];
  preferredEventTypes: CareerEventType[];
}

export type SeniorityLevel = 
  | 'student'
  | 'entry-level'        // 0-2 years
  | 'junior'             // 2-4 years
  | 'mid-level'          // 4-7 years
  | 'senior'             // 7-12 years
  | 'staff'              // 12+ years, technical track
  | 'principal'          // 15+ years, technical track
  | 'lead'               // Team lead
  | 'manager'            // People manager
  | 'senior-manager'     // Senior manager
  | 'director'           // Director level
  | 'vp'                 // VP level
  | 'cto'                // CTO/Technical executive
  | 'founder'            // Founder/Entrepreneur
  | 'consultant'         // Independent consultant
  | 'career-changer';    // Transitioning careers

export type CompanySize = 
  | 'startup'            // < 50 employees
  | 'small'              // 50-200 employees  
  | 'medium'             // 200-1000 employees
  | 'large'              // 1000-10000 employees
  | 'enterprise'         // 10000+ employees
  | 'freelance'          // Independent
  | 'consulting';        // Consulting firm

export type CareerGoal = 
  | 'skill-development'   // Learn new technologies
  | 'career-advancement'  // Get promoted
  | 'role-transition'     // Change roles (e.g., dev to PM)
  | 'leadership-growth'   // Develop leadership skills
  | 'entrepreneurship'    // Start a company
  | 'consulting'          // Become independent consultant
  | 'specialization'      // Become domain expert
  | 'generalization'      // Broaden skill set
  | 'networking'          // Build professional network
  | 'industry-change'     // Switch industries
  | 'work-life-balance'   // Improve work-life balance
  | 'salary-increase';    // Increase compensation

export type CareerTimeframe = 
  | 'immediate'          // 0-6 months
  | 'short-term'         // 6-18 months
  | 'medium-term'        // 1-3 years
  | 'long-term';         // 3+ years

export type LearningStyle = 
  | 'hands-on'           // Workshops, labs, coding sessions
  | 'theoretical'        // Lectures, presentations
  | 'interactive'        // Panel discussions, Q&A
  | 'networking'         // Meet people, build connections
  | 'case-studies'       // Real-world examples
  | 'peer-learning';     // Learn from peers

export type AvailableTime = 
  | 'very-limited'       // < 2 hours/month
  | 'limited'            // 2-8 hours/month
  | 'moderate'           // 8-20 hours/month
  | 'flexible'           // 20+ hours/month
  | 'dedicated';         // Can take time off for learning

export type BudgetRange = 
  | 'free-only'          // $0
  | 'low'                // $1-100/month
  | 'moderate'           // $100-500/month
  | 'high'               // $500-2000/month
  | 'unlimited';         // No budget constraints

export type NetworkingGoal = 
  | 'find-mentors'       // Connect with senior professionals
  | 'find-mentees'       // Help junior professionals
  | 'find-peers'         // Connect with same-level professionals
  | 'find-collaborators' // Find project partners
  | 'find-customers'     // Business development
  | 'find-employers'     // Job opportunities
  | 'find-employees'     // Hiring
  | 'industry-insights'  // Learn about industry trends
  | 'thought-leadership'; // Establish expertise

export type CareerEventType = 
  | 'conference'         // Large industry conferences
  | 'workshop'           // Hands-on learning sessions
  | 'meetup'             // Local networking events
  | 'webinar'            // Online presentations
  | 'hackathon'          // Coding competitions
  | 'summit'             // Executive/strategic events
  | 'bootcamp'           // Intensive training
  | 'certification'      // Professional certifications
  | 'panel'              // Panel discussions
  | 'keynote'            // Inspirational talks
  | 'networking'         // Pure networking events
  | 'trade-show';        // Industry exhibitions

// Career-Event Matching Logic
export interface CareerEventMatch {
  relevanceScore: number;
  reasons: string[];
  careerImpact: CareerImpact;
  skillAlignment: SkillAlignment;
  networkingValue: NetworkingValue;
  timingRelevance: TimingRelevance;
}

export type CareerImpact = 
  | 'transformative'     // Could significantly change career trajectory
  | 'high'               // Directly supports major career goals
  | 'moderate'           // Useful for general professional development
  | 'low'                // Tangentially related to career goals
  | 'minimal';           // Little direct career relevance

export type SkillAlignment = 
  | 'perfect-match'      // Exactly what user wants to learn
  | 'strong-match'       // Closely related to learning goals
  | 'moderate-match'     // Somewhat related to interests
  | 'weak-match'         // Tangentially related
  | 'no-match';          // Not relevant to current skill goals

export type NetworkingValue = 
  | 'exceptional'        // Perfect for networking goals (C-level speakers, etc.)
  | 'high'               // Great networking opportunities
  | 'moderate'           // Some networking value
  | 'low'                // Limited networking opportunities
  | 'minimal';           // Little networking value

export type TimingRelevance = 
  | 'perfect'            // Exactly when user needs it
  | 'good'               // Good timing for career goals
  | 'okay'               // Decent timing
  | 'poor'               // Not ideal timing
  | 'irrelevant';        // Timing doesn't matter for this content

// Onboarding Flow Types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: string;
  required: boolean;
  order: number;
}

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
  };
  step3_goals: {
    careerGoals: CareerGoal[];
    timeframe: CareerTimeframe;
  };
  step4_preferences: {
    learningStyle: LearningStyle[];
    availableTime: AvailableTime;
    budget: BudgetRange;
  };
  step5_networking: {
    networkingGoals: NetworkingGoal[];
    preferredEventTypes: CareerEventType[];
  };
}

// Extended User Profile
export interface EnhancedAppProfile {
  // Existing profile fields
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  preferences: unknown;
  createdAt: string | null;
  updatedAt: string | null;
  
  // New career fields
  careerProfile: CareerProfile | null;
  onboardingCompleted: boolean;
  lastCareerUpdate: string | null;
}
