// src/services/hackathonFeatureService.ts
// Persistent feature extraction for hackathon recommendation quality.

import type { Json } from '@/types/supabase';
import type {
  HackathonCompetitionLevel,
  HackathonCommitmentLevel,
  HackathonDifficulty,
  HackathonFormat,
  HackathonPrizeTier,
  HackathonRecommendationFeatures,
  HackathonTeamMode,
} from '@/types/hackathon';

export const HACKATHON_FEATURE_VERSION = 2;

export interface HackathonFeatureInput {
  title: string;
  description?: string | null;
  isVirtual?: boolean | null;
  formatHint?: string | null;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  soloAllowed?: boolean | null;
  prizePool?: string | null;
  expectedParticipants?: number | null;
  durationHours?: number | null;
  eligibilityText?: string | null;
  tags?: string[];
  tracks?: string[];
  sponsors?: string[];
  requirements?: string[];
  prizeCategories?: string[];
  providedApis?: string[];
  prizes?: any[] | null;
}

export interface HackathonPayloadSignals {
  sourceTags: string[];
  tracks: string[];
  sponsors: string[];
  requirements: string[];
  prizeCategories: string[];
  providedApis: string[];
  expectedParticipants: number | null;
  durationHours: number | null;
  eligibilityText: string | null;
  minTeamSize: number | null;
  maxTeamSize: number | null;
  soloAllowed: boolean | null;
}

const TAG_KEYWORDS: Record<string, string[]> = {
  ai: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'llm', 'nlp', 'generative', 'gpt', 'neural'],
  'web-development': ['web', 'frontend', 'backend', 'full-stack', 'fullstack', 'react', 'next.js', 'javascript', 'typescript', 'html', 'css', 'api'],
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'app'],
  blockchain: ['blockchain', 'web3', 'crypto', 'defi', 'solidity', 'ethereum', 'nft', 'smart contract'],
  'data-science': ['data', 'analytics', 'big data', 'data science', 'visualization', 'pandas', 'sql'],
  cloud: ['cloud', 'aws', 'azure', 'gcp', 'serverless', 'saas'],
  devops: ['devops', 'ci cd', 'docker', 'kubernetes', 'terraform', 'infrastructure'],
  cybersecurity: ['security', 'cybersecurity', 'ctf', 'infosec', 'encryption', 'vulnerability'],
  iot: ['iot', 'internet of things', 'embedded', 'hardware', 'sensor', 'arduino', 'raspberry'],
  gaming: ['game', 'gaming', 'unity', 'unreal', 'gamedev'],
  fintech: ['fintech', 'finance', 'banking', 'payment', 'trading'],
  healthtech: ['health', 'healthcare', 'medical', 'biotech', 'wellness', 'clinical'],
  edtech: ['education', 'edtech', 'learning', 'teaching', 'student'],
  sustainability: ['sustainability', 'climate', 'green', 'environment', 'clean energy', 'carbon'],
  'open-source': ['open source', 'opensource', 'oss', 'foss', 'contributing'],
  'ar-vr': ['ar', 'vr', 'xr', 'augmented reality', 'virtual reality', 'metaverse', '3d'],
  'social-impact': ['social impact', 'nonprofit', 'civic', 'community', 'accessibility', 'inclusion'],
  design: ['design', 'ui', 'ux', 'figma', 'prototype'],
  robotics: ['robot', 'robotics', 'automation', 'drone'],
  startup: ['startup', 'pitch', 'business', 'mvp', 'venture', 'entrepreneurship'],
};

const THEME_KEYWORDS: Record<string, string[]> = {
  ai: ['ai', 'artificial intelligence', 'machine learning', 'llm'],
  web: ['web', 'frontend', 'backend', 'full-stack'],
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter'],
  blockchain: ['blockchain', 'web3', 'crypto', 'defi'],
  fintech: ['fintech', 'finance', 'banking', 'payments'],
  healthtech: ['health', 'healthcare', 'medical', 'biotech'],
  edtech: ['education', 'edtech', 'learning'],
  sustainability: ['sustainability', 'climate', 'green', 'environment'],
  gaming: ['gaming', 'game dev', 'unity', 'unreal'],
  cloud: ['cloud', 'aws', 'azure', 'gcp', 'serverless'],
  cybersecurity: ['cybersecurity', 'security', 'ctf'],
  'social-impact': ['social impact', 'nonprofit', 'civic tech', 'accessibility'],
  startup: ['startup', 'entrepreneurship', 'business', 'pitch'],
};

const KNOWN_TECH_TERMS = [
  'react',
  'next.js',
  'typescript',
  'javascript',
  'python',
  'node.js',
  'java',
  'go',
  'rust',
  'swift',
  'kotlin',
  'flutter',
  'react native',
  'sql',
  'postgres',
  'mongodb',
  'docker',
  'kubernetes',
  'aws',
  'azure',
  'gcp',
  'tensorflow',
  'pytorch',
  'solidity',
  'ethereum',
  'openai',
];

const SPONSOR_DOMAIN_MAP: Record<string, string> = {
  google: 'big-tech',
  microsoft: 'big-tech',
  meta: 'big-tech',
  amazon: 'big-tech',
  apple: 'big-tech',
  github: 'dev-tools',
  gitlab: 'dev-tools',
  vercel: 'cloud',
  netlify: 'cloud',
  cloudflare: 'cloud',
  aws: 'cloud',
  azure: 'cloud',
  gcp: 'cloud',
  openai: 'ai',
  anthropic: 'ai',
  'hugging face': 'ai',
  stripe: 'fintech',
  'capital one': 'fintech',
  visa: 'fintech',
  mastercard: 'fintech',
  coinbase: 'blockchain',
  solana: 'blockchain',
  ethereum: 'blockchain',
  twilio: 'communications',
  datadog: 'observability',
  snowflake: 'data-platform',
};

function normalizeFeatureText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]+/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeTag(tag: string): string {
  return normalizeFeatureText(tag).replace(/\s+/g, '-');
}

function containsWholePhrase(haystack: string, phrase: string): boolean {
  const needle = normalizeFeatureText(phrase);
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = value.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return [...set];
}

function readStringList(value: unknown, keys: string[] = ['name', 'value', 'title']): string[] {
  if (!Array.isArray(value)) return [];

  const items: string[] = [];
  for (const item of value) {
    const direct = asString(item);
    if (direct) {
      items.push(direct);
      continue;
    }

    const obj = asRecord(item);
    if (!obj) continue;

    for (const key of keys) {
      const candidate = asString(obj[key]);
      if (candidate) items.push(candidate);
    }
  }

  return uniqueStrings(items);
}

function inferPrizeTier(prizePool?: string | null, prizes?: any[] | null): HackathonPrizeTier {
  if (prizePool) {
    const amountMatch = prizePool.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      const value = Number(amountMatch[1]);
      if (Number.isFinite(value)) {
        if (value >= 25000) return 'high';
        if (value >= 5000) return 'medium';
        if (value > 0) return 'low';
      }
    }
  }

  if (prizes && Array.isArray(prizes) && prizes.length > 0) {
    // Basic heuristic: if there are multiple prizes or a high value prize
    let totalValue = 0;
    for (const p of prizes) {
      if (p.type === 'cash' && p.value) {
        const val = parseFloat(p.value.replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) totalValue += val;
      }
    }
    if (totalValue >= 25000) return 'high';
    if (totalValue >= 5000) return 'medium';
    if (totalValue > 0) return 'low';
  }

  return prizePool ? 'unknown' : 'none';
}

function inferDifficulty(signalText: string): HackathonDifficulty {
  const beginnerSignals = [
    'beginner',
    'no prior experience',
    'first time',
    'all skill levels',
    'newcomer',
    'student friendly',
  ];
  const intermediateSignals = ['intermediate', 'some experience', 'working knowledge'];
  const advancedSignals = ['advanced', 'expert', 'production ready', 'prior experience required'];

  const hasBeginner = beginnerSignals.some((phrase) => containsWholePhrase(signalText, phrase));
  const hasIntermediate = intermediateSignals.some((phrase) => containsWholePhrase(signalText, phrase));
  const hasAdvanced = advancedSignals.some((phrase) => containsWholePhrase(signalText, phrase));

  if ((hasBeginner && hasAdvanced) || (hasIntermediate && (hasBeginner || hasAdvanced))) return 'mixed';
  if (hasAdvanced) return 'advanced';
  if (hasIntermediate) return 'intermediate';
  if (hasBeginner) return 'beginner';
  return 'unknown';
}

function inferCommitmentLevel(hours: number | null): HackathonCommitmentLevel {
  if (!hours || hours <= 0) return 'unknown';
  if (hours <= 24) return 'low';
  if (hours <= 72) return 'medium';
  return 'high';
}

function inferFormat(isVirtual?: boolean | null, formatHint?: string | null): HackathonFormat {
  const normalized = normalizeFeatureText(formatHint || '');
  if (normalized.includes('hybrid')) return 'hybrid';
  if (normalized.includes('virtual') || normalized.includes('online') || isVirtual === true) return 'virtual';
  if (normalized.includes('in person') || normalized.includes('inperson') || isVirtual === false) return 'in-person';
  return 'unknown';
}

function inferTeamMode(
  minTeamSize?: number | null,
  maxTeamSize?: number | null,
  soloAllowed?: boolean | null
): HackathonTeamMode {
  if (maxTeamSize && maxTeamSize > 0) {
    if (maxTeamSize <= 1 || (soloAllowed && maxTeamSize <= 2 && (minTeamSize || 1) <= 1)) return 'solo';
    if (maxTeamSize <= 3) return 'small';
    if (maxTeamSize <= 6) return 'medium';
    return 'large';
  }
  if (soloAllowed === true) return 'solo';
  return 'unknown';
}

function inferCompetitionLevel(
  expectedParticipants: number | null,
  prizeTier: HackathonPrizeTier
): HackathonCompetitionLevel {
  if (expectedParticipants && expectedParticipants > 0) {
    if (expectedParticipants >= 500) return 'high';
    if (expectedParticipants >= 120) return 'medium';
    return 'low';
  }
  if (prizeTier === 'high') return 'high';
  if (prizeTier === 'medium') return 'medium';
  if (prizeTier === 'low') return 'low';
  return 'unknown';
}

function inferSponsorDomains(sponsors: string[]): string[] {
  const domains = new Set<string>();
  for (const sponsor of sponsors) {
    const normalized = normalizeFeatureText(sponsor);
    for (const [key, domain] of Object.entries(SPONSOR_DOMAIN_MAP)) {
      if (containsWholePhrase(normalized, key) || normalized.includes(key)) {
        domains.add(domain);
      }
    }
  }
  return [...domains];
}

function inferThemeMatches(signalText: string): string[] {
  const themes = new Set<string>();
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((kw) => containsWholePhrase(signalText, kw))) {
      themes.add(theme);
    }
  }
  return [...themes];
}

function inferRequiredTech(
  signalText: string,
  providedApis: string[],
  requirements: string[]
): string[] {
  const requiredTech = new Set<string>();

  for (const tech of KNOWN_TECH_TERMS) {
    if (containsWholePhrase(signalText, tech)) {
      requiredTech.add(normalizeTag(tech));
    }
  }

  for (const api of [...providedApis, ...requirements]) {
    const normalized = normalizeTag(api);
    if (normalized) {
      requiredTech.add(normalized);
    }
  }

  return [...requiredTech];
}

function inferBeginnerFriendly(signalText: string, difficulty: HackathonDifficulty): boolean | null {
  if (difficulty === 'beginner') return true;
  if (difficulty === 'advanced') return false;
  if (containsWholePhrase(signalText, 'beginner friendly') || containsWholePhrase(signalText, 'newcomers welcome')) {
    return true;
  }
  return null;
}

export function extractTagsFromText(title: string, description?: string | null): string[] {
  const text = normalizeFeatureText([title, description || ''].join(' '));
  if (!text) return [];

  const tags = new Set<string>();
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((keyword) => containsWholePhrase(text, keyword))) {
      tags.add(tag);
    }
  }
  return [...tags];
}

export function mergeStoredAndExtractedTags(
  existingTags: string[] | null | undefined,
  title: string,
  description?: string | null,
  sourceTags: string[] = []
): string[] {
  const merged = new Set<string>();

  for (const tag of [...(existingTags || []), ...sourceTags]) {
    const normalized = normalizeTag(tag);
    if (normalized) merged.add(normalized);
  }

  extractTagsFromText(title, description).forEach((tag) => merged.add(tag));

  return [...merged];
}

export function extractFeatureSignalsFromPayload(payload: Record<string, unknown>): HackathonPayloadSignals {
  const requirementsObj = asRecord(payload.requirements);
  const prizesObj = asRecord(payload.prizes);
  const resourcesObj = asRecord(payload.resources);
  const metadataObj = asRecord(payload.metadata);

  const sourceTags = readStringList(payload.tags);
  const tracks = readStringList(payload.tracks, ['name', 'description', 'prize', 'value']);
  const sponsors = readStringList(payload.sponsors, ['name', 'description', 'value']);
  const prizeCategories = readStringList(prizesObj?.tiers, ['place', 'prize', 'sponsor', 'value']);

  const requiredTools = readStringList(requirementsObj?.required_tools);
  const prerequisites = asString(requirementsObj?.prerequisites);
  const requirementNotes = uniqueStrings([
    ...requiredTools,
    prerequisites,
    asString(requirementsObj?.eligibility),
  ]);

  const providedApis = readStringList(resourcesObj?.provided_apis, ['name', 'provider', 'description', 'value']);

  return {
    sourceTags,
    tracks,
    sponsors,
    requirements: requirementNotes,
    prizeCategories,
    providedApis,
    expectedParticipants: asNumber(metadataObj?.expected_participants),
    durationHours: asNumber(metadataObj?.duration_hours),
    eligibilityText: asString(requirementsObj?.eligibility),
    minTeamSize: asNumber(requirementsObj?.team_size_min),
    maxTeamSize: asNumber(requirementsObj?.team_size_max),
    soloAllowed: asBoolean(requirementsObj?.solo_allowed),
  };
}

export function buildRecommendationFeatures(input: HackathonFeatureInput): HackathonRecommendationFeatures {
  const description = input.description || '';
  const tracks = uniqueStrings(input.tracks || []);
  const sponsors = uniqueStrings(input.sponsors || []);
  const requirements = uniqueStrings(input.requirements || []);
  const prizeCategories = uniqueStrings(input.prizeCategories || []);
  const providedApis = uniqueStrings(input.providedApis || []);
  const tags = uniqueStrings(input.tags || []);

  const signalText = normalizeFeatureText([
    input.title,
    description,
    ...tags,
    ...tracks,
    ...requirements,
    ...prizeCategories,
    ...providedApis,
    input.eligibilityText || '',
  ].join(' '));
  
  const prizeTier = inferPrizeTier(input.prizePool, input.prizes);
  const difficulty = inferDifficulty(signalText);
  const commitmentHours = input.durationHours && input.durationHours > 0 ? Math.round(input.durationHours) : null;
  const commitmentLevel = inferCommitmentLevel(commitmentHours);
  const format = inferFormat(input.isVirtual, input.formatHint);
  const teamMode = inferTeamMode(input.minTeamSize, input.maxTeamSize, input.soloAllowed);
  const sponsorDomains = inferSponsorDomains(sponsors);
  const themes = inferThemeMatches(signalText);
  const requiredTech = inferRequiredTech(signalText, providedApis, requirements);
  const competitionLevel = inferCompetitionLevel(input.expectedParticipants || null, prizeTier);
  const beginnerFriendly = inferBeginnerFriendly(signalText, difficulty);

  return {
    themes,
    requiredTech,
    sponsorDomains,
    difficulty,
    commitmentHours,
    commitmentLevel,
    format,
    teamMode,
    prizeTier,
    expectedParticipants: input.expectedParticipants || null,
    competitionLevel,
    beginnerFriendly,
    eligibilityText: input.eligibilityText || null,
    featureVersion: HACKATHON_FEATURE_VERSION,
  };
}

export function serializeRecommendationFeatures(
  features: HackathonRecommendationFeatures
): Json {
  return features as unknown as Json;
}
