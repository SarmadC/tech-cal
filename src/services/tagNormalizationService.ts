/**
 * Tag Normalization Service
 * 
 * Standardizes tag naming and merges synonyms to canonical forms.
 * Used during event ingestion to ensure consistent tag data.
 */

/**
 * Canonical tag mappings - maps synonyms/variations to their canonical form
 * Key: lowercase variation, Value: canonical tag name
 */
const TAG_CANONICALIZATION: Record<string, string> = {
  // Programming Languages - normalize variations
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'py': 'Python',
  'python': 'Python',
  'golang': 'Go',
  'go': 'Go',
  'cpp': 'C++',
  'c++': 'C++',
  'c plus plus': 'C++',
  'csharp': 'C#',
  'c#': 'C#',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'node': 'Node.js',
  'rust': 'Rust',
  'rustlang': 'Rust',
  'java': 'Java',
  'kotlin': 'Kotlin',
  'swift': 'Swift',
  'ruby': 'Ruby',
  'php': 'PHP',
  
  // Frameworks
  'react': 'React',
  'reactjs': 'React',
  'react.js': 'React',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'angularjs': 'Angular',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'nuxt': 'Nuxt.js',
  'nuxt.js': 'Nuxt.js',
  'svelte': 'Svelte',
  'sveltekit': 'SvelteKit',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'nestjs': 'NestJS',
  'spring': 'Spring',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',
  'ror': 'Ruby on Rails',
  'laravel': 'Laravel',
  '.net': '.NET',
  'dotnet': '.NET',
  'asp.net': 'ASP.NET',
  
  // AI/ML
  'ai': 'AI',
  'artificial intelligence': 'AI',
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'deep learning': 'Deep Learning',
  'dl': 'Deep Learning',
  'llm': 'LLM',
  'large language model': 'LLM',
  'large language models': 'LLM',
  'gen ai': 'Generative AI',
  'genai': 'Generative AI',
  'generative ai': 'Generative AI',
  'gpt': 'GPT',
  'chatgpt': 'ChatGPT',
  'nlp': 'NLP',
  'natural language processing': 'NLP',
  'computer vision': 'Computer Vision',
  'cv': 'Computer Vision',
  
  // Cloud & DevOps
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'azure': 'Azure',
  'microsoft azure': 'Azure',
  'cloud': 'Cloud Computing',
  'cloud computing': 'Cloud Computing',
  'cloud native': 'Cloud Native',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'docker': 'Docker',
  'containers': 'Containers',
  'containerization': 'Containers',
  'devops': 'DevOps',
  'devsecops': 'DevSecOps',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'continuous integration': 'CI/CD',
  'continuous delivery': 'CI/CD',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'gitlab': 'GitLab',
  'github': 'GitHub',
  'git': 'Git',
  
  // Data
  'data': 'Data',
  'data science': 'Data Science',
  'data engineering': 'Data Engineering',
  'data analytics': 'Data Analytics',
  'analytics': 'Analytics',
  'big data': 'Big Data',
  'database': 'Databases',
  'databases': 'Databases',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'elasticsearch': 'Elasticsearch',
  
  // Security
  'security': 'Security',
  'cybersecurity': 'Cybersecurity',
  'cyber security': 'Cybersecurity',
  'infosec': 'Security',
  'appsec': 'Application Security',
  'application security': 'Application Security',
  
  // Web3/Blockchain
  'blockchain': 'Blockchain',
  'web3': 'Web3',
  'crypto': 'Cryptocurrency',
  'cryptocurrency': 'Cryptocurrency',
  'ethereum': 'Ethereum',
  'solidity': 'Solidity',
  'defi': 'DeFi',
  'nft': 'NFT',
  'nfts': 'NFT',
  
  // Event Types
  'conference': 'Conference',
  'conf': 'Conference',
  'summit': 'Summit',
  'workshop': 'Workshop',
  'meetup': 'Meetup',
  'webinar': 'Webinar',
  'hackathon': 'Hackathon',
  'bootcamp': 'Bootcamp',
  'training': 'Training',
  
  // Industries
  'fintech': 'Fintech',
  'financial technology': 'Fintech',
  'healthtech': 'Healthtech',
  'healthcare': 'Healthcare',
  'health tech': 'Healthtech',
  'edtech': 'EdTech',
  'education technology': 'EdTech',
  'saas': 'SaaS',
  'ecommerce': 'E-commerce',
  'e-commerce': 'E-commerce',
  'gaming': 'Gaming',
  'esports': 'Esports',
  'proptech': 'PropTech',
  'cleantech': 'CleanTech',
  'clean tech': 'CleanTech',
  
  // Career & Skills
  'leadership': 'Leadership',
  'management': 'Management',
  'agile': 'Agile',
  'scrum': 'Scrum',
  'kanban': 'Kanban',
  'project management': 'Project Management',
  'pm': 'Project Management',
  'product management': 'Product Management',
  'networking': 'Networking',
  
  // Difficulty
  'beginner': 'Beginner',
  'intro': 'Beginner',
  'introduction': 'Beginner',
  '101': 'Beginner',
  'basics': 'Beginner',
  'fundamentals': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'expert': 'Advanced',
  
  // Other Tech
  'api': 'API',
  'apis': 'API',
  'rest': 'REST API',
  'rest api': 'REST API',
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'microservices': 'Microservices',
  'serverless': 'Serverless',
  'frontend': 'Frontend',
  'front-end': 'Frontend',
  'backend': 'Backend',
  'back-end': 'Backend',
  'fullstack': 'Full Stack',
  'full stack': 'Full Stack',
  'full-stack': 'Full Stack',
  'mobile': 'Mobile Development',
  'mobile development': 'Mobile Development',
  'ios': 'iOS',
  'android': 'Android',
  'ux': 'UX',
  'ui': 'UI',
  'ui/ux': 'UI/UX',
  'ux/ui': 'UI/UX',
  'design': 'Design',
  'testing': 'Testing',
  'qa': 'QA',
  'quality assurance': 'QA',
  'automation': 'Automation',
  'observability': 'Observability',
  'monitoring': 'Monitoring',
  'performance': 'Performance',
};

/**
 * Tags to filter out (noise, language codes, etc.)
 */
const EXCLUDED_TAGS = new Set([
  // ISO 639-1 language codes
  'en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko',
  'ar', 'hi', 'tr', 'sv', 'da', 'no', 'fi', 'cs', 'sk', 'ro', 'hu', 'bg',
  'hr', 'sl', 'uk', 'vi', 'th', 'he', 'id', 'ms', 'el', 'ca', 'et', 'lv', 'lt', 'sr',
  // Full language names
  'english', 'french', 'german', 'spanish', 'portuguese', 'italian',
  'dutch', 'polish', 'russian', 'japanese', 'chinese', 'korean',
  'arabic', 'hindi', 'turkish', 'swedish', 'danish', 'norwegian',
  'finnish', 'czech', 'slovak', 'romanian', 'hungarian', 'bulgarian',
  'croatian', 'slovenian', 'ukrainian', 'vietnamese', 'thai', 'hebrew',
  'indonesian', 'malay', 'greek', 'mandarin', 'cantonese',
  // Format indicators (handled by event_format field)
  'online', 'virtual', 'in-person', 'hybrid', 'remote', 'on-site', 'digital', 'on-demand',
  // Geographic noise
  'usa', 'uk', 'europe', 'asia', 'americas', 'global', 'worldwide', 'international',
  'emea', 'apac', 'latam',
  // Pricing (handled elsewhere)
  'free', 'paid',
  // Unknown/not applicable
  'tbd', 'tba', 'n/a', 'na',
]);

/**
 * Minimum tag length (excluding known short tags)
 */
const MIN_TAG_LENGTH = 3;

/**
 * Known valid short tags
 */
const VALID_SHORT_TAGS = new Set(['ai', 'ml', 'ui', 'ux', 'vr', 'ar', 'qa', 'go', 'js', 'ts', 'py']);

export interface NormalizedTagResult {
  originalTag: string;
  normalizedTag: string;
  wasNormalized: boolean;
  wasExcluded: boolean;
  excludeReason?: string;
}

export class TagNormalizationService {
  /**
   * Normalize a single tag to its canonical form
   */
  static normalizeTag(tag: string): NormalizedTagResult {
    const trimmed = tag.trim();
    const lower = trimmed.toLowerCase();
    
    // Check for exclusions
    if (EXCLUDED_TAGS.has(lower)) {
      return {
        originalTag: tag,
        normalizedTag: '',
        wasNormalized: false,
        wasExcluded: true,
        excludeReason: 'excluded_tag'
      };
    }
    
    // Check minimum length (unless it's a known short tag)
    if (trimmed.length < MIN_TAG_LENGTH && !VALID_SHORT_TAGS.has(lower)) {
      return {
        originalTag: tag,
        normalizedTag: '',
        wasNormalized: false,
        wasExcluded: true,
        excludeReason: 'too_short'
      };
    }
    
    // Check for JSON-like or malformed tags
    if (this.isMalformedTag(trimmed)) {
      return {
        originalTag: tag,
        normalizedTag: '',
        wasNormalized: false,
        wasExcluded: true,
        excludeReason: 'malformed'
      };
    }
    
    // Check for canonical mapping
    if (TAG_CANONICALIZATION[lower]) {
      return {
        originalTag: tag,
        normalizedTag: TAG_CANONICALIZATION[lower],
        wasNormalized: true,
        wasExcluded: false
      };
    }
    
    // If no canonical mapping, apply title case normalization
    const titleCased = this.toTitleCase(trimmed);
    return {
      originalTag: tag,
      normalizedTag: titleCased,
      wasNormalized: titleCased !== trimmed,
      wasExcluded: false
    };
  }
  
  /**
   * Normalize an array of tags
   */
  static normalizeTags(tags: string[]): {
    normalized: string[];
    excluded: Array<{ tag: string; reason: string }>;
    deduped: number;
  } {
    const seen = new Set<string>();
    const normalized: string[] = [];
    const excluded: Array<{ tag: string; reason: string }> = [];
    let deduped = 0;
    
    for (const tag of tags) {
      const result = this.normalizeTag(tag);
      
      if (result.wasExcluded) {
        excluded.push({ tag, reason: result.excludeReason || 'unknown' });
        continue;
      }
      
      // Deduplicate by normalized lowercase
      const key = result.normalizedTag.toLowerCase();
      if (seen.has(key)) {
        deduped++;
        continue;
      }
      
      seen.add(key);
      normalized.push(result.normalizedTag);
    }
    
    return { normalized, excluded, deduped };
  }
  
  /**
   * Check if a tag looks malformed (JSON-like, key:value, etc.)
   */
  private static isMalformedTag(tag: string): boolean {
    // JSON-like patterns
    if (tag.startsWith('{') || tag.endsWith('}')) return true;
    if (tag.includes('"key"') || tag.includes('"value"')) return true;
    if (tag.includes('":"')) return true;
    
    // Key:value patterns (but allow valid tags like "CI/CD")
    if (tag.includes(':') && !tag.match(/^[A-Z]{2,}\/[A-Z]{2,}$/i)) {
      // Check if it looks like a key:value pair
      const parts = tag.split(':');
      if (parts.length === 2 && parts[0].length > 2 && parts[1].length > 2) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Convert string to title case
   */
  private static toTitleCase(str: string): string {
    // Handle special cases
    const specialCases: Record<string, string> = {
      'api': 'API',
      'apis': 'API',
      'ui': 'UI',
      'ux': 'UX',
      'ai': 'AI',
      'ml': 'ML',
      'qa': 'QA',
      'ci': 'CI',
      'cd': 'CD',
      'ci/cd': 'CI/CD',
      'devops': 'DevOps',
      'devsecops': 'DevSecOps',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'graphql': 'GraphQL',
      'grpc': 'gRPC',
      'ios': 'iOS',
      'saas': 'SaaS',
      'paas': 'PaaS',
      'iaas': 'IaaS',
      'nosql': 'NoSQL',
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'mongodb': 'MongoDB',
      'edtech': 'EdTech',
      'fintech': 'Fintech',
      'healthtech': 'Healthtech',
      'proptech': 'PropTech',
      'cleantech': 'CleanTech',
    };
    
    const lower = str.toLowerCase();
    if (specialCases[lower]) {
      return specialCases[lower];
    }
    
    // Standard title case
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return word;
        // Check if word has special casing in specialCases
        const lowerWord = word.toLowerCase();
        if (specialCases[lowerWord]) {
          return specialCases[lowerWord];
        }
        // Standard title case
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }
  
  /**
   * Get the canonical form of a tag (for lookup purposes)
   */
  static getCanonicalTag(tag: string): string {
    const lower = tag.trim().toLowerCase();
    return TAG_CANONICALIZATION[lower] || tag;
  }
  
  /**
   * Check if two tags are equivalent after normalization
   */
  static areTagsEquivalent(tag1: string, tag2: string): boolean {
    const norm1 = this.normalizeTag(tag1);
    const norm2 = this.normalizeTag(tag2);
    
    if (norm1.wasExcluded || norm2.wasExcluded) {
      return false;
    }
    
    return norm1.normalizedTag.toLowerCase() === norm2.normalizedTag.toLowerCase();
  }
}

