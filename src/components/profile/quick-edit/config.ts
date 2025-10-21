import { 
  LearningStyle, 
  AvailableTime, 
  BudgetRange, 
  NetworkingGoal, 
  CareerEventType 
} from '@/types/career';

// Career Goal Options
export const GOAL_OPTIONS = [
  { value: 'skill-development', label: 'Learn New Skills' },
  { value: 'role-transition', label: 'Change Roles' },
  { value: 'leadership-growth', label: 'Develop Leadership' },
  { value: 'networking', label: 'Build Network' }
] as const;

// Learning Style Options
export const LEARNING_STYLE_OPTIONS: Array<{ value: LearningStyle; label: string }> = [
  { value: 'hands-on', label: 'Hands-on Workshops' },
  { value: 'theoretical', label: 'Lectures & Presentations' },
  { value: 'interactive', label: 'Discussions & Q&A' },
  { value: 'networking', label: 'Networking & Meeting People' },
  { value: 'case-studies', label: 'Real-world Examples' },
  { value: 'peer-learning', label: 'Learning from Peers' }
];

// Available Time Options
export const AVAILABLE_TIME_OPTIONS: Array<{ value: AvailableTime; label: string }> = [
  { value: 'very-limited', label: 'Very Limited (< 2 hrs/month)' },
  { value: 'limited', label: 'Limited (2-8 hrs/month)' },
  { value: 'moderate', label: 'Moderate (8-20 hrs/month)' },
  { value: 'flexible', label: 'Flexible (20+ hrs/month)' },
  { value: 'dedicated', label: 'Dedicated (can take time off)' }
];

// Budget Range Options
export const BUDGET_OPTIONS: Array<{ value: BudgetRange; label: string }> = [
  { value: 'free-only', label: 'Free events only' },
  { value: 'low', label: 'Low ($1-100/month)' },
  { value: 'moderate', label: 'Moderate ($100-500/month)' },
  { value: 'high', label: 'High ($500-2000/month)' },
  { value: 'unlimited', label: 'No budget constraints' }
];

// Networking Goal Options
export const NETWORKING_GOAL_OPTIONS: Array<{ value: NetworkingGoal; label: string }> = [
  { value: 'find-mentors', label: 'Connect with mentors' },
  { value: 'find-mentees', label: 'Support mentees' },
  { value: 'find-peers', label: 'Meet peers at my level' },
  { value: 'find-collaborators', label: 'Find collaborators' },
  { value: 'find-employers', label: 'Explore job opportunities' },
  { value: 'industry-insights', label: 'Learn industry trends' },
  { value: 'thought-leadership', label: 'Establish expertise' }
];

// Career Event Type Options
export const EVENT_TYPE_OPTIONS: Array<{ value: CareerEventType; label: string }> = [
  { value: 'conference', label: 'Conferences' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'meetup', label: 'Meetups' },
  { value: 'webinar', label: 'Webinars' },
  { value: 'summit', label: 'Summits' },
  { value: 'networking', label: 'Networking Events' },
  { value: 'bootcamp', label: 'Bootcamps' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'panel', label: 'Panels' },
  { value: 'keynote', label: 'Keynotes' },
  { value: 'trade-show', label: 'Trade Shows' }
];

// Seniority Options
export const SENIORITY_OPTIONS = [
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
];

// Industry Options
export const INDUSTRY_OPTIONS = [
  { value: 'Technology/Software', label: 'Technology/Software' },
  { value: 'Healthcare/Biotech', label: 'Healthcare/Biotech' },
  { value: 'Finance/FinTech', label: 'Finance/FinTech' },
  { value: 'E-commerce/Retail', label: 'E-commerce/Retail' },
  { value: 'Gaming/Entertainment', label: 'Gaming/Entertainment' },
  { value: 'Education/EdTech', label: 'Education/EdTech' },
  { value: 'Energy/CleanTech', label: 'Energy/CleanTech' },
  { value: 'Aerospace/Defense', label: 'Aerospace/Defense' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Startup/Early Stage', label: 'Startup/Early Stage' },
  { value: 'Non-Profit/Government', label: 'Non-Profit/Government' },
  { value: 'Other', label: 'Other' }
];

// Company Size Options
export const COMPANY_SIZE_OPTIONS = [
  { value: 'startup', label: 'Startup (< 50 employees)' },
  { value: 'small', label: 'Small (50-200 employees)' },
  { value: 'medium', label: 'Medium (200-1000 employees)' },
  { value: 'large', label: 'Large (1000-10000 employees)' },
  { value: 'enterprise', label: 'Enterprise (10000+ employees)' },
  { value: 'freelance', label: 'Freelance/Independent' }
];