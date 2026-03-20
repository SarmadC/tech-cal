import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCirclePost } from './actions';

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

describe('deleteCirclePost', () => {
  const postId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
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

  it('returns success without redirect when no fallback target is provided', async () => {
    const result = await deleteCirclePost(postId, 'product');

    expect(result).toEqual({ success: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/circle/product');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
