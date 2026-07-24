import { describe, expect, it, vi } from 'vitest';

import { MobileSpeakerService } from '@/services/mobileSpeakerService';

function createQuery(table: string) {
  const result =
    table === 'speakers'
      ? {
          data: {
            id: 'speaker-1',
            name: 'Alex Penna',
            title: 'Senior Software Engineer',
            company: 'Canva',
            bio: null,
            photo_url: 'https://example.com/alex-avatar.png',
            portrait_url: 'https://example.com/alex-portrait.jpg',
            linkedin_url: null,
            twitter_url: null,
            website_url: null,
          },
          error: null,
        }
      : table === 'event_speakers_flat'
        ? {
            data: [{ event_id: 'event-1' }],
            error: null,
          }
        : {
            data: [
              {
                id: 'event-1',
                slug: 'pycon-australia',
                title: 'PyCon Australia',
                start_time: '2026-08-25T18:00:00.000Z',
                location: 'Brisbane, Australia',
                event_format: 'In-person',
                event_image_url: null,
                source_domain: 'pycon.org.au',
                source_url: 'https://pycon.org.au',
                status: 'confirmed',
                organizer: {
                  name: 'PyCon Australia',
                  logo_url: 'pycon-australia.svg',
                },
              },
            ],
            error: null,
          };

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result)),
  };

  return query;
}

describe('MobileSpeakerService', () => {
  it('normalizes organizer logo filenames for speaker event rows', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const readClient = {
      from: vi.fn((table: string) => createQuery(table)),
    };

    const speaker = await MobileSpeakerService.getSpeakerDetail({
      speakerId: 'speaker-1',
      readClient: readClient as never,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(speaker?.events[0]?.organizerLogoUrl).toBe(
      'https://example.supabase.co/storage/v1/object/public/logos/pycon-australia.svg'
    );
    expect(speaker?.photoUrl).toBe('https://example.com/alex-avatar.png');
    expect(speaker?.portraitUrl).toBe('https://example.com/alex-portrait.jpg');
    expect(speaker?.appearanceCount).toBe(1);
  });

  it('falls back to the legacy speaker schema when portrait columns are not deployed', async () => {
    const legacySpeaker = {
      id: 'speaker-legacy',
      name: 'Legacy Speaker',
      title: 'CTO',
      company: 'Example',
      bio: null,
      photo_url: 'https://example.com/avatar-90.png',
      linkedin_url: null,
      twitter_url: null,
      website_url: null,
    };
    const selectedFields: string[] = [];
    const readClient = {
      from: vi.fn((table: string) => {
        if (table === 'speakers') {
          const query = {
            select: vi.fn((fields: string) => {
              selectedFields.push(fields);
              return query;
            }),
            eq: vi.fn(() => query),
            maybeSingle: vi.fn(() =>
              Promise.resolve(
                selectedFields.length === 1
                  ? {
                      data: null,
                      error: {
                        code: '42703',
                        message: 'column speakers.portrait_url does not exist',
                      },
                    }
                  : { data: legacySpeaker, error: null }
              )
            ),
          };
          return query;
        }

        return createQuery(table);
      }),
    };

    const speaker = await MobileSpeakerService.getSpeakerDetail({
      speakerId: 'speaker-legacy',
      readClient: readClient as never,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(selectedFields).toHaveLength(2);
    expect(selectedFields[0]).toContain('portrait_url');
    expect(selectedFields[1]).not.toContain('portrait_url');
    expect(speaker?.photoUrl).toBe('https://example.com/avatar-90.png');
    expect(speaker?.portraitUrl).toBeNull();
  });

  it('counts every confirmed non-showcase appearance before limiting display rows', async () => {
    const speakerResult = {
      data: {
        id: 'speaker-many',
        name: 'Frequent Speaker',
        title: null,
        company: null,
        bio: null,
        photo_url: null,
        portrait_url: null,
        linkedin_url: null,
        twitter_url: null,
        website_url: null,
      },
      error: null,
    };
    const eventRows = Array.from({ length: 10 }, (_, index) => ({
      id: `event-${index + 1}`,
      slug: `event-${index + 1}`,
      title: `Event ${index + 1}`,
      start_time: `2026-08-${String(index + 1).padStart(2, '0')}T18:00:00.000Z`,
      location: null,
      event_format: 'virtual',
      event_image_url: null,
      source_domain: 'example.com',
      source_url: 'https://example.com',
      status: 'confirmed',
      organizer: null,
    }));
    eventRows.push({
      ...eventRows[0],
      id: 'showcase-event',
      slug: 'showcase-event',
      source_domain: 'showcase.kurecal.local',
      source_url: 'https://showcase.kurecal.local/events/showcase-event',
    });

    const resultByTable = {
      speakers: speakerResult,
      event_speakers_flat: {
        data: eventRows.map((event) => ({ event_id: event.id })),
        error: null,
      },
      events: { data: eventRows, error: null },
    };
    const readClient = {
      from: vi.fn((table: keyof typeof resultByTable) => {
        const result = resultByTable[table];
        const query = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          in: vi.fn(() => query),
          maybeSingle: vi.fn(() => Promise.resolve(result)),
          then: (resolve: (value: typeof result) => unknown) =>
            Promise.resolve(resolve(result)),
        };
        return query;
      }),
    };

    const speaker = await MobileSpeakerService.getSpeakerDetail({
      speakerId: 'speaker-many',
      readClient: readClient as never,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(speaker?.appearanceCount).toBe(10);
    expect(speaker?.events).toHaveLength(8);
    expect(speaker?.events[0]?.id).toBe('event-1');
  });
});
