#!/usr/bin/env tsx

import {
  clearCommunityShowcaseData,
  createShowcaseClient,
  printSummary,
  verifyCommunityShowcaseTables,
} from './community-showcase-shared';

async function clearCommunityShowcase(): Promise<void> {
  console.log('Clearing Community showcase data...');

  const supabase = createShowcaseClient();
  await verifyCommunityShowcaseTables(supabase);

  const deleted = await clearCommunityShowcaseData(supabase);
  printSummary('Cleared Community showcase rows:', deleted);
}

if (require.main === module) {
  clearCommunityShowcase().catch((error) => {
    console.error('Failed to clear Community showcase data:', error);
    process.exit(1);
  });
}

export { clearCommunityShowcase };
