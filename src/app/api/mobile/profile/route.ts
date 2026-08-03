import {
  mobileProfileStateSchema,
  mobileProfileUpdateSchema,
  type SocialProfileUpdateInput,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { buildMobileProfileState, ensureMobileProfile } from '@/app/api/mobile/profileState';
import { ProfileService } from '@/services/profileService';
import { SocialProfileService } from '@/services/socialProfileService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await buildMobileProfileState(authContext, request);

    return NextResponse.json({
      success: true,
      data: mobileProfileStateSchema.parse(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load mobile profile',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as never);
    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = mobileProfileUpdateSchema.parse(
      await request.json().catch(() => ({}))
    );

    await ensureMobileProfile(authContext, request);

    if (
      Object.prototype.hasOwnProperty.call(payload, 'fullName')
    ) {
      await ProfileService.updateProfile(
        authContext.user.id,
        {
          fullName: payload.fullName,
        },
        authContext.supabase
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(payload, 'username') ||
      Object.prototype.hasOwnProperty.call(payload, 'headline') ||
      Object.prototype.hasOwnProperty.call(payload, 'bio') ||
      Object.prototype.hasOwnProperty.call(payload, 'profileVisibility') ||
      Object.prototype.hasOwnProperty.call(payload, 'showAttendance')
    ) {
      const socialUpdates: SocialProfileUpdateInput = {};
      if (Object.prototype.hasOwnProperty.call(payload, 'username')) {
        socialUpdates.username = payload.username;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'headline')) {
        socialUpdates.headline = payload.headline;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'bio')) {
        socialUpdates.bio = payload.bio;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'profileVisibility')) {
        socialUpdates.profileVisibility = payload.profileVisibility;
      }
      if (Object.prototype.hasOwnProperty.call(payload, 'showAttendance')) {
        socialUpdates.showAttendance = payload.showAttendance;
      }
      await SocialProfileService.updateSocialProfile(
        authContext.user.id,
        socialUpdates,
        authContext.supabase
      );
    }

    const data = await buildMobileProfileState(authContext, request);

    return NextResponse.json({
      success: true,
      data: mobileProfileStateSchema.parse(data),
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? 'Invalid profile update'
        : error instanceof Error
          ? error.message
          : 'Failed to update mobile profile';

    return NextResponse.json(
      {
        success: false,
        error: message,
        details: error instanceof ZodError ? error.issues : undefined,
      },
      { status: error instanceof ZodError ? 400 : 500 }
    );
  }
}
