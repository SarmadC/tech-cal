// src/app/hackathons/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
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

  // Require authentication for hackathon features
  if (_authError || !user) {
    redirect('/login');
  }

  try {
    // Load hackathon events
    const hackathons = await HackathonService.getHackathonEvents(supabase, user.id);

    // Load user profile for personalization
    let profile = null;
    try {
      if (user?.id) {
        profile = await ProfileService.getProfile(user.id, supabase);
      }
    } catch (_profileError) {
      // This is fine - new users don't have profiles yet
    }

    return (
      <HackathonClientView
        initialHackathons={hackathons}
        profile={profile}
        userId={user.id}
      />
    );

  } catch (error) {
    console.error('Hackathon page loading failed:', error);

    // Fallback to empty state
    return (
      <HackathonClientView
        initialHackathons={[]}
        profile={null}
        userId={user.id}
      />
    );
  }
}