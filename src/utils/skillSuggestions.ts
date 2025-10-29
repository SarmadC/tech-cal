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
  'React',
  'Node.js',
  'Git',
  'SQL',
  'Docker'
];

/**
 * Get 5-7 skills for a role with fallback to DEFAULT_SKILLS
 * Always returns a non-empty array
 */
export function getSkillsForRole(role?: string): string[] {
  if (!role) return DEFAULT_SKILLS;

  const normalized = normalizeForComparison(role);

  // Keyword-based mapping
  const roleMap: Record<string, string[]> = {
    // Frontend roles
    'frontend|react|vue|angular|ui': [
      'React',
      'TypeScript',
      'Next.js',
      'Tailwind CSS',
      'HTML/CSS',
      'Vue.js',
      'JavaScript'
    ],
    // Backend roles
    'backend|api|server|node': [
      'Node.js',
      'Python',
      'PostgreSQL',
      'REST APIs',
      'Docker',
      'Redis',
      'Express.js'
    ],
    // Full stack
    'fullstack|full stack|full-stack': [
      'React',
      'Node.js',
      'TypeScript',
      'PostgreSQL',
      'Next.js',
      'Docker',
      'REST APIs'
    ],
    // Mobile
    'mobile|ios|android|flutter|react native': [
      'React Native',
      'Swift',
      'Kotlin',
      'Flutter',
      'Firebase',
      'TypeScript',
      'Mobile UI'
    ],
    // Data/ML
    'data|ml|machine learning|ai|scientist|analyst': [
      'Python',
      'SQL',
      'Pandas',
      'TensorFlow',
      'Jupyter',
      'Scikit-learn',
      'PyTorch'
    ],
    // DevOps
    'devops|sre|infrastructure|cloud|platform': [
      'Docker',
      'Kubernetes',
      'AWS',
      'Terraform',
      'Jenkins',
      'Linux',
      'Prometheus'
    ],
    // Product/PM
    'product|pm|manager|owner': [
      'SQL',
      'Analytics',
      'Figma',
      'JIRA',
      'User Research',
      'A/B Testing',
      'Product Strategy'
    ]
  };

  // Find first matching pattern
  for (const [pattern, skills] of Object.entries(roleMap)) {
    const keywords = pattern.split('|');
    if (keywords.some((kw) => normalized.includes(kw))) {
      return skills.slice(0, 7); // Return max 7
    }
  }

  return DEFAULT_SKILLS; // Fallback if no match
}

/**
 * Get complementary skills based on current selection
 * Returns 5-7 adjacent/complementary skills
 */
export function getSuggestedSkillsToLearn(
  currentSkills: string[],
  role?: string
): string[] {
  const normalized = currentSkills.map(normalizeForComparison);

  // Complementary skill map
  const complementary: Record<string, string[]> = {
    react: ['Next.js', 'TypeScript', 'React Native', 'Redux', 'GraphQL'],
    javascript: ['TypeScript', 'Node.js', 'React', 'Vue.js', 'Testing'],
    python: ['Django', 'Flask', 'FastAPI', 'Pandas', 'TensorFlow'],
    node: ['Express.js', 'NestJS', 'GraphQL', 'MongoDB', 'PostgreSQL'],
    sql: ['PostgreSQL', 'MongoDB', 'Redis', 'Data Modeling', 'ETL'],
    docker: ['Kubernetes', 'CI/CD', 'Terraform', 'AWS', 'Monitoring'],
    aws: ['Terraform', 'Docker', 'Kubernetes', 'CloudFormation', 'Lambda'],
    typescript: ['React', 'Node.js', 'Next.js', 'GraphQL', 'Testing'],
    git: ['GitHub Actions', 'CI/CD', 'GitLab CI', 'Code Review', 'DevOps']
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
    return getSkillsForRole(role).slice(0, 5);
  }

  return Array.from(suggestions).slice(0, 7);
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
  if (!/^[\w\s\-\.\/\+\#\(\)]+$/.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in skill name' };
  }

  return { valid: true, normalized: trimmed };
}

