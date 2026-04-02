import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  createReport: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/communityReportService', () => ({
  CommunityReportService: {
    createReport: (...args: unknown[]) => mocks.createReport(...args),
  },
}));

describe('POST /api/community/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when authentication is missing', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/community/reports', {
        method: 'POST',
        body: JSON.stringify({
          subjectType: 'post',
          subjectId: '55555555-5555-4555-8555-555555555555',
          reason: 'other',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it('submits a parsed report for the authenticated user', async () => {
    const supabase = { from: vi.fn() };
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase,
      user: { id: '66666666-6666-4666-8666-666666666666' },
    });
    mocks.createReport.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      reporterId: '66666666-6666-4666-8666-666666666666',
      subjectType: 'post',
      subjectId: '55555555-5555-4555-8555-555555555555',
      reason: 'spam',
      details: 'Repeated scam links.',
      status: 'open',
      resolution: null,
      resolutionNotes: null,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: '2026-03-24T08:00:00.000Z',
      updatedAt: '2026-03-24T08:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/community/reports', {
        method: 'POST',
        body: JSON.stringify({
          subjectType: 'post',
          subjectId: '55555555-5555-4555-8555-555555555555',
          reason: 'spam',
          details: 'Repeated scam links.',
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('submitted');
    expect(mocks.createReport).toHaveBeenCalledWith(
      '66666666-6666-4666-8666-666666666666',
      expect.objectContaining({
        subjectType: 'post',
        reason: 'spam',
      }),
      supabase
    );
  });
});
