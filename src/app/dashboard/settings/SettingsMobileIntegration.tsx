'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { MaterialIcon } from '@/components/ui/Icon';
import { getErrorMessage } from '@/utils/errorHandling';
import { Button } from '@/components/ui/button';

interface CalendarStatus {
    connected: boolean;
    provider: string | null;
    isActive: boolean;
    hasRefreshToken: boolean;
    lastSyncStatus: string | null;
    lastSyncAt: string | null;
    lastSyncError: string | null;
    calendarId?: string;
}

export default function SettingsMobileIntegration() {
    const [status, setStatus] = useState<CalendarStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [bulkSyncing, setBulkSyncing] = useState(false);
    const [showManage, setShowManage] = useState(false); // Toggle for detail view
    const { showSuccess, showError } = useSnackbar();

    // --- Logic (Adapted from CalendarIntegrationSettings) ---

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/calendar/google/status');
            if (!response.ok) throw new Error('Failed to fetch calendar status');
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error('Error fetching calendar status:', error);
            showError('Failed to load calendar status');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            window.location.href = '/api/calendar/google/start';
        } catch (error: unknown) {
            console.error('Error connecting calendar:', getErrorMessage(error));
            showError('Failed to connect calendar. Please try again.');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect calendar? Tracking will stop.')) return;
        setDisconnecting(true);
        try {
            const response = await fetch('/api/calendar/google/disconnect', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to disconnect');
            showSuccess('Disconnected');
            setStatus(prev => prev ? { ...prev, connected: false, isActive: false, calendarId: undefined } : null);
            setShowManage(false); // Close manage view
        } catch (_error) {
            showError('Failed to disconnect');
        } finally {
            setDisconnecting(false);
        }
    };

    const handleBulkSync = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening manage view if clicked directly
        setBulkSyncing(true);
        try {
            const response = await fetch('/api/calendar/bulk-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error('Sync failed');
            const result = await response.json();
            if (result.success) {
                showSuccess(`Synced ${result.synced} events`);
                fetchStatus();
            } else {
                throw new Error(result.error);
            }
        } catch (_error) {
            showError('Sync failed');
        } finally {
            setBulkSyncing(false);
        }
    };

    const formatSyncTime = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
        if (diffMins < 1) return 'JUST NOW';
        if (diffMins < 60) return `${diffMins}M AGO`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}H AGO`;
        return `${Math.floor(diffHours / 24)}D AGO`;
    };

    // --- Render ---

    if (loading) return <div className="p-4 text-sm text-zinc-500">Loading integration status...</div>;

    // DEBUG: Force STALE connected state
    const isConnected = true;
    const mockStatus = {
        connected: true,
        calendarId: 'your-google-calendar-id',
        // 2 hours + 5 mins ago
        lastSyncAt: new Date(Date.now() - (125 * 60000)).toISOString(),
        isActive: true,
        hasRefreshToken: true,
        lastSyncStatus: 'success',
        lastSyncError: null,
        provider: 'google'
    };
    const currentStatus = status || mockStatus;

    // Disconnected State: Simple "Connect" Row
    if (!isConnected) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                        Available Integrations
                    </h3>
                    <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)]">
                        <div className="flex items-center justify-between px-4 h-[72px]">
                            <div className="flex items-center gap-3">
                                {/* Framed Icon */}
                                <div className="w-[32px] h-[32px] rounded-[6px] bg-white flex items-center justify-center border border-white/10">
                                    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-medium text-[var(--mono-text-primary)]/90">Google Calendar</span>
                                    <span className="text-[13px] text-[var(--mono-text-secondary)]">Sync events automatically</span>
                                </div>
                            </div>
                            <Button
                                onClick={handleConnect}
                                disabled={connecting}
                                size="sm"
                                className="bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:bg-[var(--mono-text-secondary)] h-8 px-3 text-xs font-medium"
                            >
                                {connecting ? '...' : 'Connect'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Helper for Smart Status Logic
    const getStatusDisplay = (lastSync: string | null, isSyncing: boolean) => {
        if (isSyncing) return { text: 'Syncing...', color: 'text-blue-400', dot: 'bg-blue-400', isFresh: true };

        if (!lastSync) return { text: 'Connected', color: 'text-[#858585]', dot: 'bg-[#858585]', isFresh: false };

        const date = new Date(lastSync);
        const now = new Date();
        const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

        // Fresh (< 1 hour)
        if (diffMins < 60) {
            return { text: 'Synced', color: 'text-[#4ADE80]', dot: 'bg-[#4ADE80]', isFresh: true };
        }

        // Stale (> 1 hour) - "Last synced 2h ago"
        return {
            text: `Last synced ${formatSyncTime(lastSync).toLowerCase()}`,
            color: 'text-[#858585]',
            dot: 'bg-[#858585] border border-[#333]', // Hollow dot effect
            isFresh: false
        };
    };

    const statusDisplay = getStatusDisplay(currentStatus?.lastSyncAt || null, bulkSyncing);

    // Connected State: Active Monitoring Row
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Active Integrations
                </h3>

                <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)]">
                    {/* Main Row (The Monitor) */}
                    <button
                        onClick={() => setShowManage(!showManage)}
                        className="w-full flex items-center justify-between px-4 h-[60px] hover:bg-[var(--mono-bg-hover)] transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            {/* Logo - No Container */}
                            <div className="flex-shrink-0">
                                <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-[14px] font-medium text-[var(--mono-text-primary)] leading-tight">Google Calendar</span>
                                <span className="text-[12px] text-[var(--mono-text-secondary)] leading-tight">
                                    {currentStatus?.calendarId || 'your Google calendar ID'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Smart Status Indicator */}
                            <div className="flex items-center gap-2 px-2 py-1 rounded transition-colors bg-[var(--mono-bg-elevated)]">
                                <div className={`w-1.5 h-1.5 rounded-full ${statusDisplay.dot} ${bulkSyncing ? 'animate-pulse' : ''}`} />
                                <span className={`text-[12px] ${statusDisplay.isFresh ? 'font-medium' : 'font-normal'} ${statusDisplay.color}`}>
                                    {statusDisplay.text}
                                </span>
                            </div>
                        </div>
                    </button>

                    {/* Action Drawer (Inline Controls) - "Inset" Feel */}
                    {showManage && (
                        <div className="bg-[var(--mono-bg-main)] px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                            {/* Sync Button (Ghost) - Aligned */}
                            <button
                                onClick={handleBulkSync}
                                disabled={bulkSyncing}
                                className="flex items-center gap-2 px-0 py-1.5 rounded hover:text-[var(--mono-text-primary)] text-xs font-medium text-[var(--mono-text-secondary)] transition-colors group"
                            >
                                {bulkSyncing ? (
                                    <BrandLoadingLogo
                                        size={14}
                                        inline
                                        label={null}
                                        className="text-[var(--mono-text-tertiary)] group-hover:text-[var(--mono-text-primary)]"
                                    />
                                ) : (
                                    <MaterialIcon name="refresh" size={14} className="text-[var(--mono-text-tertiary)] group-hover:text-[var(--mono-text-primary)]" />
                                )}
                                <span>Sync Now</span>
                            </button>

                            {/* Disconnect Link - 13px Red */}
                            <button
                                onClick={handleDisconnect}
                                disabled={disconnecting}
                                className="text-[13px] font-normal text-[#FF453A] hover:text-[#FF453A]/80 transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
