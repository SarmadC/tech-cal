'use client';

import React from 'react';

/**
 * Abstract SVG illustrations for the UseCasesSection
 * Inspired by Linear's product page design - monochromatic, abstract shapes
 */

// Personalized Discovery - Funnel filtering concept with matched events
export function DiscoveryGraphic() {
    return (
        <svg
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
        >
            {/* Funnel shape - top wide, narrows down */}
            <path
                d="M50 30 L350 30 L290 130 L110 130 Z"
                fill="currentColor"
                opacity="0.08"
            />
            <path
                d="M110 130 L290 130 L250 210 L150 210 Z"
                fill="currentColor"
                opacity="0.12"
            />
            
            {/* Input event cards at top - unfiltered, centered */}
            <rect x="80" y="20" width="56" height="40" rx="5" fill="currentColor" opacity="0.15" />
            <rect x="142" y="20" width="56" height="40" rx="5" fill="currentColor" opacity="0.15" />
            <rect x="204" y="20" width="56" height="40" rx="5" fill="currentColor" opacity="0.15" />
            <rect x="266" y="20" width="56" height="40" rx="5" fill="currentColor" opacity="0.15" />
            
            {/* Filter lines in funnel */}
            <line x1="60" y1="75" x2="340" y2="75" stroke="currentColor" strokeWidth="1.5" opacity="0.1" strokeDasharray="5 5" />
            <line x1="100" y1="105" x2="300" y2="105" stroke="currentColor" strokeWidth="1.5" opacity="0.1" strokeDasharray="5 5" />
            
            {/* Matched event card - output, increased size */}
            <rect
                x="130"
                y="230"
                width="140"
                height="85"
                rx="8"
                fill="currentColor"
                opacity="0.2"
            />
            {/* Content lines on matched card */}
            <rect x="145" y="250" width="50" height="6" rx="2" fill="currentColor" opacity="0.4" />
            <rect x="145" y="263" width="85" height="5" rx="2" fill="currentColor" opacity="0.25" />
            <rect x="145" y="275" width="70" height="5" rx="2" fill="currentColor" opacity="0.2" />
            
            {/* Match score badge */}
            <circle cx="255" cy="250" r="13" fill="currentColor" opacity="0.3" />
            <text x="255" y="254" textAnchor="middle" fill="currentColor" opacity="0.6" fontSize="11" fontWeight="600">
                95
            </text>
        </svg>
    );
}

// Calendar Sync - Calendar grid with sync action
export function CalendarSyncGraphic() {
    return (
        <svg
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
        >
            {/* Calendar container */}
            <rect
                x="100"
                y="60"
                width="200"
                height="180"
                rx="8"
                fill="currentColor"
                opacity="0.08"
            />
            
            {/* Calendar header bar */}
            <rect x="100" y="60" width="200" height="30" rx="8" fill="currentColor" opacity="0.12" />
            <rect x="100" y="82" width="200" height="8" fill="currentColor" opacity="0.12" />
            
            {/* Day headers */}
            <rect x="115" y="100" width="20" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="145" y="100" width="20" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="175" y="100" width="20" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="205" y="100" width="20" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="235" y="100" width="20" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="265" y="100" width="20" height="6" rx="3" fill="currentColor" opacity="0.2" />
            
            {/* Calendar grid cells */}
            <rect x="115" y="115" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="145" y="115" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="175" y="115" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="205" y="115" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="235" y="115" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="265" y="115" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            
            <rect x="115" y="145" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="145" y="145" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            {/* Highlighted event cell */}
            <rect x="175" y="145" width="22" height="22" rx="4" fill="currentColor" opacity="0.25" />
            <rect x="205" y="145" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="235" y="145" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="265" y="145" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            
            <rect x="115" y="175" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="145" y="175" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="175" y="175" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="205" y="175" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="235" y="175" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            <rect x="265" y="175" width="22" height="22" rx="4" fill="currentColor" opacity="0.06" />
            
            {/* Tap/click indicator - ripple effect on event cell */}
            <circle cx="186" cy="156" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <circle cx="186" cy="156" r="28" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
            
            {/* Sync arrow connecting to external */}
            <path
                d="M310 156 C330 156, 340 140, 340 120 C340 100, 330 90, 350 90"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.25"
                fill="none"
                strokeDasharray="4 4"
            />
            {/* Arrow head */}
            <path d="M347 85 L355 90 L347 95" stroke="currentColor" strokeWidth="2" opacity="0.25" fill="none" />
            
            {/* Google Calendar icon representation */}
            <rect x="355" y="75" width="30" height="30" rx="4" fill="currentColor" opacity="0.15" />
            <rect x="360" y="80" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="372" y="80" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="360" y="92" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="372" y="92" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
    );
}

// Career Insights - Analytics chart with growth trajectory
export function InsightsGraphic() {
    return (
        <svg
            viewBox="0 0 400 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
        >
            {/* Chart container */}
            <rect
                x="60"
                y="50"
                width="280"
                height="200"
                rx="8"
                fill="currentColor"
                opacity="0.06"
            />
            
            {/* Y-axis */}
            <line x1="90" y1="70" x2="90" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.15" />
            {/* X-axis */}
            <line x1="90" y1="220" x2="320" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.15" />
            
            {/* Horizontal grid lines */}
            <line x1="90" y1="100" x2="320" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.06" strokeDasharray="4 4" />
            <line x1="90" y1="140" x2="320" y2="140" stroke="currentColor" strokeWidth="1" opacity="0.06" strokeDasharray="4 4" />
            <line x1="90" y1="180" x2="320" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.06" strokeDasharray="4 4" />
            
            {/* Growth trajectory line */}
            <path
                d="M100 200 C130 195, 150 180, 170 165 C190 150, 210 130, 240 110 C260 95, 290 85, 310 75"
                stroke="currentColor"
                strokeWidth="2.5"
                opacity="0.35"
                fill="none"
                strokeLinecap="round"
            />
            
            {/* Area fill under the line */}
            <path
                d="M100 200 C130 195, 150 180, 170 165 C190 150, 210 130, 240 110 C260 95, 290 85, 310 75 L310 220 L100 220 Z"
                fill="currentColor"
                opacity="0.08"
            />
            
            {/* Data points on the line */}
            <circle cx="100" cy="200" r="4" fill="currentColor" opacity="0.3" />
            <circle cx="170" cy="165" r="4" fill="currentColor" opacity="0.35" />
            <circle cx="240" cy="110" r="4" fill="currentColor" opacity="0.4" />
            <circle cx="310" cy="75" r="5" fill="currentColor" opacity="0.45" />
            
            {/* Y-axis labels */}
            <rect x="65" y="95" width="18" height="8" rx="2" fill="currentColor" opacity="0.15" />
            <rect x="65" y="135" width="18" height="8" rx="2" fill="currentColor" opacity="0.12" />
            <rect x="65" y="175" width="18" height="8" rx="2" fill="currentColor" opacity="0.1" />
            
            {/* Progress indicators on right side */}
            <rect x="335" y="80" width="50" height="35" rx="4" fill="currentColor" opacity="0.1" />
            <rect x="342" y="88" width="25" height="6" rx="3" fill="currentColor" opacity="0.25" />
            <rect x="342" y="100" width="35" height="5" rx="2" fill="currentColor" opacity="0.15" />
            
            <rect x="335" y="125" width="50" height="35" rx="4" fill="currentColor" opacity="0.1" />
            <rect x="342" y="133" width="20" height="6" rx="3" fill="currentColor" opacity="0.25" />
            <rect x="342" y="145" width="30" height="5" rx="2" fill="currentColor" opacity="0.15" />
            
            <rect x="335" y="170" width="50" height="35" rx="4" fill="currentColor" opacity="0.1" />
            <rect x="342" y="178" width="28" height="6" rx="3" fill="currentColor" opacity="0.25" />
            <rect x="342" y="190" width="32" height="5" rx="2" fill="currentColor" opacity="0.15" />
        </svg>
    );
}
