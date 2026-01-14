// src/components/calendar/EventActions.tsx
'use client';
import { FC, useState, useRef, useEffect } from 'react';
import { CalendarPlusIcon, ShareNetworkIcon, DownloadSimpleIcon, DotsThreeVerticalIcon, CheckCircle, Printer, FilePdf } from '@phosphor-icons/react';
import { Event } from '@/types';
import { useEventActions } from '@/hooks/useEventActions';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { format } from 'date-fns';

interface EventActionsProps {
    event: Event;
}

const EventActions: FC<EventActionsProps> = ({ event }) => {
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);
    const { isBookmarked, toggleBookmark } = useEventEngagement();
    const { showSuccess, showError } = useSnackbar();
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    const eventIsBookmarked = isBookmarked(event.id);

    // Handle track event click
    const handleTrackEvent = async () => {
        if (isTracking) return;

        setIsTracking(true);
        try {
            await toggleBookmark(event.id, event as unknown as Record<string, unknown>);
            showSuccess(eventIsBookmarked ? 'Event removed from tracking' : 'Event added to tracking');
        } catch (error) {
            const isLimit = error instanceof Error && error.message === 'BOOKMARK_LIMIT_REACHED';
            showError(isLimit ? 'Bookmark limit reached. Upgrade to add more.' : 'Failed to update event tracking');
            if (!isLimit) {
                console.error('Track event error:', error);
            }
        } finally {
            setIsTracking(false);
        }
    };

    // Handle print
    const handlePrint = () => {
        setShowMoreMenu(false);

        // Create a print-friendly version of the event
        const printContent = `
            <html>
            <head>
                <title>${event.title}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { font-size: 24px; margin-bottom: 8px; }
                    .meta { color: #666; margin-bottom: 24px; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-weight: 600; margin-bottom: 8px; color: #333; }
                    .description { line-height: 1.6; color: #444; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>${event.title}</h1>
                <div class="meta">
                    <p><strong>Date:</strong> ${format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')} at ${format(new Date(event.startTime), 'h:mm a')}</p>
                    ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                    ${event.organizer ? `<p><strong>Organizer:</strong> ${event.organizer}</p>` : ''}
                </div>
                ${event.description ? `<div class="section"><div class="section-title">Description</div><div class="description">${event.description}</div></div>` : ''}
                ${event.sourceUrl ? `<div class="section"><p><strong>More Info:</strong> ${event.sourceUrl}</p></div>` : ''}
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // Handle export to PDF (uses print dialog with PDF option)
    const handleExportPdf = () => {
        setShowMoreMenu(false);

        // Create PDF-optimized content
        const pdfContent = `
            <html>
            <head>
                <title>${event.title} - Event Details</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a1a; }
                    h1 { font-size: 28px; margin-bottom: 8px; color: #111; }
                    .subtitle { font-size: 14px; color: #666; margin-bottom: 32px; border-bottom: 1px solid #eee; padding-bottom: 16px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
                    .info-block { background: #f9f9f9; padding: 16px; border-radius: 8px; }
                    .info-label { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.5px; }
                    .info-value { font-size: 15px; color: #333; }
                    .description-section { margin-top: 24px; }
                    .description-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
                    .description { line-height: 1.7; color: #444; }
                    @media print {
                        body { padding: 20px; }
                        .info-block { background: #f5f5f5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <h1>${event.title}</h1>
                <div class="subtitle">Event Details</div>
                <div class="grid">
                    <div class="info-block">
                        <div class="info-label">Date & Time</div>
                        <div class="info-value">${format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}<br/>${format(new Date(event.startTime), 'h:mm a')}</div>
                    </div>
                    ${event.location ? `<div class="info-block"><div class="info-label">Location</div><div class="info-value">${event.location}</div></div>` : ''}
                    ${event.organizer ? `<div class="info-block"><div class="info-label">Organizer</div><div class="info-value">${event.organizer}</div></div>` : ''}
                    ${event.sourceUrl ? `<div class="info-block"><div class="info-label">Event Link</div><div class="info-value" style="word-break: break-all;">${event.sourceUrl}</div></div>` : ''}
                </div>
                ${event.description ? `<div class="description-section"><div class="description-title">About This Event</div><div class="description">${event.description}</div></div>` : ''}
            </body>
            </html>
        `;

        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
            pdfWindow.document.write(pdfContent);
            pdfWindow.document.close();
            // Small delay to ensure content is rendered before print dialog
            setTimeout(() => {
                pdfWindow.print();
            }, 250);
        }
    };

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
                    onClick={handleTrackEvent}
                    disabled={isTracking}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md ${
                        eventIsBookmarked
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'
                    } ${isTracking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {eventIsBookmarked ? (
                        <>
                            <CheckCircle className="w-4 h-4" weight="fill" />
                            <span>Tracking</span>
                        </>
                    ) : (
                        <>
                            <CalendarPlusIcon className="w-4 h-4" />
                            <span>{isTracking ? 'Saving...' : 'Track Event'}</span>
                        </>
                    )}
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
                                onClick={handleExportPdf}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors focus:outline-none focus:bg-gray-700"
                                role="menuitem"
                            >
                                <FilePdf className="w-4 h-4" />
                                <span>Export to PDF</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg transition-colors focus:outline-none focus:bg-gray-700"
                                role="menuitem"
                            >
                                <Printer className="w-4 h-4" />
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
