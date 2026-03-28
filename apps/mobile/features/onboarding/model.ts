import {
  normalizeOnboardingDraftData,
  type CareerOnboardingData,
  type MobileCareerOnboardingBootstrap,
  type OnboardingTaxonomyOption,
} from '@kurecal/domain';
import { GOAL_LABEL, ROLE_LABEL, SENIORITY_LABEL } from '@/features/onboarding/constants';
import type { RoleGroup, StepIndex, ValidationErrors } from '@/features/onboarding/types';

export function rolePayoffText(roleGroup: RoleGroup | null, role: string | undefined): string | null {
  if (!role || !roleGroup) {
    return null;
  }

  const roleSpecific: Record<string, string> = {
    'Software Engineer': "We'll prioritize product engineering, systems, and developer tooling events for you.",
    'Frontend Engineer': "We'll prioritize frontend, design systems, and app interface events for you.",
    'Backend Engineer': "We'll prioritize APIs, infrastructure, and backend systems events for you.",
    'Full Stack Engineer': "We'll prioritize product engineering, web, and full-stack build events for you.",
    'Data Analyst': "We'll prioritize analytics, BI, and data tooling events for you.",
    'Data Engineer': "We'll prioritize pipelines, platforms, and data infrastructure events for you.",
    'Data Scientist': "We'll prioritize modeling, experimentation, and applied AI events for you.",
    'ML Engineer': "We'll prioritize ML systems, deployment, and model platform events for you.",
    'Product Manager': "We'll prioritize product strategy, growth, and cross-functional leadership events for you.",
    'Product Designer': "We'll prioritize product design, UX systems, and research events for you.",
  };

  if (roleSpecific[role]) {
    return roleSpecific[role];
  }

  const groupFallback: Record<string, string> = {
    engineering: "We'll prioritize engineering, systems, and product build events for you.",
    data: "We'll prioritize analytics, AI, and data platform events for you.",
    product: "We'll prioritize product strategy, growth, and roadmap events for you.",
    design: "We'll prioritize UX, research, and design systems events for you.",
    leadership: "We'll prioritize hiring, execution, and team leadership events for you.",
  };

  return groupFallback[roleGroup.key] ?? null;
}

export function mergeOnboardingDrafts(
  remoteDraft: Partial<CareerOnboardingData>,
  localDraft: Partial<CareerOnboardingData> | null
): Partial<CareerOnboardingData> {
  if (!localDraft) {
    return normalizeOnboardingDraftData(remoteDraft);
  }

  return normalizeOnboardingDraftData({
    ...remoteDraft,
    ...localDraft,
    ...(remoteDraft.step1_role || localDraft.step1_role
      ? {
          step1_role: {
            ...remoteDraft.step1_role,
            ...localDraft.step1_role,
          },
        }
      : {}),
    ...(remoteDraft.step2_skills || localDraft.step2_skills
      ? {
          step2_skills: {
            ...remoteDraft.step2_skills,
            ...localDraft.step2_skills,
          },
        }
      : {}),
    ...(remoteDraft.step3_goals || localDraft.step3_goals
      ? {
          step3_goals: {
            ...remoteDraft.step3_goals,
            ...localDraft.step3_goals,
          },
        }
      : {}),
    ...(remoteDraft.step4_preferences || localDraft.step4_preferences
      ? {
          step4_preferences: {
            ...remoteDraft.step4_preferences,
            ...localDraft.step4_preferences,
          },
        }
      : {}),
    ...(remoteDraft.step5_networking || localDraft.step5_networking
      ? {
          step5_networking: {
            ...remoteDraft.step5_networking,
            ...localDraft.step5_networking,
          },
        }
      : {}),
    ...(remoteDraft.step6_teamBuilding || localDraft.step6_teamBuilding
      ? {
          step6_teamBuilding: {
            ...remoteDraft.step6_teamBuilding,
            ...localDraft.step6_teamBuilding,
          },
        }
      : {}),
  } as Partial<CareerOnboardingData>);
}

export function getRoleSuggestions(
  bootstrap: MobileCareerOnboardingBootstrap | null,
  type: 'current' | 'learn',
  role: string | undefined
): string[] {
  if (!bootstrap || !role) {
    return [];
  }

  return bootstrap.taxonomy.roleSuggestions[role]?.[type] ?? [];
}

export function toggleValue<T extends string>(current: T[] | undefined, value: T): T[] {
  const existing = current ?? [];
  return existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
}

export function taxonomyLabel(options: OnboardingTaxonomyOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function buildRoleGroups(roleTaxonomy: Record<string, string[]>): RoleGroup[] {
  const engineering = roleTaxonomy.Engineering ?? [];
  const data = roleTaxonomy['Data & AI'] ?? [];
  const productAndDesign = roleTaxonomy['Product & Design'] ?? [];
  const leadership = roleTaxonomy['Leadership & Strategy'] ?? [];

  const productRoles = productAndDesign.filter((role) =>
    /(Product|Program|Growth Marketer|Product Marketing)/i.test(role)
  );
  const designRoles = productAndDesign.filter((role) => !productRoles.includes(role));

  return [
    { key: 'engineering', label: 'Engineering', roles: engineering },
    { key: 'data', label: 'Data', roles: data },
    { key: 'product', label: 'Product', roles: productRoles },
    { key: 'design', label: 'Design', roles: designRoles },
    { key: 'leadership', label: 'Leadership', roles: leadership },
  ].filter((group) => group.roles.length > 0);
}

export function getInitialRoleCategory(
  roleGroups: RoleGroup[],
  draft: Partial<CareerOnboardingData>
): string | null {
  const currentRole = draft.step1_role?.currentRole;
  if (currentRole) {
    const initialCategory = roleGroups.find((group) => group.roles.includes(currentRole))?.key;
    if (initialCategory) {
      return initialCategory;
    }
  }

  return roleGroups[0]?.key ?? null;
}

export function addUniqueValue(
  currentValues: string[] | undefined,
  nextValue: string,
  options?: { limit?: number }
) {
  const normalized = nextValue.trim();
  if (!normalized) {
    return currentValues ?? [];
  }

  const next = Array.from(new Set([...(currentValues ?? []), normalized]));
  return options?.limit ? next.slice(0, options.limit) : next;
}

export function validateOnboardingStep(
  step: StepIndex,
  draft: Partial<CareerOnboardingData>
): ValidationErrors {
  const nextErrors: ValidationErrors = {};

  if (step === 1 && !draft.step1_role?.currentRole) {
    nextErrors.currentRole = `${ROLE_LABEL} is required.`;
  }

  if (step === 2 && !draft.step1_role?.seniority) {
    nextErrors.seniority = `${SENIORITY_LABEL} is required.`;
  }

  if (step === 3 && (draft.step2_skills?.primarySkills?.length ?? 0) < 2) {
    nextErrors.primarySkills = 'Add at least 2 topics you want to learn about.';
  }

  if (step === 4 && (draft.step3_goals?.careerGoals?.length ?? 0) === 0) {
    nextErrors.careerGoals = `${GOAL_LABEL} are required.`;
  }

  return nextErrors;
}
