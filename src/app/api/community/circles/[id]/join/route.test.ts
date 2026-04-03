import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

function createCircleLookup(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

describe('/api/community/circles/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {
        from: mocks.from,
      },
      user: { id: 'user-1' },
    });
  });

  it('joins a circle for an authenticated bearer request', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'circles') {
        return createCircleLookup({ id: 'circle-1' });
      }

      if (table === 'circle_members') {
        return {
          insert,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await POST(
      new Request('http://localhost/api/community/circles/circle-1/join', {
        method: 'POST',
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: 'circle-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      circle_id: 'circle-1',
      user_id: 'user-1',
    });
  });

  it('leaves a circle for an authenticated bearer request', async () => {
    const match = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === 'circles') {
        return createCircleLookup({ id: 'circle-1' });
      }

      if (table === 'circle_members') {
        return {
          delete: vi.fn().mockReturnValue({ match }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await DELETE(
      new Request('http://localhost/api/community/circles/circle-1/join', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: 'circle-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(match).toHaveBeenCalledWith({
      circle_id: 'circle-1',
      user_id: 'user-1',
    });
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await POST(
      new Request('http://localhost/api/community/circles/circle-1/join', {
        method: 'POST',
      }),
      {
        params: Promise.resolve({ id: 'circle-1' }),
      }
    );

    expect(response.status).toBe(401);
  });
});
