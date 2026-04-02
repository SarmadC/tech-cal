import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityModerationService } from '@/services/communityModerationService';

function createChain<T>(terminal: {
  maybeSingle?: () => Promise<T>;
}) {
  const chain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  } = {} as never;

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => {
    if (!terminal.maybeSingle) {
      throw new Error('maybeSingle was not configured for this chain.');
    }

    return terminal.maybeSingle();
  });

  return chain;
}

describe('CommunityModerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects replies whose parent belongs to a different post', async () => {
    const parentLookupChain = createChain({
      maybeSingle: async () => ({
        data: {
          id: '33333333-3333-4333-8333-333333333333',
          post_id: '44444444-4444-4444-8444-444444444444',
        },
        error: null,
      }),
    });

    const supabase = {
      from: vi.fn(() => parentLookupChain),
    } as any;

    await expect(
      CommunityModerationService.assertReplyParentMatchesPost(
        '55555555-5555-4555-8555-555555555555',
        '33333333-3333-4333-8333-333333333333',
        supabase
      )
    ).rejects.toThrow('Replies must belong to the same discussion.');
  });

  it('rejects hard-deleting a removed post', async () => {
    const ownedContentChain = createChain({
      maybeSingle: async () => ({
        data: {
          id: '66666666-6666-4666-8666-666666666666',
          moderation_status: 'removed',
        },
        error: null,
      }),
    });

    const supabase = {
      from: vi.fn(() => ownedContentChain),
    } as any;

    await expect(
      CommunityModerationService.assertOwnContentCanBeDeleted(
        'post',
        '66666666-6666-4666-8666-666666666666',
        '77777777-7777-4777-8777-777777777777',
        supabase
      )
    ).rejects.toThrow('Removed posts cannot be deleted.');
  });

  it('rejects hard-deleting a removed comment', async () => {
    const ownedContentChain = createChain({
      maybeSingle: async () => ({
        data: {
          id: '88888888-8888-4888-8888-888888888888',
          moderation_status: 'removed',
        },
        error: null,
      }),
    });

    const supabase = {
      from: vi.fn(() => ownedContentChain),
    } as any;

    await expect(
      CommunityModerationService.assertOwnContentCanBeDeleted(
        'comment',
        '88888888-8888-4888-8888-888888888888',
        '99999999-9999-4999-8999-999999999999',
        supabase
      )
    ).rejects.toThrow('Removed comments cannot be deleted.');
  });
});
