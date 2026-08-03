import {
  mobileCareerOnboardingBootstrapSchema,
  mobileCareerOnboardingRequestSchema,
  mobileOnboardingStatusSchema,
} from '@kurecal/domain';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { buildMobileCareerOnboardingBootstrap, ensureMobileProfile } from '@/app/api/mobile/profileState';
import { CareerProfileService } from '@/services/careerProfileService';
import type { CareerOnboardingData } from '@/types/career';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const data = await buildMobileCareerOnboardingBootstrap(authContext, request);

    return NextResponse.json({
      success: true,
      data: mobileCareerOnboardingBootstrapSchema.parse(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load onboarding bootstrap',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authContext = await getAuthenticatedRequestContext(request as never);
  if (!authContext) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const payload = mobileCareerOnboardingRequestSchema.parse(
      await request.json().catch(() => ({}))
    );

    await ensureMobileProfile(authContext, request);

    if (payload.action === 'skip') {
      await CareerProfileService.markOnboardingCompleted(
        authContext.user.id,
        authContext.supabase
      );

      return NextResponse.json({
        success: true,
        data: mobileOnboardingStatusSchema.parse({
          onboarded: true,
          source: 'legacy',
        }),
      });
    }

    if (payload.action === 'save-draft') {
      await CareerProfileService.saveMobileOnboardingDraft(
        authContext.user.id,
        payload.data,
        authContext.supabase
      );

      return NextResponse.json({
        success: true,
        data: mobileOnboardingStatusSchema.parse({
          onboarded: false,
          source: 'none',
        }),
      });
    }

    await CareerProfileService.completeCareerOnboarding(
      authContext.user.id,
      payload.data as unknown as CareerOnboardingData,
      authContext.supabase
    );

    return NextResponse.json({
      success: true,
      data: mobileOnboardingStatusSchema.parse({
        onboarded: true,
        source: 'career_profiles',
      }),
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? 'Invalid onboarding payload'
        : error instanceof Error
          ? error.message
          : 'Failed to update onboarding';

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
