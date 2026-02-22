import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  isAdminUser: vi.fn(),
  checkRateLimit: vi.fn(),
  createRateLimiter: vi.fn(() => ({})),
  getSummary: vi.fn(),
}));

const supabaseClient = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => supabaseClient),
}));

vi.mock('@/lib/adminAuth', () => ({
  isAdminUser: (...args: unknown[]) => mocks.isAdminUser(...args),
}));

vi.mock('@/utils/rateLimit', () => ({
  createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock('@/services/telemetryAnalyticsService', () => ({
  TelemetryAnalyticsService: {
    getSummary: (...args: unknown[]) => mocks.getSummary(...args),
  },
}));

const buildRequest = (url: string) => ({ url }) as unknown as Request;

describe('GET /api/monitoring/telemetry', () => {
  const adminUserId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.isAdminUser.mockResolvedValue(true);
    mocks.getSummary.mockResolvedValue({
      timeWindow: {
        from: '2026-02-11T00:00:00.000Z',
        to: '2026-02-17T23:59:59.999Z',
        days: 7,
      },
      totals: { events: 0, uniqueUsers: 0 },
      eventsByType: [],
      skillRatings: { totalRatings: 0, skills: [] },
      recommendationInteractions: { totalInteractions: 0, byType: [] },
      recommendationBatches: { totalBatches: 0, avgReturnedCount: null, topTags: [] },
      socialStageGates: {
        denominator: {
          consentedActiveUsers: 0,
          note: 'Rates use analytics-consented active users (users with telemetry events in this window).',
        },
        phaseA: {
          attendanceOptInUsers: 0,
          attendanceOptInRate: null,
          whosGoingImpressions: 0,
          whosGoingClicks: 0,
          whosGoingCtr: null,
        },
        phaseB: {
          usersWhoFollowed: 0,
          followAdoptionRate: null,
          profileViews: 0,
        },
        phaseC: {
          networkBadgeImpressions: 0,
          networkBadgeClicks: 0,
          networkBadgeCtr: null,
          discoveryAttendanceToggleCount: 0,
          discoveryAttendanceToggleUsers: 0,
          discoveryAttendanceToggleRate: null,
          discoveryAttendanceToggleSetCount: 0,
          discoveryAttendanceToggleClearCount: 0,
          discoveryAttendanceToggleUnknownActionCount: 0,
          discoveryAttendanceToggleBySurface: [],
        },
      },
      rawSampleSize: 0,
      truncated: false,
    });
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(
      buildRequest('http://localhost/api/monitoring/telemetry') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Authentication required');
    expect(mocks.isAdminUser).not.toHaveBeenCalled();
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.getSummary).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not an admin', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: adminUserId } },
      error: null,
    });
    mocks.isAdminUser.mockResolvedValue(false);

    const response = await GET(
      buildRequest('http://localhost/api/monitoring/telemetry') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Admin access required');
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.getSummary).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: adminUserId } },
      error: null,
    });
    mocks.checkRateLimit.mockResolvedValue({ success: false });

    const response = await GET(
      buildRequest('http://localhost/api/monitoring/telemetry') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Too many requests. Please try again later.');
    expect(mocks.getSummary).not.toHaveBeenCalled();
  });

  it('returns telemetry summary for authenticated admin requests', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: adminUserId } },
      error: null,
    });

    const response = await GET(
      buildRequest('http://localhost/api/monitoring/telemetry?days=14&limit=500') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.isAdminUser).toHaveBeenCalledWith(adminUserId, supabaseClient);
    expect(mocks.checkRateLimit).toHaveBeenCalled();
    expect(mocks.getSummary).toHaveBeenCalledWith(supabaseClient, {
      days: 14,
      maxEvents: 500,
    });
    expect(payload.data.socialStageGates.phaseC.networkBadgeCtr).toBeNull();
  });
});
