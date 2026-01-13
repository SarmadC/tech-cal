/**
 * CalendarIntegrationSettings Component
 * 
 * Manages calendar integration settings (Google Calendar sync)
 * Displays connection status, controls, and sync options
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { MaterialIcon } from '@/components/ui/Icon';
import { getErrorMessage } from '@/utils/errorHandling';

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

export default function CalendarIntegrationSettings() {
    const [status, setStatus] = useState<CalendarStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [bulkSyncing, setBulkSyncing] = useState(false);
    const { showSuccess, showError } = useSnackbar();

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/calendar/google/status');
            if (!response.ok) {
                throw new Error('Failed to fetch calendar status');
            }
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error('Error fetching calendar status:', error);
            showError('Failed to load calendar status');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            // Custom OAuth flow - bypass Supabase OAuth
            const redirectUri = `${window.location.origin}/api/calendar/google/callback`;

            console.log('DEBUG: OAuth redirect URI:', redirectUri);
            console.log('DEBUG: window.location.origin:', window.location.origin);
            console.log('DEBUG: window.location.href:', window.location.href);

            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('response_type', 'code');
            // Use full calendar scope - calendar.events might not be enough for calendarList.get()
            authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', 'calendar_connect');

            console.log('DEBUG: Full OAuth URL:', authUrl.toString());

            // Redirect to Google OAuth
            window.location.href = authUrl.toString();
        } catch (error: unknown) {
            console.error('Error connecting calendar:', getErrorMessage(error));
            showError('Failed to connect calendar. Please try again.');
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect your calendar? Your tracked events will remain, but will no longer sync.')) {
            return;
        }

        setDisconnecting(true);
        try {
            const response = await fetch('/api/calendar/google/disconnect', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to disconnect calendar');
            }

            showSuccess('Calendar disconnected successfully');
            setStatus({
                connected: false,
                provider: null,
                isActive: false,
                hasRefreshToken: false,
                lastSyncStatus: null,
                lastSyncAt: null,
                lastSyncError: null
            });
        } catch (error) {
            console.error('Error disconnecting calendar:', error);
            showError('Failed to disconnect calendar');
        } finally {
            setDisconnecting(false);
        }
    };

    const handleBulkSync = async () => {
        setBulkSyncing(true);
        try {
            const response = await fetch('/api/calendar/bulk-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                // Try to extract error message from response
                let errorMessage = 'Failed to sync events';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.details || errorMessage;
                } catch {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();

            if (result.success) {
                showSuccess(`Synced ${result.synced} of ${result.total} events to your calendar`);
                fetchStatus(); // Refresh status
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error: unknown) {
            const errorMessage = getErrorMessage(error);
            console.error('Error syncing events:', errorMessage, error);

            // Provide more user-friendly error messages
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                showError('Unable to connect to the server. Please check your connection and try again.');
            } else {
                showError(errorMessage || 'Failed to sync events. Please try again.');
            }
        } finally {
            setBulkSyncing(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getConnectionError = (status: CalendarStatus): string | null => {
        if (!status.hasRefreshToken) {
            return 'Connection expired';
        }
        if (status.lastSyncStatus === 'failed' && status.lastSyncError) {
            // Convert developer-friendly error to user-friendly message
            if (status.lastSyncError.toLowerCase().includes('token') ||
                status.lastSyncError.toLowerCase().includes('refresh')) {
                return 'Connection expired';
            }
            return 'Sync error';
        }
        return null;
    };

    // State 1: Disconnected (Reference: "Sales Card" - Focus on prompt & value)
    if (!status?.connected) {
        return (
            <div className="space-y-6">
                <div
                    className="w-full rounded-lg p-4 sm:p-6 shadow-xl"
                    style={{
                        backgroundColor: '#1C1C1C',
                        border: '1px solid #333'
                    }}
                >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4 sm:gap-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex-shrink-0">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Google Calendar</h3>
                                <p className="text-sm text-gray-400">Sync tracked events to your calendar.</p>
                            </div>
                        </div>
                        {/* Status Badge: Disconnected */}
                        <div className="self-start sm:self-auto px-3 py-1 rounded-full border border-zinc-700/50 bg-zinc-800/30 text-zinc-500 text-xs font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                            Disconnected
                        </div>
                    </div>

                    {/* Value Props / "How it works" - Indented to align with text */}
                    <div className="pl-0 sm:pl-[60px] grid grid-cols-1 gap-3 mb-8">
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                            <MaterialIcon name="check" size={16} className="text-emerald-500 flex-shrink-0" />
                            <span>Automatically syncs tracked events</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                            <MaterialIcon name="check" size={16} className="text-emerald-500 flex-shrink-0" />
                            <span>Updates when event details change</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                            <MaterialIcon name="check" size={16} className="text-emerald-500 flex-shrink-0" />
                            <span>Removes events when you untrack them</span>
                        </div>
                    </div>

                    {/* Primary Action */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="py-1.5 px-4 rounded font-medium text-sm shadow hover:opacity-90 transition-all flex items-center gap-2"
                            style={{
                                backgroundColor: 'white',
                                color: 'black',
                            }}
                        >
                            {connecting ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <span>Connect</span>
                            )}
                        </button>
                    </div>

                    {/* Privacy Footer */}
                    <p className="text-xs text-center text-gray-600 mt-4">
                        We only access events we create. Your existing data is private.
                    </p>
                </div>
            </div>
        );
    }

    // State 2: Connected - Compact "Active Row" Design
    const connectionError = getConnectionError(status);
    const isHealthy = status?.isActive && status?.hasRefreshToken && status?.lastSyncStatus !== 'failed';

    return (
        <div className="space-y-6">
            <div
                className="w-full rounded-lg h-[72px] px-6 shadow-xl flex items-center justify-between"
                style={{
                    backgroundColor: '#1C1C1C',
                    border: '1px solid #333'
                }}
            >
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-[#252525] border border-[#333] flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                    </div>

                    {/* Details */}
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-white">Google Calendar</h3>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5"></span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            {status?.calendarId || 'Connected'}
                            {status?.lastSyncAt && (
                                <>
                                    <span className="text-[10px]">•</span>
                                    <span>Synced {formatDate(status.lastSyncAt)}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBulkSync}
                        disabled={bulkSyncing}
                        className="text-gray-500 hover:text-white transition-colors"
                        title="Sync Now"
                    >
                        {bulkSyncing ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <MaterialIcon name="refresh" size={18} />
                        )}
                    </button>

                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="px-4 py-1.5 rounded text-xs font-medium text-red-500 hover:bg-white/5 transition-colors border border-white/10 hover:border-white/20"
                    >
                        {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                </div>
            </div>
        </div>
    );

}
