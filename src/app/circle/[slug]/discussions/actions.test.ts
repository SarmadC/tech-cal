import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCircleComment, deleteCirclePost } from './actions';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  from: vi.fn(),
  delete: vi.fn(),
  firstEq: vi.fn(),
  secondEq: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
  assertOwnContentCanBeDeleted: vi.fn(),
}));

const supabase = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
  from: (...args: unknown[]) => mocks.from(...args),
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => supabase),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mocks.revalidatePath(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (href: string) => mocks.redirect(href),
}));

vi.mock('@/services/communityModerationService', () => ({
  CommunityModerationService: {
    assertOwnContentCanBeDeleted: (...args: unknown[]) =>
      mocks.assertOwnContentCanBeDeleted(...args),
  },
}));

describe('deleteCirclePost', () => {
  const postId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mocks.assertOwnContentCanBeDeleted.mockResolvedValue(undefined);
    mocks.secondEq.mockResolvedValue({ error: null });
    mocks.firstEq.mockReturnValue({ eq: mocks.secondEq });
    mocks.delete.mockReturnValue({ eq: mocks.firstEq });
    mocks.from.mockReturnValue({ delete: mocks.delete });
  });

  it('redirects to the circle page after a successful thread delete', async () => {
    await expect(deleteCirclePost(postId, 'product', '/circle/product')).rejects.toThrow(
      'REDIRECT:/circle/product'
    );

    expect(mocks.from).toHaveBeenCalledWith('circle_posts');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/circle/product');
    expect(mocks.redirect).toHaveBeenCalledWith('/circle/product');
  });

  it.each(['https://evil.example/phish', '//evil.example/phish'])(
    'falls back to the circle page for unsafe redirect target %s',
    async (unsafeRedirectTo) => {
      await expect(deleteCirclePost(postId, 'product', unsafeRedirectTo)).rejects.toThrow(
        'REDIRECT:/circle/product'
      );

      expect(mocks.redirect).not.toHaveBeenCalledWith(unsafeRedirectTo);
      expect(mocks.redirect).toHaveBeenCalledWith('/circle/product');
    }
  );

  it('returns success without redirect when no fallback target is provided', async () => {
    const result = await deleteCirclePost(postId, 'product');

    expect(result).toEqual({ success: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/circle/product');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('returns a moderation error instead of deleting removed posts', async () => {
    mocks.assertOwnContentCanBeDeleted.mockRejectedValue(
      new Error('Removed posts cannot be deleted.')
    );

    const result = await deleteCirclePost(postId, 'product');

    expect(result).toEqual({
      success: false,
      error: 'Removed posts cannot be deleted.',
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteCircleComment', () => {
  const commentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mocks.assertOwnContentCanBeDeleted.mockResolvedValue(undefined);
    mocks.secondEq.mockResolvedValue({ error: null });
    mocks.firstEq.mockReturnValue({ eq: mocks.secondEq });
    mocks.delete.mockReturnValue({ eq: mocks.firstEq });
    mocks.from.mockReturnValue({ delete: mocks.delete });
  });

  it('returns a moderation error instead of deleting removed comments', async () => {
    mocks.assertOwnContentCanBeDeleted.mockRejectedValue(
      new Error('Removed comments cannot be deleted.')
    );

    const result = await deleteCircleComment(commentId, 'product');

    expect(result).toEqual({
      success: false,
      error: 'Removed comments cannot be deleted.',
    });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
