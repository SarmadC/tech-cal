/**
 * Export utilities for dashboard
 * DRY: Single source for all export functionality
 */

export interface DashboardExportData {
  kpis: {
    impactAvg: string;
    streak: number;
    attendRate: number;
    peerRank: number;
  };
  summary: {
    totalEvents: number;
    period: string;
    userName: string;
  };
}

/**
 * Export dashboard as PDF
 * Simple approach: use browser print functionality
 */
export const exportToPDF = () => {
  // Trigger browser print dialog with optimized CSS
  if (typeof window !== 'undefined') {
    window.print();
  }
};

/**
 * Export dashboard data as CSV
 */
export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        return typeof value === 'string' && value.includes(',')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  // Create download with proper cleanup
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  } finally {
    // Ensure URL is revoked even if click fails
    URL.revokeObjectURL(url);
  }
};

/**
 * Generate shareable dashboard link
 * Simple approach: encode current date range in URL params
 */
export const generateShareLink = (params: { 
  startDate?: string; 
  endDate?: string; 
  userId?: string 
}): string => {
  if (typeof window === 'undefined') return '';
  
  const baseUrl = window.location.origin;
  const searchParams = new URLSearchParams();
  
  if (params.startDate) searchParams.set('start', params.startDate);
  if (params.endDate) searchParams.set('end', params.endDate);
  if (params.userId) searchParams.set('shared', 'true');
  
  return `${baseUrl}/dashboard?${searchParams.toString()}`;
};

/**
 * Copy link to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

