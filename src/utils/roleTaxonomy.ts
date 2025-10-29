import { ROLE_TAXONOMY, ROLE_CATEGORIES } from '@/types/career';

export interface RoleKeywordMeta {
  role: string;
  normalized: string;
  category: string;
  keywords: string[];
  synonyms: string[];
}

/**
 * Manual synonym mappings for role keywords.
 * Keys must match roles defined in ROLE_TAXONOMY.
 */
const ROLE_SYNONYM_MAP: Record<string, string[]> = {
  // Engineering roles
  'Frontend Engineer': ['frontend', 'frontend engineer', 'ui developer', 'frontend dev', 'client-side developer', 'web developer'],
  'Backend Engineer': ['backend', 'backend engineer', 'server developer', 'api developer', 'backend dev'],
  'Full Stack Engineer': ['full stack', 'fullstack', 'full-stack developer', 'fullstack developer', 'full stack dev'],
  'Mobile Engineer (iOS/Android)': ['mobile engineer', 'mobile developer', 'ios developer', 'android developer', 'mobile dev'],
  'DevOps Engineer': ['devops', 'dev ops', 'platform engineer', 'infrastructure engineer', 'site reliability engineer'],
  'Site Reliability Engineer': ['sre', 'site reliability', 'reliability engineer', 'platform engineer'],
  'QA Engineer': ['qa', 'quality assurance', 'test engineer', 'testing engineer', 'qa engineer'],
  'Security Engineer': ['security', 'security engineer', 'cybersecurity engineer', 'infosec engineer'],
  
  // Data & AI roles
  'Data Scientist': ['data scientist', 'data science', 'ml scientist', 'machine learning scientist'],
  'Data Analyst': ['data analyst', 'analytics', 'business analyst', 'data analytics'],
  'Data Engineer': ['data engineer', 'data engineering', 'etl engineer', 'data pipeline engineer'],
  'ML Engineer': ['ml engineer', 'machine learning engineer', 'ai engineer', 'ml dev'],
  'AI Research Scientist': ['ai researcher', 'research scientist', 'ai research', 'ml researcher'],
  
  // Product & Design roles
  'Product Manager': ['product manager', 'pm', 'product lead', 'product owner'],
  'Product Owner': ['product owner', 'po', 'scrum master', 'agile coach'],
  'UX Designer': ['ux designer', 'user experience designer', 'ux', 'user experience'],
  'UI Designer': ['ui designer', 'user interface designer', 'ui', 'user interface'],
  'UX Researcher': ['ux researcher', 'user researcher', 'research', 'user research'],
  'Technical Product Manager': ['technical pm', 'technical product manager', 'tpm', 'engineering manager'],
  
  // Leadership roles
  'Engineering Manager': ['engineering manager', 'eng manager', 'dev manager', 'development manager'],
  'Technical Lead': ['tech lead', 'technical lead', 'lead engineer', 'senior engineer'],
  'Product Director': ['product director', 'director of product', 'vp product', 'head of product'],
  'VP of Engineering': ['vp engineering', 'vp of engineering', 'head of engineering', 'engineering vp'],
  'CTO': ['cto', 'chief technology officer', 'chief technical officer'],
  'Solutions Architect': ['solutions architect', 'solution architect', 'enterprise architect', 'system architect'],
  'Developer Relations': ['dev rel', 'developer relations', 'developer advocate', 'dev advocate'],
  'Technical Writer': ['technical writer', 'tech writer', 'documentation engineer', 'content engineer']
};

/**
 * Normalize role strings for consistent matching
 */
export function normalizeRoleName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build keywords for a role including synonyms and variations
 */
function buildRoleKeywords(role: string, manualSynonyms: string[]): string[] {
  const keywords = new Set<string>();

  // Add the role name itself
  keywords.add(role);
  keywords.add(role.toLowerCase());
  
  // Add manual synonyms
  manualSynonyms.forEach(synonym => {
    keywords.add(synonym);
    keywords.add(synonym.toLowerCase());
  });

  // Add automatic splits for common patterns
  const parts = role.split(/[()\/-]/);
  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed && trimmed.length > 2) {
      keywords.add(trimmed);
      keywords.add(trimmed.toLowerCase());
    }
  });

  // Add condensed forms (remove spaces)
  keywords.add(role.replace(/\s+/g, ''));
  keywords.add(role.replace(/\s+/g, '').toLowerCase());

  return Array.from(keywords);
}

// Build role keyword taxonomy
const roleKeywordMap = new Map<string, RoleKeywordMeta>();
const aliasLookup = new Map<string, RoleKeywordMeta>();

// Process all roles from ROLE_TAXONOMY
Object.entries(ROLE_TAXONOMY).forEach(([category, roles]) => {
  roles.forEach(role => {
    const normalized = normalizeRoleName(role);
    const manualSynonyms = ROLE_SYNONYM_MAP[role] || [];
    const keywords = buildRoleKeywords(role, manualSynonyms);

    const meta: RoleKeywordMeta = {
      role,
      normalized,
      category,
      keywords,
      synonyms: manualSynonyms
    };

    roleKeywordMap.set(role, meta);
    aliasLookup.set(normalized, meta);
    
    // Add all keywords to alias lookup
    keywords.forEach(keyword => {
      aliasLookup.set(normalizeRoleName(keyword), meta);
    });
  });
});

/**
 * Get role keywords for matching against event content
 */
export function getRoleKeywords(role: string): string[] {
  if (!role) return [];
  
  const meta = aliasLookup.get(normalizeRoleName(role));
  return meta?.keywords || [role];
}

/**
 * Get role metadata including category and synonyms
 */
export function getRoleMeta(role: string): RoleKeywordMeta | null {
  if (!role) return null;
  return aliasLookup.get(normalizeRoleName(role)) || null;
}

/**
 * Check if a role exists in the taxonomy
 */
export function isValidRole(role: string): boolean {
  return aliasLookup.has(normalizeRoleName(role));
}

/**
 * Get all roles in a specific category
 */
export function getRolesByCategory(category: string): readonly string[] {
  return ROLE_TAXONOMY[category as keyof typeof ROLE_TAXONOMY] || [];
}

/**
 * Get all available role categories
 */
export function getRoleCategories(): string[] {
  return Object.values(ROLE_CATEGORIES);
}

/**
 * Export the complete role keyword map for testing/debugging
 */
export const ROLE_KEYWORD_MAP: Map<string, RoleKeywordMeta> = roleKeywordMap;

/**
 * Get all available roles
 */
export function getAllRoles(): string[] {
  return Array.from(roleKeywordMap.keys());
}
