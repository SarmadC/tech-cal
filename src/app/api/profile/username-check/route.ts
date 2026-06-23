import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { SocialProfileService } from '@/services/socialProfileService';

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(30),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const validation = QuerySchema.safeParse({
      q: request.nextUrl.searchParams.get('q'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameter', details: validation.error.issues },
        { status: 400 }
      );
    }

    const availability = await SocialProfileService.checkUsernameAvailability(
      validation.data.q,
      user.id,
      supabase
    );

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Username availability API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}
