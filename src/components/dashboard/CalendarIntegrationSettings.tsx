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
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to sync events');
            }

            const result = await response.json();
            
            if (result.success) {
                showSuccess(`Synced ${result.synced} of ${result.total} events to your calendar`);
                fetchStatus(); // Refresh status
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error: unknown) {
            console.error('Error syncing events:', getErrorMessage(error));
            showError(getErrorMessage(error) || 'Failed to sync events');
        } finally {
            setBulkSyncing(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
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
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>
                    Google Calendar Integration
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                    Your calendar is connected and syncing automatically.
                </p>

                {/* Connection Status Card */}
                <div 
                    className="border rounded-lg p-6 mb-4"
                    style={{ 
                        backgroundColor: 'var(--background-main)',
                        borderColor: 'var(--border-default)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <MaterialIcon name="calendar" size={20} color="var(--success)" />
                            <span className="font-medium" style={{ color: 'var(--foreground-primary)' }}>
                                Connected to Google Calendar
                            </span>
                        </div>
                        <span 
                            className="px-3 py-1 text-xs font-medium rounded-full"
                            style={{ 
                                backgroundColor: 'var(--success-light)',
                                color: 'var(--success)'
                            }}
                        >
                            Active
                        </span>
                    </div>

                    {/* Refresh Token Warning */}
                    {!status.hasRefreshToken && (
                        <div 
                            className="p-4 rounded-lg mb-4"
                            style={{ 
                                backgroundColor: 'var(--warning-light)',
                                border: '1px solid var(--warning)'
                            }}
                        >
                            <div className="flex items-start gap-2">
                                <MaterialIcon name="warning" size={16} color="var(--warning)" className="mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--foreground-primary)' }}>
                                        Reconnection Required
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                                        Your refresh token is missing. Please reconnect to enable automatic sync.
                                    </p>
                                    <button
                                        onClick={handleConnect}
                                        className="mt-2 px-3 py-1 text-xs font-medium rounded"
                                        style={{
                                            backgroundColor: 'var(--warning)',
                                            color: 'white'
                                        }}
                                    >
                                        Reconnect Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sync Status */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--foreground-secondary)' }}>Last sync:</span>
                            <span style={{ color: 'var(--foreground-primary)' }}>{formatDate(status.lastSyncAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: 'var(--foreground-secondary)' }}>Status:</span>
                            <span 
                                style={{ 
                                    color: status.lastSyncStatus === 'success' 
                                        ? 'var(--success)' 
                                        : status.lastSyncStatus === 'failed' 
                                        ? 'var(--error)' 
                                        : 'var(--foreground-primary)'
                                }}
                            >
                                {status.lastSyncStatus || 'No syncs yet'}
                            </span>
                        </div>
                        {status.lastSyncError && (
                            <div 
                                className="p-3 rounded mt-2"
                                style={{ 
                                    backgroundColor: 'var(--error-light)',
                                    color: 'var(--error)'
                                }}
                            >
                                <p className="text-xs">{status.lastSyncError}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={handleBulkSync}
                        disabled={bulkSyncing}
                        className="px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: 'var(--accent-secondary)',
                            color: 'var(--accent-secondary-foreground)',
                            border: '1px solid var(--border-default)'
                        }}
                    >
                        {bulkSyncing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                <span>Syncing...</span>
                            </>
                        ) : (
                            <>
                                <MaterialIcon name="refresh" size={16} />
                                <span>Sync Existing Events</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: 'var(--error-light)',
                            color: 'var(--error)',
                            border: '1px solid var(--error)'
                        }}
                    >
                        {disconnecting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                <span>Disconnecting...</span>
                            </>
                        ) : (
                            <>
                                <MaterialIcon name="cancel" size={16} />
                                <span>Disconnect Calendar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

