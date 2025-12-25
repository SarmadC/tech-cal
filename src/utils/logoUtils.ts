/**
 * Centralized logo utility with multiple fallback sources
 * Handles Clearbit 403 errors by providing alternative logo services
 */

// Special logos mapping for known companies with better transparent logos
const SPECIAL_LOGOS: Record<string, string> = {
  'meta.com': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
  'facebook.com': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
  'google.com': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
  'microsoft.com': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  'amazon.com': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
  'apple.com': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  'netflix.com': 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
  'uber.com': 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png',
  'airbnb.com': 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg',
  'twitter.com': 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
  'linkedin.com': 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
  'github.com': 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
  'stackoverflow.com': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Stack_Overflow_icon.svg',
  'docker.com': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg',
  'kubernetes.io': 'https://upload.wikimedia.org/wikipedia/commons/3/39/Kubernetes_logo_without_workmark.svg',
  'aws.amazon.com': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
  'cloud.google.com': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
  'azure.microsoft.com': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg',
  'nvidia.com': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/NVIDIA_logo.svg',
  'openai.com': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
};

// Company name to domain mapping for landing page components
const COMPANY_SLUG: Record<string, string> = {
  meta: 'meta',
  google: 'google',
  apple: 'apple',
  microsoft: 'microsoft',
  github: 'github',
  openai: 'openai',
  nvidia: 'nvidia',
  amazon: 'amazon',
  docker: 'docker',
  vercel: 'vercel',
};

/**
 * Get domain from company name or return as-is if already a domain
 */
function getDomain(input: string): string {
  // If it's already a domain (contains a dot), return as-is
  if (input.includes('.')) {
    return input;
  }

  // Try to find company slug match
  const key = input.toLowerCase();
  const slug = Object.keys(COMPANY_SLUG).find((k) => key.includes(k));
  
  if (slug) {
    return `${COMPANY_SLUG[slug]}.com`;
  }

  // Fallback: try to construct domain from company name
  return `${key.replace(/\s+/g, '').toLowerCase()}.com`;
}

/**
 * Generate alternative logo URLs for a given domain
 */
function getAlternativeLogoServices(domain: string): string[] {
  const alternatives: string[] = [];

  // Google Favicon Service (reliable, free)
  alternatives.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);

  // Icon Horse (free logo service)
  alternatives.push(`https://icon.horse/icon/${domain}`);

  // Clearbit (last resort, may return 403)
  alternatives.push(`https://logo.clearbit.com/${domain}`);

  return alternatives;
}

/**
 * Get logo URLs with fallback chain for a domain
 * Returns array of URLs in priority order
 */
export function getLogoSources(
  domainOrCompany: string,
  supabaseUrl?: string
): string[] {
  const sources: string[] = [];
  const domain = getDomain(domainOrCompany);

  // 1. Check Supabase storage (if slug exists and Supabase URL available)
  const key = domainOrCompany.toLowerCase();
  const slug = Object.keys(COMPANY_SLUG).find((k) => key.includes(k));
  const baseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (baseUrl && slug) {
    sources.push(`${baseUrl}/storage/v1/object/public/logos/${COMPANY_SLUG[slug]}.svg`);
  }

  // 2. Check special logos mapping
  if (SPECIAL_LOGOS[domain]) {
    sources.push(SPECIAL_LOGOS[domain]);
  }

  // 3. Add alternative logo services
  sources.push(...getAlternativeLogoServices(domain));

  return sources;
}

/**
 * Get primary logo URL (first in fallback chain)
 * For server-side or simple use cases
 */
export function getLogoUrl(
  domainOrCompany: string,
  supabaseUrl?: string
): string {
  const sources = getLogoSources(domainOrCompany, supabaseUrl);
  return sources[0] || `https://www.google.com/s2/favicons?domain=${getDomain(domainOrCompany)}&sz=128`;
}

/**
 * Get logo URL from domain or filename (for transformers.ts compatibility)
 * Handles both domain strings and filenames
 */
export function getLogoUrlFromInput(
  logoUrl: string | null | undefined,
  organizerName?: string,
  supabaseUrl?: string
): string | undefined {
  if (!logoUrl) return undefined;

  // If it's already a full URL (starts with http), return as-is
  if (logoUrl.startsWith('http')) {
    return logoUrl;
  }

  // If it's a domain name (contains a dot but no file extension)
  if (logoUrl.includes('.') && !logoUrl.includes('/') && !logoUrl.match(/\.(png|jpg|jpeg|svg|webp)$/i)) {
    const sources = getLogoSources(logoUrl, supabaseUrl);
    return sources[0];
  }

  // If it's a filename (including SVG), construct Supabase storage URL
  const baseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return undefined;
  }
  return `${baseUrl}/storage/v1/object/public/logos/${logoUrl}`;
}

/**
 * Get multiple logo sources for client-side error handling
 * Returns array of URLs to try in sequence
 */
export function getLogoSourcesForClient(
  companyName: string,
  supabaseUrl?: string
): string[] {
  return getLogoSources(companyName, supabaseUrl);
}




