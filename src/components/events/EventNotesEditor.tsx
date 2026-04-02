'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NoteBlank, Check, X, Spinner } from '@phosphor-icons/react';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import type { Event } from '@/types';

interface EventNotesEditorProps {
    event: Event;
    initialNotes?: string | null;
    onSave?: (notes: string) => void;
    compact?: boolean;
    className?: string;
}

const MAX_NOTES_LENGTH = 500;

export function EventNotesEditor({
    event,
    initialNotes = '',
    onSave,
    compact = false,
    className = ''
}: EventNotesEditorProps) {
    const { setAttendanceStatus, getAttendanceStatus, trackedEvents } = useEventEngagement();
    const { showSuccess, showError } = useSnackbar();

    // Get the tracked event record to access notes
    const trackedEvent = trackedEvents.find(te => te.eventId === event.id);
    const existingNotes = trackedEvent?.notes || initialNotes || '';

    const [notes, setNotes] = useState(existingNotes);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Update notes when tracked event data changes
    useEffect(() => {
        if (trackedEvent?.notes !== undefined) {
            setNotes(trackedEvent.notes || '');
        }
    }, [trackedEvent?.notes]);

    // Check for changes
    useEffect(() => {
        setHasChanges(notes !== existingNotes);
    }, [notes, existingNotes]);

    const handleSave = useCallback(async (silent = false) => {
        if (!hasChanges || isSaving) return;

        setIsSaving(true);
        try {
            const currentStatus = getAttendanceStatus(event.id);
            // If event is not tracked at all, we need to set a status first
            // For notes, we'll set it to 'attending' as a default if not set
            const statusToSet = currentStatus || 'attending';

            await setAttendanceStatus(event.id, statusToSet, notes.trim() || undefined);
            if (!silent) {
                showSuccess('Notes saved');
                setIsEditing(false);
            }
            onSave?.(notes.trim());
        } catch (error) {
            console.error('Failed to save notes:', error);
            showError('Failed to save notes');
        } finally {
            setIsSaving(false);
        }
    }, [hasChanges, isSaving, getAttendanceStatus, event.id, setAttendanceStatus, notes, showSuccess, showError, onSave]);

    const handleCancel = () => {
        setNotes(existingNotes);
        setIsEditing(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            e.preventDefault();
            handleSave(false);
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    // Auto-save while editing with debounce
    useEffect(() => {
        if (!isEditing || !hasChanges || isSaving) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            handleSave(true);
        }, 1500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [isEditing, hasChanges, isSaving, handleSave]);

    // Compact mode - just a clickable note display
    if (compact && !isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className={`w-full text-left p-3 rounded-md bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors ${className}`}
            >
                {existingNotes ? (
                    <p className="text-sm text-zinc-300 line-clamp-2">{existingNotes}</p>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-500">
                        <NoteBlank className="w-4 h-4" />
                        <span className="text-sm">Add notes...</span>
                    </div>
                )}
            </button>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                    <NoteBlank className="w-3.5 h-3.5" />
                    Personal Notes
                </label>
                <span className="text-[10px] text-zinc-600">
                    {notes.length}/{MAX_NOTES_LENGTH}
                </span>
            </div>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
                onFocus={() => setIsEditing(true)}
                onKeyDown={handleKeyDown}
                placeholder="Add your personal notes about this event..."
                rows={compact ? 2 : 3}
                className="w-full px-3 py-2 bg-zinc-900/50 border border-white/5 rounded-md text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none"
            />

            {/* Action buttons - show when editing */}
            {isEditing && hasChanges && (
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave(false)}
                        disabled={isSaving || !hasChanges}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? (
                            <>
                                <Spinner className="w-3.5 h-3.5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                Save
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Helper text */}
            {isEditing && (
                <p className="text-[10px] text-zinc-600">
                    Press ⌘+Enter to save, Esc to cancel
                </p>
            )}
        </div>
    );
}
