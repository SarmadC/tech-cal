import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const mocks = vi.hoisted(() => ({
  fetchWithSafeRedirects: vi.fn(),
}));

vi.mock('@/lib/ssrfProtection', () => ({
  fetchWithSafeRedirects: (...args: unknown[]) =>
    mocks.fetchWithSafeRedirects(...args),
}));

import { SpeakerPortraitCandidateService } from './speakerPortraitCandidateService';

async function imageResponse(width: number, height: number) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: '#234567' },
  })
    .png()
    .toBuffer();
  return new Response(buffer, {
    headers: {
      'content-length': String(buffer.length),
      'content-type': 'image/png',
    },
  });
}

function candidateResult(
  overrides: Partial<{
    height: number;
    id: string;
    image_url: string;
    speaker_id: string;
    status: string;
    width: number;
  }> = {}
) {
  return {
    data: {
      height: 1200,
      id: 'candidate-1',
      image_url: 'https://official.example/dana-portrait.jpg',
      speaker_id: 'speaker-1',
      status: 'pending',
      width: 1600,
      ...overrides,
    },
    error: null,
  };
}

describe('SpeakerPortraitCandidateService', () => {
  beforeEach(() => {
    mocks.fetchWithSafeRedirects.mockReset();
  });

  it('stores only qualifying official-page srcset candidates', async () => {
    mocks.fetchWithSafeRedirects.mockImplementation(async (url: string) => {
      if (url === 'https://summit.example/speakers') {
        return new Response(
          '<article>Clara Chappaz <img alt="Clara Chappaz" srcset="https://cdn.example/clara-90.png 90w, https://cdn.example/clara-1200.png 1200w"></article>'
        );
      }
      return url.endsWith('1200.png')
        ? imageResponse(1200, 1200)
        : imageResponse(90, 90);
    });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    created_at: '2026-01-01T00:00:00Z',
                    height: 1200,
                    id: 'candidate-1',
                    image_url: 'https://cdn.example/clara-1200.png',
                    source_page_url: 'https://summit.example/speakers',
                    source_type: 'srcset',
                    speaker_id: 'speaker-1',
                    status: 'pending',
                    width: 1200,
                  },
                ],
                error: null,
              }),
          }),
        }),
        upsert,
      })),
    };

    const candidates = await SpeakerPortraitCandidateService.discover({
      speakerId: 'speaker-1',
      speakerName: 'Clara Chappaz',
      sourcePageUrls: ['https://summit.example/speakers'],
      supabaseClient: client as never,
    });

    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          height: 1200,
          image_url: 'https://cdn.example/clara-1200.png',
          width: 1200,
        }),
      ],
      expect.any(Object)
    );
    expect(candidates).toHaveLength(1);
  });

  it('publishes the exact revalidated bytes and reviews atomically', async () => {
    mocks.fetchWithSafeRedirects.mockResolvedValue(
      await imageResponse(1400, 1100)
    );
    const upload = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(candidateResult()),
          }),
        }),
      })),
      rpc,
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: () => ({
            data: {
              publicUrl:
                'https://project.supabase.co/storage/v1/object/public/avatars/speaker-profile-photos/approved/dana.png',
            },
          }),
          upload,
        })),
      },
    };

    await SpeakerPortraitCandidateService.review({
      action: 'approve',
      candidateId: 'candidate-1',
      reviewerId: 'admin-1',
      supabaseClient: client as never,
    });

    const uploadedBuffer = upload.mock.calls[0]?.[1] as Buffer;
    const uploadedMetadata = await sharp(uploadedBuffer).metadata();
    expect(uploadedMetadata).toMatchObject({ height: 1100, width: 1400 });
    expect(rpc).toHaveBeenCalledWith(
      'review_speaker_portrait_candidate',
      expect.objectContaining({
        p_action: 'approve',
        p_candidate_id: 'candidate-1',
        p_portrait_height: 1100,
        p_portrait_width: 1400,
        p_reviewer_id: 'admin-1',
      })
    );
  });

  it('refuses approval when the remote image changed to a thumbnail', async () => {
    mocks.fetchWithSafeRedirects.mockResolvedValue(
      await imageResponse(90, 90)
    );
    const upload = vi.fn();
    const rpc = vi.fn();
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(candidateResult()),
          }),
        }),
      })),
      rpc,
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn(),
          upload,
        })),
      },
    };

    await expect(
      SpeakerPortraitCandidateService.review({
        action: 'approve',
        candidateId: 'candidate-1',
        reviewerId: 'admin-1',
        supabaseClient: client as never,
      })
    ).rejects.toThrow('at least 1024px');
    expect(upload).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects content whose detected format does not match its MIME type', async () => {
    mocks.fetchWithSafeRedirects.mockResolvedValue(
      new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"></svg>',
        { headers: { 'content-type': 'image/png' } }
      )
    );
    const upload = vi.fn();
    const rpc = vi.fn();
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(candidateResult()),
          }),
        }),
      })),
      rpc,
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn(),
          upload,
        })),
      },
    };

    await expect(
      SpeakerPortraitCandidateService.review({
        action: 'approve',
        candidateId: 'candidate-1',
        reviewerId: 'admin-1',
        supabaseClient: client as never,
      })
    ).rejects.toThrow('approved raster format');
    expect(upload).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a candidate through the atomic review RPC without downloading it', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve(candidateResult()),
          }),
        }),
      })),
      rpc,
    };

    await SpeakerPortraitCandidateService.review({
      action: 'reject',
      candidateId: 'candidate-1',
      reviewerId: 'admin-1',
      supabaseClient: client as never,
    });

    expect(mocks.fetchWithSafeRedirects).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      'review_speaker_portrait_candidate',
      expect.objectContaining({
        p_action: 'reject',
        p_portrait_url: null,
      })
    );
  });

  it('drops an oversized source page before parsing candidates', async () => {
    mocks.fetchWithSafeRedirects.mockResolvedValue(
      new Response('ignored', {
        headers: { 'content-length': String(3 * 1024 * 1024) },
      })
    );
    const upsert = vi.fn();
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        upsert,
      })),
    };

    await expect(
      SpeakerPortraitCandidateService.discover({
        speakerId: 'speaker-1',
        speakerName: 'Clara Chappaz',
        sourcePageUrls: ['https://summit.example/oversized'],
        supabaseClient: client as never,
      })
    ).resolves.toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
  });
});
