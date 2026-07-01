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
            photo_url: null,
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
  });
});
