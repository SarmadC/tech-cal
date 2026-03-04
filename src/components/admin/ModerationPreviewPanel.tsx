'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface QueueItem {
    id: string;
    source_event_id: string;
    event_id: string | null;
    ingestion_quality_score: number;
    reason_codes: string[];
    recommended_tags: string[] | null;
    status: string;
    created_at: string;
    source_events: {
        raw_payload: {
            record: {
                title: string;
                description?: string;
                startTime: string;
                location: string;
                organizer?: string;
                sourceUrl?: string;
            };
        };
    } | null;
    events: {
        id: string;
        title: string;
        description: string;
        start_time: string;
        location: string;
        organizer: { name: string } | null;
        ingestion_quality_score: number | null;
        ingestion_provenance: {
            quality_components: {
                source_trust: number;
                metadata_completeness: number;
                speaker_verification: number;
                historical_performance: number;
            };
        } | null;
    } | null;
}

interface ModerationPreviewPanelProps {
    item: QueueItem;
    onClose: () => void;
    onApprove: (item: QueueItem) => void;
    onReject: (item: QueueItem) => void;
    onEditAndApprove: (item: QueueItem, eventData: Record<string, string>) => void;
    actionLoading: boolean;
}

interface EditFormState {
    title: string;
    description: string;
    location: string;
    start_time: string;
}

function scoreColor(score: number): string {
    if (score >= 70) return 'text-emerald-300';
    if (score >= 50) return 'text-amber-300';
    return 'text-rose-300';
}

function scoreBarColor(score: number): string {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
}

function reasonCodeColor(code: string): string {
    const trustCodes = ['low_source_trust', 'unverified_source', 'low_trust', 'source_trust'];
    const qualityCodes = ['low_quality', 'low_score', 'quality_below_threshold'];
    if (trustCodes.some((c) => code.includes(c)) || qualityCodes.some((c) => code.includes(c))) {
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
}

/**
 * Resolve Techmeme redirect URLs to canonical URLs for display.
 * e.g. techmeme.com/r2/blockworks.co_event_permissionless-RWjwjofT.htm?cal=1
 *   -> https://blockworks.co/event/permissionless
 */
function cleanSourceUrl(rawUrl: string): string {
    if (!rawUrl.includes('techmeme.com/r2/')) return rawUrl;

    const urlWithoutQuery = rawUrl.split('?')[0];
    const match = urlWithoutQuery.match(/techmeme\.com\/r2\/([^_]+)_(.+?)\.htm$/);
    if (match) {
        const domain = match[1];
        let pathSegments = match[2].replace(/-[a-zA-Z0-9]+$/, '');
        if (!pathSegments) return `https://${domain}`;
        return `https://${domain}/${pathSegments.replace(/_/g, '/')}`;
    }
    const altMatch = urlWithoutQuery.match(/techmeme\.com\/r2\/([^_]+?)(?:-[a-zA-Z0-9]+)?\.htm$/);
    if (altMatch?.[1]) return `https://${altMatch[1]}`;
    return rawUrl;
}

function formatDatetimeLocal(isoString: string): string {
    try {
        const d = new Date(isoString);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return '';
    }
}

export default function ModerationPreviewPanel({
    item,
    onClose,
    onApprove,
    onReject,
    onEditAndApprove,
    actionLoading,
}: ModerationPreviewPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [editForm, setEditForm] = useState<EditFormState>({
        title: '',
        description: '',
        location: '',
        start_time: '',
    });

    // Initialize edit form from event data
    useEffect(() => {
        const record = item.source_events?.raw_payload?.record;
        setEditForm({
            title: item.events?.title ?? record?.title ?? '',
            description: item.events?.description ?? record?.description ?? '',
            location: item.events?.location ?? record?.location ?? '',
            start_time: formatDatetimeLocal(item.events?.start_time ?? record?.startTime ?? ''),
        });
    }, [item]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editMode) {
                    setEditMode(false);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose, editMode]);

    const handleSaveAndApprove = useCallback(() => {
        const eventData: Record<string, string> = {};
        if (editForm.title) eventData.title = editForm.title;
        if (editForm.description) eventData.description = editForm.description;
        if (editForm.location) eventData.location = editForm.location;
        if (editForm.start_time) eventData.start_time = new Date(editForm.start_time).toISOString();
        onEditAndApprove(item, eventData);
    }, [item, editForm, onEditAndApprove]);

    const record = item.source_events?.raw_payload?.record;
    const eventTitle = item.events?.title ?? record?.title ?? 'Untitled Event';
    const organizer = item.events?.organizer?.name ?? record?.organizer ?? 'Unknown organizer';
    const description = item.events?.description ?? record?.description ?? '';
    const location = item.events?.location ?? record?.location ?? '';
    const startTime = item.events?.start_time ?? record?.startTime ?? '';
    const sourceUrl = record?.sourceUrl ? cleanSourceUrl(record.sourceUrl) : undefined;
    const qualityComponents = item.events?.ingestion_provenance?.quality_components;
    const overallScore = item.ingestion_quality_score;

    const statusBadgeStyle: Record<string, string> = {
        pending: 'bg-amber-400/15 text-amber-200 border border-amber-500/30',
        approved: 'bg-emerald-400/15 text-emerald-200 border border-emerald-500/30',
        rejected: 'bg-rose-500/15 text-rose-200 border border-rose-500/30',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                className={cn(
                    'fixed inset-y-0 right-0 z-50 w-full max-w-2xl',
                    'bg-background-main border-l border-default',
                    'flex flex-col shadow-2xl',
                    'animate-in slide-in-from-right duration-300'
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="moderation-preview-title"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-default px-6 py-4">
                    <div className="min-w-0 flex-1">
                        <h2 id="moderation-preview-title" className="text-lg font-semibold text-foreground-primary truncate">
                            {eventTitle}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground-tertiary">
                            <span>{organizer}</span>
                            <Badge className={cn('ml-1', statusBadgeStyle[item.status] ?? 'bg-background-tertiary text-foreground-primary')}>
                                {item.status.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-2 text-foreground-tertiary hover:bg-background-tertiary hover:text-foreground-secondary"
                        aria-label="Close panel"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                </div>

                {/* Quality Breakdown */}
                <div className="border-b border-default bg-background-secondary px-6 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Quality Breakdown</h3>
                        <div className={cn('text-lg font-bold', scoreColor(overallScore))}>
                            {overallScore.toFixed(0)}
                        </div>
                    </div>
                    {qualityComponents ? (
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                ['Source Trust', qualityComponents.source_trust],
                                ['Metadata', qualityComponents.metadata_completeness],
                                ['Speaker Verification', qualityComponents.speaker_verification],
                                ['Historical', qualityComponents.historical_performance],
                            ] as [string, number | undefined][]).map(([label, score]) => {
                                const val = score ?? 0;
                                return (
                                    <div key={label} className="rounded-lg border border-default/60 bg-background-main/50 p-2.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] text-foreground-muted">{label}</span>
                                            <span className={cn('text-sm font-semibold', score != null ? scoreColor(val) : 'text-foreground-muted')}>
                                                {score != null ? val.toFixed(0) : '—'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-background-tertiary overflow-hidden">
                                            <div
                                                className={cn('h-full rounded-full transition-all', scoreBarColor(val))}
                                                style={{ width: `${Math.min(100, val)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-foreground-muted">No quality component data available.</p>
                    )}
                </div>

                {/* Reason Code Chips */}
                {item.reason_codes.length > 0 && (
                    <div className="border-b border-default px-6 py-3">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Flagged Reasons</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {item.reason_codes.map((code) => (
                                <Badge key={code} className={cn('px-2 py-0.5 text-[10px] border', reasonCodeColor(code))}>
                                    {code.replace(/_/g, ' ')}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Event Details / Edit Mode */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {editMode ? (
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Edit Event</h3>
                            <div>
                                <label className="mb-1 block text-xs text-foreground-muted">Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full rounded-md border border-default bg-background-tertiary px-3 py-2 text-sm text-foreground-primary focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-foreground-muted">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                    rows={5}
                                    className="w-full rounded-md border border-default bg-background-tertiary px-3 py-2 text-sm text-foreground-primary focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50 resize-y"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-foreground-muted">Location</label>
                                <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                                    className="w-full rounded-md border border-default bg-background-tertiary px-3 py-2 text-sm text-foreground-primary focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs text-foreground-muted">Start Time</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.start_time}
                                    onChange={(e) => setEditForm((f) => ({ ...f, start_time: e.target.value }))}
                                    className="w-full rounded-md border border-default bg-background-tertiary px-3 py-2 text-sm text-foreground-primary focus:border-accent-primary/50 focus:outline-none focus:ring-1 focus:ring-accent-primary/50"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Event Details</h3>

                            {/* Description */}
                            {description && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Description</div>
                                    <div className={cn('text-sm text-foreground-tertiary whitespace-pre-wrap', !descExpanded && 'line-clamp-4')}>
                                        {description}
                                    </div>
                                    {description.length > 200 && (
                                        <button
                                            onClick={() => setDescExpanded(!descExpanded)}
                                            className="mt-1 text-xs text-accent-primary hover:underline"
                                        >
                                            {descExpanded ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Date/Time */}
                            {startTime && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Date & Time</div>
                                    <div className="text-sm text-foreground-secondary">
                                        {format(new Date(startTime), 'EEEE, MMM d, yyyy · h:mm a')}
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {location && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Location</div>
                                    <div className="text-sm text-foreground-secondary">{location}</div>
                                </div>
                            )}

                            {/* Source URL */}
                            {sourceUrl && (
                                <div>
                                    <div className="mb-1 text-xs text-foreground-muted">Source</div>
                                    <a
                                        href={sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-accent-primary hover:underline"
                                    >
                                        <MaterialIcon name="arrow-up-right" size={14} />
                                        {(() => { try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; } })()}
                                    </a>
                                </div>
                            )}

                            {/* Organizer */}
                            <div>
                                <div className="mb-1 text-xs text-foreground-muted">Organizer</div>
                                <div className="text-sm text-foreground-secondary">{organizer}</div>
                            </div>

                            {/* Recommended Tags */}
                            {item.recommended_tags && item.recommended_tags.length > 0 && (
                                <div>
                                    <div className="mb-1.5 text-xs text-foreground-muted">Recommended Tags</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.recommended_tags.map((tag) => (
                                            <Badge key={tag} className="bg-accent-primary-light text-foreground-secondary px-2 py-0.5 text-[10px]">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-default bg-background-secondary px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                        {editMode ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditMode(false)}
                                    disabled={actionLoading}
                                    className="text-foreground-tertiary"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveAndApprove}
                                    disabled={actionLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <MaterialIcon name="check" size={14} className="mr-1" />
                                    Save & Approve
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onReject(item)}
                                    disabled={actionLoading}
                                    className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                >
                                    <MaterialIcon name="close" size={14} className="mr-1" />
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => onApprove(item)}
                                    disabled={actionLoading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <MaterialIcon name="check" size={14} className="mr-1" />
                                    Approve
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setEditMode(true)}
                                    disabled={actionLoading}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    <MaterialIcon name="edit" size={14} className="mr-1" />
                                    Edit & Approve
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="mt-3 flex justify-end text-xs text-foreground-muted">
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-default bg-background-tertiary px-1.5 py-0.5 text-[10px]">
                                Esc
                            </kbd>
                            to close
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
