/**
 * Circle Tag Mappings
 *
 * Maps each circle slug to an explicit list of relevant event tag strings.
 * Used by the circle page to filter upcoming events by topic relevance.
 *
 * When a slug is present here, these tags are merged with the results from
 * TagBasedMatchingService.expandSearchTerm() for broader coverage.
 * Unmapped slugs fall back to expandSearchTerm() alone.
 */
export const CIRCLE_TAG_MAPPINGS: Record<string, string[]> = {
  'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'nlp', 'llm', 'data science', 'generative ai'],
  'javascript': ['javascript', 'js', 'typescript', 'ts', 'node.js', 'nodejs', 'react', 'next.js', 'vue', 'angular'],
  'python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'data science'],
  'design': ['design', 'ux', 'ui', 'product design', 'ux design', 'ui design', 'figma', 'user experience'],
  'product': ['product management', 'product', 'product strategy', 'roadmap', 'agile', 'scrum'],
  'startup': ['startup', 'entrepreneurship', 'founder', 'venture', 'fundraising', 'saas'],
  'devops': ['devops', 'docker', 'kubernetes', 'ci/cd', 'cloud', 'aws', 'gcp', 'azure', 'infrastructure'],
  'security': ['security', 'cybersecurity', 'infosec', 'penetration testing', 'privacy'],
  'web3': ['web3', 'blockchain', 'crypto', 'nft', 'defi', 'solidity', 'ethereum'],
  'data': ['data', 'data science', 'analytics', 'data engineering', 'sql', 'big data'],
  'cloud': ['cloud', 'aws', 'gcp', 'azure', 'serverless', 'infrastructure'],
  'backend': ['backend', 'api', 'database', 'server', 'microservices'],
  'frontend': ['frontend', 'css', 'html', 'react', 'vue', 'angular', 'javascript'],
  'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
  'leadership': ['leadership', 'management', 'team lead', 'director', 'cto', 'engineering manager'],
};
