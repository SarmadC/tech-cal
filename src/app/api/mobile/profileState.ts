import type { User } from '@supabase/supabase-js';
import type {
  MobileCareerOnboardingData,
  MobileCareerProfileSummary,
  MobileProfileState,
} from '@kurecal/domain';

import { ROLE_TAXONOMY, type CareerProfile } from '@/types';
import { ProfileService } from '@/services/profileService';
import { CareerProfileService } from '@/services/careerProfileService';
import { SocialProfileService } from '@/services/socialProfileService';
import { fetchOnboardingTaxonomy } from '@/services/onboardingTaxonomyService';
import { getOnboardingStatus } from '@/utils/onboarding';
import type { AuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

function resolveDisplayName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : '';

  if (fullName) {
    return fullName;
  }

  const email = user.email?.trim();
  if (email) {
    return email.split('@')[0] || 'KureCal user';
  }

  return 'KureCal user';
}

function isProfileNotFound(error: unknown): boolean {
  return error instanceof Error && error.name === 'ProfileNotFoundError';
}

export async function ensureMobileProfile(
  authContext: AuthenticatedRequestContext,
  request: Request
) {
  try {
    return await ProfileService.getProfile(authContext.user.id, authContext.supabase);
  } catch (error) {
    if (!isProfileNotFound(error)) {
      throw error;
    }

    const metadata = authContext.user.user_metadata as Record<string, unknown> | undefined;
    const avatarUrl =
      typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;
    const timezone = request.headers.get('x-timezone')?.trim() || null;

    return ProfileService.createProfile(
      {
        id: authContext.user.id,
        fullName: resolveDisplayName(authContext.user),
        avatarUrl,
        timezone: timezone || undefined,
        preferences: {},
      },
      authContext.supabase
    );
  }
}

export function toMobileCareerProfileSummary(
  careerProfile: CareerProfile
): MobileCareerProfileSummary {
  return {
    currentRole: careerProfile.currentRole,
    seniority: careerProfile.seniority,
    industry: careerProfile.industry,
    primarySkills: careerProfile.primarySkills ?? [],
    skillsToLearn: careerProfile.skillsToLearn ?? [],
    interests: careerProfile.interests ?? [],
    careerGoals: careerProfile.careerGoals ?? [],
    timeframe: careerProfile.timeframe ?? null,
    learningStyle: careerProfile.learningStyle ?? [],
    networkingGoals: careerProfile.networkingGoals ?? [],
    preferredEventTypes: careerProfile.preferredEventTypes ?? [],
  };
}

export function toMobileCareerOnboardingData(
  careerProfile: CareerProfile
): MobileCareerOnboardingData {
  return {
    step1_role: {
      currentRole: careerProfile.currentRole,
      seniority: careerProfile.seniority,
      industry: careerProfile.industry ?? '',
      companySize: careerProfile.companySize ?? 'medium',
    },
    step2_skills: {
      primarySkills: careerProfile.primarySkills ?? [],
      skillsToLearn: careerProfile.skillsToLearn ?? [],
      interests: careerProfile.interests ?? [],
    },
    step3_goals: {
      careerGoals: careerProfile.careerGoals ?? [],
      timeframe: careerProfile.timeframe ?? 'medium-term',
    },
    step4_preferences: {
      targetPath: careerProfile.targetPath ?? '',
      learningStyle: careerProfile.learningStyle ?? [],
      availableTime: careerProfile.availableTime ?? 'moderate',
      budget: careerProfile.budget ?? 'moderate',
    },
    step5_networking: {
      networkingGoals: careerProfile.networkingGoals ?? [],
      preferredEventTypes: careerProfile.preferredEventTypes ?? [],
    },
    step6_teamBuilding: {
      teamRole: 'flexible',
      collaborationStyle: [],
      teamSizePreference: 'flexible',
      communicationPreferences: [],
      teamGoals: [],
      mentorshipPreference: 'neither',
      availabilityPattern: null,
      projectTypePreferences: [],
    },
  };
}

export async function buildMobileProfileState(
  authContext: AuthenticatedRequestContext,
  request: Request
): Promise<MobileProfileState> {
  const profile = await ensureMobileProfile(authContext, request);

  const [socialProfile, careerProfile, onboarding] = await Promise.all([
    SocialProfileService.getSocialProfile(authContext.user.id, authContext.supabase),
    CareerProfileService.getCareerProfile(authContext.user.id, authContext.supabase),
    getOnboardingStatus(authContext.supabase, authContext.user.id),
  ]);

  return {
    profile: {
      id: profile.id,
      email: authContext.user.email ?? null,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      timezone: profile.timezone,
    },
    socialProfile,
    onboarding,
    careerProfile: careerProfile
      ? toMobileCareerProfileSummary(careerProfile)
      : null,
  };
}

export async function buildMobileCareerOnboardingBootstrap(
  authContext: AuthenticatedRequestContext,
  request: Request
) {
  await ensureMobileProfile(authContext, request);

  const [careerProfile, onboardingStatus, taxonomy] = await Promise.all([
    CareerProfileService.getCareerProfile(authContext.user.id, authContext.supabase),
    getOnboardingStatus(authContext.supabase, authContext.user.id),
    fetchOnboardingTaxonomy(authContext.supabase),
  ]);

  return {
    status: onboardingStatus,
    initialData: careerProfile
      ? toMobileCareerOnboardingData(careerProfile)
      : null,
    taxonomy: {
      roleGroups: Object.entries(ROLE_TAXONOMY).map(([label, roles]) => ({
        key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label,
        roles,
      })),
      skillOptions: taxonomy.skillOptions.map((option) => ({
        value: option.value,
        label: option.label,
        category: option.category ?? null,
        description: null,
      })),
      interestOptions: taxonomy.interestOptions.map((option) => ({
        value: option.value,
        label: option.label,
        category: option.category ?? null,
        description: null,
      })),
      roleSuggestions: taxonomy.roleSuggestions,
    },
  };
}
