// src/app/hackathons/page.tsx
import { createClient } from '@/utils/supabase/server';
import { HackathonService } from '@/services/hackathonService';
import { ProfileService } from '@/services/profileService';
import HackathonClientView from './HackathonClientView';

export const metadata = {
  title: 'Hackathons - TechCal',
  description: 'Discover and participate in exciting hackathons. Find teams, register for events, and showcase your coding skills.',
};

export default async function HackathonsPage() {
  const supabase = await createClient();
  const { data: { user }, error: _authError } = await supabase.auth.getUser();

  // For now, allow access without authentication to test hackathon data
  const userId = user?.id || 'anonymous';

  try {
    // Load hackathon events
    const hackathons = await HackathonService.getHackathonEvents(supabase, userId);

    // Load user profile for personalization (only if authenticated)
    let profile = null;
    if (user?.id) {
      try {
        profile = await ProfileService.getProfile(user.id, supabase);
      } catch (_profileError) {
        // This is fine - new users don't have profiles yet
      }
    }

    return (
      <HackathonClientView
        initialHackathons={hackathons}
        profile={profile}
        userId={userId}
      />
    );

  } catch (error) {
    console.error('Hackathon page loading failed:', error);

    // Fallback to empty state
    return (
      <HackathonClientView
        initialHackathons={[]}
        profile={null}
        userId={user?.id || 'anonymous'}
      />
    );
  }
}