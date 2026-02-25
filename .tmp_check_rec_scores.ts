import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getRecommendedHackathons } from './src/services/hackathonRecommendationService';
import type { CareerProfile } from './src/types/career';
import type { HackathonEvent } from './src/types/hackathon';

dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, preferences')
    .limit(100);

  const profileRow = (profiles || []).find((p: any) => p.preferences?.careerProfile);
  if (!profileRow) {
    console.log('No profile with careerProfile found');
    return;
  }

  const careerProfile = profileRow.preferences.careerProfile as CareerProfile;

  const { data: hacks, error } = await supabase
    .from('hackathons')
    .select('*')
    .order('start_date', { ascending: true })
    .limit(100);

  if (error) throw error;

  const hackathons: HackathonEvent[] = (hacks || []).map((h: any) => ({
    id: h.id,
    title: h.title,
    description: h.description || '',
    startDate: h.start_date,
    endDate: h.end_date,
    location: h.location || '',
    organizerId: h.organizer_id || '',
    maxTeamSize: h.max_team_size || 4,
    minTeamSize: h.min_team_size || 1,
    status: h.status,
    isVirtual: !!h.is_virtual,
    prizePool: h.prize_pool,
    prizeDescription: h.prize_description,
    tags: h.tags || [],
    recommendationFeatures: h.recommendation_features || null,
    featureVersion: h.feature_version || null,
    createdAt: h.created_at || new Date().toISOString(),
    updatedAt: h.updated_at || new Date().toISOString(),
    totalParticipants: h.total_participants || 0,
  } as HackathonEvent));

  const recs = getRecommendedHackathons(hackathons, careerProfile, 20);

  console.log('career profile user id', profileRow.id);
  console.log('recs', recs.length);
  const scoreCounts = new Map<number, number>();
  for (const rec of recs) {
    scoreCounts.set(rec.overall, (scoreCounts.get(rec.overall) || 0) + 1);
  }
  console.log('score distribution', Object.fromEntries([...scoreCounts.entries()].sort((a,b)=>b[0]-a[0])));

  for (const rec of recs.slice(0, 12)) {
    console.log(`\n${rec.overall}%  ${rec.hackathon.title}`);
    console.log('breakdown', rec.breakdown);
    console.log('reasons', rec.matchReasons);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
