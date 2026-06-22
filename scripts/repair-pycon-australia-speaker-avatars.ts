import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import { SpeakerAvatarCacheService } from '../src/services/speakerAvatarCacheService';
import { env } from '../src/utils/env';

dotenv.config({ path: '.env.local' });

const supabaseUrl = env('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = env('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type EventRow = {
  id: string;
  title: string | null;
  speaker_lineup: unknown;
};

type SpeakerRow = {
  id: string;
  name: string | null;
  photo_url: string | null;
};

type SpeakerLineupEntry = Record<string, unknown>;

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  const eventIdIndex = args.indexOf('--event-id');
  const eventId = eventIdIndex !== -1 ? args[eventIdIndex + 1]?.trim() : null;

  const titleIndex = args.indexOf('--title');
  const title = titleIndex !== -1 && args[titleIndex + 1]
    ? args[titleIndex + 1].trim()
    : 'PyCon Australia';

  return { apply, eventId, title };
}

function getSpeakerId(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const id = (entry as SpeakerLineupEntry).id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

function getSpeakerName(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const name = (entry as SpeakerLineupEntry).name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

function patchSpeakerLineup(
  lineup: unknown,
  affectedSpeakerIds: Set<string>,
  affectedSpeakerNames: Set<string>
): unknown {
  if (!Array.isArray(lineup)) {
    return lineup;
  }

  return lineup.map((entry) => {
    const speakerId = getSpeakerId(entry);
    const speakerName = getSpeakerName(entry);
    const isAffected = (speakerId && affectedSpeakerIds.has(speakerId))
      || (speakerName && affectedSpeakerNames.has(speakerName));

    if (!isAffected || !entry || typeof entry !== 'object') {
      return entry;
    }

    return {
      ...(entry as SpeakerLineupEntry),
      photoUrl: null,
      photo_url: null,
    };
  });
}

async function isInvalidCachedAvatar(photoUrl: string): Promise<{ invalid: boolean; reason?: string }> {
  if (!SpeakerAvatarCacheService.isCachedSpeakerAvatarUrl(photoUrl)) {
    return { invalid: false };
  }

  try {
    const response = await fetch(photoUrl, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'KureCal Speaker Avatar Repair/1.0',
      },
    });

    if (!response.ok) {
      return { invalid: true, reason: `Stored avatar returned ${response.status}` };
    }

    const blob = await response.blob();
    await SpeakerAvatarCacheService.assertLooksLikeRealAvatar(blob);
    return { invalid: false };
  } catch (error) {
    return {
      invalid: true,
      reason: error instanceof Error ? error.message : 'Stored avatar failed validation',
    };
  }
}

async function loadEvents(eventId: string | null, title: string): Promise<EventRow[]> {
  let query = supabase
    .from('events')
    .select('id, title, speaker_lineup');

  query = eventId
    ? query.eq('id', eventId)
    : query.ilike('title', `%${title}%`);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load events: ${error.message}`);
  }

  return (data ?? []) as EventRow[];
}

async function run() {
  const { apply, eventId, title } = parseArgs();
  const events = await loadEvents(eventId, title);

  if (events.length === 0) {
    console.log('No matching events found.');
    return;
  }

  const speakerIds = new Set<string>();
  const speakerNames = new Set<string>();
  for (const event of events) {
    if (!Array.isArray(event.speaker_lineup)) {
      continue;
    }

    for (const entry of event.speaker_lineup) {
      const speakerId = getSpeakerId(entry);
      if (speakerId) {
        speakerIds.add(speakerId);
      }

      const speakerName = getSpeakerName(entry);
      if (speakerName) {
        speakerNames.add(speakerName);
      }
    }
  }

  if (speakerIds.size === 0 && speakerNames.size === 0) {
    console.log('Matching events do not have speaker ids or names in speaker_lineup.');
    return;
  }

  const speakersById = new Map<string, SpeakerRow>();

  if (speakerIds.size > 0) {
    const { data: speakersByIds, error: speakersByIdsError } = await supabase
      .from('speakers')
      .select('id, name, photo_url')
      .in('id', Array.from(speakerIds));

    if (speakersByIdsError) {
      throw new Error(`Failed to load speakers by id: ${speakersByIdsError.message}`);
    }

    for (const speaker of (speakersByIds ?? []) as SpeakerRow[]) {
      speakersById.set(speaker.id, speaker);
    }
  }

  if (speakerNames.size > 0) {
    const { data: speakersByNames, error: speakersByNamesError } = await supabase
      .from('speakers')
      .select('id, name, photo_url')
      .in('name', Array.from(speakerNames));

    if (speakersByNamesError) {
      throw new Error(`Failed to load speakers by name: ${speakersByNamesError.message}`);
    }

    for (const speaker of (speakersByNames ?? []) as SpeakerRow[]) {
      speakersById.set(speaker.id, speaker);
    }
  }

  const speakers = Array.from(speakersById.values());

  const affected: Array<SpeakerRow & { reason: string }> = [];
  for (const speaker of speakers) {
    const photoUrl = speaker.photo_url?.trim();
    if (!photoUrl) {
      continue;
    }

    const assessment = await isInvalidCachedAvatar(photoUrl);
    if (assessment.invalid) {
      affected.push({
        ...speaker,
        reason: assessment.reason ?? 'Stored cached avatar failed validation',
      });
    }
  }

  console.log(`Matched events: ${events.length}`);
  for (const event of events) {
    console.log(`  ${event.title ?? '(untitled)'} (${event.id})`);
  }
  console.log(`Speakers checked: ${speakers.length}`);
  console.log(`Affected cached avatars: ${affected.length}`);

  for (const speaker of affected) {
    console.log(`  ${speaker.name ?? speaker.id} (${speaker.id}): ${speaker.reason}`);
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to clear affected speaker photos and event speaker_lineup photo URLs.');
    return;
  }

  if (affected.length === 0) {
    return;
  }

  const affectedIds = affected.map((speaker) => speaker.id);
  const affectedIdSet = new Set(affectedIds);
  const affectedNameSet = new Set(
    affected
      .map((speaker) => speaker.name?.trim())
      .filter((name): name is string => Boolean(name))
  );

  const { error: updateSpeakersError } = await supabase
    .from('speakers')
    .update({ photo_url: null })
    .in('id', affectedIds);

  if (updateSpeakersError) {
    throw new Error(`Failed to clear speaker photo_url values: ${updateSpeakersError.message}`);
  }

  for (const event of events) {
    const patchedLineup = patchSpeakerLineup(event.speaker_lineup, affectedIdSet, affectedNameSet);
    if (patchedLineup === event.speaker_lineup) {
      continue;
    }

    const { error: updateEventError } = await supabase
      .from('events')
      .update({ speaker_lineup: patchedLineup })
      .eq('id', event.id);

    if (updateEventError) {
      throw new Error(`Failed to update event ${event.id}: ${updateEventError.message}`);
    }
  }

  console.log('\nCleared affected speaker photo_url values and event speaker_lineup photo URLs.');
}

run().catch((error) => {
  console.error('Unhandled script error:', error);
  process.exit(1);
});
