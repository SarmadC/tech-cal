import type { MobileSpeakerDetail, MobileSpeakerDetailEvent } from '@kurecal/domain';

import type { SupabaseClientType } from '@/types';

const SHOWCASE_SOURCE_DOMAIN = 'showcase.kurecal.local';
const SPEAKER_EVENT_LIMIT = 8;

interface SpeakerRow {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
}

interface SpeakerEventLinkRow {
  event_id: string | null;
}

interface EventRow {
  id: string;
  slug: string | null;
  title: string | null;
  start_time: string;
  location: string | null;
  event_format: string | null;
  source_domain: string | null;
  source_url: string | null;
  status: string | null;
}

function isShowcaseEvent(row: Pick<EventRow, 'source_domain' | 'source_url'>): boolean {
  return (
    row.source_domain === SHOWCASE_SOURCE_DOMAIN ||
    row.source_url?.includes(SHOWCASE_SOURCE_DOMAIN) === true
  );
}

function compareSpeakerEvents(
  left: MobileSpeakerDetailEvent,
  right: MobileSpeakerDetailEvent
): number {
  if (left.isPastEvent !== right.isPastEvent) {
    return left.isPastEvent ? 1 : -1;
  }

  const leftTime = new Date(left.startTime).getTime();
  const rightTime = new Date(right.startTime).getTime();

  return left.isPastEvent ? rightTime - leftTime : leftTime - rightTime;
}

export class MobileSpeakerService {
  static async getSpeakerDetail({
    speakerId,
    readClient,
    now = new Date(),
  }: {
    speakerId: string;
    readClient: SupabaseClientType;
    now?: Date;
  }): Promise<MobileSpeakerDetail | null> {
    const speakerResult = await readClient
      .from('speakers')
      .select(
        'id, name, title, company, bio, photo_url, linkedin_url, twitter_url, website_url'
      )
      .eq('id', speakerId)
      .maybeSingle();

    if (speakerResult.error) {
      throw new Error('Failed to load speaker details.');
    }

    const speaker = speakerResult.data as SpeakerRow | null;
    if (!speaker) {
      return null;
    }

    const linkResult = await readClient
      .from('event_speakers_flat')
      .select('event_id')
      .eq('speaker_id', speakerId);

    if (linkResult.error) {
      throw new Error('Failed to load speaker event links.');
    }

    const eventIds = Array.from(
      new Set(
        ((linkResult.data ?? []) as SpeakerEventLinkRow[])
          .map((row) => row.event_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    let events: MobileSpeakerDetailEvent[] = [];
    if (eventIds.length > 0) {
      const eventResult = await readClient
        .from('events')
        .select(
          'id, slug, title, start_time, location, event_format, source_domain, source_url, status'
        )
        .in('id', eventIds)
        .eq('status', 'confirmed');

      if (eventResult.error) {
        throw new Error('Failed to load speaker events.');
      }

      events = ((eventResult.data ?? []) as EventRow[])
        .filter((event) => !isShowcaseEvent(event))
        .map((event) => ({
          id: event.id,
          slug: event.slug ?? event.id,
          title: event.title?.trim() || 'Untitled event',
          startTime: event.start_time,
          location: event.location,
          format: event.event_format,
          isPastEvent: new Date(event.start_time).getTime() < now.getTime(),
        }))
        .sort(compareSpeakerEvents)
        .slice(0, SPEAKER_EVENT_LIMIT);
    }

    return {
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      bio: speaker.bio,
      photoUrl: speaker.photo_url,
      linkedinUrl: speaker.linkedin_url,
      twitterUrl: speaker.twitter_url,
      websiteUrl: speaker.website_url,
      events,
    };
  }
}
