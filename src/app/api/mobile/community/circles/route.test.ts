import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityCircleSummarySchema } from '@kurecal/domain';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

describe('GET /api/mobile/community/circles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns joined circles for the authenticated mobile user', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [
        {
          circles: {
            id: '11111111-1111-4111-8111-111111111111',
            slug: 'design-systems',
            name: 'Design Systems',
          },
        },
      ],
      error: null,
    });

    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({ eq })),
        })),
      },
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/community/circles', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(communityCircleSummarySchema.array().parse(payload.data)).toHaveLength(1);
  });

  it('returns 401 when the mobile user is not authenticated', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: null,
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/community/circles')
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
  });
});
