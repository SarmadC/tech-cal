/**
 * Admin landing page
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { isAdminUser } from '@/lib/adminAuth';
import AdminLandingClient, {
    type AdminSocialStageGates,
    type AdminSummaryMetrics,
} from './AdminLandingClient';

export const dynamic = 'force-dynamic';

interface QueueCountsApiResponse {
    updateQueue?: number | null;
    moderation?: number | null;
    enrichment?: number | null;
    fieldProtection?: number | null;
}

interface MonitoringTelemetryApiResponse {
    success?: boolean;
    data?: {
        timeWindow?: {
            days?: number;
        };
        socialStageGates?: {
            denominator?: {
                consentedActiveUsers?: number;
                note?: string;
            };
            phaseA?: {
                attendanceOptInUsers?: number;
                attendanceOptInRate?: number | null;
                whosGoingImpressions?: number;
                whosGoingClicks?: number;
                whosGoingCtr?: number | null;
            };
            phaseB?: {
                usersWhoFollowed?: number;
                followAdoptionRate?: number | null;
                profileViews?: number;
                followToReturnUsers?: number;
                followToReturnCohortUsers?: number;
                followToReturnRate?: number | null;
            };
            phaseC?: {
                networkBadgeImpressions?: number;
                networkBadgeClicks?: number;
                networkBadgeCtr?: number | null;
                discoveryAttendanceToggleCount?: number;
                discoveryAttendanceToggleUsers?: number;
                discoveryAttendanceToggleRate?: number | null;
                discoveryAttendanceToggleSetCount?: number;
                discoveryAttendanceToggleClearCount?: number;
                discoveryAttendanceToggleUnknownActionCount?: number;
                discoveryAttendanceToggleBySurface?: Array<{
                    surface?: string;
                    count?: number;
                }>;
                retentionFollowersReturnRate?: number | null;
                retentionNonFollowersReturnRate?: number | null;
                retentionDelta?: number | null;
                retentionFollowersCohortUsers?: number;
                retentionNonFollowersCohortUsers?: number;
            };
        };
    };
}

export default async function AdminLandingPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const isAdmin = await isAdminUser(user.id, supabase);
    if (!isAdmin) {
        redirect('/');
    }

    // Fetch real queue counts from the API
    let metrics: AdminSummaryMetrics = {
        updateQueuePending: null,
        moderationFlags: null,
        enrichmentBacklog: null,
        protectedFields: null,
    };
    let socialStageGates: AdminSocialStageGates | null = null;

    try {
        // Get the host from headers to construct absolute URL
        const headersList = await headers();
        const host = headersList.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseHeaders = {
            cookie: headersList.get('cookie') || '',
        };

        const [queueCountsResponse, telemetryResponse] = await Promise.all([
            fetch(`${protocol}://${host}/api/admin/ingestion/queue-counts`, {
                headers: baseHeaders,
                cache: 'no-store',
            }),
            fetch(`${protocol}://${host}/api/monitoring/telemetry?days=30`, {
                headers: baseHeaders,
                cache: 'no-store',
            }),
        ]);

        if (queueCountsResponse.ok) {
            const data = (await queueCountsResponse.json()) as QueueCountsApiResponse;
            metrics = {
                updateQueuePending: data.updateQueue ?? null,
                moderationFlags: data.moderation ?? null,
                enrichmentBacklog: data.enrichment ?? null,
                protectedFields: data.fieldProtection ?? null,
            };
        }

        if (telemetryResponse.ok) {
            const payload = (await telemetryResponse.json()) as MonitoringTelemetryApiResponse;
            const gateData = payload.data?.socialStageGates;

            if (payload.success && gateData) {
                socialStageGates = {
                    windowDays: payload.data?.timeWindow?.days ?? 30,
                    denominatorConsentedActiveUsers:
                        gateData.denominator?.consentedActiveUsers ?? 0,
                    denominatorNote: gateData.denominator?.note ?? '',
                    phaseA: {
                        attendanceOptInUsers: gateData.phaseA?.attendanceOptInUsers ?? 0,
                        attendanceOptInRate: gateData.phaseA?.attendanceOptInRate ?? null,
                        whosGoingImpressions: gateData.phaseA?.whosGoingImpressions ?? 0,
                        whosGoingClicks: gateData.phaseA?.whosGoingClicks ?? 0,
                        whosGoingCtr: gateData.phaseA?.whosGoingCtr ?? null,
                    },
                    phaseB: {
                        usersWhoFollowed: gateData.phaseB?.usersWhoFollowed ?? 0,
                        followAdoptionRate: gateData.phaseB?.followAdoptionRate ?? null,
                        profileViews: gateData.phaseB?.profileViews ?? 0,
                        followToReturnUsers: gateData.phaseB?.followToReturnUsers ?? 0,
                        followToReturnCohortUsers: gateData.phaseB?.followToReturnCohortUsers ?? 0,
                        followToReturnRate: gateData.phaseB?.followToReturnRate ?? null,
                    },
                    phaseC: {
                        networkBadgeImpressions: gateData.phaseC?.networkBadgeImpressions ?? 0,
                        networkBadgeClicks: gateData.phaseC?.networkBadgeClicks ?? 0,
                        networkBadgeCtr: gateData.phaseC?.networkBadgeCtr ?? null,
                        discoveryAttendanceToggleCount:
                            gateData.phaseC?.discoveryAttendanceToggleCount ?? 0,
                        discoveryAttendanceToggleUsers:
                            gateData.phaseC?.discoveryAttendanceToggleUsers ?? 0,
                        discoveryAttendanceToggleRate:
                            gateData.phaseC?.discoveryAttendanceToggleRate ?? null,
                        discoveryAttendanceToggleSetCount:
                            gateData.phaseC?.discoveryAttendanceToggleSetCount ?? 0,
                        discoveryAttendanceToggleClearCount:
                            gateData.phaseC?.discoveryAttendanceToggleClearCount ?? 0,
                        discoveryAttendanceToggleUnknownActionCount:
                            gateData.phaseC?.discoveryAttendanceToggleUnknownActionCount ?? 0,
                        discoveryAttendanceToggleBySurface:
                            gateData.phaseC?.discoveryAttendanceToggleBySurface?.map((entry) => ({
                                surface: entry.surface ?? 'unknown',
                                count: entry.count ?? 0,
                            })) ?? [],
                        retentionFollowersReturnRate:
                            gateData.phaseC?.retentionFollowersReturnRate ?? null,
                        retentionNonFollowersReturnRate:
                            gateData.phaseC?.retentionNonFollowersReturnRate ?? null,
                        retentionDelta: gateData.phaseC?.retentionDelta ?? null,
                        retentionFollowersCohortUsers:
                            gateData.phaseC?.retentionFollowersCohortUsers ?? 0,
                        retentionNonFollowersCohortUsers:
                            gateData.phaseC?.retentionNonFollowersCohortUsers ?? 0,
                    },
                };
            }
        }
    } catch (error) {
        console.error('[AdminLandingPage] Error fetching command center data:', error);
        // Fall back to null metrics on error
    }

    return (
        <div className="space-y-6">
            <AdminLandingClient metrics={metrics} socialStageGates={socialStageGates} />
        </div>
    );
}



