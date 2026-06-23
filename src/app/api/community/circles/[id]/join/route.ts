import type { NextRequest } from 'next/server';

import { unauthorizedJson, validationErrorJson, errorJson, successJson, catchErrorJson } from '@/lib/api/apiResponse';
import type { SupabaseClientType } from '@/types/database';
import { getAuthenticatedRequestContext } from '@/utils/supabase/requestAuth';

async function resolveCircle(
  circleId: string,
  supabase: SupabaseClientType
) {
  const { data, error } = await supabase
    .from('circles')
    .select('id')
    .eq('id', circleId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message ?? 'Failed to load circle.');
  }

  return data;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    const { id: circleId } = await params;
    if (!circleId) return validationErrorJson('Missing circle ID');

    const circle = await resolveCircle(circleId, authContext.supabase);
    if (!circle) return errorJson('Circle not found', 404);

    const { error } = await authContext.supabase.from('circle_members').insert({
      circle_id: circleId,
      user_id: authContext.user.id,
    });

    if (error && error.code !== '23505') {
      return errorJson(error.message ?? 'Failed to join circle', 500);
    }

    return successJson({ message: error?.code === '23505' ? 'Already a member' : 'Joined circle' });
  } catch (error) {
    return catchErrorJson(error, 'Failed to join circle');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedRequestContext(request as NextRequest);
    if (!authContext) return unauthorizedJson();

    const { id: circleId } = await params;
    if (!circleId) return validationErrorJson('Missing circle ID');

    const circle = await resolveCircle(circleId, authContext.supabase);
    if (!circle) return errorJson('Circle not found', 404);

    const { error } = await authContext.supabase
      .from('circle_members')
      .delete()
      .match({
        circle_id: circleId,
        user_id: authContext.user.id,
      });

    if (error) return errorJson(error.message ?? 'Failed to leave circle', 500);

    return successJson({ message: 'Left circle' });
  } catch (error) {
    return catchErrorJson(error, 'Failed to leave circle');
  }
}
