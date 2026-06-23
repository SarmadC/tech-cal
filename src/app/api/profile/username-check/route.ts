import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, validationErrorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import { SocialProfileService } from '@/services/socialProfileService';
import { createClient } from '@/utils/supabase/server';

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(30),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) return unauthorizedJson();

    const validation = QuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q'),
    });
    if (!validation.success) {
      return validationErrorJson('Invalid query parameter', validation.error.issues);
    }

    const availability = await SocialProfileService.checkUsernameAvailability(
      validation.data.q,
      user.id,
      supabase
    );

    return successJson(availability);
  } catch (error) {
    console.error('Username availability API error:', error);
    return catchErrorJson(error, 'Failed to check username availability');
  }
}
