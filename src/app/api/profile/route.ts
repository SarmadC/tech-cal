import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/profileService';
import { z } from 'zod';

// Validation schema for profile updates
const ProfileUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  timezone: z.string().optional(),
  currentRole: z.string().optional(),
  seniority: z.string().optional(),
  industry: z.string().optional()
});

/**
 * GET /api/profile
 * Get user profile
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const profile = await ProfileService.getProfile(user.id, supabase);

    return NextResponse.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get profile API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update user profile with automatic cache invalidation
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProfileUpdateSchema.parse(body);

    // ProfileService now automatically handles cache invalidation
    const updatedProfile = await ProfileService.updateProfile(
      user.id,
      validatedData,
      supabase
    );

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully. Cache automatically invalidated.'
    });

  } catch (error) {
    console.error('Update profile API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}