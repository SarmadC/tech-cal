'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { EventService } from '@/services/eventServices';
import { LoadingButton } from '@/components/Loading';
import { toast } from 'sonner';

import { useSupabase } from '@/components/providers/SupabaseProvider';

interface BulkActionsProps {
    selectedEvents: Set<string>;
    onClearSelection: () => void;
    onBulkComplete: () => void;
    className?: string;
}

type LocalOperation = 'export' | 'share' | 'tracking';

export default function BulkActions({
    selectedEvents,
    onClearSelection,
    onBulkComplete: _onBulkComplete,
    className = ''
}: BulkActionsProps) {
    const { user } = useAuth();
    const supabase = useSupabase();
    const selectedEventArray = Array.from(selectedEvents);
    const selectedCount = selectedEventArray.length;

    const { trackEvent, isLoading: isBulkTracking } = useTrackedEventsUnified();
    const [localLoading, setLocalLoading] = useState<LocalOperation | null>(null);
    
    // Return null if supabase client is not ready yet
    if (!supabase) {
        return null;
    }

    const handleBulkTrack = async () => {
        if (!user || selectedCount === 0) return;
        
        setLocalLoading('tracking');
        try {
            for (const eventId of selectedEventArray) {
                await trackEvent(eventId);
            }
            toast.success(`Successfully tracked ${selectedCount} events`);
            onClearSelection();
        } catch (error) {
            console.error('Bulk track error:', error);
            toast.error('Failed to track some events');
        } finally {
            setLocalLoading(null);
        }
    };

    const handleBulkUntrack = () => {
        toast.info("Bulk untrack functionality is not yet available.");
    };

    const handleBulkExport = async () => {
        if (selectedCount === 0) return;
        setLocalLoading('export');
        try {
            // CHANGED: The service now returns the event array directly or throws an error.
            const eventsToExport = await EventService.getEvents({ eventIds: selectedEventArray }, supabase);

            if (!eventsToExport || eventsToExport.length === 0) {
                throw new Error('Could not fetch event details for export.');
            }

            const icsEvents = eventsToExport.map(event => {
                const startTime = new Date(event.startTime).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
                const endTime = event.endTime
                    ? new Date(event.endTime).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
                    : new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

                const eventContent = [
                    'BEGIN:VEVENT', `UID:${event.id}@kurecal.app`,
                    `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z`,
                    `DTSTART:${startTime}`, `DTEND:${endTime}`, `SUMMARY:${event.title}`,
                    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`, `LOCATION:${event.location}`,
                    `ORGANIZER:${event.organizer}`, 'END:VEVENT'
                ];
                return eventContent.join('\r\n');
            });

            const icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KureCal//EN', ...icsEvents, 'END:VCALENDAR'].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            const objectUrl = URL.createObjectURL(blob);
            link.href = objectUrl;
            link.download = `kurecal-events-${new Date().toISOString().split('T')[0]}.ics`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the object URL to prevent memory leaks
            URL.revokeObjectURL(objectUrl);

            toast.success(`Exported ${eventsToExport.length} events to .ics file.`);

        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to export events.');
        } finally {
            setLocalLoading(null);
        }
    };

    const handleBulkShare = async () => {
        if (selectedCount === 0) return;
        setLocalLoading('share');
        try {
            const shareUrl = `${window.location.origin}/calendar?events=${selectedEventArray.join(',')}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success('Share link copied to clipboard!');
        } catch (_err) {
            toast.error('Failed to copy share link.');
        } finally {
            setLocalLoading(null);
        }
    };

    if (selectedCount === 0) return null;

    return (
        <div className={`bg-background-secondary border border-border-color rounded-xl p-4 shadow-sm ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-accent-primary/10 rounded-full">
                        <span className="text-sm font-semibold text-accent-primary">{selectedCount}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground-primary">
                        {selectedCount} event{selectedCount === 1 ? '' : 's'} selected
                    </span>
                </div>
                <button onClick={onClearSelection} className="text-sm text-foreground-tertiary hover:text-foreground-primary">Clear</button>
            </div>

            <div className="flex flex-wrap gap-2">
                <LoadingButton loading={isBulkTracking} onClick={handleBulkTrack} disabled={!user || localLoading !== null} variant="primary" className="text-sm">
                    Track All
                </LoadingButton>
                <LoadingButton loading={false} onClick={handleBulkUntrack} disabled={!user || localLoading !== null} variant="secondary" className="text-sm">
                    Untrack All
                </LoadingButton>
                <LoadingButton loading={localLoading === 'export'} onClick={handleBulkExport} disabled={isBulkTracking || localLoading !== null} variant="secondary" className="text-sm">
                    Export (.ics)
                </LoadingButton>
                <LoadingButton loading={localLoading === 'share'} onClick={handleBulkShare} disabled={isBulkTracking || localLoading !== null} variant="secondary" className="text-sm">
                    Copy Share Link
                </LoadingButton>
            </div>
        </div>
    );
}

// Hooks can remain unchanged
export function useBulkSelection() {
    const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

    const toggleEvent = useCallback((eventId: string) => {
        setSelectedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    }, []);

    const selectAll = useCallback((eventIds: string[]) => {
        setSelectedEvents(new Set(eventIds));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedEvents(new Set());
    }, []);

    const isSelected = useCallback((eventId: string) => {
        return selectedEvents.has(eventId);
    }, [selectedEvents]);

    return {
        selectedEvents,
        toggleEvent,
        selectAll,
        clearSelection,
        isSelected,
        selectedCount: selectedEvents.size,
    };
}

export function useBulkKeyboardShortcuts(
    selectedEvents: Set<string>,
    visibleEventIds: string[],
    { onSelectAll, onClearSelection, onBulkTrack }: {
        onSelectAll: (eventIds: string[]) => void;
        onClearSelection: () => void;
        onBulkTrack: () => void;
    }
) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault();
                onSelectAll(visibleEventIds);
            }
            if (event.key === 'Escape' && selectedEvents.size > 0) {
                event.preventDefault();
                onClearSelection();
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 't' && selectedEvents.size > 0) {
                event.preventDefault();
                onBulkTrack();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedEvents.size, visibleEventIds, onSelectAll, onClearSelection, onBulkTrack]);
}