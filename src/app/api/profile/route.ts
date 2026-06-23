import { NextRequest } from 'next/server';
import { z } from 'zod';
import { unauthorizedJson, validationErrorJson, successJson, errorJson } from '@/lib/api/apiResponse';
import { ProfileService } from '@/services/profileService';
import { createClient } from '@/utils/supabase/server';

// Validation schema for profile updates
const ProfileUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  timezone: z.string().optional(),
  currentRole: z.string().optional(),
  seniority: z.string().optional(),
  industry: z.string().optional()
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    const profile = await ProfileService.getProfile(user.id, supabase);
    return successJson(profile);
  } catch (error) {
    console.error('Get profile API error:', error);
    return errorJson('Failed to fetch profile', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return unauthorizedJson();

    const body = await request.json();
    const validatedData = ProfileUpdateSchema.parse(body);

    const updatedProfile = await ProfileService.updateProfile(
      user.id,
      validatedData,
      supabase
    );

    return successJson(updatedProfile);
  } catch (error) {
    console.error('Update profile API error:', error);
    if (error instanceof z.ZodError) {
      return validationErrorJson('Invalid data', error.issues);
    }
    return errorJson('Failed to update profile', 500);
  }
}