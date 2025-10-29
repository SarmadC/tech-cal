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

// Two-track experience level groupings
export interface ExperienceLevel {
  value: string;
  label: string;
  years: string;
  lessCommon: boolean;
}

export const LEVELS_BY_TRACK: Record<'ic' | 'management', ExperienceLevel[]> = {
  ic: [
    { value: 'entry-level', label: 'Entry-level', years: '0-2 years', lessCommon: false },
    { value: 'junior', label: 'Junior', years: '2-4 years', lessCommon: false },
    { value: 'mid-level', label: 'Mid-level', years: '4-7 years', lessCommon: false },
    { value: 'senior', label: 'Senior', years: '7-12 years', lessCommon: false },
    { value: 'staff', label: 'Staff', years: '12+ years', lessCommon: false },
    { value: 'principal', label: 'Principal', years: '15+ years', lessCommon: false },
    { value: 'student', label: 'Student', years: '', lessCommon: true },
    { value: 'founder', label: 'Founder/Entrepreneur', years: '', lessCommon: true }
  ],
  management: [
    { value: 'lead', label: 'Team Lead', years: '', lessCommon: false },
    { value: 'manager', label: 'Manager', years: '', lessCommon: false },
    { value: 'director', label: 'Director', years: '', lessCommon: false },
    { value: 'vp', label: 'VP/Executive', years: '', lessCommon: false },
    { value: 'founder', label: 'Founder/Entrepreneur', years: '', lessCommon: true }
  ]
};

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

// Standardized technical skills for consistency
export const TECHNICAL_SKILLS = {
  PROGRAMMING_LANGUAGES: [
    'JavaScript/TypeScript',
    'Python',
    'Java',
    'C#',
    'C++',
    'Go',
    'Rust',
    'PHP',
    'Ruby',
    'Swift',
    'Kotlin',
    'Scala',
    'R',
    'MATLAB',
    'Dart'
  ],
  FRONTEND_TECHNOLOGIES: [
    'React',
    'Vue.js',
    'Angular',
    'Svelte',
    'Next.js',
    'Nuxt.js',
    'Gatsby',
    'HTML/CSS',
    'Tailwind CSS',
    'Bootstrap',
    'Sass/SCSS',
    'Webpack',
    'Vite',
    'Parcel'
  ],
  BACKEND_TECHNOLOGIES: [
    'Node.js',
    'Express.js',
    'Django',
    'Flask',
    'Spring Boot',
    'ASP.NET',
    'Laravel',
    'Ruby on Rails',
    'FastAPI',
    'GraphQL',
    'REST APIs',
    'Microservices',
    'Serverless'
  ],
  DATABASES: [
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Redis',
    'Elasticsearch',
    'DynamoDB',
    'SQLite',
    'Oracle',
    'SQL Server',
    'Cassandra',
    'Neo4j',
    'InfluxDB'
  ],
  CLOUD_PLATFORMS: [
    'AWS',
    'Google Cloud Platform',
    'Microsoft Azure',
    'DigitalOcean',
    'Heroku',
    'Vercel',
    'Netlify',
    'Firebase',
    'Supabase',
    'Cloudflare'
  ],
  DEVOPS_TOOLS: [
    'Docker',
    'Kubernetes',
    'Jenkins',
    'GitLab CI/CD',
    'GitHub Actions',
    'Terraform',
    'Ansible',
    'Prometheus',
    'Grafana',
    'ELK Stack',
    'Git',
    'GitHub',
    'GitLab',
    'Bitbucket'
  ],
  DATA_AI_TOOLS: [
    'TensorFlow',
    'PyTorch',
    'Scikit-learn',
    'Pandas',
    'NumPy',
    'Jupyter',
    'Apache Spark',
    'Hadoop',
    'Tableau',
    'Power BI',
    'Looker',
    'Apache Kafka',
    'Apache Airflow'
  ],
  MOBILE_TECHNOLOGIES: [
    'React Native',
    'Flutter',
    'iOS Development',
    'Android Development',
    'Xamarin',
    'Ionic',
    'Cordova/PhoneGap'
  ]
} as const;

// Flattened skills list for easy access
export const ALL_TECHNICAL_SKILLS = Object.values(TECHNICAL_SKILLS).flat();

// Skill Proficiency Types
export type SkillProficiency = 
  | 'beginner'      // 0-1 years experience
  | 'intermediate'  // 1-3 years experience  
  | 'advanced'      // 3-7 years experience
  | 'expert';       // 7+ years experience

// Proficiency level configuration
export const PROFICIENCY_LEVELS = {
  beginner: { label: 'Beginner', description: '0-1 years', years: 0.5 },
  intermediate: { label: 'Intermediate', description: '1-3 years', years: 2 },
  advanced: { label: 'Advanced', description: '3-7 years', years: 5 },
  expert: { label: 'Expert', description: '7+ years', years: 8 }
} as const;

export interface SkillTag {
  skill: string;
  proficiency?: SkillProficiency;
  yearsOfExperience: number;
  lastUsed: string; // ISO date
  category?: string; // Skill category for organization
  order?: number; // For drag-and-drop ordering
  pendingProficiency?: boolean; // Flag to highlight missing inputs in the UI
}

export interface TeamSkillRequirement {
  skill: string;
  requiredProficiency: SkillProficiency;
  isRequired: boolean;
  description: string; // What they'll be doing with this skill
}

// Skill suggestion types
export interface SkillSuggestion {
  skill: string;
  category: string;
  reason: string; // Why this skill is suggested
  priority: 'high' | 'medium' | 'low';
}

export interface SkillCategory {
  name: string;
  skills: string[];
  icon?: string;
  color?: string;
}

// Standardized interest areas
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
  'Testing & QA'
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
  skillTags?: SkillTag[]; // Enhanced skills with proficiency
  
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

export interface CareerOptionalSectionStatus {
  learningPreferences: boolean;
  networkingPreferences: boolean;
  teamPreferences: boolean;
}

export interface CareerOptionalSectionSnoozes {
  learningPreferences?: string; // ISO timestamp of last snooze
  networkingPreferences?: string;
  teamPreferences?: string;
}

export interface CareerOptionalSectionTimestamps {
  learningPreferencesCompletedAt?: string;
  networkingPreferencesCompletedAt?: string;
  teamPreferencesCompletedAt?: string;
}

// Team Building Preferences (stored separately in preferences JSON)
export interface TeamBuildingPreferences {
  skillProficiencies: SkillTag[];
  teamRole: TeamRole;
  collaborationStyle: CollaborationStyle[];
  teamSizePreference: TeamSizePreference;
  communicationPreferences: CommunicationPreference[];
  teamGoals: string[];
  mentorshipPreference: MentorshipPreference;
  availabilityPattern?: AvailabilityPattern;
  projectTypePreferences: string[];
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

// Team Building Types
export type TeamRole = 
  | 'frontend-developer'    // Frontend development focus
  | 'backend-developer'     // Backend development focus
  | 'full-stack-developer'  // Full stack development
  | 'mobile-developer'      // Mobile app development
  | 'ui-ux-designer'        // Design and user experience
  | 'product-manager'       // Product management
  | 'data-scientist'        // Data analysis and ML
  | 'devops-engineer'       // Infrastructure and deployment
  | 'qa-engineer'          // Quality assurance
  | 'tech-lead'            // Technical leadership
  | 'project-manager'      // Project coordination
  | 'flexible';            // Can adapt to any role

// Team role configuration
export interface TeamRoleConfig {
  role: TeamRole;
  title: string;
  description: string;
  icon: string;
  color: string;
  requiredSkills: string[];
  recommendedSkills: string[];
  responsibilities: string[];
  idealFor: string[];
}

// Role suggestion based on skills
export interface RoleSuggestion {
  role: TeamRole;
  matchScore: number; // 0-100
  reason: string;
  missingSkills: string[];
  strengths: string[];
}

// Team role configurations
export const TEAM_ROLE_CONFIGS: Record<TeamRole, TeamRoleConfig> = {
  'frontend-developer': {
    role: 'frontend-developer',
    title: 'Frontend Developer',
    description: 'Build user interfaces and client-side applications',
    icon: '🖥️',
    color: 'blue',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React'],
    recommendedSkills: ['TypeScript', 'Vue.js', 'Angular', 'Tailwind CSS'],
    responsibilities: ['UI Development', 'User Experience', 'Client-side Logic', 'Responsive Design'],
    idealFor: ['Creative problem solvers', 'User-focused developers', 'Visual thinkers']
  },
  'backend-developer': {
    role: 'backend-developer',
    title: 'Backend Developer',
    description: 'Build server-side applications and APIs',
    icon: '⚙️',
    color: 'green',
    requiredSkills: ['Node.js', 'Python', 'Java', 'PostgreSQL'],
    recommendedSkills: ['Docker', 'AWS', 'GraphQL', 'Redis'],
    responsibilities: ['API Development', 'Database Design', 'Server Logic', 'Security'],
    idealFor: ['System architects', 'Problem solvers', 'Performance optimizers']
  },
  'full-stack-developer': {
    role: 'full-stack-developer',
    title: 'Full Stack Developer',
    description: 'Handle both frontend and backend development',
    icon: '🔄',
    color: 'purple',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    recommendedSkills: ['Docker', 'AWS', 'Next.js', 'GraphQL'],
    responsibilities: ['End-to-end Development', 'System Integration', 'Architecture Design'],
    idealFor: ['Versatile developers', 'System thinkers', 'Quick learners']
  },
  'mobile-developer': {
    role: 'mobile-developer',
    title: 'Mobile Developer',
    description: 'Build native and cross-platform mobile applications',
    icon: '📱',
    color: 'orange',
    requiredSkills: ['React Native', 'Swift', 'Kotlin', 'iOS'],
    recommendedSkills: ['Flutter', 'Android', 'Xcode', 'Firebase'],
    responsibilities: ['Mobile App Development', 'Platform Optimization', 'User Interface'],
    idealFor: ['Mobile enthusiasts', 'Platform experts', 'User experience focused']
  },
  'ui-ux-designer': {
    role: 'ui-ux-designer',
    title: 'UI/UX Designer',
    description: 'Design user interfaces and user experiences',
    icon: '🎨',
    color: 'pink',
    requiredSkills: ['Figma', 'Adobe XD', 'Sketch', 'User Research'],
    recommendedSkills: ['Prototyping', 'Wireframing', 'Design Systems', 'Accessibility'],
    responsibilities: ['User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
    idealFor: ['Creative minds', 'User advocates', 'Visual communicators']
  },
  'product-manager': {
    role: 'product-manager',
    title: 'Product Manager',
    description: 'Define product strategy and roadmap',
    icon: '📋',
    color: 'indigo',
    requiredSkills: ['Product Strategy', 'User Research', 'Analytics', 'Communication'],
    recommendedSkills: ['Agile', 'Data Analysis', 'Stakeholder Management', 'Roadmapping'],
    responsibilities: ['Product Strategy', 'Feature Planning', 'Stakeholder Management', 'User Research'],
    idealFor: ['Strategic thinkers', 'User advocates', 'Cross-functional leaders']
  },
  'data-scientist': {
    role: 'data-scientist',
    title: 'Data Scientist',
    description: 'Analyze data and build machine learning models',
    icon: '📊',
    color: 'teal',
    requiredSkills: ['Python', 'R', 'SQL', 'Machine Learning'],
    recommendedSkills: ['Pandas', 'TensorFlow', 'PyTorch', 'Statistics'],
    responsibilities: ['Data Analysis', 'Model Building', 'Insights Generation', 'Data Visualization'],
    idealFor: ['Analytical minds', 'Problem solvers', 'Data enthusiasts']
  },
  'devops-engineer': {
    role: 'devops-engineer',
    title: 'DevOps Engineer',
    description: 'Manage infrastructure and deployment pipelines',
    icon: '🚀',
    color: 'red',
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
    recommendedSkills: ['Terraform', 'Jenkins', 'Linux', 'Monitoring'],
    responsibilities: ['Infrastructure Management', 'Deployment Automation', 'Monitoring', 'Security'],
    idealFor: ['Infrastructure experts', 'Automation enthusiasts', 'System optimizers']
  },
  'qa-engineer': {
    role: 'qa-engineer',
    title: 'QA Engineer',
    description: 'Ensure software quality through testing',
    icon: '🔍',
    color: 'yellow',
    requiredSkills: ['Testing', 'Selenium', 'Jest', 'Bug Tracking'],
    recommendedSkills: ['Cypress', 'Playwright', 'API Testing', 'Performance Testing'],
    responsibilities: ['Test Planning', 'Automated Testing', 'Bug Reporting', 'Quality Assurance'],
    idealFor: ['Detail-oriented testers', 'Quality advocates', 'System validators']
  },
  'tech-lead': {
    role: 'tech-lead',
    title: 'Tech Lead',
    description: 'Provide technical leadership and architecture guidance',
    icon: '👑',
    color: 'gold',
    requiredSkills: ['Architecture', 'Leadership', 'Code Review', 'Mentoring'],
    recommendedSkills: ['System Design', 'Team Management', 'Technical Writing', 'Decision Making'],
    responsibilities: ['Technical Leadership', 'Architecture Decisions', 'Team Mentoring', 'Code Quality'],
    idealFor: ['Technical leaders', 'Mentors', 'Architecture experts']
  },
  'project-manager': {
    role: 'project-manager',
    title: 'Project Manager',
    description: 'Coordinate projects and manage timelines',
    icon: '📅',
    color: 'gray',
    requiredSkills: ['Project Management', 'Agile', 'Communication', 'Planning'],
    recommendedSkills: ['Jira', 'Scrum', 'Risk Management', 'Stakeholder Management'],
    responsibilities: ['Project Planning', 'Timeline Management', 'Team Coordination', 'Risk Management'],
    idealFor: ['Organized coordinators', 'Communication experts', 'Timeline managers']
  },
  'flexible': {
    role: 'flexible',
    title: 'Flexible Role',
    description: 'Adapt to any role based on team needs',
    icon: '🔄',
    color: 'slate',
    requiredSkills: [],
    recommendedSkills: ['Adaptability', 'Learning', 'Communication', 'Problem Solving'],
    responsibilities: ['Role Adaptation', 'Team Support', 'Learning', 'Collaboration'],
    idealFor: ['Adaptable team players', 'Quick learners', 'Versatile contributors']
  }
};

export type CollaborationStyle = 
  | 'hands-on'            // Prefer coding and building
  | 'strategic'           // Prefer planning and architecture
  | 'mentoring'           // Prefer teaching others
  | 'learning'            // Prefer learning from others
  | 'leading'             // Prefer taking initiative
  | 'supporting'          // Prefer supporting others
  | 'innovating'          // Prefer exploring new ideas
  | 'executing';          // Prefer implementing solutions

export type TeamSizePreference = 
  | 'small'               // 2-3 people
  | 'medium'              // 4-5 people
  | 'large'               // 6+ people
  | 'flexible';           // Any size

export type MentorshipPreference = 
  | 'mentor'              // Prefer to mentor others
  | 'mentee'              // Prefer to be mentored
  | 'both'                // Open to both mentoring and being mentored
  | 'neither';            // Prefer peer-to-peer collaboration

export interface AvailabilityPattern {
  timezone: string;        // User's timezone (e.g., "America/New_York")
  availableHours: {
    start: string;         // Start time in HH:MM format (e.g., "09:00")
    end: string;           // End time in HH:MM format (e.g., "17:00")
  };
  availableDays: string[]; // Days of the week (e.g., ["monday", "tuesday", "wednesday"])
  timezoneOffset: number;  // Timezone offset in minutes (e.g., -300 for EST)
}

export type CommunicationPreference = 
  | 'slack'               // Slack messaging
  | 'discord'             // Discord voice/text
  | 'zoom'                // Video calls
  | 'github'              // GitHub discussions
  | 'email'               // Email communication
  | 'phone'               // Phone calls
  | 'in-person'           // Face-to-face meetings
  | 'async'               // Asynchronous communication
  | 'real-time'           // Real-time collaboration
  | 'other';              // Other communication methods

// Team Matching Types
export interface TeamSkillRequirement {
  skill: string;
  proficiency: SkillProficiency;
  required: boolean;
  weight: number; // 1-5, how important this skill is for the team
}

export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  skills: SkillTag[];
  preferredRole?: TeamRole;
  collaborationStyle?: CollaborationStyle[];
  location?: string;
}

// Simplified team matching - removed complex types

export interface TeamPreferences {
  preferredTeamSize: TeamSizePreference;
  collaborationStyle: CollaborationStyle[];
  communicationPreferences: CommunicationPreference[];
  teamGoals: string[];
  mentorshipPreference: MentorshipPreference;
  availabilityPattern?: AvailabilityPattern;
  projectTypePreferences: string[];
}

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
    skillTags?: SkillTag[]; // Enhanced skills with proficiency
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
