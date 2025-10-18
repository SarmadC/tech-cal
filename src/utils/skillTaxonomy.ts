import { TECHNICAL_SKILLS } from '@/types/career';

export interface CanonicalSkillMeta {
  name: string;
  normalized: string;
  category: string;
  synonyms: string[];
  keywords: string[];
}

/**
 * Manual synonym clusters for canonical skills.
 * Keys must match the canonical skill labels defined in TECHNICAL_SKILLS.
 */
const MANUAL_SYNONYM_SOURCE: Record<string, string[]> = {
  'JavaScript/TypeScript': ['JavaScript', 'TypeScript', 'JS', 'TS', 'ECMAScript'],
  'Python': ['Py', 'Python Language'],
  'Java': ['Java Language', 'JVM'],
  'C#': ['C Sharp', 'C-Sharp'],
  'C++': ['C Plus Plus', 'CPP'],
  'Go': ['Golang'],
  'Rust': ['Rust Language'],
  'PHP': ['PHP Language'],
  'Ruby': ['Ruby Language'],
  'Swift': ['Swift Language'],
  'Kotlin': ['Kotlin Language'],
  'Scala': ['Scala Language'],
  'R': ['R Language'],
  'MATLAB': ['Mat Lab'],
  'Dart': ['Dart Language'],
  'React': ['ReactJS', 'React.js', 'React JS'],
  'Vue.js': ['Vue', 'VueJS', 'Vue JS'],
  'Angular': ['AngularJS', 'Angular JS'],
  'Svelte': ['SvelteKit'],
  'Next.js': ['NextJS', 'Next JS'],
  'Nuxt.js': ['NuxtJS', 'Nuxt JS'],
  'Gatsby': ['GatsbyJS', 'Gatsby JS'],
  'HTML/CSS': ['HTML', 'CSS'],
  'Tailwind CSS': ['Tailwind'],
  'Sass/SCSS': ['Sass', 'SCSS'],
  'Webpack': ['WebpackJS'],
  'Vite': ['ViteJS'],
  'Parcel': ['ParcelJS'],
  'Node.js': ['Node', 'NodeJS'],
  'Express.js': ['Express', 'ExpressJS'],
  'Django': ['Django Framework'],
  'Flask': ['Flask Framework'],
  'Spring Boot': ['Spring'],
  'ASP.NET': ['DotNet', '.NET', 'ASP.NET Core'],
  'Laravel': ['PHP Laravel'],
  'Ruby on Rails': ['Rails'],
  'FastAPI': ['Fast API'],
  'GraphQL': ['Graph QL'],
  'REST APIs': ['REST API', 'RESTful API'],
  'PostgreSQL': ['Postgres', 'Postgre SQL'],
  'MySQL': ['My SQL'],
  'MongoDB': ['Mongo'],
  'Redis': ['Redis Cache'],
  'Elasticsearch': ['Elastic Search'],
  'DynamoDB': ['Dynamo DB'],
  'SQLite': ['SQLite3'],
  'SQL Server': ['MSSQL', 'Microsoft SQL Server'],
  'Neo4j': ['Neo 4J', 'Graph Database'],
  'InfluxDB': ['Influx DB'],
  'AWS': ['Amazon Web Services'],
  'Google Cloud Platform': ['GCP', 'Google Cloud'],
  'Microsoft Azure': ['Azure'],
  'DigitalOcean': ['Digital Ocean'],
  'Heroku': ['Heroku Platform'],
  'Vercel': ['Vercel Platform'],
  'Netlify': ['Netlify Platform'],
  'Firebase': ['Google Firebase'],
  'Supabase': ['Supabase Platform'],
  'Cloudflare': ['Cloudflare Workers', 'Cloudflare Pages'],
  'Docker': ['Containerization', 'Docker Containers'],
  'Kubernetes': ['K8s'],
  'Jenkins': ['Jenkins CI'],
  'GitLab CI/CD': ['GitLab CI', 'GitLab Pipeline'],
  'GitHub Actions': ['GitHub Workflow'],
  'Terraform': ['IaC', 'Infrastructure as Code'],
  'Ansible': ['Ansible Automation'],
  'Prometheus': ['Prometheus Monitoring'],
  'Grafana': ['Grafana Dashboards'],
  'ELK Stack': ['Elastic Stack', 'Elasticsearch Logstash Kibana'],
  'Git': ['Git Version Control'],
  'GitHub': ['Git Hub'],
  'GitLab': ['Git Lab'],
  'Bitbucket': ['Bit Bucket'],
  'TensorFlow': ['Tensor Flow'],
  'PyTorch': ['Py Torch'],
  'Scikit-learn': ['Sklearn', 'Scikit Learn'],
  'Pandas': ['Python Pandas'],
  'NumPy': ['Numpy'],
  'Jupyter': ['Jupyter Notebook'],
  'Apache Spark': ['Spark'],
  'Hadoop': ['Apache Hadoop'],
  'Tableau': ['Tableau Software'],
  'Power BI': ['PowerBI'],
  'Looker': ['Google Looker'],
  'Apache Kafka': ['Kafka'],
  'Apache Airflow': ['Airflow'],
  'React Native': ['ReactNative'],
  'Flutter': ['Flutter SDK'],
  'iOS Development': ['iOS', 'iOS Apps'],
  'Android Development': ['Android', 'Android Apps'],
  'Xamarin': ['Xamarin Forms'],
  'Cordova/PhoneGap': ['Cordova', 'PhoneGap']
};

const canonicalSkills: CanonicalSkillMeta[] = [];
const aliasLookup = new Map<string, CanonicalSkillMeta>();

/**
 * Normalize skill strings to enable consistent lookups.
 */
export function normalizeSkillName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.(js|ts)$/g, '$1')
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/&/g, 'and')
    .replace(/@/g, 'at')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lightweight title case helper for fallback canonical labels.
 */
function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildKeywords(label: string, manualSynonyms: string[]): string[] {
  const keywords = new Set<string>();

  // Add manual synonyms
  manualSynonyms.forEach((synonym) => keywords.add(synonym));

  // Add automatic splits for delimiters
  label
    .split(/[/(),-]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      keywords.add(segment);
      keywords.add(segment.replace(/\s+/g, ''));
    });

  // Add condensed forms
  keywords.add(label.replace(/\s+/g, ''));

  return Array.from(keywords);
}

// Build canonical skill taxonomy with synonym lookups
Object.entries(TECHNICAL_SKILLS).forEach(([category, skills]) => {
  skills.forEach((skill) => {
    const normalized = normalizeSkillName(skill);
    const manualSynonyms = MANUAL_SYNONYM_SOURCE[skill] ?? [];
    const keywords = buildKeywords(skill, manualSynonyms);

    const meta: CanonicalSkillMeta = {
      name: skill,
      normalized,
      category,
      synonyms: manualSynonyms,
      keywords
    };

    canonicalSkills.push(meta);
    aliasLookup.set(normalized, meta);
    keywords.forEach((keyword) => {
      aliasLookup.set(normalizeSkillName(keyword), meta);
    });
  });
});

/**
 * Retrieve canonical metadata for a skill-like input.
 */
export function getCanonicalSkillMeta(skill: string): CanonicalSkillMeta | null {
  if (!skill) return null;
  return aliasLookup.get(normalizeSkillName(skill)) ?? null;
}

/**
 * Resolve a skill into its canonical label (falls back to title case).
 */
export function resolveCanonicalSkillName(skill: string): string {
  if (!skill) return '';
  const meta = getCanonicalSkillMeta(skill);
  return meta?.name ?? toTitleCase(skill);
}

/**
 * Get category for a skill using the canonical taxonomy.
 */
export function getSkillCategory(skill: string): string {
  return getCanonicalSkillMeta(skill)?.category ?? 'Other';
}

/**
 * Return user-facing synonyms for a canonical skill.
 */
export function getSkillSynonyms(skill: string): string[] {
  const meta = getCanonicalSkillMeta(skill);
  if (!meta) return [];

  const canonicalLower = meta.name.toLowerCase();
  return meta.synonyms
    .map((synonym) => synonym.trim())
    .filter((synonym) => synonym.toLowerCase() !== canonicalLower);
}

/**
 * Map a list of skills to canonical labels while preserving order and removing duplicates.
 */
export function mapSkillsToCanonical(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  skills.forEach((skill) => {
    if (!skill) {
      return;
    }
    const meta = getCanonicalSkillMeta(skill);
    const normalizedKey = meta?.normalized ?? normalizeSkillName(skill);
    if (seen.has(normalizedKey)) {
      return;
    }
    seen.add(normalizedKey);
    result.push(meta?.name ?? toTitleCase(skill));
  });

  return result;
}

/**
 * Provide options suitable for the onboarding multi-select component.
 */
export function buildSkillOptionList(): Array<{
  value: string;
  label: string;
  category: string;
  keywords: string[];
}> {
  return canonicalSkills.map((meta) => ({
    value: meta.name,
    label: meta.name,
    category: meta.category,
    keywords: meta.keywords
  }));
}

/**
 * Expose the canonical taxonomy for diagnostics or analytics.
 */
export const CANONICAL_SKILL_TAXONOMY: CanonicalSkillMeta[] = canonicalSkills;
