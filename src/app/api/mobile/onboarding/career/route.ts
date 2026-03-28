import {
  ROLE_TAXONOMY,
  deriveOptionalSectionStatus,
  sanitizeOnboardingData,
  validateOnboardingData,
  type CareerOnboardingData,
  type CareerOptionalSectionSnoozes,
  type CareerOptionalSectionStatus,
  type CareerOptionalSectionTimestamps,
  type MobileCareerOnboardingCompletePayload,
  type MobileCareerOnboardingBootstrap,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { CareerProfileService } from '@/services/careerProfileService';
import { fetchOnboardingTaxonomy } from '@/services/onboardingTaxonomyService';
import { ProfileService } from '@/services/profileService';
import type { AppProfile, Json } from '@/types';

type PreferenceRecord = Record<string, unknown>;

const ROLE_TAXONOMY_MAP = Object.fromEntries(
  Object.entries(ROLE_TAXONOMY).map(([category, roles]) => [category, [...roles]])
);

function getTimezone(request: Request): string {
  return request.headers.get('x-timezone')?.trim() || 'UTC';
}

function getDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  if (fullName?.trim()) {
    return fullName.trim();
  }

  const emailLocalPart = user.email?.split('@')[0]?.trim();
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return 'User';
}

async function ensureProfile(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  supabase: Parameters<typeof ProfileService.getProfile>[1],
  request: Request
): Promise<AppProfile> {
  try {
    return await ProfileService.getProfile(user.id, supabase);
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'ProfileNotFoundError') {
      throw error;
    }
  }

  return ProfileService.createProfile(
    {
      id: user.id,
      fullName: getDisplayName(user),
      avatarUrl:
        typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
      timezone: getTimezone(request),
      preferences: {},
    },
    supabase
  );
}

function mapProfileToDraft(profile: AppProfile | null, careerProfile: Awaited<ReturnType<typeof CareerProfileService.getCareerProfile>>): Partial<CareerOnboardingData> {
  if (!careerProfile) {
    return {};
  }

  const teamBuildingPreferences = CareerProfileService.getTeamBuildingPreferences(profile);

  return {
    step1_role: {
      currentRole: careerProfile.currentRole,
      seniority: careerProfile.seniority,
      industry: careerProfile.industry,
      companySize: careerProfile.companySize,
    },
    step2_skills: {
      primarySkills: careerProfile.primarySkills,
      skillsToLearn: careerProfile.skillsToLearn,
      interests: careerProfile.interests,
      skillTags: teamBuildingPreferences?.skillProficiencies ?? careerProfile.skillTags,
    },
    step3_goals: {
      careerGoals: careerProfile.careerGoals,
      timeframe: careerProfile.timeframe,
    },
    step4_preferences: {
      targetPath: careerProfile.targetPath,
      learningStyle: careerProfile.learningStyle,
      availableTime: careerProfile.availableTime,
      budget: careerProfile.budget,
    },
    step5_networking: {
      networkingGoals: careerProfile.networkingGoals,
      preferredEventTypes: careerProfile.preferredEventTypes,
    },
    step6_teamBuilding: teamBuildingPreferences
      ? {
          teamRole: teamBuildingPreferences.teamRole,
          collaborationStyle: teamBuildingPreferences.collaborationStyle,
          teamSizePreference: teamBuildingPreferences.teamSizePreference,
          communicationPreferences: teamBuildingPreferences.communicationPreferences,
          teamGoals: teamBuildingPreferences.teamGoals,
          mentorshipPreference: teamBuildingPreferences.mentorshipPreference,
          availabilityPattern: teamBuildingPreferences.availabilityPattern,
          projectTypePreferences: teamBuildingPreferences.projectTypePreferences,
        }
      : undefined,
  };
}

function extractOptionalState(profile: AppProfile | null): {
  optionalSections: CareerOptionalSectionStatus | null;
  optionalSectionSnoozes: CareerOptionalSectionSnoozes | null;
  optionalSectionTimestamps: CareerOptionalSectionTimestamps | null;
  hasCompletedOnboarding: boolean;
} {
  const preferences = (profile?.preferences as PreferenceRecord | null) ?? null;
  return {
    optionalSections:
      (preferences?.careerOptionalSections as CareerOptionalSectionStatus | undefined) ?? null,
    optionalSectionSnoozes:
      (preferences?.careerOptionalSnoozes as CareerOptionalSectionSnoozes | undefined) ?? null,
    optionalSectionTimestamps:
      (preferences?.careerOptionalSectionTimestamps as CareerOptionalSectionTimestamps | undefined) ??
      null,
    hasCompletedOnboarding: Boolean(preferences?.careerOnboardingCompleted),
  };
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let profile: AppProfile | null = null;
    try {
      profile = await ProfileService.getProfile(user.id, supabase);
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'ProfileNotFoundError') {
        throw error;
      }
    }

    const [careerProfile, taxonomy] = await Promise.all([
      CareerProfileService.getCareerProfile(user.id, supabase),
      fetchOnboardingTaxonomy(supabase),
    ]);

    const optionalState = extractOptionalState(profile);
    const payload: MobileCareerOnboardingBootstrap = {
      hasCompletedOnboarding: optionalState.hasCompletedOnboarding,
      profileExists: Boolean(profile),
      draft: mapProfileToDraft(profile, careerProfile),
      optionalSections: optionalState.optionalSections,
      optionalSectionSnoozes: optionalState.optionalSectionSnoozes,
      optionalSectionTimestamps: optionalState.optionalSectionTimestamps,
      taxonomy,
      roleTaxonomy: ROLE_TAXONOMY_MAP,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load onboarding bootstrap',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as MobileCareerOnboardingCompletePayload;
    const validation = validateOnboardingData(payload?.data ?? {});

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(' ') },
        { status: 400 }
      );
    }

    await ensureProfile(user, supabase, request);

    const sanitized = sanitizeOnboardingData(payload.data);
    await CareerProfileService.completeCareerOnboarding(user.id, sanitized, supabase);

    const optionalSections = payload.optionalSectionsCompleted ?? deriveOptionalSectionStatus(sanitized);

    const currentProfile = await ProfileService.getProfile(user.id, supabase);
    const preferences = ((currentProfile.preferences as PreferenceRecord | null) ?? {}) as PreferenceRecord;

    await ProfileService.updatePreferences(
      user.id,
      {
        ...preferences,
        careerOnboardingSkipped: false,
        careerOptionalSections: optionalSections,
      } as unknown as Json,
      supabase
    );

    return NextResponse.json({
      success: true,
      data: {
        completed: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding',
      },
      { status: 500 }
    );
  }
}
