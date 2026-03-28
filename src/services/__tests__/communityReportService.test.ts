import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityReportService } from '@/services/communityReportService';

const mocks = vi.hoisted(() => ({
  assertReportableSubject: vi.fn(),
  applyResolutionToSubject: vi.fn(),
}));

vi.mock('@/services/communityModerationService', () => ({
  CommunityModerationService: {
    assertReportableSubject: (...args: unknown[]) =>
      mocks.assertReportableSubject(...args),
    applyResolutionToSubject: (...args: unknown[]) =>
      mocks.applyResolutionToSubject(...args),
  },
}));

function createChain<T>(terminal: {
  maybeSingle?: () => Promise<T>;
  select?: () => Promise<T>;
}) {
  return {
    select: vi.fn(function () {
      if (terminal.select) {
        return terminal.select();
      }

      return this;
    }),
    eq: vi.fn(function () {
      return this;
    }),
    in: vi.fn(function () {
      return this;
    }),
    update: vi.fn(function () {
      return this;
    }),
    insert: vi.fn(function () {
      return this;
    }),
    maybeSingle: vi.fn(async () => {
      if (!terminal.maybeSingle) {
        throw new Error('maybeSingle was not configured for this chain.');
      }

      return terminal.maybeSingle();
    }),
  };
}

describe('CommunityReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects duplicate active reports for the same reporter and subject', async () => {
    mocks.assertReportableSubject.mockResolvedValue(undefined);

    const duplicateLookupChain = createChain({
      maybeSingle: async () => ({
        data: {
          id: 'report-1',
          reporter_id: 'user-1',
          subject_type: 'post',
          subject_id: 'post-1',
          reason: 'spam',
          details: null,
          status: 'open',
          resolution: null,
          resolution_notes: null,
          reviewed_at: null,
          reviewed_by: null,
          created_at: '2026-03-24T10:00:00.000Z',
          updated_at: '2026-03-24T10:00:00.000Z',
        },
        error: null,
      }),
    });

    const supabase = {
      from: vi.fn(() => duplicateLookupChain),
    } as any;

    await expect(
      CommunityReportService.createReport(
        'user-1',
        {
          subjectType: 'post',
          subjectId: 'post-1',
          reason: 'spam',
        },
        supabase
      )
    ).rejects.toThrow('You already have an active report for this item.');

    expect(mocks.assertReportableSubject).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ subjectType: 'post', subjectId: 'post-1' }),
      supabase
    );
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('resolves all active reports for a removed subject and applies moderation once', async () => {
    mocks.applyResolutionToSubject.mockResolvedValue(undefined);

    const existingReport = {
      id: 'report-1',
      reporter_id: 'user-1',
      subject_type: 'post',
      subject_id: 'post-1',
      reason: 'harassment',
      details: 'Targeted abuse.',
      status: 'open',
      resolution: null,
      resolution_notes: null,
      reviewed_at: null,
      reviewed_by: null,
      created_at: '2026-03-24T10:00:00.000Z',
      updated_at: '2026-03-24T10:00:00.000Z',
    };

    const updatedRows = [
      {
        ...existingReport,
        status: 'resolved',
        resolution: 'removed',
        resolution_notes: 'Removed after review.',
        reviewed_at: '2026-03-24T11:00:00.000Z',
        reviewed_by: 'admin-1',
        updated_at: '2026-03-24T11:00:00.000Z',
      },
      {
        ...existingReport,
        id: 'report-2',
        reporter_id: 'user-2',
        status: 'resolved',
        resolution: 'removed',
        resolution_notes: 'Removed after review.',
        reviewed_at: '2026-03-24T11:00:00.000Z',
        reviewed_by: 'admin-1',
        updated_at: '2026-03-24T11:00:00.000Z',
      },
    ];

    const lookupChain = createChain({
      maybeSingle: async () => ({ data: existingReport, error: null }),
    });
    const bulkUpdateChain = createChain({
      select: async () => ({ data: updatedRows, error: null }),
    });

    const fromMock = vi
      .fn()
      .mockImplementationOnce(() => lookupChain)
      .mockImplementationOnce(() => bulkUpdateChain);

    const supabase = {
      from: fromMock,
    } as any;

    const result = await CommunityReportService.resolveReport(
      'report-1',
      'admin-1',
      {
        status: 'resolved',
        resolution: 'removed',
        resolutionNotes: 'Removed after review.',
      },
      supabase
    );

    expect(mocks.applyResolutionToSubject).toHaveBeenCalledWith(
      {
        reviewerId: 'admin-1',
        resolution: 'removed',
        resolutionNotes: 'Removed after review.',
        subjectId: 'post-1',
        subjectType: 'post',
      },
      supabase
    );
    expect(result.id).toBe('report-1');
    expect(result.status).toBe('resolved');
    expect(result.resolution).toBe('removed');
  });
});
