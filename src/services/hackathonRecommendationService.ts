// src/services/hackathonRecommendationService.ts
// Multi-factor recommendation scoring for hackathon personalization.

import type {
  HackathonEvent,
  HackathonRecommendation,
  HackathonRecommendationFeatures,
  HackathonScoreBreakdown,
} from '@/types/hackathon';
import type { CareerProfile } from '@/types/career';
import { INTEREST_AREAS } from '@/types/career';
import { getHackathonDurationDays, isHackathonEnded } from '@/types/hackathon';
import { HACKATHON_FEATURE_VERSION, mergeStoredAndExtractedTags } from '@/services/hackathonFeatureService';

function toNonEmptyStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function sanitizePersistedFeatures(
  features: HackathonRecommendationFeatures | null | undefined
): HackathonRecommendationFeatures | null {
  if (!features || typeof features !== 'object') return null;

  const asRecord = features as unknown as Record<string, unknown>;
  const allowedDifficulty = ['beginner', 'intermediate', 'advanced', 'mixed', 'unknown'] as const;
  const allowedCommitment = ['low', 'medium', 'high', 'unknown'] as const;
  const allowedFormat = ['virtual', 'in-person', 'hybrid', 'unknown'] as const;
  const allowedTeamMode = ['solo', 'small', 'medium', 'large', 'unknown'] as const;
  const allowedPrizeTier = ['none', 'low', 'medium', 'high', 'unknown'] as const;
  const allowedCompetition = ['low', 'medium', 'high', 'unknown'] as const;

  const difficulty = typeof asRecord.difficulty === 'string' && allowedDifficulty.includes(asRecord.difficulty as (typeof allowedDifficulty)[number])
    ? asRecord.difficulty as HackathonRecommendationFeatures['difficulty']
    : 'unknown';
  const commitmentLevel = typeof asRecord.commitmentLevel === 'string' && allowedCommitment.includes(asRecord.commitmentLevel as (typeof allowedCommitment)[number])
    ? asRecord.commitmentLevel as HackathonRecommendationFeatures['commitmentLevel']
    : 'unknown';
  const format = typeof asRecord.format === 'string' && allowedFormat.includes(asRecord.format as (typeof allowedFormat)[number])
    ? asRecord.format as HackathonRecommendationFeatures['format']
    : 'unknown';
  const teamMode = typeof asRecord.teamMode === 'string' && allowedTeamMode.includes(asRecord.teamMode as (typeof allowedTeamMode)[number])
    ? asRecord.teamMode as HackathonRecommendationFeatures['teamMode']
    : 'unknown';
  const prizeTier = typeof asRecord.prizeTier === 'string' && allowedPrizeTier.includes(asRecord.prizeTier as (typeof allowedPrizeTier)[number])
    ? asRecord.prizeTier as HackathonRecommendationFeatures['prizeTier']
    : 'unknown';
  const competitionLevel = typeof asRecord.competitionLevel === 'string' && allowedCompetition.includes(asRecord.competitionLevel as (typeof allowedCompetition)[number])
    ? asRecord.competitionLevel as HackathonRecommendationFeatures['competitionLevel']
    : 'unknown';

  return {
    themes: toNonEmptyStringArray(asRecord.themes),
    requiredTech: toNonEmptyStringArray(asRecord.requiredTech ?? asRecord.technologies),
    sponsorDomains: toNonEmptyStringArray(asRecord.sponsorDomains),
    difficulty,
    commitmentHours: typeof asRecord.commitmentHours === 'number' && Number.isFinite(asRecord.commitmentHours) ? asRecord.commitmentHours : null,
    commitmentLevel,
    format,
    teamMode,
    prizeTier,
    expectedParticipants: typeof asRecord.expectedParticipants === 'number' && Number.isFinite(asRecord.expectedParticipants) ? asRecord.expectedParticipants : null,
    competitionLevel,
    beginnerFriendly: typeof asRecord.beginnerFriendly === 'boolean' ? asRecord.beginnerFriendly : null,
    eligibilityText: typeof asRecord.eligibilityText === 'string' ? asRecord.eligibilityText : null,
    featureVersion: typeof asRecord.featureVersion === 'number' && Number.isFinite(asRecord.featureVersion) ? asRecord.featureVersion : 0,
  };
}

const WEIGHTS = {
  skills: 0.25,
  interests: 0.20,
  learning: 0.20,
  format: 0.15,
  careerGoals: 0.10,
  difficulty: 0.10,
} as const;

const INTEREST_OVERRIDES: Partial<Record<(typeof INTEREST_AREAS)[number], string[]>> = {
  'Artificial Intelligence & Machine Learning': ['ai', 'ml', 'machine-learning', 'llm', 'deep-learning', 'nlp', 'generative'],
  'Web Development': ['frontend', 'backend', 'full-stack', 'react', 'next.js', 'javascript', 'typescript'],
  'Mobile Development': ['mobile', 'ios', 'android', 'react-native', 'flutter'],
  'Cloud Computing': ['cloud', 'aws', 'azure', 'gcp', 'serverless'],
  'DevOps & Infrastructure': ['devops', 'docker', 'kubernetes', 'terraform', 'ci-cd'],
  'Data Science & Analytics': ['data-science', 'analytics', 'big-data', 'sql'],
  'Cybersecurity': ['cybersecurity', 'security', 'ctf', 'infosec'],
  'Blockchain & Web3': ['blockchain', 'web3', 'crypto', 'solidity', 'defi'],
  'AR/VR': ['ar', 'vr', 'xr', 'augmented-reality', 'virtual-reality'],
  'IoT (Internet of Things)': ['iot', 'internet-of-things', 'embedded', 'hardware'],
  'Open Source': ['open-source', 'opensource', 'oss'],
};

function normalizeRecommendationToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9+.#/-]+/g, '-').replace(/-+/g, '-');
}

function toSignalSet(values: string[]): Set<string> {
  const set = new Set<string>();
  for (const value of values) {
    const normalized = normalizeRecommendationToken(value);
    if (normalized) set.add(normalized);
  }
  return set;
}

function buildInterestKeywords(label: string): string[] {
  const normalized = normalizeRecommendationToken(label);
  const pieces = normalized
    .replace(/[()]/g, ' ')
    .split(/[-/&]+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const compact = pieces.join('');
  return [...new Set([normalized, ...pieces, compact])];
}

const INTEREST_KEYWORDS: Record<string, string[]> = INTEREST_AREAS.reduce<Record<string, string[]>>((acc, area) => {
  const base = buildInterestKeywords(area);
  const overrides = (INTEREST_OVERRIDES[area] || []).map(normalizeRecommendationToken);
  acc[area] = [...new Set([...base, ...overrides])];
  return acc;
}, {});

function buildSearchableCorpus(tags: string[], description: string, features: HackathonRecommendationFeatures | null): string[] {
  const parts = [
    ...tags,
    description,
    ...(features?.themes || []),
    ...(features?.requiredTech || []),
    ...(features?.sponsorDomains || []),
    features?.eligibilityText || '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9+.#/\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return [...new Set(parts.map(normalizeRecommendationToken))];
}

function keywordMatchesTerm(keyword: string, term: string): boolean {
  if (!keyword || !term) return false;
  if (keyword === term) return true;

  // Short keywords (ai, ml, vr, ar) must be exact token matches.
  if (keyword.length <= 3 || term.length <= 3) {
    return false;
  }

  return term.includes(keyword) || keyword.includes(term);
}

function scoreSkillsMatch(
  primarySkills: string[],
  skillTagNames: string[],
  hackathonTags: string[],
  features: HackathonRecommendationFeatures | null
): { score: number; matchedSkills: string[] } {
  const signalSet = toSignalSet([
    ...hackathonTags,
    ...(features?.requiredTech || []),
    ...(features?.themes || []),
  ]);

  if (signalSet.size === 0) return { score: 30, matchedSkills: [] };

  const userSkills = [...new Set([
    ...primarySkills.map((skill) => skill.toLowerCase()),
    ...skillTagNames.map((skill) => skill.toLowerCase()),
  ])];

  if (userSkills.length === 0) return { score: 20, matchedSkills: [] };

  const signals = [...signalSet];
  const matchedSkills = userSkills.filter((skill) =>
    signals.some((signal) => signal.includes(skill) || skill.includes(signal))
  );

  const denominator = Math.min(userSkills.length, signals.length);
  const ratio = denominator > 0 ? matchedSkills.length / denominator : 0;

  return {
    score: Math.min(100, Math.round(ratio * 100)),
    matchedSkills,
  };
}

function scoreInterestsMatch(
  interests: string[],
  hackathonTags: string[],
  description: string,
  features: HackathonRecommendationFeatures | null
): { score: number; matchedInterests: string[] } {
  if (interests.length === 0) return { score: 30, matchedInterests: [] };

  const structuredSignals = toSignalSet([
    ...hackathonTags,
    ...(features?.themes || []),
    ...(features?.requiredTech || []),
    ...(features?.sponsorDomains || []),
  ]);

  const corpus = buildSearchableCorpus(hackathonTags, description, features).filter((term) => term.length >= 3);
  const matchedInterests: string[] = [];

  for (const interest of interests) {
    const keywords = INTEREST_KEYWORDS[interest] || buildInterestKeywords(interest);
    const matched = keywords.some((rawKeyword) => {
      const keyword = normalizeRecommendationToken(rawKeyword);
      if (!keyword) return false;

      // Prefer structured signals for high precision.
      for (const signal of structuredSignals) {
        if (keywordMatchesTerm(keyword, signal)) return true;
      }

      // Description terms are noisier: only allow robust keyword-term matching.
      for (const term of corpus) {
        if (keywordMatchesTerm(keyword, term)) return true;
      }

      return false;
    });

    if (matched) matchedInterests.push(interest);
  }

  const ratio = matchedInterests.length / interests.length;
  return {
    score: Math.min(100, Math.round(ratio * 115)),
    matchedInterests,
  };
}

function scoreLearningOpportunity(
  skillsToLearn: string[],
  hackathonTags: string[],
  features: HackathonRecommendationFeatures | null
): { score: number; opportunities: string[] } {
  if (skillsToLearn.length === 0) return { score: 30, opportunities: [] };

  const signalSet = toSignalSet([
    ...hackathonTags,
    ...(features?.requiredTech || []),
    ...(features?.themes || []),
  ]);

  if (signalSet.size === 0) return { score: 30, opportunities: [] };

  const signals = [...signalSet];
  const opportunities = skillsToLearn.filter((skill) => {
    const normalized = normalizeRecommendationToken(skill);
    return signals.some((signal) => signal.includes(normalized) || normalized.includes(signal));
  });

  const ratio = opportunities.length / skillsToLearn.length;
  return {
    score: Math.min(100, Math.round(ratio * 120)),
    opportunities,
  };
}

function scoreFormatFit(
  availableTime: string,
  durationDays: number,
  features: HackathonRecommendationFeatures | null
): number {
  const commitment = features?.commitmentLevel || 'unknown';
  const format = features?.format || 'unknown';

  let base: number;
  switch (availableTime) {
    case 'very-limited':
      base = commitment === 'low' ? 95 : commitment === 'medium' ? 45 : commitment === 'high' ? 15 : durationDays <= 2 ? 90 : 40;
      break;
    case 'limited':
      base = commitment === 'low' ? 90 : commitment === 'medium' ? 60 : commitment === 'high' ? 25 : durationDays <= 3 ? 85 : 45;
      break;
    case 'moderate':
      base = commitment === 'low' ? 80 : commitment === 'medium' ? 85 : commitment === 'high' ? 50 : durationDays <= 7 ? 85 : 60;
      break;
    case 'flexible':
      base = commitment === 'low' ? 70 : commitment === 'medium' ? 85 : commitment === 'high' ? 75 : durationDays <= 14 ? 85 : 75;
      break;
    case 'dedicated':
      base = commitment === 'high' ? 95 : 90;
      break;
    default:
      base = 55;
      break;
  }

  if ((availableTime === 'very-limited' || availableTime === 'limited') && format === 'virtual') {
    base = Math.min(100, base + 10);
  }

  if (availableTime === 'very-limited' && format === 'in-person') {
    base = Math.max(0, base - 8);
  }

  return base;
}

function scoreCareerGoalAlignment(
  careerGoals: string[],
  seniority: string,
  hackathon: HackathonEvent,
  features: HackathonRecommendationFeatures | null
): number {
  if (careerGoals.length === 0) return 40;

  const prizeTier = features?.prizeTier || 'unknown';
  const competition = features?.competitionLevel || 'unknown';
  const themes = features?.themes || [];
  const sponsorDomains = features?.sponsorDomains || [];
  const requiredTech = features?.requiredTech || [];
  const isLarge = (hackathon.totalParticipants || 0) > 100;

  let total = 0;

  for (const goal of careerGoals) {
    let goalScore = 45;

    switch (goal) {
      case 'skill-development':
        goalScore = requiredTech.length > 0 ? 82 : 70;
        break;
      case 'career-advancement':
        goalScore = prizeTier === 'high' ? 90 : prizeTier === 'medium' ? 78 : prizeTier === 'low' ? 65 : 50;
        break;
      case 'networking':
        goalScore = competition === 'high' || isLarge ? 86 : competition === 'medium' ? 70 : 50;
        break;
      case 'entrepreneurship':
        goalScore = themes.includes('startup') ? 88 : sponsorDomains.includes('fintech') ? 78 : 55;
        break;
      case 'leadership-growth':
        goalScore = features?.teamMode === 'medium' || features?.teamMode === 'large' ? 74 : 56;
        break;
      case 'specialization':
        goalScore = themes.length > 0 && themes.length <= 2 ? 82 : themes.length > 2 ? 66 : 48;
        break;
      case 'generalization':
        goalScore = themes.length >= 3 ? 80 : 58;
        break;
      default:
        goalScore = 50;
        break;
    }

    if (['student', 'entry-level', 'junior'].includes(seniority)) {
      goalScore = Math.min(100, goalScore + 5);
    }

    total += goalScore;
  }

  return Math.round(total / careerGoals.length);
}

function scoreDifficultyFit(
  seniority: string,
  features: HackathonRecommendationFeatures | null
): number {
  const difficulty = features?.difficulty || 'unknown';
  const isJunior = ['student', 'entry-level', 'junior'].includes(seniority);
  const isMid = seniority === 'mid-level';

  let score = 55;

  if (difficulty === 'beginner') {
    score = isJunior ? 95 : isMid ? 72 : 58;
  } else if (difficulty === 'intermediate') {
    score = isJunior ? 70 : isMid ? 90 : 78;
  } else if (difficulty === 'advanced') {
    score = isJunior ? 32 : isMid ? 62 : 94;
  } else if (difficulty === 'mixed') {
    score = isJunior ? 68 : isMid ? 82 : 88;
  }

  if (isJunior && features?.beginnerFriendly) {
    score = Math.min(100, score + 6);
  }

  if (!isJunior && features?.eligibilityText) {
    const eligibility = features.eligibilityText.toLowerCase();
    if (eligibility.includes('students only') || eligibility.includes('student-only')) {
      score = Math.min(score, 25);
    }
  }

  return score;
}

function calculatePenalty(
  careerProfile: CareerProfile,
  features: HackathonRecommendationFeatures | null,
  matchedSkills: string[]
): number {
  if (!features) return 0;

  let penalty = 0;

  const eligibility = (features.eligibilityText || '').toLowerCase();
  const isJunior = ['student', 'entry-level', 'junior'].includes(careerProfile.seniority);
  if (!isJunior && (eligibility.includes('students only') || eligibility.includes('student-only'))) {
    penalty -= 40;
  }

  if (careerProfile.availableTime === 'very-limited' && features.commitmentLevel === 'high') {
    penalty -= 25;
  }
  if (careerProfile.availableTime === 'limited' && features.commitmentLevel === 'high') {
    penalty -= 15;
  }

  if (isJunior && features.difficulty === 'advanced' && matchedSkills.length === 0) {
    penalty -= 15;
  }

  return penalty;
}

function toTitleCase(value: string): string {
  return value
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildMatchReasons(
  breakdown: HackathonScoreBreakdown,
  matchedSkills: string[],
  matchedInterests: string[],
  learningOpportunities: string[],
  features: HackathonRecommendationFeatures | null,
  isJunior: boolean
): string[] {
  const reasons: string[] = [];

  if (breakdown.skills >= 60 && matchedSkills.length > 0) {
    reasons.push(`Matches: ${matchedSkills.slice(0, 2).map(toTitleCase).join(', ')}`);
  }

  if (breakdown.interests >= 60 && reasons.length < 3) {
    if (features && features.themes.length > 0) {
      reasons.push(`${toTitleCase(features.themes[0])} focus`);
    } else if (matchedInterests.length > 0) {
      reasons.push(`${matchedInterests[0].replace(/\s*\(.*\)/, '')} fit`);
    } else {
      reasons.push('Aligns with your interests');
    }
  }

  if (breakdown.learning >= 60 && learningOpportunities.length > 0 && reasons.length < 3) {
    reasons.push(`Learn: ${learningOpportunities.slice(0, 2).map(toTitleCase).join(', ')}`);
  }

  if (isJunior && features?.beginnerFriendly && reasons.length < 3) {
    reasons.push('Beginner-friendly');
  }

  if (breakdown.format >= 75 && reasons.length < 3) {
    reasons.push('Great time fit');
  }

  if (breakdown.careerGoals >= 70 && reasons.length < 3) {
    reasons.push('Career-aligned');
  }

  return reasons.slice(0, 3);
}

export function getRecommendedHackathons(
  hackathons: HackathonEvent[],
  careerProfile: CareerProfile,
  limit = 5
): HackathonRecommendation[] {
  const candidates = hackathons.filter((hackathon) => {
    if (hackathon.status === 'cancelled' || hackathon.status === 'completed') return false;
    if (isHackathonEnded(hackathon)) return false;
    if (hackathon.userParticipation?.status === 'registered' || hackathon.userParticipation?.status === 'team_formed') return false;
    return true;
  });

  if (candidates.length === 0) return [];

  const skillTagNames = (careerProfile.skillTags || []).map((tag) => tag.skill);
  const isJunior = ['student', 'entry-level', 'junior'].includes(careerProfile.seniority);

  const scored: HackathonRecommendation[] = candidates.map((hackathon) => {
    const persistedVersion = Math.max(
      hackathon.featureVersion || 0,
      hackathon.recommendationFeatures?.featureVersion || 0
    );

    const hasPersistedV2 = persistedVersion >= HACKATHON_FEATURE_VERSION;
    const tags = hasPersistedV2
      ? (hackathon.tags || [])
      : mergeStoredAndExtractedTags(hackathon.tags || [], hackathon.title, hackathon.description);

    const features = hasPersistedV2
      ? sanitizePersistedFeatures(hackathon.recommendationFeatures || null)
      : null;
    const durationDays = getHackathonDurationDays(hackathon);

    const { score: skillsScore, matchedSkills } = scoreSkillsMatch(
      careerProfile.primarySkills,
      skillTagNames,
      tags,
      features
    );

    const { score: interestsScore, matchedInterests } = scoreInterestsMatch(
      careerProfile.interests,
      tags,
      hackathon.description,
      features
    );

    const { score: learningScore, opportunities } = scoreLearningOpportunity(
      careerProfile.skillsToLearn,
      tags,
      features
    );

    const formatScore = scoreFormatFit(careerProfile.availableTime, durationDays, features);
    const careerGoalsScore = scoreCareerGoalAlignment(
      careerProfile.careerGoals,
      careerProfile.seniority,
      hackathon,
      features
    );
    const difficultyScore = scoreDifficultyFit(careerProfile.seniority, features);

    const weighted =
      skillsScore * WEIGHTS.skills +
      interestsScore * WEIGHTS.interests +
      learningScore * WEIGHTS.learning +
      formatScore * WEIGHTS.format +
      careerGoalsScore * WEIGHTS.careerGoals +
      difficultyScore * WEIGHTS.difficulty;

    const overall = Math.max(0, Math.min(100, Math.round(weighted + calculatePenalty(careerProfile, features, matchedSkills))));

    const breakdown: HackathonScoreBreakdown = {
      skills: skillsScore,
      interests: interestsScore,
      learning: learningScore,
      format: formatScore,
      careerGoals: careerGoalsScore,
      difficulty: difficultyScore,
    };

    return {
      hackathonId: hackathon.id,
      hackathon,
      overall,
      breakdown,
      matchReasons: buildMatchReasons(breakdown, matchedSkills, matchedInterests, opportunities, features, isJunior),
      matchedSkills,
      learningOpportunities: opportunities,
    };
  });

  return scored
    .filter((recommendation) => recommendation.overall >= 35)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, limit);
}
