import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Simple test endpoint to check if analytics API is working
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get basic user data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Return basic info
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        profileExists: !!profileData,
        profileId: profileData.id,
        fullName: profileData.full_name,
        hasAnalyticsConsent: profileData.analytics_consent,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
