import { randomUUID } from 'crypto';
import type {
  CommunityReportInput,
  CommunityReportRecord,
} from '@kurecal/domain';
import type { SupabaseClientType } from '@/types';
import { CommunityModerationService } from '@/services/communityModerationService';

interface CommunityReportRow {
  id: string;
  reporter_id: string;
  subject_type: 'post' | 'comment' | 'profile';
  subject_id: string;
  reason: CommunityReportInput['reason'];
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolution: 'removed' | 'warned' | 'no-action' | 'other' | null;
  resolution_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CommunityReportRow): CommunityReportRecord {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolution: row.resolution ?? null,
    resolutionNotes: row.resolution_notes ?? null,
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CommunityReportService {
  static async createReport(
    reporterId: string,
    payload: CommunityReportInput,
    supabase: SupabaseClientType
  ): Promise<CommunityReportRecord> {
    await CommunityModerationService.assertReportableSubject(
      reporterId,
      payload,
      supabase
    );

    const { data: existingActiveReport, error: existingReportError } = await (supabase as any)
      .from('community_reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .eq('subject_type', payload.subjectType)
      .eq('subject_id', payload.subjectId)
      .in('status', ['open', 'reviewing'])
      .maybeSingle();

    if (existingReportError) {
      throw new Error(existingReportError.message ?? 'Failed to check existing reports.');
    }

    if (existingActiveReport) {
      throw new Error('You already have an active report for this item.');
    }

    const now = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from('community_reports')
      .insert({
        id: randomUUID(),
        reporter_id: reporterId,
        subject_type: payload.subjectType,
        subject_id: payload.subjectId,
        reason: payload.reason,
        details: payload.details ?? null,
        status: 'open',
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message ?? 'Failed to submit report.');
    }

    return mapRow(data as CommunityReportRow);
  }

  static async listReports(
    supabase: SupabaseClientType,
    status?: CommunityReportRow['status']
  ): Promise<CommunityReportRecord[]> {
    let query = (supabase as any)
      .from('community_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message ?? 'Failed to fetch community reports.');
    }

    return ((data as CommunityReportRow[]) ?? []).map(mapRow);
  }

  static async resolveReport(
    reportId: string,
    reviewerId: string,
    updates: {
      status: CommunityReportRow['status'];
      resolution?: CommunityReportRow['resolution'];
      resolutionNotes?: string;
    },
    supabase: SupabaseClientType
  ): Promise<CommunityReportRecord> {
    const { data: existingReport, error: existingReportError } = await (supabase as any)
      .from('community_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (existingReportError || !existingReport) {
      throw new Error(existingReportError?.message ?? 'Failed to load the community report.');
    }

    if (updates.status === 'resolved' && !updates.resolution) {
      throw new Error('A moderation resolution is required when resolving a report.');
    }

    if (updates.status === 'resolved' && updates.resolution) {
      await CommunityModerationService.applyResolutionToSubject(
        {
          subjectType: existingReport.subject_type,
          subjectId: existingReport.subject_id,
          reviewerId,
          resolution: updates.resolution,
          resolutionNotes: updates.resolutionNotes,
        },
        supabase
      );
    }

    const reviewTimestamp = new Date().toISOString();
    let updateQuery = (supabase as any).from('community_reports').update({
      status: updates.status,
      resolution: updates.resolution ?? null,
      resolution_notes: updates.resolutionNotes ?? null,
      reviewed_by: reviewerId,
      reviewed_at: reviewTimestamp,
      updated_at: reviewTimestamp,
    });

    if (updates.status === 'resolved' && updates.resolution) {
      updateQuery = updateQuery
        .eq('subject_type', existingReport.subject_type)
        .eq('subject_id', existingReport.subject_id)
        .in('status', ['open', 'reviewing']);
    } else {
      updateQuery = updateQuery.eq('id', reportId);
    }

    const { data, error } = await updateQuery.select('*');

    if (error) {
      throw new Error(error.message ?? 'Failed to update community report.');
    }

    const updatedReports = (data as CommunityReportRow[]) ?? [];
    const updatedReport =
      updatedReports.find((report) => report.id === reportId) ?? updatedReports[0];

    if (!updatedReport) {
      throw new Error('Failed to load the updated report state.');
    }

    return mapRow(updatedReport);
  }
}
