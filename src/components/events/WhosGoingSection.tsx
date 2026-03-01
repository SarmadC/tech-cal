'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AvatarCircles } from '@/components/ui/avatar-circles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MaterialIcon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts';
import BlockUserButton from '@/components/social/BlockUserButton';
import FollowButton from '@/components/social/FollowButton';
import { sendTelemetryEvent } from '@/utils/telemetryClient';

interface WhosGoingAttendee {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    username: string | null;
    headline: string | null;
    isInNetwork: boolean;
    followsViewer?: boolean;
    isMutualFollow?: boolean;
}

interface WhosGoingResponse {
    eventId: string;
    totalAttending: number;
    visibleAttendeeCount: number;
    networkAttendingCount?: number;
    viewerIsAttending: boolean;
    attendees: WhosGoingAttendee[];
}

interface WhosGoingSectionProps {
    eventId: string;
    className?: string;
}

function getRelationshipChips(attendee: WhosGoingAttendee): string[] {
    const chips: string[] = [];
    const isInNetwork = Boolean(attendee.isInNetwork);
    const followsViewer = Boolean(attendee.followsViewer);
    const isMutualFollow = Boolean(attendee.isMutualFollow);

    if (isMutualFollow) {
        chips.push('Mutual follow');
    } else {
        if (isInNetwork) {
            chips.push('You follow');
        }
        if (followsViewer) {
            chips.push('Follows you');
        }
    }

    chips.push('Also attending');
    return chips.slice(0, 2);
}

export default function WhosGoingSection({ eventId, className }: WhosGoingSectionProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<WhosGoingResponse | null>(null);
    const [authRequired, setAuthRequired] = useState(false);
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [blockedAttendeeIds, setBlockedAttendeeIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        let isMounted = true;

        const loadAttendees = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/events/${eventId}/attendees?limit=6`, {
                    credentials: 'include',
                });

                if (response.status === 401) {
                    if (isMounted) {
                        setAuthRequired(true);
                        setData(null);
                    }
                    return;
                }

                if (!response.ok) {
                    return;
                }

                const payload = await response.json() as { success?: boolean; data?: WhosGoingResponse };
                if (!isMounted || !payload.success || !payload.data) {
                    return;
                }

                setData(payload.data);
            } catch {
                // no-op
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadAttendees();

        return () => {
            isMounted = false;
        };
    }, [eventId]);

    useEffect(() => {
        if (!data || hasTrackedImpression || data.visibleAttendeeCount <= 0) {
            return;
        }

        setHasTrackedImpression(true);
        void sendTelemetryEvent({
            eventType: 'whos_going_impression',
            context: {
                surface: 'event_detail',
            },
            metadata: {
                eventId,
                visibleAttendeeCount: data.visibleAttendeeCount,
                totalAttending: data.totalAttending,
            },
        });
    }, [data, hasTrackedImpression, eventId]);

    const avatars = useMemo(() => {
        if (!data) {
            return [];
        }

        return data.attendees
            .filter(attendee => !blockedAttendeeIds.has(attendee.id))
            .filter(attendee => Boolean(attendee.avatarUrl))
            .map(attendee => ({
                imageUrl: attendee.avatarUrl || '',
                profileUrl: attendee.username ? `/u/${attendee.username}` : '#',
            }));
    }, [data, blockedAttendeeIds]);

    const visibleAttendees = useMemo(() => {
        if (!data) {
            return [];
        }

        return data.attendees.filter(attendee => !blockedAttendeeIds.has(attendee.id));
    }, [data, blockedAttendeeIds]);

    const blockedNetworkAttendeeCount = useMemo(() => {
        if (!data || blockedAttendeeIds.size === 0) {
            return 0;
        }

        return data.attendees.reduce((count, attendee) => {
            if (attendee.isInNetwork && blockedAttendeeIds.has(attendee.id)) {
                return count + 1;
            }

            return count;
        }, 0);
    }, [data, blockedAttendeeIds]);

    const trackAttendeeProfileClick = (targetUserId: string, surface: string) => {
        void sendTelemetryEvent({
            eventType: 'whos_going_click',
            context: {
                surface,
            },
            metadata: {
                eventId,
                targetUserId,
            },
        });
    };

    if (isLoading) {
        return (
            <section className={className}>
                <span className="text-[12px] text-foreground-tertiary block mb-2">Who&apos;s Going</span>
                <div className="animate-pulse flex space-x-2">
                    <div className="rounded-full bg-background-tertiary h-6 w-6"></div>
                    <div className="rounded-full bg-background-tertiary h-6 w-6"></div>
                </div>
            </section>
        );
    }

    if (authRequired) {
        return (
            <section className={className}>
                <span className="text-[12px] text-foreground-tertiary block mb-2">Who&apos;s Going</span>
                <p className="text-[12px] text-foreground-tertiary">
                    <Link href="/login" className="underline hover:text-foreground-primary transition-colors">
                        Sign in
                    </Link>{' '}
                    to view.
                </p>
            </section>
        );
    }

    if (!data || (data.totalAttending <= 0 && !data.viewerIsAttending)) {
        return (
            <section className={className}>
                <span className="text-[12px] text-foreground-tertiary block mb-2">Who&apos;s Going</span>
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full border border-dashed border-border-subtle bg-background-tertiary/60 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-foreground-muted"></div>
                    </div>
                    <p className="text-[12px] text-foreground-tertiary italic">Be the first to attend</p>
                </div>
            </section>
        );
    }

    const summary = data.viewerIsAttending
        ? `You + ${Math.max(0, data.totalAttending - 1)} attending`
        : `${data.totalAttending} attending`;

    const visibleAttendeeCount = Math.max(0, data.visibleAttendeeCount - blockedAttendeeIds.size);
    const networkAttendingCount = Math.max(0, (data.networkAttendingCount ?? 0) - blockedNetworkAttendeeCount);
    const visibilityHint = visibleAttendeeCount > 0
        ? `${visibleAttendeeCount} sharing attendance publicly`
        : 'No public attendee profiles yet';

    return (
        <section className={className}>
            <span className="text-[12px] text-foreground-tertiary block mb-2">Who&apos;s Going</span>
            <p className="text-[13px] text-foreground-primary font-medium">{summary}</p>
            <p className="text-[11px] text-foreground-tertiary mt-1">{visibilityHint}</p>
            {networkAttendingCount > 0 && (
                <p className="mt-1 text-[11px] font-medium text-emerald-500">
                    {networkAttendingCount} in your network
                </p>
            )}

            {avatars.length > 0 && (
                <div
                    className="mt-3"
                    onClick={() => {
                        void sendTelemetryEvent({
                            eventType: 'whos_going_click',
                            context: {
                                surface: 'event_detail',
                            },
                            metadata: {
                                eventId,
                                visibleAttendeeCount,
                            },
                        });
                    }}
                >
                    <AvatarCircles
                        avatarUrls={avatars}
                        numPeople={Math.max(0, visibleAttendeeCount - avatars.length)}
                    />
                </div>
            )}

            {visibleAttendees.length > 0 && (
                <div className="mt-3">
                    <button
                        type="button"
                        className="text-[11px] text-foreground-secondary hover:text-foreground-primary transition-colors"
                        onClick={() => {
                            if (!isExpanded) {
                                void sendTelemetryEvent({
                                    eventType: 'whos_going_click',
                                    context: {
                                        surface: 'event_detail_attendee_list',
                                    },
                                    metadata: {
                                        eventId,
                                        visibleAttendeeCount,
                                    },
                                });
                            }
                            setIsExpanded((current) => !current);
                        }}
                    >
                        {isExpanded ? 'Hide attendee list' : 'View attendee list'}
                    </button>

                    {isExpanded && (
                        <ul className="mt-2 space-y-2">
                            {visibleAttendees.map((attendee) => (
                                <li
                                    key={attendee.id}
                                    className="flex items-start justify-between gap-2 rounded-md border border-border-subtle px-2 py-2"
                                >
                                    <div className="flex min-w-0 items-start gap-2">
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={attendee.avatarUrl || ''} alt={attendee.fullName || 'Attendee'} />
                                            <AvatarFallback className="text-[10px]">
                                                {(attendee.fullName || 'U').slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0">
                                            {attendee.username ? (
                                                <Link
                                                    href={`/u/${attendee.username}`}
                                                    className="truncate text-xs text-foreground-primary hover:underline"
                                                    onClick={() => {
                                                        trackAttendeeProfileClick(attendee.id, 'event_detail_attendee_name');
                                                    }}
                                                >
                                                    {attendee.fullName || `@${attendee.username}`}
                                                </Link>
                                            ) : (
                                                <p className="truncate text-xs text-foreground-primary">{attendee.fullName || 'Unknown attendee'}</p>
                                            )}

                                            {attendee.headline && (
                                                <p className="truncate text-[11px] text-foreground-tertiary">{attendee.headline}</p>
                                            )}

                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {getRelationshipChips(attendee).map((chip) => (
                                                    <span
                                                        key={`${attendee.id}-${chip}`}
                                                        className="rounded-full border border-border-subtle px-1.5 py-0.5 text-[10px] text-foreground-tertiary"
                                                    >
                                                        {chip}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {user && (
                                        <div className="flex items-center gap-1">
                                            <FollowButton
                                                userId={attendee.id}
                                                compact
                                                telemetrySurface="event_detail_attendee_list"
                                            />
                                            {attendee.username && (
                                                <Button asChild variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                                    <Link
                                                        href={`/u/${attendee.username}`}
                                                        onClick={() => {
                                                            trackAttendeeProfileClick(
                                                                attendee.id,
                                                                'event_detail_attendee_profile_button'
                                                            );
                                                        }}
                                                    >
                                                        Profile
                                                    </Link>
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="h-7 w-7"
                                                        aria-label={`More actions for ${attendee.fullName || attendee.username || 'attendee'}`}
                                                    >
                                                        <MaterialIcon name="menu" size={14} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" forceMount>
                                                    <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                                    {attendee.username && (
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href={`/u/${attendee.username}`}
                                                                onClick={() => {
                                                                    trackAttendeeProfileClick(
                                                                        attendee.id,
                                                                        'event_detail_attendee_profile_menu'
                                                                    );
                                                                }}
                                                            >
                                                                View profile
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel className="text-xs">Safety</DropdownMenuLabel>
                                                    <div className="px-1 py-1">
                                                        <BlockUserButton
                                                            userId={attendee.id}
                                                            username={attendee.username}
                                                            compact
                                                            onStatusChange={(isBlocked) => {
                                                                if (isBlocked) {
                                                                    setBlockedAttendeeIds((current) => {
                                                                        const next = new Set(current);
                                                                        next.add(attendee.id);
                                                                        return next;
                                                                    });
                                                                } else {
                                                                    setBlockedAttendeeIds((current) => {
                                                                        const next = new Set(current);
                                                                        next.delete(attendee.id);
                                                                        return next;
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <DropdownMenuItem disabled>
                                                        Report user (coming soon)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}
