/**
 * Skill suggestion utilities for Career Onboarding
 * Provides role-based suggestions, complementary skills, and deduplication
 */

// Normalize for comparison: trim + lowercase
export function normalizeForComparison(skill: string): string {
  return skill.trim().toLowerCase();
}

// Default popular skills if role is missing or unmatched
const DEFAULT_SKILLS = [
  'JavaScript',
  'Python',
  'Product Strategy',
  'Leadership',
  'SQL',
  'Public Speaking',
  'Business Operations'
];

interface RoleSuggestionRule {
  patterns: string[];
  skills: string[];
}

const CURRENT_ROLE_SKILL_RULES: RoleSuggestionRule[] = [
  {
    patterns: ['founder', 'cofounder', 'co-founder', 'entrepreneur', 'startup operator'],
    skills: [
      'Product Strategy',
      'Customer Discovery',
      'Go-to-Market',
      'Fundraising',
      'Business Operations',
      'Strategic Planning',
      'Partnerships'
    ]
  },
  {
    patterns: ['product marketing manager', 'product marketing', 'pmm', 'growth marketer', 'growth marketing', 'growth lead'],
    skills: [
      'Go-to-Market',
      'Pricing & Packaging',
      'Content Strategy',
      'Growth Marketing',
      'Experiment Design',
      'Competitive Analysis',
      'Stakeholder Management'
    ]
  },
  {
    patterns: ['developer relations manager', 'devrel manager', 'community manager', 'community lead', 'customer success manager', 'customer success'],
    skills: [
      'Community Strategy',
      'Program Design',
      'Event Programming',
      'Public Speaking',
      'Partnerships',
      'Customer Success',
      'Stakeholder Management'
    ]
  },
  {
    patterns: ['technical program manager', 'technical pgm', 'program manager', 'pgm', 'business operations manager', 'bizops', 'business ops'],
    skills: [
      'Program Management',
      'Roadmapping',
      'Stakeholder Management',
      'Executive Communication',
      'Facilitation',
      'Business Operations',
      'Strategic Planning'
    ]
  },
  {
    patterns: ['ai engineer', 'applied ai engineer', 'genai engineer', 'analytics engineer', 'dbt developer'],
    skills: [
      'Python',
      'SQL',
      'TensorFlow',
      'PyTorch',
      'Experiment Design',
      'Tableau',
      'Power BI'
    ]
  },
  {
    patterns: ['platform engineer', 'developer platform engineer', 'solutions engineer', 'sales engineer', 'solution consultant'],
    skills: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Terraform',
      'Technical Writing',
      'Stakeholder Management',
      'Public Speaking'
    ]
  },
  {
    patterns: ['ux designer', 'ui designer', 'ux researcher', 'product designer', 'designer', 'design', 'researcher'],
    skills: [
      'Figma',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'Accessibility',
      'Usability Testing'
    ]
  },
  {
    patterns: ['frontend', 'react', 'vue', 'angular', 'ui developer'],
    skills: [
      'React',
      'TypeScript',
      'Next.js',
      'Tailwind CSS',
      'HTML/CSS',
      'Vue.js',
      'JavaScript'
    ]
  },
  {
    patterns: ['backend', 'api', 'server', 'node'],
    skills: [
      'Node.js',
      'Python',
      'PostgreSQL',
      'REST APIs',
      'Docker',
      'Redis',
      'Express.js'
    ]
  },
  {
    patterns: ['fullstack', 'full stack', 'full-stack'],
    skills: [
      'React',
      'Node.js',
      'TypeScript',
      'PostgreSQL',
      'Next.js',
      'Docker',
      'REST APIs'
    ]
  },
  {
    patterns: ['mobile', 'ios', 'android', 'flutter', 'react native'],
    skills: [
      'React Native',
      'Swift',
      'Kotlin',
      'Flutter',
      'Firebase',
      'TypeScript',
      'iOS Development'
    ]
  },
  {
    patterns: ['data scientist', 'data analyst', 'data engineer', 'ml engineer', 'machine learning', 'ai research scientist'],
    skills: [
      'Python',
      'SQL',
      'Pandas',
      'TensorFlow',
      'Jupyter',
      'Scikit-learn',
      'PyTorch'
    ]
  },
  {
    patterns: ['devops', 'sre', 'infrastructure', 'cloud'],
    skills: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Terraform',
      'GitHub Actions',
      'Prometheus',
      'Grafana'
    ]
  },
  {
    patterns: ['product manager', 'product owner', 'technical product manager'],
    skills: [
      'Product Strategy',
      'Roadmapping',
      'Prioritization',
      'User Research',
      'Stakeholder Management',
      'Competitive Analysis',
      'Go-to-Market'
    ]
  }
];

const LEARNING_ROLE_SKILL_RULES: RoleSuggestionRule[] = [
  {
    patterns: ['founder', 'cofounder', 'co-founder', 'entrepreneur', 'startup operator'],
    skills: [
      'Product Strategy',
      'Customer Discovery',
      'Go-to-Market',
      'Fundraising',
      'Business Operations',
      'Strategic Planning',
      'Partnerships'
    ]
  },
  {
    patterns: ['product marketing manager', 'product marketing', 'pmm', 'growth marketer', 'growth marketing', 'growth lead'],
    skills: [
      'Go-to-Market',
      'Pricing & Packaging',
      'Content Strategy',
      'Growth Marketing',
      'Experiment Design',
      'Competitive Analysis',
      'Stakeholder Management'
    ]
  },
  {
    patterns: ['developer relations manager', 'devrel manager', 'community manager', 'community lead', 'customer success manager', 'customer success'],
    skills: [
      'Community Strategy',
      'Program Design',
      'Event Programming',
      'Public Speaking',
      'Partnerships',
      'Customer Success',
      'Stakeholder Management'
    ]
  },
  {
    patterns: ['technical program manager', 'technical pgm', 'program manager', 'pgm', 'business operations manager', 'bizops', 'business ops'],
    skills: [
      'Program Management',
      'Roadmapping',
      'Stakeholder Management',
      'Executive Communication',
      'Facilitation',
      'Business Operations',
      'Strategic Planning'
    ]
  },
  {
    patterns: ['ai engineer', 'applied ai engineer', 'genai engineer', 'analytics engineer', 'dbt developer'],
    skills: [
      'Python',
      'SQL',
      'TensorFlow',
      'PyTorch',
      'Experiment Design',
      'Tableau',
      'Power BI'
    ]
  },
  {
    patterns: ['platform engineer', 'developer platform engineer', 'solutions engineer', 'sales engineer', 'solution consultant'],
    skills: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Terraform',
      'Technical Writing',
      'Stakeholder Management',
      'Public Speaking'
    ]
  }
];

function getRoleMatchedSkills(role: string, rules: RoleSuggestionRule[]): string[] | null {
  const normalizedRole = normalizeForComparison(role);

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => normalizedRole.includes(pattern))) {
      return rule.skills;
    }
  }

  return null;
}

/**
 * Get 5-7 skills for a role with fallback to DEFAULT_SKILLS
 * Always returns a non-empty array
 */
export function getSkillsForRole(role?: string): string[] {
  if (!role) return DEFAULT_SKILLS;

  return getRoleMatchedSkills(role, CURRENT_ROLE_SKILL_RULES)?.slice(0, 7) ?? DEFAULT_SKILLS;
}

/**
 * Get complementary skills based on current selection
 * Returns 5-7 adjacent/complementary skills, excluding skills user already knows
 */
export function getSuggestedSkillsToLearn(
  currentSkills: string[],
  role?: string
): string[] {
  const normalized = currentSkills.map(normalizeForComparison);
  const normalizedCurrentSet = new Set(normalized);

  if (role) {
    const roleSuggestions = getRoleMatchedSkills(role, LEARNING_ROLE_SKILL_RULES);
    if (roleSuggestions) {
      return roleSuggestions
        .filter((skill) => !normalizedCurrentSet.has(normalizeForComparison(skill)))
        .slice(0, 7);
    }
  }

  // Complementary skill map
  const complementary: Record<string, string[]> = {
    react: ['Next.js', 'TypeScript', 'React Native', 'GraphQL', 'Design Systems'],
    javascript: ['TypeScript', 'Node.js', 'React', 'Vue.js', 'Next.js'],
    python: ['Django', 'Flask', 'FastAPI', 'Pandas', 'TensorFlow'],
    node: ['Express.js', 'GraphQL', 'MongoDB', 'PostgreSQL', 'Docker'],
    sql: ['PostgreSQL', 'MongoDB', 'Redis', 'Tableau', 'Power BI'],
    docker: ['Kubernetes', 'GitHub Actions', 'Terraform', 'AWS', 'Grafana'],
    aws: ['Terraform', 'Docker', 'Kubernetes', 'Serverless', 'Cloudflare'],
    typescript: ['React', 'Node.js', 'Next.js', 'GraphQL', 'React Native'],
    git: ['GitHub Actions', 'GitLab CI/CD', 'Docker', 'Terraform', 'GitHub'],
    figma: ['Design Systems', 'Prototyping', 'Accessibility', 'User Research', 'Framer'],
    'user research': ['Usability Testing', 'Information Architecture', 'Prototyping', 'Accessibility', 'Design Systems'],
    wireframing: ['Prototyping', 'Information Architecture', 'Design Systems', 'Accessibility', 'User Research'],
    prototyping: ['Figma', 'Framer', 'Design Systems', 'Accessibility', 'Usability Testing'],
    accessibility: ['Design Systems', 'Usability Testing', 'Information Architecture', 'User Research', 'HTML/CSS'],
    'product strategy': ['Roadmapping', 'Prioritization', 'Customer Discovery', 'Competitive Analysis', 'Go-to-Market'],
    'customer discovery': ['User Interviews', 'Product Strategy', 'Go-to-Market', 'Competitive Analysis', 'Pricing & Packaging'],
    'go to market': ['Pricing & Packaging', 'Content Strategy', 'Growth Marketing', 'Partnerships', 'Competitive Analysis'],
    leadership: ['Stakeholder Management', 'Executive Communication', 'Team Management', 'Mentoring', 'Negotiation'],
    'community strategy': ['Program Design', 'Event Programming', 'Partnerships', 'Customer Success', 'Content Strategy'],
    partnerships: ['Business Development', 'Community Strategy', 'Customer Success', 'Strategic Planning', 'Executive Communication'],
    'business operations': ['Strategic Planning', 'Program Management', 'Stakeholder Management', 'Facilitation', 'Business Development']
  };

  const suggestions = new Set<string>();

  // Add complementary skills for each current skill
  for (const skill of normalized) {
    for (const [key, complementarySkills] of Object.entries(complementary)) {
      if (skill.includes(key)) {
        complementarySkills.forEach((s) => suggestions.add(s));
      }
    }
  }

  // If no matches, get role-based suggestions
  if (suggestions.size === 0 && role) {
    const roleSuggestions = getSkillsForRole(role).slice(0, 5);
    // Filter out skills the user already has
    return roleSuggestions.filter(
      (s) => !normalizedCurrentSet.has(normalizeForComparison(s))
    );
  }

  // Filter out skills the user already has
  return Array.from(suggestions)
    .filter((s) => !normalizedCurrentSet.has(normalizeForComparison(s)))
    .slice(0, 7);
}

/**
 * Cross-field and within-field deduplication
 * Normalizes all inputs and checks for duplicates across fields
 */
export function deduplicateSkills(
  currentSkills: string[],
  skillsToLearn: string[],
  interests: string[]
): {
  isValid: boolean;
  crossFieldDuplicates: Array<{ skill: string; fields: string[] }>;
  normalizedCurrent: string[];
  normalizedToLearn: string[];
  normalizedInterests: string[];
} {
  // Normalize all inputs
  const normCurrent = currentSkills.map((s) => normalizeForComparison(s));
  const normToLearn = skillsToLearn.map((s) => normalizeForComparison(s));
  const normInterests = interests.map((s) => normalizeForComparison(s));

  // Build frequency map
  const freqMap = new Map<string, string[]>();

  normCurrent.forEach((skill) => {
    if (!freqMap.has(skill)) freqMap.set(skill, []);
    freqMap.get(skill)!.push('Current Skills');
  });

  normToLearn.forEach((skill) => {
    if (!freqMap.has(skill)) freqMap.set(skill, []);
    freqMap.get(skill)!.push('Skills to Learn');
  });

  normInterests.forEach((skill) => {
    if (!freqMap.has(skill)) freqMap.set(skill, []);
    freqMap.get(skill)!.push('Areas of Interest');
  });

  // Find cross-field duplicates (appears in 2+ fields)
  const crossFieldDuplicates: Array<{ skill: string; fields: string[] }> = [];

  freqMap.forEach((fields, skill) => {
    const uniqueFields = [...new Set(fields)];
    if (uniqueFields.length > 1) {
      // Get original casing from first occurrence
      const original =
        currentSkills.find((s) => normalizeForComparison(s) === skill) ||
        skillsToLearn.find((s) => normalizeForComparison(s) === skill) ||
        interests.find((s) => normalizeForComparison(s) === skill) ||
        skill;
      crossFieldDuplicates.push({ skill: original, fields: uniqueFields });
    }
  });

  return {
    isValid: crossFieldDuplicates.length === 0,
    crossFieldDuplicates,
    normalizedCurrent: normCurrent,
    normalizedToLearn: normToLearn,
    normalizedInterests: normInterests
  };
}

/**
 * Validate custom skill entry
 * Returns validation result with normalized value if valid
 */
export function validateSkillEntry(value: string): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Skill name cannot be empty' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Skill name too short (min 2 characters)' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Skill name too long (max 50 characters)' };
  }

  // Allow letters, numbers, spaces, and common tech punctuation: - . / + # ( )
  if (!/^[\w\s./+#()-]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in skill name' };
  }

  return { valid: true, normalized: trimmed };
}
