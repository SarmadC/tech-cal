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
import { useSubscriptionContext } from '@/contexts';
import UpgradeModal from '@/components/ui/UpgradeModal';

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
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeVariant, setUpgradeVariant] = useState<'trialStart' | 'featureLocked' | 'upgradePrompt'>('featureLocked');
    const { showSuccess, showError } = useSnackbar();
    const {
        isPro,
        isTrialing,
        startTrial,
        openUpgrade,
        hasUsedTrial,
    } = useSubscriptionContext();

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/calendar/google/status');
            if (!response.ok) {
                // If gated, prompt upgrade instead of toasting an error
                if (response.status === 402 || response.status === 403) {
                    setUpgradeVariant(isPro || isTrialing ? 'upgradePrompt' : 'trialStart');
                    setShowUpgradeModal(true);
                    return;
                }
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
    }, [showError, isPro, isTrialing]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const requireProAccess = (): boolean => {
        if (isPro || isTrialing) return true;
        setUpgradeVariant(hasUsedTrial ? 'upgradePrompt' : 'trialStart');
        setShowUpgradeModal(true);
        return false;
    };

    const handleConnect = async () => {
        if (!requireProAccess()) return;
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
        if (!requireProAccess()) return;
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

    const disconnectedView = (
        <div className="space-y-6">
            <div
                className="group relative w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--background-secondary)] p-5 shadow-2xl transition-all hover:border-[var(--border-default)]"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* LEFT PANE: Content & Context */}
                    <div className="flex flex-1 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--background-tertiary)]">
                            <svg viewBox="0 0 24 24" className="h-5 w-5">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-[15px] font-medium leading-none text-[var(--foreground-primary)]">Google Calendar</h3>
                            <p className="mt-1.5 text-[13px] leading-none text-[var(--foreground-tertiary)]">Sync events to your personal calendar.</p>
                        </div>
                    </div>

                    {/* RIGHT PANE: Actions & Status */}
                    <div className="flex items-center gap-4">
                        {/* Connect Button */}
                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-[13px] font-medium text-[var(--accent-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {connecting ? (
                                <>
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent-primary-foreground)] border-t-transparent" />
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                <span>Connect</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Privacy Note */}
            <div className="mt-6 border-t border-[var(--border-subtle)] pt-3 text-right">
                <p className="text-[10px] text-[var(--foreground-tertiary)]">
                    Data is encrypted. We only access events created by KureCal.
                </p>
            </div>
        </div>

    );

    const connectedView = (
        <div className="space-y-6">
            <div
                className="group relative w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--background-secondary)] px-5 py-4 shadow-2xl transition-all hover:border-[var(--border-default)]"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* LEFT: Identity */}
                    <div className="flex flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--background-tertiary)]">
                            {/* Mono Google G for connected state or retain color? Keeping color for brand recognition */}
                            <svg viewBox="0 0 24 24" className="h-5 w-5">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-[14px] font-medium text-[var(--foreground-primary)]">Google Calendar</h3>
                                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            </div>
                            <p className="text-[12px] text-[var(--foreground-tertiary)]">
                                {status?.calendarId || 'Connected'}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex items-center gap-3">
                        {/* Last Sync info - desktop only preferably, or wrap */}
                        {status?.lastSyncAt && (
                            <span className="mr-2 hidden text-[11px] text-[var(--foreground-tertiary)] sm:inline-block">
                                Synced {formatDate(status.lastSyncAt)}
                            </span>
                        )}

                        <button
                            onClick={handleBulkSync}
                            disabled={bulkSyncing}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--background-tertiary)] text-[var(--foreground-tertiary)] transition-colors hover:bg-[var(--background-elevated)] hover:text-[var(--foreground-primary)] disabled:opacity-50"
                            title="Sync Now"
                        >
                            {bulkSyncing ? (
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                                <MaterialIcon name="refresh" size={16} />
                            )}
                        </button>

                        <button
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="h-8 rounded-md border border-[var(--error-light)] bg-[var(--error-light)] px-3 text-[12px] font-medium text-[var(--error)] transition-colors hover:bg-[var(--error-light)] hover:text-[var(--error)] hover:opacity-80 disabled:opacity-50"
                        >
                            {disconnecting ? '...' : 'Disconnect'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

    );

    const content = status?.connected ? connectedView : disconnectedView;

    return (
        <>
            {loading && !status ? (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                    Loading calendar status...
                </div>
            ) : (
                content
            )}
            <UpgradeModal
                open={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                variant={upgradeVariant}
                featureName="Calendar sync"
                onStartTrial={async () => {
                    await startTrial();
                    setShowUpgradeModal(false);
                }}
                onUpgrade={async () => {
                    await openUpgrade();
                    setShowUpgradeModal(false);
                }}
            />
        </>
    );
}
