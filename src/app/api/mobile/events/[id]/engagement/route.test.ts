import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mobileEventEngagementSchema } from '@kurecal/domain';
import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  loadEngagementMap: vi.fn(),
  toggleBookmark: vi.fn(),
  setAttendanceStatus: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

vi.mock('@/services/userEventService', () => ({
  UserEventService: {
    toggleBookmark: (...args: unknown[]) => mocks.toggleBookmark(...args),
    setAttendanceStatus: (...args: unknown[]) => mocks.setAttendanceStatus(...args),
  },
}));

describe('mobile event engagement route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAuthContext.mockResolvedValue({
      supabase: {},
      user: { id: '22222222-2222-4222-8222-222222222222' },
    });
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          '11111111-1111-4111-8111-111111111111',
          { isBookmarked: true, status: 'attending' },
        ],
      ])
    );
  });

  it('returns the current engagement state for a mobile event', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/events/11111111-1111-4111-8111-111111111111/engagement', {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mobileEventEngagementSchema.parse(payload.data).status).toBe('attending');
  });

  it('updates bookmark state through the server contract and returns the fresh engagement snapshot', async () => {
    const response = await POST(
      new Request('http://localhost/api/mobile/events/11111111-1111-4111-8111-111111111111/engagement', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isBookmarked: false }),
      }),
      {
        params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.toggleBookmark).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
      false,
      {}
    );
    expect(mobileEventEngagementSchema.parse(payload.data).isBookmarked).toBe(true);
  });

  it('updates attendance state through the server contract', async () => {
    await POST(
      new Request('http://localhost/api/mobile/events/11111111-1111-4111-8111-111111111111/engagement', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: null }),
      }),
      {
        params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }),
      }
    );

    expect(mocks.setAttendanceStatus).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
      null,
      undefined,
      {}
    );
  });
});
