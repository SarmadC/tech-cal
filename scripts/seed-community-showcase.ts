#!/usr/bin/env tsx

import {
  clearCommunityShowcaseData,
  createCommunityShowcaseDataset,
  createShowcaseClient,
  ensureCommunityShowcaseAuthUsers,
  printSummary,
  verifyCommunityShowcaseTables,
} from './community-showcase-shared';

async function seedCommunityShowcase(): Promise<void> {
  console.log('Seeding Community showcase data...');

  const supabase = createShowcaseClient();
  await verifyCommunityShowcaseTables(supabase);

  const deleted = await clearCommunityShowcaseData(supabase);
  const profileIdsBySlug = await ensureCommunityShowcaseAuthUsers(supabase);
  const dataset = createCommunityShowcaseDataset(profileIdsBySlug);

  const runUpsert = async <TRow extends Record<string, unknown>>(
    label: string,
    rows: TRow[],
    onConflict: string
  ) => {
    const { error } = await supabase
      .from(label as never)
      .upsert(rows as never[], { onConflict });

    if (error) {
      throw new Error(`Failed to upsert ${label}: ${error.message}`);
    }
  };

  const runInsert = async <TRow extends Record<string, unknown>>(
    label: string,
    rows: TRow[]
  ) => {
    const { error } = await supabase.from(label as never).insert(rows as never[]);
    if (error) {
      throw new Error(`Failed to insert ${label}: ${error.message}`);
    }
  };

  await runUpsert('profiles', dataset.profiles, 'id');
  await runUpsert('career_profiles', dataset.careerProfiles, 'user_id');
  await runUpsert('user_social_stats', dataset.userSocialStats, 'user_id');
  await runUpsert('circles', dataset.circles, 'id');
  await runInsert('circle_members', dataset.circleMembers);
  await runUpsert('events', dataset.events, 'id');
  await runUpsert('user_events', dataset.userEvents, 'id');
  await runUpsert('circle_posts', dataset.circlePosts, 'id');
  await runUpsert('circle_comments', dataset.circleComments, 'id');

  printSummary('Deleted existing showcase rows:', deleted);
  printSummary('Seeded Community showcase rows:', {
    auth_users: Object.keys(profileIdsBySlug).length,
    profiles: dataset.profiles.length,
    career_profiles: dataset.careerProfiles.length,
    user_social_stats: dataset.userSocialStats.length,
    circles: dataset.circles.length,
    circle_members: dataset.circleMembers.length,
    circle_posts: dataset.circlePosts.length,
    circle_comments: dataset.circleComments.length,
    events: dataset.events.length,
    user_events: dataset.userEvents.length,
  });
}

if (require.main === module) {
  seedCommunityShowcase().catch((error) => {
    console.error('Failed to seed Community showcase data:', error);
    process.exit(1);
  });
}

export { seedCommunityShowcase };
