import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import { TelemetryAnalyticsService } from '@/services/telemetryAnalyticsService';

type TelemetryRow = Database['public']['Tables']['telemetry_events']['Row'];

interface TelemetryQueryChain {
  select: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
}

function createTelemetryQuery(rows: TelemetryRow[]): TelemetryQueryChain {
  const query: TelemetryQueryChain = {
    select: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: rows, error: null });

  return query;
}

function makeTelemetryRow(overrides: Partial<TelemetryRow>): TelemetryRow {
  return {
    id: crypto.randomUUID(),
    event_type: 'unknown',
    event_version: 1,
    source: 'web',
    user_id: null,
    session_id: null,
    request_id: null,
    occurred_at: '2026-02-17T00:00:00.000Z',
    received_at: '2026-02-17T00:00:00.000Z',
    metadata: {},
    context: {},
    ...overrides,
  };
}

function daysAgoIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

describe('TelemetryAnalyticsService social stage gates', () => {
  let mockSupabaseClient: SupabaseClientType;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fromMock = vi.fn();
    mockSupabaseClient = {
      from: fromMock,
    } as unknown as SupabaseClientType;
  });

  it('computes phase A/B/C stage-gate rates and CTRs', async () => {
    const rows: TelemetryRow[] = [
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'attendance_opt_in',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'whos_going_impression',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'whos_going_click',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-2',
        event_type: 'whos_going_impression',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-2',
        event_type: 'follow_action',
        metadata: { action: 'follow' },
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-2',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(14),
      }),
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(15),
      }),
      makeTelemetryRow({
        user_id: 'user-3',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-4',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-4',
        event_type: 'unknown',
        occurred_at: daysAgoIso(10),
      }),
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'network_badge_impression',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'network_badge_click',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-2',
        event_type: 'network_badge_impression',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-1',
        event_type: 'discovery_attendance_toggle',
        metadata: { action: 'set_attending', source: 'card_icon' },
        context: { surface: 'desktop' },
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-2',
        event_type: 'discovery_attendance_toggle',
        metadata: { action: 'clear_attending', source: 'card_icon' },
        context: { surface: 'mobile' },
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'user-2',
        event_type: 'discovery_attendance_toggle',
        metadata: { action: 'typo_set_attending', source: 'card_icon' },
        context: { surface: 'mobile' },
        occurred_at: daysAgoIso(20),
      }),
    ];

    fromMock.mockImplementation((table: string) => {
      if (table === 'telemetry_events') {
        return createTelemetryQuery(rows);
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const summary = await TelemetryAnalyticsService.getSummary(mockSupabaseClient, {
      days: 30,
      maxEvents: 100,
    });

    expect(summary.socialStageGates.denominator.consentedActiveUsers).toBe(4);
    expect(summary.socialStageGates.denominator.note).toContain('analytics-consented active users');

    expect(summary.socialStageGates.phaseA.attendanceOptInUsers).toBe(1);
    expect(summary.socialStageGates.phaseA.attendanceOptInRate).toBeCloseTo(1 / 4, 6);
    expect(summary.socialStageGates.phaseA.whosGoingImpressions).toBe(2);
    expect(summary.socialStageGates.phaseA.whosGoingClicks).toBe(1);
    expect(summary.socialStageGates.phaseA.whosGoingCtr).toBeCloseTo(0.5, 6);

    expect(summary.socialStageGates.phaseB.usersWhoFollowed).toBe(1);
    expect(summary.socialStageGates.phaseB.followAdoptionRate).toBeCloseTo(1 / 4, 6);
    expect(summary.socialStageGates.phaseB.profileViews).toBe(4);
    expect(summary.socialStageGates.phaseB.followToReturnUsers).toBe(1);
    expect(summary.socialStageGates.phaseB.followToReturnCohortUsers).toBe(1);
    expect(summary.socialStageGates.phaseB.followToReturnRate).toBeCloseTo(1, 6);

    expect(summary.socialStageGates.phaseC.networkBadgeImpressions).toBe(2);
    expect(summary.socialStageGates.phaseC.networkBadgeClicks).toBe(1);
    expect(summary.socialStageGates.phaseC.networkBadgeCtr).toBeCloseTo(0.5, 6);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleCount).toBe(3);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleUsers).toBe(2);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleRate).toBeCloseTo(2 / 4, 6);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleSetCount).toBe(1);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleClearCount).toBe(1);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleUnknownActionCount).toBe(1);
    expect(
      summary.socialStageGates.phaseC.discoveryAttendanceToggleSetCount +
      summary.socialStageGates.phaseC.discoveryAttendanceToggleClearCount +
      summary.socialStageGates.phaseC.discoveryAttendanceToggleUnknownActionCount
    ).toBe(summary.socialStageGates.phaseC.discoveryAttendanceToggleCount);
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleBySurface).toEqual([
      { surface: 'mobile:card_icon', count: 2 },
      { surface: 'desktop:card_icon', count: 1 },
    ]);
    expect(summary.socialStageGates.phaseC.retentionFollowersReturnRate).toBeCloseTo(1, 6);
    expect(summary.socialStageGates.phaseC.retentionNonFollowersReturnRate).toBeCloseTo(1 / 3, 6);
    expect(summary.socialStageGates.phaseC.retentionDelta).toBeCloseTo(2 / 3, 6);
    expect(summary.socialStageGates.phaseC.retentionFollowersCohortUsers).toBe(1);
    expect(summary.socialStageGates.phaseC.retentionNonFollowersCohortUsers).toBe(3);
  });

  it('returns null rates when denominator events are missing', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'telemetry_events') {
        return createTelemetryQuery([]);
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const summary = await TelemetryAnalyticsService.getSummary(mockSupabaseClient, { days: 7, maxEvents: 100 });

    expect(summary.socialStageGates.denominator.consentedActiveUsers).toBe(0);
    expect(summary.socialStageGates.phaseA.attendanceOptInRate).toBeNull();
    expect(summary.socialStageGates.phaseA.whosGoingCtr).toBeNull();
    expect(summary.socialStageGates.phaseB.followAdoptionRate).toBeNull();
    expect(summary.socialStageGates.phaseB.followToReturnRate).toBeNull();
    expect(summary.socialStageGates.phaseC.networkBadgeCtr).toBeNull();
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleRate).toBeNull();
    expect(summary.socialStageGates.phaseC.discoveryAttendanceToggleUnknownActionCount).toBe(0);
    expect(summary.socialStageGates.phaseC.retentionFollowersReturnRate).toBeNull();
    expect(summary.socialStageGates.phaseC.retentionNonFollowersReturnRate).toBeNull();
    expect(summary.socialStageGates.phaseC.retentionDelta).toBeNull();
  });

  it('requires +24h and return-worthy events for retention calculations', async () => {
    const rows: TelemetryRow[] = [
      makeTelemetryRow({
        user_id: 'follower-1',
        event_type: 'follow_action',
        metadata: { action: 'follow' },
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'follower-1',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(19.7), // <24h after follow, should not count
      }),
      makeTelemetryRow({
        user_id: 'follower-1',
        event_type: 'unknown',
        occurred_at: daysAgoIso(18), // non-return event type
      }),
      makeTelemetryRow({
        user_id: 'follower-1',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(12), // >7d after follow, should not count
      }),
      makeTelemetryRow({
        user_id: 'non-follower-1',
        event_type: 'unknown',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'non-follower-1',
        event_type: 'unknown',
        occurred_at: daysAgoIso(18), // non-return event type
      }),
      makeTelemetryRow({
        user_id: 'non-follower-2',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'non-follower-2',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(19.8), // <24h after anchor, should not count
      }),
      makeTelemetryRow({
        user_id: 'non-follower-3',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(20),
      }),
      makeTelemetryRow({
        user_id: 'non-follower-3',
        event_type: 'profile_view',
        occurred_at: daysAgoIso(19), // exactly +24h, should count
      }),
    ];

    fromMock.mockImplementation((table: string) => {
      if (table === 'telemetry_events') {
        return createTelemetryQuery(rows);
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const summary = await TelemetryAnalyticsService.getSummary(mockSupabaseClient, {
      days: 30,
      maxEvents: 100,
    });

    expect(summary.socialStageGates.phaseB.followToReturnCohortUsers).toBe(1);
    expect(summary.socialStageGates.phaseB.followToReturnUsers).toBe(0);
    expect(summary.socialStageGates.phaseB.followToReturnRate).toBe(0);
    expect(summary.socialStageGates.phaseC.retentionFollowersReturnRate).toBe(0);

    expect(summary.socialStageGates.phaseC.retentionNonFollowersCohortUsers).toBe(3);
    expect(summary.socialStageGates.phaseC.retentionNonFollowersReturnRate).toBeCloseTo(1 / 3, 6);
    expect(summary.socialStageGates.phaseC.retentionDelta).toBeCloseTo(-1 / 3, 6);
  });
});
