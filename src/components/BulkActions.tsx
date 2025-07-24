// src/components/BulkActions.tsx (Phase 1.3 - Bulk Actions)

'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/contexts/AuthContext';
import { LoadingButton } from '@/components/Loading';
import React from 'react';

interface BulkActionsProps {
  selectedEvents: Set<string>;
  onClearSelection: () => void;
  onBulkComplete: () => void;
  className?: string;
}

type BulkOperation = 'track' | 'untrack' | 'export' | 'share';

interface BulkResult {
  successful: number;
  failed: number;
  errors: string[];
}

export default function BulkActions({ 
  selectedEvents, 
  onClearSelection, 
  onBulkComplete,
  className = '' 
}: BulkActionsProps) {
  const userId = useUserId();
  const [loading, setLoading] = useState<BulkOperation | null>(null);
  const [lastResult, setLastResult] = useState<BulkResult | null>(null);

  const selectedCount = selectedEvents.size;
  const isDisabled = selectedCount === 0 || !userId;

  // Bulk track events
  const handleBulkTrack = useCallback(async () => {
    if (!userId || selectedCount === 0) return;

    setLoading('track');
    setLastResult(null);

    try {
      // Check which events are already tracked
      const { data: existingTracked } = await supabase
        .from('user_events')
        .select('event_id')
        .eq('user_id', userId)
        .in('event_id', Array.from(selectedEvents));

      const alreadyTracked = new Set(existingTracked?.map(item => item.event_id) || []);
      const eventsToTrack = Array.from(selectedEvents).filter(id => !alreadyTracked.has(id));

      if (eventsToTrack.length === 0) {
        setLastResult({
          successful: 0,
          failed: selectedCount,
          errors: ['All selected events are already tracked']
        });
        return;
      }

      // Bulk insert new tracking records
      const insertData = eventsToTrack.map(eventId => ({
        user_id: userId,
        event_id: eventId,
        status: 'bookmarked' as const,
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('user_events')
        .insert(insertData)
        .select();

      if (error) {
        throw error;
      }

      setLastResult({
        successful: data?.length || 0,
        failed: selectedCount - (data?.length || 0),
        errors: alreadyTracked.size > 0 ? [`${alreadyTracked.size} events were already tracked`] : []
      });

      onBulkComplete();
    } catch (err) {
      console.error('Bulk track error:', err);
      setLastResult({
        successful: 0,
        failed: selectedCount,
        errors: [(err as Error).message || 'Failed to track events']
      });
    } finally {
      setLoading(null);
    }
  }, [userId, selectedEvents, selectedCount, onBulkComplete]);

  // Bulk untrack events
  const handleBulkUntrack = useCallback(async () => {
    if (!userId || selectedCount === 0) return;

    setLoading('untrack');
    setLastResult(null);

    try {
      const { error, count } = await supabase
        .from('user_events')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .in('event_id', Array.from(selectedEvents));

      if (error) {
        throw error;
      }

      setLastResult({
        successful: count || 0,
        failed: selectedCount - (count || 0),
        errors: count === 0 ? ['No tracked events found to remove'] : []
      });

      onBulkComplete();
    } catch (err) {
      console.error('Bulk untrack error:', err);
      setLastResult({
        successful: 0,
        failed: selectedCount,
        errors: [(err as Error).message || 'Failed to untrack events']
      });
    } finally {
      setLoading(null);
    }
  }, [userId, selectedEvents, selectedCount, onBulkComplete]);

  // Export to calendar (ICS format)
  const handleBulkExport = useCallback(async () => {
    if (selectedCount === 0) return;

    setLoading('export');
    setLastResult(null);

    try {
      // Fetch event details for selected events
      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, description, start_time, end_time, location, organizer')
        .in('id', Array.from(selectedEvents));

      if (error) throw error;

      if (!events || events.length === 0) {
        throw new Error('No events found to export');
      }

      // Generate ICS content
      const icsEvents = events.map(event => {
        const startTime = new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endTime = event.end_time 
          ? new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
          : new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        return [
          'BEGIN:VEVENT',
          `UID:${event.id}@techcalendar.app`,
          `DTSTART:${startTime}`,
          `DTEND:${endTime}`,
          `SUMMARY:${event.title || 'Untitled Event'}`,
          `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
          `LOCATION:${event.location || ''}`,
          `ORGANIZER:${event.organizer || ''}`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          'END:VEVENT'
        ].join('\r\n');
      });

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TechCalendar//EN',
        'CALSCALE:GREGORIAN',
        ...icsEvents,
        'END:VCALENDAR'
      ].join('\r\n');

      // Download the file
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `tech-events-${new Date().toISOString().split('T')[0]}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setLastResult({
        successful: events.length,
        failed: selectedCount - events.length,
        errors: events.length < selectedCount ? ['Some events could not be exported'] : []
      });
    } catch (err) {
      console.error('Export error:', err);
      setLastResult({
        successful: 0,
        failed: selectedCount,
        errors: [(err as Error).message || 'Failed to export events']
      });
    } finally {
      setLoading(null);
    }
  }, [selectedEvents, selectedCount]);

  // Copy share link
  const handleBulkShare = useCallback(async () => {
    if (selectedCount === 0) return;

    setLoading('share');
    setLastResult(null);

    try {
      // Create a shareable link with event IDs
      const eventIds = Array.from(selectedEvents).join(',');
      const shareUrl = `${window.location.origin}/events/shared?ids=${encodeURIComponent(eventIds)}`;
      
      await navigator.clipboard.writeText(shareUrl);
      
      setLastResult({
        successful: selectedCount,
        failed: 0,
        errors: []
      });
    } catch (err) {
      console.error('Share error:', err);
      setLastResult({
        successful: 0,
        failed: selectedCount,
        errors: ['Failed to copy share link to clipboard']
      });
    } finally {
      setLoading(null);
    }
  }, [selectedEvents, selectedCount]);

  // Clear results when selection changes
  React.useEffect(() => {
    setLastResult(null);
  }, [selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <div className={`bg-background-secondary border border-border-color rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-accent-primary/10 rounded-full">
            <span className="text-sm font-semibold text-accent-primary">
              {selectedCount}
            </span>
          </div>
          <span className="text-sm font-medium text-foreground-primary">
            {selectedCount} event{selectedCount === 1 ? '' : 's'} selected
          </span>
        </div>
        
        <button
          onClick={onClearSelection}
          className="text-sm text-foreground-tertiary hover:text-foreground-primary transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <LoadingButton
          loading={loading === 'track'}
          onClick={handleBulkTrack}
          disabled={isDisabled}
          variant="primary"
          className="text-sm"
        >
          Track All
        </LoadingButton>

        <LoadingButton
          loading={loading === 'untrack'}
          onClick={handleBulkUntrack}
          disabled={isDisabled}
          variant="secondary"
          className="text-sm"
        >
          Untrack All
        </LoadingButton>

        <LoadingButton
          loading={loading === 'export'}
          onClick={handleBulkExport}
          disabled={selectedCount === 0}
          variant="secondary"
          className="text-sm"
        >
          Export (.ics)
        </LoadingButton>

        <LoadingButton
          loading={loading === 'share'}
          onClick={handleBulkShare}
          disabled={selectedCount === 0}
          variant="secondary"
          className="text-sm"
        >
          Copy Share Link
        </LoadingButton>
      </div>

      {/* Results display */}
      {lastResult && (
        <div className={`text-sm p-3 rounded-lg border ${
          lastResult.failed === 0 
            ? 'bg-success/10 border-success text-success' 
            : lastResult.successful === 0
            ? 'bg-error/10 border-error text-error'
            : 'bg-warning/10 border-warning text-warning'
        }`}>
          <div className="flex items-center space-x-2">
            {lastResult.failed === 0 ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            <span>
              {lastResult.successful > 0 && `${lastResult.successful} completed`}
              {lastResult.successful > 0 && lastResult.failed > 0 && ', '}
              {lastResult.failed > 0 && `${lastResult.failed} failed`}
            </span>
          </div>
          {lastResult.errors.length > 0 && (
            <ul className="mt-1 ml-6 text-xs">
              {lastResult.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for managing bulk selection state
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

  const selectMultiple = useCallback((eventIds: string[]) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      eventIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const deselectMultiple = useCallback((eventIds: string[]) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      eventIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  const toggleMultiple = useCallback((eventIds: string[]) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev);
      const allSelected = eventIds.every(id => newSet.has(id));
      
      if (allSelected) {
        // If all are selected, deselect them
        eventIds.forEach(id => newSet.delete(id));
      } else {
        // If not all are selected, select them all
        eventIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  }, []);



  return {
    selectedEvents,
    toggleEvent,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedEvents.size,
    selectMultiple,
    deselectMultiple,
    toggleMultiple
  };
}
export function useBulkKeyboardShortcuts(
    selectedEvents: Set<string>,
    visibleEventIds: string[],
    { onSelectAll, onClearSelection, onBulkTrack }: {
        onSelectAll: (eventIds: string[]) => void;
        onClearSelection: () => void;
        // 👇 FIX: Allow the onBulkTrack function to receive the keyboard event
        onBulkTrack: (event: KeyboardEvent) => void;
    }
) {
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            if (event.target && (event.target as HTMLElement).tagName === 'INPUT') return;

            // Ctrl/Cmd + A = Select all visible events
            if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
                event.preventDefault();
                onSelectAll(visibleEventIds);
            }

            // Escape = Clear selection
            if (event.key === 'Escape' && selectedEvents.size > 0) {
                event.preventDefault();
                onClearSelection();
            }

            // Ctrl/Cmd + T = Track selected events
            if ((event.ctrlKey || event.metaKey) && event.key === 't' && selectedEvents.size > 0) {
                // The event is now passed to the callback
                onBulkTrack(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedEvents.size, visibleEventIds, onSelectAll, onClearSelection, onBulkTrack]);
}