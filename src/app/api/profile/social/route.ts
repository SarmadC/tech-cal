import { NextRequest, NextResponse } from 'next/server';
import { socialProfileUpdateSchema } from '@kurecal/domain';

import { SocialProfileService } from '@/services/socialProfileService';
import { TrustLevelService } from '@/services/trustLevelService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const [socialProfile, trust] = await Promise.all([
      SocialProfileService.getSocialProfile(authContext.user.id, authContext.supabase),
      TrustLevelService.evaluateAndPersistTrustLevel(authContext.user.id, authContext.supabase),
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
      { success: false, error: 'Failed to fetch social profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = socialProfileUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const socialProfile = await SocialProfileService.updateSocialProfile(
      authContext.user.id,
      validation.data,
      authContext.supabase
    );

    const trust = await TrustLevelService.evaluateAndPersistTrustLevel(
      authContext.user.id,
      authContext.supabase
    );

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
      { success: false, error: 'Failed to update social profile' },
      { status: 500 }
    );
  }
}
