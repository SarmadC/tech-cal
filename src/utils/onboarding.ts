import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export type OnboardingStatus = {
  onboarded: boolean;
  source: 'career_profiles' | 'legacy' | 'none';
};

/**
 * Returns whether the user has completed onboarding.
 * Checks the modern career profile, then falls back to legacy preferences.
 */
export async function getOnboardingStatus(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OnboardingStatus> {
  try {
    // Tiny TTL cache via Vercel KV (if configured)
    try {
      const cached = await kv.get<string>(`onb2:${userId}`);
      if (cached === '1') return { onboarded: true, source: 'career_profiles' };
      if (cached === '0') return { onboarded: false, source: 'none' };
    } catch {
      // KV might not be configured in local/dev; proceed without cache
    }

    // Modern career profile
    const { data: careerProfile, error: cpError } = await supabase
      .from('career_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!cpError && careerProfile) {
      // Positive cache for a short TTL
      try { await kv.set(`onb2:${userId}`, '1', { ex: 120 }); } catch {}
      return { onboarded: true, source: 'career_profiles' };
    }

    // Legacy preferences flag
    const { data: legacyProfile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .single();

    const preferences = legacyProfile?.preferences as Record<string, unknown> | null;
    const hasLegacyOnboarding = preferences?.careerOnboardingCompleted === true;

    if (hasLegacyOnboarding) {
      try { await kv.set(`onb2:${userId}`, '1', { ex: 120 }); } catch {}
      return { onboarded: true, source: 'legacy' };
    }

    // Negative cache with very short TTL to avoid blocking newly-onboarded flows
    try { await kv.set(`onb2:${userId}`, '0', { ex: 60 }); } catch {}
    return { onboarded: false, source: 'none' };
  } catch {
    // In case of error, default to not onboarded so callers can choose behavior
    return { onboarded: false, source: 'none' };
  }
}

/**
 * Server component/layout guard. Redirects to onboarding if not completed.
 */
export async function enforceOnboarding(
  supabase: SupabaseClient<Database>,
  userId: string,
  from: string = 'protected'
): Promise<void> {
  if (process.env.DISABLE_ONBOARDING_REDIRECT === 'true') return;

  const status = await getOnboardingStatus(supabase, userId);
  if (!status.onboarded) {
    redirect(`/onboarding/career?from=${encodeURIComponent(from)}`);
  }
}

/**
 * API route guard. Returns a 412 response if not onboarded, else null.
 */
export async function requireOnboardedApi(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NextResponse | null> {
  if (process.env.DISABLE_ONBOARDING_REDIRECT === 'true') return null;

  const status = await getOnboardingStatus(supabase, userId);
  if (!status.onboarded) {
    return NextResponse.json(
      { success: false, error: 'Onboarding required' },
      { status: 412 }
    );
  }
  return null;
}
