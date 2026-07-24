import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sharp from 'sharp';

import { fetchWithSafeRedirects } from '../src/lib/ssrfProtection';
import { SpeakerPortraitCandidateService } from '../src/services/speakerPortraitCandidateService';

dotenv.config({ path: '.env.local' });

const SPEAKER_ID = '58772c1a-333f-47e4-9192-eb0bde3e520e';
const SOURCE_PAGE_URL = 'https://londontechweek.com/speakers/arjun-kharpul';
const IMAGE_URL =
  'https://cdn.asp.events/CLIENT_Informa__AADDE28D_5056_B739_5481D63BF875B0DF/sites/london-tech-week-2024/media/libraries/speakers/Arjun-Kharpal.jpg';
const MIN_HERO_PORTRAIT_EDGE = 1024;

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() || null : null;
}

async function inspectOfficialPortrait() {
  const response = await fetchWithSafeRedirects(IMAGE_URL, {
    headers: { Accept: 'image/jpeg,image/png,image/webp,image/avif' },
  });
  if (!response.ok) {
    throw new Error(`Official portrait returned HTTP ${response.status}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read official portrait dimensions.');
  }
  if (Math.min(metadata.width, metadata.height) < MIN_HERO_PORTRAIT_EDGE) {
    throw new Error(
      `Official portrait is only ${metadata.width}x${metadata.height}; ${MIN_HERO_PORTRAIT_EDGE}px is required on the short edge.`
    );
  }

  return { width: metadata.width, height: metadata.height };
}

async function main() {
  const dimensions = await inspectOfficialPortrait();
  console.log(
    `Validated Arjun Kharpal portrait from London Tech Week: ${dimensions.width}x${dimensions.height}.`
  );

  if (!process.argv.includes('--apply')) {
    console.log('Dry run only. Pass --apply --reviewer-id <admin-user-id> to publish it.');
    return;
  }

  const reviewerId = argumentValue('--reviewer-id');
  if (!reviewerId) {
    throw new Error('--reviewer-id is required when using --apply.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data: reviewer, error: reviewerError } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', reviewerId)
    .maybeSingle();
  if (reviewerError || reviewer?.is_admin !== true) {
    throw new Error('The supplied reviewer is not an administrator.');
  }

  const { data: speaker, error: speakerError } = await supabase
    .from('speakers')
    .select('id, name, photo_url')
    .eq('id', SPEAKER_ID)
    .maybeSingle();
  if (speakerError || !speaker || speaker.name !== 'Arjun Kharpal') {
    throw new Error('The expected Arjun Kharpal speaker record was not found.');
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('speaker_portrait_candidates')
    .upsert(
      {
        speaker_id: SPEAKER_ID,
        image_url: IMAGE_URL,
        source_page_url: SOURCE_PAGE_URL,
        source_type: 'img',
        width: dimensions.width,
        height: dimensions.height,
        status: 'pending',
      },
      { onConflict: 'speaker_id,image_url' }
    )
    .select('id, status')
    .single();
  if (candidateError || !candidate) {
    throw new Error(`Unable to store the approved candidate: ${candidateError?.message ?? 'unknown error'}`);
  }
  if (candidate.status !== 'pending') {
    throw new Error(`Portrait candidate is already ${candidate.status}.`);
  }

  await SpeakerPortraitCandidateService.review({
    candidateId: candidate.id,
    action: 'approve',
    reviewerId,
    supabaseClient: supabase,
  });

  console.log('Published the approved hero portrait. The existing compact avatar was preserved.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
