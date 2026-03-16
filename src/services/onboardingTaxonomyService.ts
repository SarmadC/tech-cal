import type { SupabaseClientType } from '@/types';
import { INTEREST_AREAS, ROLE_TAXONOMY } from '@/types/career';
import { getRoleMeta } from '@/utils/roleTaxonomy';
import {
  buildSkillOptionList,
  normalizeSkillName
} from '@/utils/skillTaxonomy';
import {
  getSkillsForRole,
  getSuggestedSkillsToLearn,
  normalizeForComparison
} from '@/utils/skillSuggestions';

export interface OnboardingTaxonomyOption {
  value: string;
  label: string;
  category?: string;
  keywords?: string[];
}

type SuggestionKind = 'current' | 'learn';

interface OnboardingSkillRow {
  name: string;
  category: string;
  sort_order: number;
  is_active: boolean;
}

interface OnboardingSkillAliasRow {
  skill_name: string;
  alias: string;
}

interface OnboardingInterestRow {
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface OnboardingRoleSuggestionRow {
  role: string;
  kind: SuggestionKind;
  skill_name: string;
  rank: number;
  is_active: boolean;
}

type RoleSuggestionMap = Record<string, Partial<Record<SuggestionKind, string[]>>>;

export interface OnboardingTaxonomyData {
  skillOptions: OnboardingTaxonomyOption[];
  interestOptions: OnboardingTaxonomyOption[];
  roleSuggestions: RoleSuggestionMap;
  source: 'fallback' | 'remote' | 'hybrid';
}

type MinimalSupabaseClient = Pick<SupabaseClientType, 'from'>;

const FALLBACK_INTEREST_OPTIONS: OnboardingTaxonomyOption[] = INTEREST_AREAS.map((interest) => ({
  value: interest,
  label: interest,
}));

const FALLBACK_ROLE_SUGGESTIONS: RoleSuggestionMap = Object.values(ROLE_TAXONOMY)
  .flat()
  .reduce<RoleSuggestionMap>((accumulator, role) => {
    accumulator[role] = {
      current: getSkillsForRole(role),
    };
    return accumulator;
  }, {});

const FALLBACK_TAXONOMY: OnboardingTaxonomyData = {
  skillOptions: buildSkillOptionList(),
  interestOptions: FALLBACK_INTEREST_OPTIONS,
  roleSuggestions: FALLBACK_ROLE_SUGGESTIONS,
  source: 'fallback',
};

function buildKeywordList(label: string, aliases: string[]): string[] {
  const keywords = new Set<string>();

  aliases.forEach((alias) => {
    const trimmedAlias = alias.trim();
    if (trimmedAlias) {
      keywords.add(trimmedAlias);
    }
  });

  label
    .split(/[/(),-]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      keywords.add(segment);
      keywords.add(segment.replace(/\s+/g, ''));
    });

  keywords.add(label.replace(/\s+/g, ''));

  return Array.from(keywords);
}

function createSkillValueLookup(skillOptions: OnboardingTaxonomyOption[]): Map<string, string> {
  const lookup = new Map<string, string>();

  skillOptions.forEach((option) => {
    const aliases = [option.value, option.label, ...(option.keywords ?? [])];
    aliases.forEach((alias) => {
      const normalizedAlias = normalizeSkillName(alias);
      if (normalizedAlias && !lookup.has(normalizedAlias)) {
        lookup.set(normalizedAlias, option.value);
      }
    });
  });

  return lookup;
}

function normalizeSuggestionValues(
  suggestions: string[],
  skillOptions: OnboardingTaxonomyOption[]
): string[] {
  const lookup = createSkillValueLookup(skillOptions);
  const seen = new Set<string>();
  const normalizedSuggestions: string[] = [];

  suggestions.forEach((suggestion) => {
    const trimmedSuggestion = suggestion.trim();
    if (!trimmedSuggestion) {
      return;
    }

    const canonicalValue =
      lookup.get(normalizeSkillName(trimmedSuggestion)) ?? trimmedSuggestion;
    const dedupeKey = normalizeForComparison(canonicalValue);

    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    normalizedSuggestions.push(canonicalValue);
  });

  return normalizedSuggestions;
}

function buildInterestOptionsFromRows(rows: OnboardingInterestRow[]): OnboardingTaxonomyOption[] {
  return rows
    .filter((row) => row.is_active)
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name))
    .map((row) => ({
      value: row.name,
      label: row.name,
    }));
}

function buildSkillOptionsFromRows(
  skillRows: OnboardingSkillRow[],
  aliasRows: OnboardingSkillAliasRow[]
): OnboardingTaxonomyOption[] {
  const aliasesBySkill = aliasRows.reduce<Map<string, string[]>>((accumulator, row) => {
    const existingAliases = accumulator.get(row.skill_name) ?? [];
    existingAliases.push(row.alias);
    accumulator.set(row.skill_name, existingAliases);
    return accumulator;
  }, new Map<string, string[]>());

  return skillRows
    .filter((row) => row.is_active)
    .sort((left, right) => {
      if (left.category === right.category) {
        return left.sort_order - right.sort_order || left.name.localeCompare(right.name);
      }
      return left.category.localeCompare(right.category);
    })
    .map((row) => ({
      value: row.name,
      label: row.name,
      category: row.category,
      keywords: buildKeywordList(row.name, aliasesBySkill.get(row.name) ?? []),
    }));
}

function buildRoleSuggestionsFromRows(
  rows: OnboardingRoleSuggestionRow[],
  skillOptions: OnboardingTaxonomyOption[]
): RoleSuggestionMap {
  const groupedRows = rows
    .filter((row) => row.is_active)
    .sort((left, right) => {
      if (left.role === right.role) {
        if (left.kind === right.kind) {
          return left.rank - right.rank || left.skill_name.localeCompare(right.skill_name);
        }
        return left.kind.localeCompare(right.kind);
      }
      return left.role.localeCompare(right.role);
    })
    .reduce<RoleSuggestionMap>((accumulator, row) => {
      const roleKey = getRoleMeta(row.role)?.role ?? row.role.trim();
      const roleEntry = accumulator[roleKey] ?? {};
      const existingValues = roleEntry[row.kind] ?? [];
      roleEntry[row.kind] = [...existingValues, row.skill_name];
      accumulator[roleKey] = roleEntry;
      return accumulator;
    }, {});

  Object.entries(groupedRows).forEach(([role, suggestionSet]) => {
    if (suggestionSet.current) {
      suggestionSet.current = normalizeSuggestionValues(suggestionSet.current, skillOptions);
    }
    if (suggestionSet.learn) {
      suggestionSet.learn = normalizeSuggestionValues(suggestionSet.learn, skillOptions);
    }
    groupedRows[role] = suggestionSet;
  });

  return groupedRows;
}

export function getFallbackOnboardingTaxonomy(): OnboardingTaxonomyData {
  return FALLBACK_TAXONOMY;
}

export function buildOnboardingTaxonomyData({
  skillRows,
  aliasRows,
  interestRows,
  roleSuggestionRows,
}: {
  skillRows: OnboardingSkillRow[];
  aliasRows: OnboardingSkillAliasRow[];
  interestRows: OnboardingInterestRow[];
  roleSuggestionRows: OnboardingRoleSuggestionRow[];
}): OnboardingTaxonomyData {
  const remoteSkillOptions = buildSkillOptionsFromRows(skillRows, aliasRows);
  const remoteInterestOptions = buildInterestOptionsFromRows(interestRows);
  const skillOptions = remoteSkillOptions.length > 0 ? remoteSkillOptions : FALLBACK_TAXONOMY.skillOptions;
  const interestOptions = remoteInterestOptions.length > 0 ? remoteInterestOptions : FALLBACK_TAXONOMY.interestOptions;
  const roleSuggestions = buildRoleSuggestionsFromRows(roleSuggestionRows, skillOptions);
  const hasRemoteRows =
    skillRows.length > 0 ||
    aliasRows.length > 0 ||
    interestRows.length > 0 ||
    roleSuggestionRows.length > 0;

  if (!hasRemoteRows) {
    return FALLBACK_TAXONOMY;
  }

  const hasFullRemoteDataset =
    remoteSkillOptions.length > 0 &&
    remoteInterestOptions.length > 0 &&
    Object.keys(roleSuggestions).length > 0;

  return {
    skillOptions,
    interestOptions,
    roleSuggestions,
    source: hasFullRemoteDataset ? 'remote' : 'hybrid',
  };
}

function resolveRoleKey(role?: string): string {
  if (!role) {
    return '';
  }

  return getRoleMeta(role)?.role ?? role.trim();
}

export function getCurrentSkillSuggestionsForRole(
  taxonomy: OnboardingTaxonomyData,
  role?: string
): string[] {
  const roleKey = resolveRoleKey(role);
  const remoteSuggestions = roleKey ? taxonomy.roleSuggestions[roleKey]?.current ?? [] : [];
  const fallbackSuggestions = getSkillsForRole(role);

  return normalizeSuggestionValues(
    remoteSuggestions.length > 0 ? remoteSuggestions : fallbackSuggestions,
    taxonomy.skillOptions
  );
}

export function getLearningSkillSuggestionsForRole(
  taxonomy: OnboardingTaxonomyData,
  currentSkills: string[],
  role?: string
): string[] {
  const normalizedCurrentSkills = new Set(currentSkills.map(normalizeForComparison));
  const roleKey = resolveRoleKey(role);
  const remoteSuggestions = roleKey ? taxonomy.roleSuggestions[roleKey]?.learn ?? [] : [];
  const rawSuggestions = remoteSuggestions.length > 0
    ? remoteSuggestions
    : getSuggestedSkillsToLearn(currentSkills, role);

  return normalizeSuggestionValues(rawSuggestions, taxonomy.skillOptions)
    .filter((suggestion) => !normalizedCurrentSkills.has(normalizeForComparison(suggestion)))
    .slice(0, 7);
}

export async function fetchOnboardingTaxonomy(
  supabaseClient: MinimalSupabaseClient | null
): Promise<OnboardingTaxonomyData> {
  if (!supabaseClient) {
    return FALLBACK_TAXONOMY;
  }

  const client = supabaseClient as unknown as {
    from: (table: string) => {
      select: (columns: string) => Promise<{ data: unknown[] | null; error: { message?: string } | null }>;
    };
  };

  const [
    skillResponse,
    aliasResponse,
    interestResponse,
    roleSuggestionResponse,
  ] = await Promise.all([
    client.from('onboarding_skills').select('name, category, sort_order, is_active'),
    client.from('onboarding_skill_aliases').select('skill_name, alias'),
    client.from('onboarding_interest_options').select('name, sort_order, is_active'),
    client.from('onboarding_role_skill_suggestions').select('role, kind, skill_name, rank, is_active'),
  ]);

  if (
    skillResponse.error ||
    aliasResponse.error ||
    interestResponse.error ||
    roleSuggestionResponse.error
  ) {
    return FALLBACK_TAXONOMY;
  }

  return buildOnboardingTaxonomyData({
    skillRows: (skillResponse.data as OnboardingSkillRow[] | null) ?? [],
    aliasRows: (aliasResponse.data as OnboardingSkillAliasRow[] | null) ?? [],
    interestRows: (interestResponse.data as OnboardingInterestRow[] | null) ?? [],
    roleSuggestionRows: (roleSuggestionResponse.data as OnboardingRoleSuggestionRow[] | null) ?? [],
  });
}
