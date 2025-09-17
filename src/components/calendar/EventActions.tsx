// src/components/calendar/EventActions.tsx
'use client';
import { FC, useState, useRef, useEffect } from 'react';
import { CalendarPlusIcon, ShareNetworkIcon, DownloadSimpleIcon, DotsThreeVerticalIcon } from '@phosphor-icons/react';
// 1. UPDATE IMPORT: Use the new, canonical `Event` type.
import { Event } from '@/types';
import { useEventActions } from '@/hooks/useEventActions';

// 2. UPDATE PROPS: The interface now uses the `Event` type.
interface EventActionsProps {
    event: Event;
}

const EventActions: FC<EventActionsProps> = ({ event }) => {
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            {/* All actions in one horizontal line */}
            <div className="flex items-center gap-3">
                {/* Primary CTA - Takes more space */}
                <button 
                    onClick={() => {
                        // This would need to be connected to the tracking functionality
                        console.log('Track event clicked');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <CalendarPlusIcon className="w-4 h-4" />
                    <span>Track Event</span>
                </button>
                
                {/* Share icon-only button */}
                <button 
                    onClick={() => handleShare()}
                    className="flex items-center justify-center px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/30"
                    title="Share event"
                >
                    <ShareNetworkIcon className="w-3.5 h-3.5 text-gray-300" />
                </button>

                {/* More menu */}
                <div className="relative" ref={moreMenuRef}>
                    <button 
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                        title="More actions"
                        aria-expanded={showMoreMenu}
                        aria-haspopup="true"
                    >
                        <DotsThreeVerticalIcon className="w-3.5 h-3.5 text-gray-300" />
                    </button>
                    
                    {/* More menu dropdown */}
                    {showMoreMenu && (
                        <div 
                            className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10"
                            role="menu"
                            aria-orientation="vertical"
                        >
                            <a 
                                href={googleCalendarLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={() => setShowMoreMenu(false)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors focus:outline-none focus:bg-gray-700"
                                role="menuitem"
                            >
                                <CalendarPlusIcon className="w-4 h-4" />
                                <span>Add to Calendar</span>
                            </a>
                            <button 
                                onClick={() => {
                                    handleIcsDownload();
                                    setShowMoreMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none focus:bg-gray-700"
                                role="menuitem"
                            >
                                <DownloadSimpleIcon className="w-4 h-4" />
                                <span>Download .ics</span>
                            </button>
                            <button 
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none focus:bg-gray-700"
                                role="menuitem"
                            >
                                <DownloadSimpleIcon className="w-4 h-4" />
                                <span>Export to PDF</span>
                            </button>
                            <button 
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg transition-colors focus:outline-none focus:bg-gray-700"
                                role="menuitem"
                            >
                                <DownloadSimpleIcon className="w-4 h-4" />
                                <span>Print</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventActions;