/**
 * API Route: Admin Reports
 * 
 * GET: Fetch report data for admin dashboards
 * Query params:
 *   - type: 'ingestion-summary' | 'moderation-sla' | 'enrichment-coverage'
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';

export interface IngestionSummaryReport {
    type: 'ingestion-summary';
    dateRange: { start: string; end: string };
    metrics: {
        totalEventsIngested: number;
        newEvents: number;
        updatedEvents: number;
        updateQueueItems: number;
        approvalRate: number;
        autoAppliedRate: number;
    };
    dailyBreakdown: Array<{
        date: string;
        newEvents: number;
        updatedEvents: number;
    }>;
}

export interface ModerationSLAReport {
    type: 'moderation-sla';
    dateRange: { start: string; end: string };
    metrics: {
        totalReviewed: number;
        averageTimeToReview: number; // in hours
        pendingCount: number;
        withinSLA: number; // percentage
        overdueCount: number;
    };
    byReviewer: Array<{
        reviewerId: string;
        reviewerName: string;
        reviewCount: number;
        avgReviewTime: number;
    }>;
}

export interface EnrichmentCoverageReport {
    type: 'enrichment-coverage';
    dateRange: { start: string; end: string };
    metrics: {
        totalEvents: number;
        enrichedCount: number;
        coverageRate: number;
        avgFieldsFilled: number;
    };
    byField: Array<{
        fieldName: string;
        filledCount: number;
        percentage: number;
    }>;
}

export type ReportData = IngestionSummaryReport | ModerationSLAReport | EnrichmentCoverageReport;

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const url = new URL(request.url);
        const reportType = url.searchParams.get('type') || 'ingestion-summary';
        const startDateStr = url.searchParams.get('startDate');
        const endDateStr = url.searchParams.get('endDate');

        // Default to last 7 days if no dates provided
        const endDate = endDateStr ? new Date(endDateStr) : new Date();
        const startDate = startDateStr 
            ? new Date(startDateStr) 
            : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = supabase as any;

        if (reportType === 'ingestion-summary') {
            const report = await generateIngestionSummary(tableClient, startDate, endDate);
            return NextResponse.json(report);
        } else if (reportType === 'moderation-sla') {
            const report = await generateModerationSLA(tableClient, startDate, endDate);
            return NextResponse.json(report);
        } else if (reportType === 'enrichment-coverage') {
            const report = await generateEnrichmentCoverage(tableClient, startDate, endDate);
            return NextResponse.json(report);
        }

        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });

    } catch (error) {
        console.error('Error generating report:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateIngestionSummary(supabase: any, startDate: Date, endDate: Date): Promise<IngestionSummaryReport> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Get total events created in range
    const { count: newEventsCount } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startIso)
        .lte('created_at', endIso);

    // Get update queue activity
    const { data: queueData } = await supabase
        .from('event_update_queue')
        .select('id, status')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

    const queueItems = queueData || [];
    const approvedCount = queueItems.filter((item: { status: string }) => item.status === 'approved').length;
    const autoAppliedCount = queueItems.filter((item: { status: string }) => item.status === 'auto_applied').length;
    
    const approvalRate = queueItems.length > 0 
        ? (approvedCount / queueItems.length) * 100 
        : 0;
    const autoAppliedRate = queueItems.length > 0 
        ? (autoAppliedCount / queueItems.length) * 100 
        : 0;

    // Get daily breakdown using RPC or manual aggregation
    const dailyBreakdown: Array<{ date: string; newEvents: number; updatedEvents: number }> = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const { count: dayNewEvents } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString());

        const { count: dayUpdates } = await supabase
            .from('event_update_queue')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString());

        dailyBreakdown.push({
            date: currentDate.toISOString().split('T')[0],
            newEvents: dayNewEvents || 0,
            updatedEvents: dayUpdates || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
        type: 'ingestion-summary',
        dateRange: { start: startIso, end: endIso },
        metrics: {
            totalEventsIngested: (newEventsCount || 0) + queueItems.length,
            newEvents: newEventsCount || 0,
            updatedEvents: queueItems.length,
            updateQueueItems: queueItems.length,
            approvalRate: Math.round(approvalRate * 10) / 10,
            autoAppliedRate: Math.round(autoAppliedRate * 10) / 10,
        },
        dailyBreakdown,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateModerationSLA(supabase: any, startDate: Date, endDate: Date): Promise<ModerationSLAReport> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Get moderation queue items reviewed in range
    const { data: moderatedItems } = await supabase
        .from('event_moderation_queue')
        .select('id, status, created_at, reviewed_at, reviewed_by')
        .gte('reviewed_at', startIso)
        .lte('reviewed_at', endIso);

    const reviewed = moderatedItems || [];
    
    // Calculate average review time
    let totalReviewTime = 0;
    let reviewedWithTime = 0;
    
    for (const item of reviewed) {
        if (item.created_at && item.reviewed_at) {
            const created = new Date(item.created_at).getTime();
            const reviewedAt = new Date(item.reviewed_at).getTime();
            totalReviewTime += (reviewedAt - created) / (1000 * 60 * 60); // hours
            reviewedWithTime++;
        }
    }

    const avgReviewTime = reviewedWithTime > 0 
        ? Math.round((totalReviewTime / reviewedWithTime) * 10) / 10 
        : 0;

    // Get pending items
    const { count: pendingCount } = await supabase
        .from('event_moderation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

    // SLA is 24 hours - calculate how many are within SLA
    const slaThreshold = 24; // hours
    const withinSLACount = reviewed.filter((item: { created_at?: string; reviewed_at?: string }) => {
        if (!item.created_at || !item.reviewed_at) return false;
        const reviewTimeHours = (new Date(item.reviewed_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60);
        return reviewTimeHours <= slaThreshold;
    }).length;

    const withinSLA = reviewed.length > 0 
        ? Math.round((withinSLACount / reviewed.length) * 100) 
        : 100;

    // Get overdue items (pending for more than 24 hours)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: overdueCount } = await supabase
        .from('event_moderation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', dayAgo);

    return {
        type: 'moderation-sla',
        dateRange: { start: startIso, end: endIso },
        metrics: {
            totalReviewed: reviewed.length,
            averageTimeToReview: avgReviewTime,
            pendingCount: pendingCount || 0,
            withinSLA,
            overdueCount: overdueCount || 0,
        },
        byReviewer: [], // Would need to join with profiles table for names
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateEnrichmentCoverage(supabase: any, startDate: Date, endDate: Date): Promise<EnrichmentCoverageReport> {
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Get events created in range
    const { data: events } = await supabase
        .from('events')
        .select('id, title, description, location, start_time, end_time, is_online, enrichment_status, tags_extracted, audiences_extracted')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

    const eventList = events || [];
    const totalEvents = eventList.length;

    // Calculate enrichment coverage
    const enrichedCount = eventList.filter((e: { enrichment_status?: string }) => 
        e.enrichment_status === 'completed' || e.enrichment_status === 'success'
    ).length;

    const coverageRate = totalEvents > 0 
        ? Math.round((enrichedCount / totalEvents) * 100) 
        : 0;

    // Calculate field coverage
    const fieldCounts = {
        title: 0,
        description: 0,
        location: 0,
        start_time: 0,
        end_time: 0,
        is_online: 0,
        tags: 0,
        audiences: 0,
    };

    for (const event of eventList) {
        if (event.title) fieldCounts.title++;
        if (event.description) fieldCounts.description++;
        if (event.location) fieldCounts.location++;
        if (event.start_time) fieldCounts.start_time++;
        if (event.end_time) fieldCounts.end_time++;
        if (event.is_online !== null) fieldCounts.is_online++;
        if (event.tags_extracted) fieldCounts.tags++;
        if (event.audiences_extracted) fieldCounts.audiences++;
    }

    const byField = Object.entries(fieldCounts).map(([fieldName, filledCount]) => ({
        fieldName,
        filledCount,
        percentage: totalEvents > 0 ? Math.round((filledCount / totalEvents) * 100) : 0,
    }));

    const filledFields = Object.values(fieldCounts);
    const avgFieldsFilled = totalEvents > 0 && filledFields.length > 0
        ? Math.round((filledFields.reduce((a, b) => a + b, 0) / (totalEvents * filledFields.length)) * 100) / 10
        : 0;

    return {
        type: 'enrichment-coverage',
        dateRange: { start: startIso, end: endIso },
        metrics: {
            totalEvents,
            enrichedCount,
            coverageRate,
            avgFieldsFilled,
        },
        byField,
    };
}
