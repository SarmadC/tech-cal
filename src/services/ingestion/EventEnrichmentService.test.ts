import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventEnrichmentService } from './EventEnrichmentService';

const mocks = vi.hoisted(() => ({
  proxyImageToStorage: vi.fn(),
  upsertSpeakers: vi.fn(),
  trackManualEdit: vi.fn(),
}));

vi.mock('@/services/imageProxyService', () => ({
  isSupabaseStorageUrl: (value: string | null | undefined) =>
    Boolean(value?.includes('/storage/v1/object/public/')),
  proxyImageToStorage: (...args: unknown[]) => mocks.proxyImageToStorage(...args),
  urlStorageKey: (prefix: string, sourceUrl: string) => `${prefix}/mock-key-${sourceUrl.length}`,
}));

vi.mock('./repositories/EventRepository', () => ({
  EventRepository: {
    upsertSpeakers: (...args: unknown[]) => mocks.upsertSpeakers(...args),
  },
}));

vi.mock('./EventUpdateService', () => ({
  EventUpdateService: {
    trackManualEdit: (...args: unknown[]) => mocks.trackManualEdit(...args),
  },
}));

function createSupabaseMock() {
  const update = vi.fn(() => ({
    eq: vi.fn(async () => ({ error: null })),
  }));
  const single = vi.fn(async () => ({
    data: { speaker_lineup: null },
    error: null,
  }));
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table === 'events') {
      return { select, update };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    client: { from },
    update,
  };
}

describe('EventEnrichmentService.createOrUpdateSpeakers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.proxyImageToStorage.mockResolvedValue(
      'https://project.supabase.co/storage/v1/object/public/avatars/speaker-profile-photos/mock-key-33.jpg'
    );
    mocks.upsertSpeakers.mockResolvedValue(['speaker-1']);
    mocks.trackManualEdit.mockResolvedValue(undefined);
  });

  it('copies manual speaker profile image URLs to storage before saving', async () => {
    const { client, update } = createSupabaseMock();

    const result = await EventEnrichmentService.createOrUpdateSpeakers(
      'event-1',
      [
        {
          name: 'Ada Lovelace',
          linkedinUrl: 'https://www.linkedin.com/in/ada',
          photoUrl: 'https://temporary.example.com/ada.jpg',
        },
      ],
      client as never,
      'admin-1'
    );

    expect(result).toEqual({ success: true, speakerIds: ['speaker-1'] });
    expect(mocks.proxyImageToStorage).toHaveBeenCalledWith({
      sourceUrl: 'https://temporary.example.com/ada.jpg',
      bucket: 'avatars',
      storagePath: 'speaker-profile-photos/mock-key-37',
      supabaseClient: client,
    });
    expect(mocks.upsertSpeakers).toHaveBeenCalledWith(client, [
      {
        name: 'Ada Lovelace',
        linkedinUrl: 'https://www.linkedin.com/in/ada',
        photoUrl:
          'https://project.supabase.co/storage/v1/object/public/avatars/speaker-profile-photos/mock-key-33.jpg',
      },
    ]);
    expect(update).toHaveBeenCalledWith({
      speaker_lineup: [
        {
          id: 'speaker-1',
          name: 'Ada Lovelace',
          linkedinUrl: 'https://www.linkedin.com/in/ada',
          title: undefined,
          company: undefined,
          bio: undefined,
          photoUrl:
            'https://project.supabase.co/storage/v1/object/public/avatars/speaker-profile-photos/mock-key-33.jpg',
          twitterUrl: undefined,
          websiteUrl: undefined,
        },
      ],
    });
  });
});
