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

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
        );
    }

    if (!status?.connected) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>
                        Google Calendar Integration
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                        Connect your Google Calendar to automatically sync tracked events.
                    </p>

                    <div
                        className="border rounded-lg p-6"
                        style={{
                            backgroundColor: 'var(--background-main)',
                            borderColor: 'var(--border-default)'
                        }}
                    >
                        <div className="mb-6">
                            <h4 className="text-base font-medium mb-3" style={{ color: 'var(--foreground-primary)' }}>
                                How it works
                            </h4>
                            <ul className="space-y-2 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                <li className="flex items-start">
                                    <MaterialIcon name="check-circle" size={16} className="mr-2 mt-0.5" color="var(--success)" />
                                    <span>When you track an event, it&apos;s automatically added to your Google Calendar</span>
                                </li>
                                <li className="flex items-start">
                                    <MaterialIcon name="check-circle" size={16} className="mr-2 mt-0.5" color="var(--success)" />
                                    <span>When you untrack an event, it&apos;s removed from your calendar</span>
                                </li>
                                <li className="flex items-start">
                                    <MaterialIcon name="check-circle" size={16} className="mr-2 mt-0.5" color="var(--success)" />
                                    <span>Your calendar stays in sync with your tracked events</span>
                                </li>
                            </ul>
                        </div>

                        <div
                            className="p-4 rounded-lg mb-6"
                            style={{
                                backgroundColor: 'var(--warning-light)',
                                borderLeft: '4px solid var(--warning)'
                            }}
                        >
                            <p className="text-sm" style={{ color: 'var(--foreground-primary)' }}>
                                <strong>Privacy Notice:</strong> We&apos;ll request access to add and remove events from your calendar.
                                We never read your existing calendar events or access any other Google data.
                            </p>
                        </div>

                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: 'var(--accent-primary)',
                                color: 'var(--accent-primary-foreground)'
                            }}
                            onMouseEnter={(e) => {
                                if (!connecting) {
                                    e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
                            }}
                        >
                            {connecting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <>
                                    <MaterialIcon name="calendar" size={16} />
                                    <span>Connect Google Calendar</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Connected state
    const connectionError = status ? getConnectionError(status) : null;
    const isHealthy = status?.isActive && status?.hasRefreshToken && status?.lastSyncStatus !== 'failed';
    const needsReconnect = !status?.hasRefreshToken || connectionError;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground-primary)' }}>
                    Google Calendar
                </h3>
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Sync your events automatically.
                </p>
            </div>

            {/* Integration Row - Compact List Item Style */}
            <div className="w-full">
                <div className="flex items-start justify-between py-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                    {/* Left: Icon + Title + Status */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <MaterialIcon
                                name="calendar"
                                size={20}
                                className="text-foreground-primary"
                            />
                            <span
                                className="text-sm font-medium"
                                style={{ color: 'var(--foreground-primary)' }}
                            >
                                Google Calendar
                            </span>
                            {/* Dot indicator */}
                            <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                    backgroundColor: isHealthy ? '#10b981' : '#ef4444'
                                }}
                            />
                        </div>

                        {/* Error message - inline, subtle */}
                        {connectionError && (
                            <p
                                className="text-xs mt-1.5 ml-8"
                                style={{ color: '#f87171' }}
                            >
                                {connectionError}. Please reconnect to resume sync.
                            </p>
                        )}

                        {/* Success state - last sync info */}
                        {!connectionError && status?.lastSyncStatus === 'success' && status?.lastSyncAt && (
                            <p
                                className="text-xs mt-1.5 ml-8"
                                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                            >
                                Last synced {formatDate(status.lastSyncAt)}
                            </p>
                        )}
                    </div>

                    {/* Right: Action Button */}
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {needsReconnect ? (
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="h-8 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                style={{
                                    backgroundColor: 'white',
                                    color: 'black'
                                }}
                                onMouseEnter={(e) => {
                                    if (!connecting) {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!connecting) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                    }
                                }}
                            >
                                {connecting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-black"></div>
                                        <span>Connecting...</span>
                                    </>
                                ) : (
                                    'Reconnect'
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleBulkSync}
                                disabled={bulkSyncing}
                                className="h-8 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'rgba(255, 255, 255, 0.9)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!bulkSyncing) {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!bulkSyncing) {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }
                                }}
                            >
                                {bulkSyncing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                        <span>Syncing...</span>
                                    </>
                                ) : (
                                    'Sync Now'
                                )}
                            </button>
                        )}

                        {/* Disconnect - subtle ghost button */}
                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="h-8 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            style={{
                                backgroundColor: 'transparent',
                                color: 'rgba(255, 255, 255, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                                if (!disconnecting) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!disconnecting) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                }
                            }}
                        >
                            {disconnecting ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                    <span>Disconnecting...</span>
                                </>
                            ) : (
                                'Disconnect'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

