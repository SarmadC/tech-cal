import { SKILL_CATEGORIES } from '@/data/skillsData';

export interface SkillDefinition {
  id: string;
  name: string;
  synonyms: string[];
  categories: string[];
}

interface InternalSkillDefinition {
  id: string;
  name: string;
  synonyms: Set<string>;
  categories: Set<string>;
}

const ADDITIONAL_SYNONYMS: Record<string, string[]> = {
  github: ['github', 'github universe', 'github summit', 'github enterprise'],
  'github-actions': ['github actions', 'actions workflow', 'actions workflows']
};

function slugifySkill(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

const definitionMap = new Map<string, InternalSkillDefinition>();
const synonymLookup = new Map<string, string>();

for (const category of SKILL_CATEGORIES) {
  for (const skillName of category.skills) {
    const id = slugifySkill(skillName);
    const normalized = skillName.trim().toLowerCase();
    let entry = definitionMap.get(id);
    if (!entry) {
      entry = {
        id,
        name: skillName,
        synonyms: new Set<string>(),
        categories: new Set<string>()
      };
      definitionMap.set(id, entry);
    }
    entry.synonyms.add(normalized);
    entry.categories.add(category.id);
    synonymLookup.set(normalized, id);
  }
}

for (const [id, synonyms] of Object.entries(ADDITIONAL_SYNONYMS)) {
  let entry = definitionMap.get(id);
  if (!entry) {
    entry = {
      id,
      name: id,
      synonyms: new Set<string>(),
      categories: new Set<string>()
    };
    definitionMap.set(id, entry);
  }
  const target = entry;
  synonyms.forEach((syn) => {
    const normalized = syn.trim().toLowerCase();
    target.synonyms.add(normalized);
    synonymLookup.set(normalized, id);
  });
}

export const SKILL_DEFINITIONS: SkillDefinition[] = Array.from(definitionMap.values()).map(
  (entry) => ({
    id: entry.id,
    name: entry.name,
    synonyms: Array.from(entry.synonyms),
    categories: Array.from(entry.categories)
  })
);

export function resolveSkillIds(skills: string[]): string[] {
  const ids = new Set<string>();
  for (const raw of skills) {
    const normalized = raw.trim().toLowerCase();
    const direct = synonymLookup.get(normalized);
    if (direct) {
      ids.add(direct);
      continue;
    }
    const slug = slugifySkill(raw);
    if (slug && definitionMap.has(slug)) {
      ids.add(slug);
    }
  }
  return Array.from(ids);
}

function matchesWholeWord(text: string, keyword: string): boolean {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasNonWordChars = /[^a-zA-Z0-9\s]/.test(keyword);
  if (hasNonWordChars) {
    const regex = new RegExp(`(?:^|\\s|\\b)${escapedKeyword}(?=\\s|\\b|$)`, 'i');
    return regex.test(text);
  }
  const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
  return regex.test(text);
}

export function matchSkillIdsInText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matches = new Set<string>();

  SKILL_DEFINITIONS.forEach((definition) => {
    for (const synonym of definition.synonyms) {
      if (!synonym) continue;
      if (synonym.includes(' ')) {
        if (lower.includes(synonym)) {
          matches.add(definition.id);
          break;
        }
      } else if (matchesWholeWord(lower, synonym)) {
        matches.add(definition.id);
        break;
      }
    }
  });

  return Array.from(matches);
}

export function getSkillDefinition(id: string): SkillDefinition | undefined {
  const entry = definitionMap.get(id);
  if (!entry) return undefined;
  return {
    id: entry.id,
    name: entry.name,
    synonyms: Array.from(entry.synonyms),
    categories: Array.from(entry.categories)
  };
}

export function getSkillIdByName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  const direct = synonymLookup.get(normalized);
  if (direct) {
    return direct;
  }
  const slug = slugifySkill(name);
  return definitionMap.has(slug) ? slug : undefined;
}
