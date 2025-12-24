/**
 * Hook for fetching admin reports
 */

import { useState, useCallback } from 'react';
import type { ReportData } from '@/app/api/admin/reports/route';

export type ReportType = 'ingestion-summary' | 'moderation-sla' | 'enrichment-coverage';

interface UseAdminReportsOptions {
    type: ReportType;
    startDate?: Date;
    endDate?: Date;
}

interface UseAdminReportsReturn {
    data: ReportData | null;
    loading: boolean;
    error: string | null;
    fetchReport: () => Promise<void>;
}

export function useAdminReports({ type, startDate, endDate }: UseAdminReportsOptions): UseAdminReportsReturn {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ type });
            
            if (startDate) {
                params.set('startDate', startDate.toISOString());
            }
            if (endDate) {
                params.set('endDate', endDate.toISOString());
            }

            const response = await fetch(`/api/admin/reports?${params.toString()}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.error || 'Failed to fetch report');
            }

            const reportData = await response.json();
            setData(reportData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [type, startDate, endDate]);

    return { data, loading, error, fetchReport };
}
