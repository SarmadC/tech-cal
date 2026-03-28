import type {
  CareerOptionalSectionSnoozes,
  CareerOptionalSectionStatus,
  CareerOptionalSectionTimestamps,
  MobileCareerOnboardingSkipPayload,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/apiAuth';
import { ProfileService } from '@/services/profileService';
import type { AppProfile, Json } from '@/types';

type PreferenceRecord = Record<string, unknown>;

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

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = (await request.json().catch(() => ({}))) as MobileCareerOnboardingSkipPayload;
    const profile = await ensureProfile(user, supabase, request);
    const preferences = ((profile.preferences as PreferenceRecord | null) ?? {}) as PreferenceRecord;
    const now = new Date().toISOString();
    const existingStatus =
      (preferences.careerOptionalSections as CareerOptionalSectionStatus | undefined) ?? null;
    const mergedStatus = {
      ...(existingStatus ?? {}),
      ...(payload.optionalSectionsCompleted ?? {}),
    } as CareerOptionalSectionStatus | null;

    await ProfileService.updatePreferences(
      user.id,
      {
        ...preferences,
        careerOnboardingCompleted: true,
        careerOnboardingCompletedAt: now,
        careerOnboardingSkipped: true,
        careerOptionalSections: mergedStatus,
        careerOptionalSnoozes:
          (preferences.careerOptionalSnoozes as CareerOptionalSectionSnoozes | undefined) ?? null,
        careerOptionalSectionTimestamps:
          (preferences.careerOptionalSectionTimestamps as CareerOptionalSectionTimestamps | undefined) ??
          null,
      } as Json,
      supabase
    );

    return NextResponse.json({
      success: true,
      data: {
        skipped: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to skip onboarding',
      },
      { status: 500 }
    );
  }
}
