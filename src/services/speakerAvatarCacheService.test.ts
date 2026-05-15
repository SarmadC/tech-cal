import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpeakerAvatarCacheService } from './speakerAvatarCacheService';

const mocks = vi.hoisted(() => ({
  fetchWithSafeRedirects: vi.fn(),
  captureException: vi.fn(),
  upload: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock('@/lib/ssrfProtection', () => ({
  fetchWithSafeRedirects: (...args: unknown[]) =>
    mocks.fetchWithSafeRedirects(...args),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mocks.captureException(...args),
}));

function createSupabaseClient(rows: Array<{
  id: string;
  name: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
}> = []) {
  return {
    storage: {
      from(bucket: string) {
        expect(bucket).toBe('avatars');
        return {
          upload: (...args: unknown[]) => mocks.upload(...args),
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: `https://example.supabase.co/storage/v1/object/public/avatars/${path}`,
              },
            };
          },
        };
      },
    },
    from(table: string) {
      if (table !== 'speakers') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        update(data: Record<string, unknown>) {
          return {
            eq(field: string, value: string) {
              return mocks.updateEq(field, value, data);
            },
          };
        },
        select(columns: string) {
          expect(columns).toBe('id, name, linkedin_url, photo_url');
          return {
            not(field: string, operator: string, value: null) {
              expect(field).toBe('linkedin_url');
              expect(operator).toBe('is');
              expect(value).toBeNull();
              return {
                order(_orderField: string, _options: { ascending: boolean }) {
                  return {
                    range(from: number, to: number) {
                      return Promise.resolve({
                        data: rows.slice(from, to + 1),
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('SpeakerAvatarCacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue({ error: null });
    mocks.updateEq.mockResolvedValue({ error: null });
  });

  it('caches a LinkedIn-derived avatar to storage and persists the public url', async () => {
    mocks.fetchWithSafeRedirects.mockResolvedValue(
      new Response(new Blob(['avatar-bytes'], { type: 'image/png' }), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': '12',
        },
      })
    );

    const result = await SpeakerAvatarCacheService.cacheSpeakerAvatar({
      speaker: {
        id: 'speaker-1',
        name: 'Dana',
        linkedinUrl: 'https://www.linkedin.com/in/dana',
        currentPhotoUrl: null,
      },
      supabaseClient: createSupabaseClient() as never,
    });

    expect(result.status).toBe('cached');
    const [path, blob, options] = mocks.upload.mock.calls[0] ?? [];
    expect(path).toMatch(/^speakers\/speaker-1-[a-f0-9]{12}\.png$/);
    expect(blob).toEqual(
      expect.objectContaining({
        size: expect.any(Number),
        type: 'image/png',
      })
    );
    expect(options).toEqual(
      expect.objectContaining({
        cacheControl: '3600',
        contentType: 'image/png',
        upsert: true,
      })
    );
    expect(mocks.updateEq).toHaveBeenCalledWith(
      'id',
      'speaker-1',
      expect.objectContaining({
        photo_url: expect.stringContaining('/storage/v1/object/public/avatars/speakers/speaker-1-'),
      })
    );
  });

  it('preserves existing non-cached speaker photos', async () => {
    const result = await SpeakerAvatarCacheService.cacheSpeakerAvatar({
      speaker: {
        id: 'speaker-2',
        name: 'Jamie',
        linkedinUrl: 'https://www.linkedin.com/in/jamie',
        currentPhotoUrl: 'https://conference.example.com/speakers/jamie.jpg',
      },
      supabaseClient: createSupabaseClient() as never,
    });

    expect(result).toEqual({
      speakerId: 'speaker-2',
      status: 'skipped',
      reason: 'Existing non-cached photo preserved',
    });
    expect(mocks.fetchWithSafeRedirects).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rejects non-image resolver responses', async () => {
    mocks.fetchWithSafeRedirects.mockResolvedValue(
      new Response('<html>nope</html>', {
        status: 200,
        headers: {
          'content-type': 'text/html',
        },
      })
    );

    const result = await SpeakerAvatarCacheService.cacheSpeakerAvatar({
      speaker: {
        id: 'speaker-3',
        name: 'Taylor',
        linkedinUrl: 'https://www.linkedin.com/in/taylor',
        currentPhotoUrl: null,
      },
      supabaseClient: createSupabaseClient() as never,
    });

    expect(result.status).toBe('failed');
    expect(result.reason).toContain('Unsupported avatar content type');
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('scans past already-populated photos during dry-run backfill', async () => {
    const summary = await SpeakerAvatarCacheService.backfillLinkedInSpeakerAvatars({
      supabaseClient: createSupabaseClient([
        {
          id: 'speaker-1',
          name: 'A',
          linkedin_url: 'https://www.linkedin.com/in/a',
          photo_url: 'https://conference.example.com/a.jpg',
        },
        {
          id: 'speaker-2',
          name: 'B',
          linkedin_url: 'https://www.linkedin.com/in/b',
          photo_url: null,
        },
        {
          id: 'speaker-3',
          name: 'C',
          linkedin_url: 'https://www.linkedin.com/in/c',
          photo_url: null,
        },
      ]) as never,
      limit: 2,
      scanBatchSize: 2,
      dryRun: true,
    });

    expect(summary).toEqual({
      scanned: 3,
      eligible: 2,
      processed: 0,
      cached: 0,
      skipped: 0,
      failed: 0,
      results: [],
    });
  });
});
