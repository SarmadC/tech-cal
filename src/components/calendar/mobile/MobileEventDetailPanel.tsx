'use client';

import { FC, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import {
    XIcon,
    ArrowSquareOutIcon,
    CalendarPlusIcon,
    ShareNetworkIcon,
    DotsThreeVerticalIcon,
    DownloadSimpleIcon,
    BookmarkSimple
} from '@phosphor-icons/react';
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import { useEventActions } from '@/hooks/useEventActions';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useAuth } from '@/contexts';
import { getSafeImageSrc, getVersionedImageSrc } from '@/utils/imageUrl';

interface MobileEventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const MobileEventDetailPanel: FC<MobileEventDetailPanelProps> = ({ event, onClose, categories: _categories }) => {
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] }>(event);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Add tracking functionality
    const { user } = useAuth();
    const { trackedEventIds, trackEvent, untrackEvent, isLoading: isTrackingLoading } = useTrackedEventsUnified();
    const { getAttendanceStatus, setAttendanceStatus } = useEventEngagement();

    // Update eventWithAgenda when event prop changes
    useEffect(() => {
        setEventWithAgenda(event);
    }, [event]);

    // Get the display event (with agenda if available)
    const displayEvent = eventWithAgenda;
    const organizationLogoSrc = getSafeImageSrc(displayEvent.organization?.logo);
    const versionedEventImageSrc = getVersionedImageSrc(displayEvent.eventImageUrl, displayEvent.updatedAt);

    // Event actions hook - use displayEvent to ensure it updates with new events
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(displayEvent);

    // Check if event is tracked
    const isTracked = trackedEventIds?.has(displayEvent.id) ?? false;

    const handleTrackEvent = async () => {
        if (!user) {
            return;
        }

        if (isTracked) {
            await untrackEvent(displayEvent.id);
        } else {
            await trackEvent(displayEvent.id, 'bookmarked');
        }
    };

    // Attendance functionality
    const trackingEventId = ('originalEventId' in displayEvent ? (displayEvent as MultiDayEventInstance).originalEventId : null) || displayEvent.id;
    const attendanceStatus = getAttendanceStatus(trackingEventId);

    const getAttendanceState = () => {
        if (!attendanceStatus || attendanceStatus === null) {
            return { state: 'none', label: 'Attending', nextAction: 'attending' };
        }
        if (attendanceStatus === 'attending') {
            return { state: 'attending', label: 'Attending', nextAction: 'attended' };
        }
        if (attendanceStatus === 'attended') {
            return { state: 'attended', label: 'Attended', nextAction: null };
        }
        return { state: 'none', label: 'Attending', nextAction: 'attending' };
    };

    const attendanceState = getAttendanceState();

    // Fetch complete event details with agenda
    useEffect(() => {
        let isMounted = true;

        const fetchEventWithAgenda = async () => {
            if (event.agenda && event.agenda.length > 0) {
                return;
            }

            try {
                const supabase = createClient();
                const fetchEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);

                if (isMounted) {
                    if (fullEvent.agenda && fullEvent.agenda.length > 0) {
                        setEventWithAgenda(prev => ({
                            ...prev,
                            agenda: fullEvent.agenda
                        }));
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch event agenda:', error);
            }
        };

        void fetchEventWithAgenda();

        return () => {
            isMounted = false;
        };
    }, [event]);

    // Close more menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
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

    const containerClasses = `fixed inset-0 z-50 bg-[#161618] overflow-y-auto`;

    const toggleDescription = () => {
        setShowFullDescription(!showFullDescription);
    };

    const getDescriptionPreview = (description: string, maxLength: number = 150) => {
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength) + '...';
    };

    // Helper to render property row
    const PropertyRow = ({ label, children }: { label: string, children: React.ReactNode }) => (
        <>
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#71717A] py-1">{label}</div>
            <div className="text-[14px] font-normal text-[#F4F4F5] py-1 min-w-0">{children}</div>
        </>
    );

    return (
        <div className={containerClasses}>
            {/* Mobile Header - Minimal */}
            <div className="sticky top-0 z-10 bg-[#161618]/95 backdrop-blur-md">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0 pr-4">
                        <h1 className="text-[16px] font-bold text-[#F4F4F5] truncate leading-tight">
                            {displayEvent.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* More Menu - Moved to Header */}
                        <div className="relative" ref={moreMenuRef}>
                            <button
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className="p-2 rounded-md hover:bg-white/10 text-[#A1A1AA] transition-colors"
                                aria-label="More options"
                            >
                                <DotsThreeVerticalIcon size={20} weight="bold" />
                            </button>

                            {/* More Menu Dropdown */}
                            {showMoreMenu && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E1E20] rounded-xl shadow-2xl border border-[#27272A] py-1 overflow-hidden z-50">
                                    <button
                                        onClick={() => {
                                            handleShare();
                                            setShowMoreMenu(false);
                                        }}
                                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#E4E4E7] hover:bg-white/5 w-full text-left"
                                    >
                                        <ShareNetworkIcon size={16} />
                                        Share Event
                                    </button>
                                    <a
                                        href={googleCalendarLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#E4E4E7] hover:bg-white/5"
                                        onClick={() => setShowMoreMenu(false)}
                                    >
                                        <CalendarPlusIcon size={16} />
                                        Add to Google Calendar
                                    </a>
                                    <button
                                        onClick={() => {
                                            handleIcsDownload();
                                            setShowMoreMenu(false);
                                        }}
                                        className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#E4E4E7] hover:bg-white/5 w-full text-left"
                                    >
                                        <DownloadSimpleIcon size={16} />
                                        Download ICS
                                    </button>
                                    {(displayEvent.registrationUrl || displayEvent.sourceUrl) && (
                                        <button
                                            onClick={() => {
                                                const url = displayEvent.registrationUrl || displayEvent.sourceUrl;
                                                if (url) {
                                                    window.open(url, '_blank', 'noopener,noreferrer');
                                                }
                                                setShowMoreMenu(false);
                                            }}
                                            className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-[#E4E4E7] hover:bg-white/5 w-full text-left"
                                        >
                                            <ArrowSquareOutIcon size={16} />
                                            Visit Event Page
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-md hover:bg-white/10 text-[#A1A1AA] transition-colors"
                            aria-label="Close"
                        >
                            <XIcon size={20} weight="bold" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content - Scrollable */}
            <div className="px-5 pb-32 pt-2">
                {/* Property Grid */}
                <div className="grid grid-cols-[90px_1fr] gap-x-4 gap-y-3 my-6 items-center">
                    {/* Date */}
                    <PropertyRow label="DATE">
                        {format(new Date(displayEvent.startTime), "MMM d, yyyy 'at' h:mm a")}
                    </PropertyRow>

                    {/* Location */}
                    <PropertyRow label="LOCATION">
                        <div className="flex items-center gap-1.5 group cursor-pointer hover:text-white transition-colors">
                            <span className="truncate">
                                {displayEvent.location || 'TBA'}
                            </span>
                            {displayEvent.location && (
                                <ArrowSquareOutIcon size={14} className="text-[#71717A] group-hover:text-white transition-colors" />
                            )}
                        </div>
                    </PropertyRow>

                    {/* Host */}
                    <PropertyRow label="HOST">
                        <div className="flex items-center gap-2">
                            {organizationLogoSrc || versionedEventImageSrc ? (
                                <div className="w-6 h-6 overflow-hidden flex-shrink-0">
                                    <Image
                                        src={organizationLogoSrc || versionedEventImageSrc || ''}
                                        alt="Host"
                                        width={24}
                                        height={24}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold text-white">
                                        {(displayEvent.organization?.name || displayEvent.title).charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <span className="truncate">{displayEvent.organization?.name || 'Organizer'}</span>
                        </div>
                    </PropertyRow>

                    {/* Tags */}
                    {displayEvent.tags && displayEvent.tags.length > 0 && (
                        <PropertyRow label="TAGS">
                            <div className="flex flex-wrap gap-1.5">
                                {displayEvent.tags.slice(0, 5).map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center px-1.5 py-[2px] rounded text-[11px] bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]"
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                                {displayEvent.tags.length > 5 && (
                                    <span className="inline-flex items-center px-1.5 py-[2px] rounded text-[11px] bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46] hover:bg-[#3F3F46] hover:text-white transition-colors cursor-pointer">
                                        +{displayEvent.tags.length - 5} more
                                    </span>
                                )}
                            </div>
                        </PropertyRow>
                    )}
                </div>

                {/* Description Divider & Content */}
                {displayEvent.description && (
                    <div className="border-t border-[#27272A] pt-7">
                        <div className="text-[14px] font-semibold text-[#EDEDED] mb-2">Description</div>
                        <div className="text-[14px] text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">
                            {showFullDescription ? (
                                <div>
                                    {displayEvent.description}
                                    <button
                                        onClick={toggleDescription}
                                        className="block mt-2 text-[#E4E4E7] hover:underline font-medium"
                                    >
                                        Show less
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <span className="text-[#A1A1AA]">{getDescriptionPreview(displayEvent.description)}</span>
                                    {displayEvent.description.length > 150 && (
                                        <button
                                            onClick={toggleDescription}
                                            className="inline ml-1 text-blue-400 hover:text-blue-300 font-medium hover:underline"
                                        >
                                            Read more
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#161618] via-[#161618] to-transparent z-20">
                <div className="flex flex-col gap-3">
                    {/* Primary Action - Register */}
                    <button
                        onClick={() => {
                            const url = displayEvent.registrationUrl || displayEvent.sourceUrl;
                            if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                                // Auto-mark as 'attending' when they register (if not already set)
                                if (user && attendanceState.state === 'none') {
                                    setAttendanceStatus(trackingEventId, 'attending');
                                }
                            } else {
                                // Fallback: Add to calendar if no registration URL
                                window.open(googleCalendarLink, '_blank');
                            }
                        }}
                        disabled={!user && !(displayEvent.registrationUrl || displayEvent.sourceUrl)}
                        className="w-full flex items-center justify-center gap-2 h-12 rounded-lg font-medium text-[15px] transition-all duration-200 shadow-lg bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowSquareOutIcon size={18} />
                        <span>
                            {displayEvent.registrationUrl || displayEvent.sourceUrl
                                ? 'Register'
                                : 'Add to Calendar'}
                        </span>
                    </button>

                    {/* Secondary Action - Bookmark */}
                    <button
                        onClick={handleTrackEvent}
                        disabled={isTrackingLoading || !user}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-[14px] transition-colors ${isTracked
                            ? 'text-blue-400 hover:text-blue-300'
                            : 'text-[#A1A1AA] hover:text-white'
                            }`}
                    >
                        <BookmarkSimple size={16} weight={isTracked ? 'fill' : 'regular'} />
                        {isTracked ? 'Saved to Bookmarks' : 'Bookmark this event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileEventDetailPanel;
