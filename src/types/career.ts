// Career and Professional Development Types

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
