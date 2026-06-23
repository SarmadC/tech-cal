import { NextRequest } from 'next/server';
import { socialProfileUpdateSchema } from '@kurecal/domain';

import { unauthorizedJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { SocialProfileService } from '@/services/socialProfileService';
import { TrustLevelService } from '@/services/trustLevelService';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) return unauthorizedJson();

    const [socialProfile, trust] = await Promise.all([
      SocialProfileService.getSocialProfile(authContext.user.id, authContext.supabase),
      TrustLevelService.evaluateAndPersistTrustLevel(authContext.user.id, authContext.supabase),
    ]);

    return successJson({ ...socialProfile, trustLevel: trust.level });
  } catch (error) {
    console.error('Get social profile API error:', error);
    return catchErrorJson(error, 'Failed to fetch social profile');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext) return unauthorizedJson();

    const body = await request.json();
    const validation = socialProfileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorJson('Invalid input', validation.error.issues);
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

    return successJson({ ...socialProfile, trustLevel: trust.level });
  } catch (error) {
    console.error('Update social profile API error:', error);
    return catchErrorJson(error, 'Failed to update social profile');
  }
}
