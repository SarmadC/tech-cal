import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAuthContext } from '@/lib/apiAuth';
import { SocialProfileService, type ProfileVisibility } from '@/services/socialProfileService';
import { TrustLevelService } from '@/services/trustLevelService';

const PROFILE_VISIBILITY_VALUES = ['private', 'connections', 'public'] as const satisfies readonly ProfileVisibility[];

const SocialProfileUpdateSchema = z.object({
  username: z.string().trim().max(30).nullable().optional(),
  headline: z.string().trim().max(120).nullable().optional(),
  profileVisibility: z.enum(PROFILE_VISIBILITY_VALUES).optional(),
  showAttendance: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const [socialProfile, trust] = await Promise.all([
      SocialProfileService.getSocialProfile(user.id, supabase),
      TrustLevelService.evaluateAndPersistTrustLevel(user.id, supabase),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...socialProfile,
        trustLevel: trust.level,
      },
    });
  } catch (error) {
    console.error('Get social profile API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch social profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = SocialProfileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const socialProfile = await SocialProfileService.updateSocialProfile(
      user.id,
      validation.data,
      supabase
    );

    const trust = await TrustLevelService.evaluateAndPersistTrustLevel(user.id, supabase);

    return NextResponse.json({
      success: true,
      data: {
        ...socialProfile,
        trustLevel: trust.level,
      },
    });
  } catch (error) {
    console.error('Update social profile API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update social profile' },
      { status: 500 }
    );
  }
}
