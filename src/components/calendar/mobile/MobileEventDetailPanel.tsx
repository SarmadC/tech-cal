'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format, isSameDay } from 'date-fns';
import {
    ArrowSquareOutIcon,
    BookmarkSimple,
    CalendarPlusIcon,
    CaretRight,
    DotsThreeVerticalIcon,
    DownloadSimpleIcon,
    ShareNetworkIcon,
    XIcon,
} from '@phosphor-icons/react';
import type { AgendaItem, Event, EventType, MultiDayEventInstance, Speaker } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import { useEventActions } from '@/hooks/useEventActions';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useAuth } from '@/contexts';
import { getBrowserSafeImageSrc, getSafeImageSrc, getVersionedImageSrc } from '@/utils/imageUrl';
import { buildAgendaDayGroups, getSpeakerAvatarUrls } from '@/utils/timelineUtils';
import { dedupeSpeakersFromEvent, getSpeakerIdentity, hasSpeakerData } from '@/components/calendar/eventDetailShared';
import { useBackClose } from '@/hooks/useBackClose';

interface MobileEventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const PANEL_BACKGROUND = '#08090a';
const PREVIEW_COUNT = 4;
const NON_MAPPABLE_LOCATIONS = new Set(['online', 'remote', 'hybrid', 'tbd', 'location tba']);

const normalizeEventFormatLabel = (eventFormat?: Event['eventFormat'] | string | null): string | null => {
    const normalized = eventFormat?.trim().toLowerCase();

    switch (normalized) {
        case 'online':
            return 'Online';
        case 'in-person':
        case 'in person':
            return 'In-person';
        case 'hybrid':
            return 'Hybrid';
        default:
            return eventFormat?.trim() || null;
    }
};

const formatEventDateTime = (startTime: string, endTime?: string | null): string => {
    const startDate = new Date(startTime);

    if (Number.isNaN(startDate.getTime())) {
        return startTime;
    }

    if (!endTime) {
        return format(startDate, 'MMM d · h:mm a');
    }

    const endDate = new Date(endTime);
    if (Number.isNaN(endDate.getTime())) {
        return format(startDate, 'MMM d · h:mm a');
    }

    if (isSameDay(startDate, endDate)) {
        const startLabel = format(startDate, 'h:mm a');
        const endLabel = format(endDate, 'h:mm a');

        if (startLabel === endLabel) {
            return format(startDate, 'MMM d · h:mm a');
        }

        return `${format(startDate, 'MMM d')} · ${startLabel} to ${endLabel}`;
    }

    return `${format(startDate, 'MMM d · h:mm a')} to ${format(endDate, 'MMM d · h:mm a')}`;
};

const formatAgendaTimeRange = (agendaItem: AgendaItem): string => {
    const startDate = new Date(agendaItem.startTime);
    const endDate = new Date(agendaItem.endTime);

    if (Number.isNaN(startDate.getTime())) {
        return agendaItem.startTime;
    }

    if (Number.isNaN(endDate.getTime())) {
        return format(startDate, 'h:mm a');
    }

    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
};

const buildAgendaSecondaryText = (agendaItem: AgendaItem): string | null => {
    const seenSpeakerIdentities = new Set<string>();
    const speakerNames = [
        ...(agendaItem.speakers ?? []),
        ...(agendaItem.speaker ? [agendaItem.speaker] : []),
    ]
        .filter((speaker, index) => {
            const speakerIdentity = getSpeakerIdentity(speaker, index);

            if (seenSpeakerIdentities.has(speakerIdentity)) {
                return false;
            }

            seenSpeakerIdentities.add(speakerIdentity);
            return true;
        })
        .map((speaker) => speaker.name?.trim())
        .filter((speakerName): speakerName is string => Boolean(speakerName))
        .join(', ');

    const segments = [agendaItem.track, agendaItem.location, speakerNames].filter(
        (value): value is string => Boolean(value && value.trim())
    );

    return segments.length > 0 ? segments.join(' · ') : null;
};

const buildSpeakerSecondaryText = (speaker: Speaker): string | null => {
    const parts = [speaker.title, speaker.company].filter(
        (value): value is string => Boolean(value && value.trim())
    );

    return parts.length > 0 ? parts.join(' · ') : null;
};

const formatAgendaDayLabel = (agendaItem: AgendaItem, dayIndex: number, totalDays: number): string => {
    const agendaDate = new Date(agendaItem.startTime);

    if (!Number.isNaN(agendaDate.getTime())) {
        const dateLabel = format(agendaDate, 'EEE, MMM d');
        return totalDays > 1 ? `Day ${dayIndex + 1} · ${dateLabel}` : dateLabel;
    }

    return `Day ${dayIndex + 1}`;
};

const formatAgendaDayMeta = (agendaItems: AgendaItem[]): string => {
    if (agendaItems.length === 0) {
        return 'No sessions';
    }

    const firstItem = agendaItems[0];
    const lastItem = agendaItems[agendaItems.length - 1];
    const firstDate = new Date(firstItem.startTime);
    const lastDate = new Date(lastItem.endTime || lastItem.startTime);

    if (Number.isNaN(firstDate.getTime()) || Number.isNaN(lastDate.getTime())) {
        return `${agendaItems.length} session${agendaItems.length === 1 ? '' : 's'}`;
    }

    return `${format(firstDate, 'h:mm a')} - ${format(lastDate, 'h:mm a')} · ${agendaItems.length} session${agendaItems.length === 1 ? '' : 's'}`;
};

const buildMapsSearchUrl = (location: string): string =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

const getInitials = (value: string): string =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

const hasMappableLocation = (location?: string | null): location is string => {
    if (!location?.trim()) {
        return false;
    }

    return !NON_MAPPABLE_LOCATIONS.has(location.trim().toLowerCase());
};

type InfoRowProps = {
    children: ReactNode;
    interactive?: boolean;
    onClick?: () => void;
    ariaLabel?: string;
};

function InfoRow({ children, interactive = false, onClick, ariaLabel }: InfoRowProps) {
    const baseClasses =
        'flex w-full items-start pr-4 pl-0 py-3.5 text-left transition-colors';
    const containerClasses = interactive
        ? `${baseClasses} hover:bg-white/[0.03] active:bg-white/[0.04]`
        : baseClasses;

    if (interactive) {
        return (
            <button
                type="button"
                className={containerClasses}
                onClick={onClick}
                aria-label={ariaLabel}
            >
                <div className="min-w-0 flex-1">{children}</div>
            </button>
        );
    }

    return (
        <div className={containerClasses}>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

export default function MobileEventDetailPanel(props: MobileEventDetailPanelProps) {
    return <MobileEventDetailPanelContent key={props.event.id} {...props} />;
}

function MobileEventDetailPanelContent({
    event,
    onClose,
    categories,
}: MobileEventDetailPanelProps) {
    const { close } = useBackClose('mobile-event-detail', onClose);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] }>(event);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [expandedAgendaDays, setExpandedAgendaDays] = useState<string[]>([]);
    const [showAllSpeakers, setShowAllSpeakers] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const { trackedEventIds, trackEvent, untrackEvent, isLoading: isTrackingLoading } = useTrackedEventsUnified();
    const { getAttendanceStatus, setAttendanceStatus } = useEventEngagement();

    const displayEvent = eventWithAgenda;
    const categoryNameById = useMemo(
        () => new Map(categories.map((category) => [category.id, category.name])),
        [categories]
    );
    const eventMetaLabel = categoryNameById.get(displayEvent.eventTypeId)
        ?? normalizeEventFormatLabel(displayEvent.eventFormat);
    const displayDateTime = useMemo(
        () => formatEventDateTime(displayEvent.startTime, displayEvent.endTime),
        [displayEvent.endTime, displayEvent.startTime]
    );
    const displayLocation = displayEvent.location?.trim() || 'Location TBA';
    const isLocationInteractive = hasMappableLocation(displayEvent.location);
    const agendaItems = displayEvent.agenda ?? [];
    const agendaDayGroups = buildAgendaDayGroups(agendaItems, displayEvent.timezone);
    const uniqueSpeakers = dedupeSpeakersFromEvent(displayEvent);
    const visibleSpeakers = showAllSpeakers ? uniqueSpeakers : uniqueSpeakers.slice(0, PREVIEW_COUNT);
    const visibleTags = displayEvent.tags?.slice(0, 6) ?? [];
    const hiddenTagCount = Math.max((displayEvent.tags?.length ?? 0) - visibleTags.length, 0);
    const primaryUrl = displayEvent.registrationUrl || displayEvent.sourceUrl || '';
    const hasPrimaryUrl = Boolean(primaryUrl);
    const trackingEventId =
        ('originalEventId' in displayEvent ? (displayEvent as MultiDayEventInstance).originalEventId : null)
        || displayEvent.id;
    const attendanceStatus = getAttendanceStatus(trackingEventId);
    const isTracked = trackedEventIds?.has(displayEvent.id) ?? false;

    const hostName = displayEvent.organization?.name || displayEvent.organizer || 'Organizer';
    const hostImageCandidate =
        getSafeImageSrc(displayEvent.organization?.logo)
        ?? getVersionedImageSrc(displayEvent.eventImageUrl, displayEvent.updatedAt);
    const hostImageSrc = getBrowserSafeImageSrc(hostImageCandidate, { width: 80 }) ?? hostImageCandidate;

    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(displayEvent);

    useEffect(() => {
        let isMounted = true;

        const fetchEventWithAgenda = async () => {
            const alreadyHasAgenda = Array.isArray(event.agenda) && event.agenda.length > 0;
            if (alreadyHasAgenda && hasSpeakerData(event)) {
                return;
            }

            try {
                const supabase = createClient();
                const fetchEventId =
                    ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null)
                    || event.id;
                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);

                if (!isMounted) {
                    return;
                }

                const fetchedAgenda = Array.isArray(fullEvent.agenda) ? fullEvent.agenda : [];
                const fetchedSpeakerLineup = Array.isArray(fullEvent.speakerLineup)
                    ? fullEvent.speakerLineup
                    : [];

                if (fetchedAgenda.length === 0 && fetchedSpeakerLineup.length === 0) {
                    return;
                }

                setEventWithAgenda((previous) => ({
                    ...previous,
                    ...(fetchedAgenda.length > 0 ? { agenda: fetchedAgenda } : {}),
                    ...(fetchedSpeakerLineup.length > 0 ? { speakerLineup: fetchedSpeakerLineup } : {}),
                }));
            } catch (error) {
                console.warn('Failed to fetch mobile event detail data:', error);
            }
        };

        void fetchEventWithAgenda();

        return () => {
            isMounted = false;
        };
    }, [event]);

    useEffect(() => {
        const handleClickOutside = (mouseEvent: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(mouseEvent.target as Node)) {
                setShowMoreMenu(false);
            }
        };

        if (showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMoreMenu]);

    useEffect(() => {
        const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
            if (keyboardEvent.key !== 'Escape') {
                return;
            }

            if (showMoreMenu) {
                setShowMoreMenu(false);
                return;
            }

            close();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [close, showMoreMenu]);

    const handleTrackEvent = async () => {
        if (!user) {
            return;
        }

        if (isTracked) {
            await untrackEvent(displayEvent.id);
            return;
        }

        await trackEvent(displayEvent.id, 'bookmarked');
    };

    const handlePrimaryAction = () => {
        if (hasPrimaryUrl) {
            window.open(primaryUrl, '_blank', 'noopener,noreferrer');

            if (user && attendanceStatus == null) {
                void setAttendanceStatus(trackingEventId, 'attending');
            }
            return;
        }

        window.open(googleCalendarLink, '_blank', 'noopener,noreferrer');
    };

    const toggleAgendaDay = (dayKey: string) => {
        setExpandedAgendaDays((previous) =>
            previous.includes(dayKey)
                ? previous.filter((key) => key !== dayKey)
                : [...previous, dayKey]
        );
    };

    return (
        <div
            className="fixed inset-0 z-[120] overflow-hidden bg-[#08090a] text-[#f4f4f5]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-event-detail-title"
        >
            <div className="flex h-full flex-col" style={{ backgroundColor: PANEL_BACKGROUND }}>
                <header className="shrink-0 border-b border-white/[0.06] bg-[#08090a]/95 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-md">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            {eventMetaLabel ? (
                                <p className="mb-2 text-[12px] font-medium tracking-[0.02em] text-[#7d7f87]">
                                    {eventMetaLabel}
                                </p>
                            ) : null}
                            <h1
                                id="mobile-event-detail-title"
                                className="overflow-hidden text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#f4f4f5] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                            >
                                {displayEvent.title}
                            </h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowMoreMenu((previous) => !previous)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#8e9099] transition-colors hover:bg-white/[0.04] hover:text-[#f4f4f5]"
                                    aria-label="More actions"
                                    aria-expanded={showMoreMenu}
                                >
                                    <DotsThreeVerticalIcon size={18} weight="bold" />
                                </button>

                                {showMoreMenu ? (
                                    <div className="absolute right-0 top-full z-[140] mt-2 w-60 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#111214] p-1 shadow-[0_22px_48px_rgba(0,0,0,0.45)]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleShare();
                                                setShowMoreMenu(false);
                                            }}
                                            className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] text-[#d7d8de] transition-colors hover:bg-white/[0.05]"
                                        >
                                            <ShareNetworkIcon size={16} />
                                            Share Event
                                        </button>
                                        <a
                                            href={googleCalendarLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowMoreMenu(false)}
                                            className="flex h-11 items-center gap-3 rounded-[14px] px-3 text-[14px] text-[#d7d8de] transition-colors hover:bg-white/[0.05]"
                                        >
                                            <CalendarPlusIcon size={16} />
                                            Add to Google Calendar
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleIcsDownload();
                                                setShowMoreMenu(false);
                                            }}
                                            className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] text-[#d7d8de] transition-colors hover:bg-white/[0.05]"
                                        >
                                            <DownloadSimpleIcon size={16} />
                                            Download ICS
                                        </button>
                                        {hasPrimaryUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    window.open(primaryUrl, '_blank', 'noopener,noreferrer');
                                                    setShowMoreMenu(false);
                                                }}
                                                className="flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left text-[14px] text-[#d7d8de] transition-colors hover:bg-white/[0.05]"
                                            >
                                                <ArrowSquareOutIcon size={16} />
                                                Visit Event Page
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>

                            <button
                                type="button"
                                onClick={close}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-[#8e9099] transition-colors hover:bg-white/[0.04] hover:text-[#f4f4f5]"
                                aria-label="Close"
                            >
                                <XIcon size={20} weight="bold" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="px-5 py-4 pb-8">
                        <section className="divide-y divide-white/[0.06] border-b border-white/[0.06]">
                            <InfoRow>
                                <p className="text-[12px] font-medium text-[#7d7f87]">{'When'}</p>
                                <p className="mt-1 text-[16px] font-medium leading-6 text-[#f4f4f5]">
                                    {displayDateTime}
                                </p>
                            </InfoRow>

                            <InfoRow
                                interactive={isLocationInteractive}
                                onClick={
                                    isLocationInteractive
                                        ? () => window.open(buildMapsSearchUrl(displayLocation), '_blank', 'noopener,noreferrer')
                                        : undefined
                                }
                                ariaLabel={isLocationInteractive ? 'Open location in maps' : undefined}
                            >
                                <p className="text-[12px] font-medium text-[#7d7f87]">{'Where'}</p>
                                <div className="mt-1 flex items-start gap-2">
                                    <p className="min-w-0 flex-1 text-[16px] font-medium leading-6 text-[#f4f4f5]">
                                        {displayLocation}
                                    </p>
                                    {isLocationInteractive ? (
                                        <ArrowSquareOutIcon size={16} className="mt-1 shrink-0 text-[#7d7f87]" />
                                    ) : null}
                                </div>
                            </InfoRow>

                            <InfoRow>
                                <p className="text-[12px] font-medium text-[#7d7f87]">{'Hosted by'}</p>
                                <div className="mt-1 flex items-center gap-3">
                                    {hostImageSrc ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={hostImageSrc}
                                            alt={hostName}
                                            width={36}
                                            height={36}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <span className="shrink-0 text-[12px] font-semibold uppercase text-[#7d7f87]">
                                            {getInitials(hostName)}
                                        </span>
                                    )}
                                    <p className="min-w-0 text-[16px] font-medium leading-6 text-[#f4f4f5]">
                                        {hostName}
                                    </p>
                                </div>
                            </InfoRow>

                            {visibleTags.length > 0 ? (
                                <InfoRow>
                                    <p className="text-[12px] font-medium text-[#7d7f87]">{'Topics'}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {visibleTags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="inline-flex h-8 items-center rounded-[12px] border border-white/[0.08] px-3 text-[13px] font-medium text-[#d7d8de]"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                        {hiddenTagCount > 0 ? (
                                            <span className="inline-flex h-8 items-center rounded-[12px] border border-white/[0.08] px-3 text-[13px] font-medium text-[#8e9099]">
                                                +{hiddenTagCount}
                                            </span>
                                        ) : null}
                                    </div>
                                </InfoRow>
                            ) : null}
                        </section>

                        {displayEvent.description ? (
                            <section className="border-b border-white/[0.06] py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-[15px] font-medium text-[#e8e8ee]">Overview</h2>
                                </div>
                                <div className="mt-3">
                                    <p
                                        className={`text-[15px] leading-7 text-[#a7a9b1] whitespace-pre-wrap ${showFullDescription
                                            ? ''
                                            : '[display:-webkit-box] overflow-hidden [-webkit-box-orient:vertical] [-webkit-line-clamp:4]'
                                            }`}
                                    >
                                        {displayEvent.description}
                                    </p>
                                    {displayEvent.description.length > 240 ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowFullDescription((previous) => !previous)}
                                            className="mt-3 text-[13px] font-medium text-[#9ea2ad] transition-colors hover:text-[#f4f4f5]"
                                        >
                                            {showFullDescription ? 'Show less' : 'Read more'}
                                        </button>
                                    ) : null}
                                </div>
                            </section>
                        ) : null}

                        {agendaItems.length > 0 ? (
                            <section className="border-b border-white/[0.06] py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-[15px] font-medium text-[#e8e8ee]">Agenda</h2>
                                    <span className="text-[12px] text-[#7d7f87]">
                                        {agendaDayGroups.length} day{agendaDayGroups.length === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="mt-3 divide-y divide-white/[0.06]">
                                    {agendaDayGroups.map((agendaDayGroup, groupIndex) => {
                                        const isExpanded = expandedAgendaDays.includes(agendaDayGroup.key);
                                        const dayLabel = formatAgendaDayLabel(
                                            agendaDayGroup.items[0],
                                            groupIndex,
                                            agendaDayGroups.length
                                        );
                                        const dayMeta = formatAgendaDayMeta(agendaDayGroup.items);

                                        return (
                                            <div
                                                key={agendaDayGroup.key}
                                                className="py-3 first:pt-0 last:pb-0"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => toggleAgendaDay(agendaDayGroup.key)}
                                                    className="flex w-full items-center justify-between gap-3 text-left"
                                                    aria-expanded={isExpanded}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-[14px] font-medium text-[#f4f4f5]">
                                                            {dayLabel}
                                                        </p>
                                                        <p className="mt-1 text-[12px] text-[#7d7f87]">
                                                            {dayMeta}
                                                        </p>
                                                    </div>
                                                    <CaretRight
                                                        size={14}
                                                        weight="bold"
                                                        className={`shrink-0 text-[#7d7f87] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                    />
                                                </button>

                                                {isExpanded ? (
                                                    <div className="mt-3">
                                                        {agendaDayGroup.items.map((agendaItem, itemIndex) => {
                                                            const agendaSecondaryText = buildAgendaSecondaryText(agendaItem);
                                                            const isLastAgendaItem = itemIndex === agendaDayGroup.items.length - 1;

                                                            return (
                                                                <div
                                                                    key={agendaItem.id}
                                                                    className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
                                                                >
                                                                    <div className="pt-0.5 text-[12px] font-medium tabular-nums text-[#7d7f87]">
                                                                        {formatAgendaTimeRange(agendaItem)}
                                                                    </div>
                                                                    <div className="relative min-w-0 pl-4">
                                                                        {!isLastAgendaItem ? (
                                                                            <span className="absolute bottom-[-12px] left-[4px] top-[14px] w-px bg-white/[0.06]" />
                                                                        ) : null}
                                                                        <span className="absolute left-0 top-[8px] h-2.5 w-2.5 rounded-full bg-white/[0.38]" />
                                                                        <p className="text-[15px] font-medium leading-6 text-[#f4f4f5]">
                                                                            {agendaItem.title}
                                                                        </p>
                                                                        {agendaSecondaryText ? (
                                                                            <p className="mt-1 text-[13px] leading-5 text-[#8e9099]">
                                                                                {agendaSecondaryText}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ) : null}

                        {uniqueSpeakers.length > 0 ? (
                            <section className="border-b border-white/[0.06] py-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-[15px] font-medium text-[#e8e8ee]">Speakers</h2>
                                    <span className="text-[12px] text-[#7d7f87]">
                                        {uniqueSpeakers.length} speaker{uniqueSpeakers.length === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="mt-3 divide-y divide-white/[0.06]">
                                    {visibleSpeakers.map((speaker, index) => {
                                        const { primary, fallback } = getSpeakerAvatarUrls(speaker, 40);
                                        const speakerAvatarSrc = getBrowserSafeImageSrc(primary, { width: 80 }) ?? primary;
                                        const fallbackAvatarSrc = getBrowserSafeImageSrc(fallback, { width: 80 }) ?? fallback;
                                        const speakerSecondaryText = buildSpeakerSecondaryText(speaker);

                                        return (
                                            <div
                                                key={getSpeakerIdentity(speaker, index)}
                                                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.04]">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={speakerAvatarSrc}
                                                        alt={speaker.name}
                                                        className="h-full w-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                        onError={(errorEvent) => {
                                                            if (errorEvent.currentTarget.src !== fallbackAvatarSrc) {
                                                                errorEvent.currentTarget.src = fallbackAvatarSrc;
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[15px] font-medium leading-6 text-[#f4f4f5]">
                                                        {speaker.name}
                                                    </p>
                                                    {speakerSecondaryText ? (
                                                        <p className="text-[13px] leading-5 text-[#8e9099]">
                                                            {speakerSecondaryText}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {uniqueSpeakers.length > PREVIEW_COUNT ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllSpeakers((previous) => !previous)}
                                        className="mt-3 text-[13px] font-medium text-[#9ea2ad] transition-colors hover:text-[#f4f4f5]"
                                    >
                                        {showAllSpeakers ? 'Show less' : 'Show all speakers'}
                                    </button>
                                ) : null}
                            </section>
                        ) : null}
                    </div>
                </main>

                <footer className="shrink-0 border-t border-white/[0.06] bg-[#08090a]/95 px-5 pt-3 backdrop-blur-md pb-[calc(env(safe-area-inset-bottom)+14px)]">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handlePrimaryAction}
                            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] bg-white px-4 text-[16px] font-semibold text-[#08090a] transition-colors hover:bg-[#f2f2f4]"
                        >
                            {hasPrimaryUrl ? <ArrowSquareOutIcon size={18} /> : <CalendarPlusIcon size={18} />}
                            <span>{hasPrimaryUrl ? 'Register' : 'Add to Calendar'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleTrackEvent}
                            disabled={isTrackingLoading || !user}
                            className={`flex h-14 w-[124px] shrink-0 items-center justify-center gap-2 rounded-[18px] border px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${isTracked
                                ? 'border-[#f4c84c] bg-[#f4c84c] text-[#08090a] hover:bg-[#ffd65f]'
                                : 'border-white/[0.08] bg-white/[0.03] text-[#d7d8de] hover:bg-white/[0.05]'
                                }`}
                            aria-label={isTracked ? 'Remove bookmark' : 'Bookmark event'}
                            aria-pressed={isTracked}
                        >
                            <BookmarkSimple size={16} weight={isTracked ? 'fill' : 'regular'} />
                            <span>{isTracked ? 'Saved' : 'Bookmark'}</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
