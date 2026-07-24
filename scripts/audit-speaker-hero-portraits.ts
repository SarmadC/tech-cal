import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const PAGE_SIZE = 500;

type SpeakerPortraitAuditRow = {
  id: string;
  name: string;
  photo_url: string | null;
  portrait_url: string | null;
  portrait_width: number | null;
  portrait_height: number | null;
};

async function loadSpeakers(): Promise<SpeakerPortraitAuditRow[]> {
  const rows: SpeakerPortraitAuditRow[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('speakers')
      .select('id, name, photo_url, portrait_url, portrait_width, portrait_height')
      .order('name', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to audit speaker portraits: ${error.message}`);
    }

    const page = (data ?? []) as SpeakerPortraitAuditRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

async function main() {
  const speakers = await loadSpeakers();
  const missingPortraits = speakers.filter((speaker) => !speaker.portrait_url);
  const invalidMetadata = speakers.filter(
    (speaker) =>
      Boolean(speaker.portrait_url) &&
      (!speaker.portrait_width || !speaker.portrait_height)
  );
  const avatarOnly = missingPortraits.filter((speaker) => Boolean(speaker.photo_url));
  const report = {
    generatedAt: new Date().toISOString(),
    totalSpeakers: speakers.length,
    approvedPortraits: speakers.length - missingPortraits.length,
    missingPortraits: missingPortraits.length,
    avatarOnly: avatarOnly.length,
    invalidPortraitMetadata: invalidMetadata.length,
    speakers: missingPortraits.map((speaker) => ({
      id: speaker.id,
      name: speaker.name,
      hasCompactAvatar: Boolean(speaker.photo_url),
    })),
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`Speaker hero portrait audit (${report.generatedAt})`);
  console.log(`Total speakers: ${report.totalSpeakers}`);
  console.log(`Approved portraits: ${report.approvedPortraits}`);
  console.log(`Missing portraits: ${report.missingPortraits}`);
  console.log(`Avatar-only speakers: ${report.avatarOnly}`);
  console.log(`Invalid portrait metadata: ${report.invalidPortraitMetadata}`);
  console.table(report.speakers);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
