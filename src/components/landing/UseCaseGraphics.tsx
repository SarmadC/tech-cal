'use client';

import React from 'react';
import styles from './UseCasesSection.module.css';

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
                y="210"
                width="140"
                height="85"
                rx="8"
                className={styles.graphicAccentBlueFill}
                opacity="0.25"
            />
            {/* Content lines on matched card */}
            <rect x="145" y="230" width="50" height="6" rx="2" className={styles.graphicAccentBlueFill} opacity="0.5" />
            <rect x="145" y="243" width="85" height="5" rx="2" className={styles.graphicAccentBlueFill} opacity="0.35" />
            <rect x="145" y="255" width="70" height="5" rx="2" className={styles.graphicAccentBlueFill} opacity="0.3" />

            {/* Match score badge */}
            <circle cx="255" cy="230" r="13" className={styles.graphicAccentBlueFill} opacity="0.4" />
            <text x="255" y="234" textAnchor="middle" className={styles.graphicTextContrast} opacity="0.9" fontSize="11" fontWeight="600">
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
            width="400"
            height="300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Calendar container - Increased width from 200 to 280, height 180 to 200 */}
            <rect
                x="60"
                y="50"
                width="280"
                height="200"
                rx="8"
                fill="currentColor"
                opacity="0.08"
            />

            {/* Calendar header bar */}
            <rect x="60" y="50" width="280" height="35" rx="8" fill="currentColor" opacity="0.12" />
            <rect x="60" y="75" width="280" height="10" fill="currentColor" opacity="0.12" />

            {/* Day headers - x start 78, gap 8, width 34 */}
            <rect x="78" y="95" width="34" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="120" y="95" width="34" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="162" y="95" width="34" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="204" y="95" width="34" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="246" y="95" width="34" height="6" rx="3" fill="currentColor" opacity="0.2" />
            <rect x="288" y="95" width="34" height="6" rx="3" fill="currentColor" opacity="0.2" />

            {/* Calendar grid cells - Row 1 */}
            <rect x="78" y="115" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="120" y="115" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="162" y="115" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="204" y="115" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="246" y="115" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="288" y="115" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />

            {/* Calendar grid cells - Row 2 */}
            <rect x="78" y="159" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="120" y="159" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            {/* Highlighted event cell - Center left ish */}
            <rect x="162" y="159" width="34" height="34" rx="6" className={styles.graphicAccentGreenFill} opacity="0.35" />
            <rect x="204" y="159" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="246" y="159" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="288" y="159" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />

            {/* Calendar grid cells - Row 3 */}
            <rect x="78" y="203" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="120" y="203" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="162" y="203" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="204" y="203" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="246" y="203" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />
            <rect x="288" y="203" width="34" height="34" rx="6" fill="currentColor" opacity="0.06" />

            {/* Tap/click indicator - ripple effect on event cell (162, 159) center = 179, 176 */}
            <circle cx="179" cy="176" r="22" fill="none" className={styles.graphicAccentGreenStroke} strokeWidth="1" opacity="0.4" />
            <circle cx="179" cy="176" r="34" fill="none" className={styles.graphicAccentGreenStroke} strokeWidth="1" opacity="0.2" />

            {/* Sync arrow connecting to external - adjusted for new position */}
            <path
                d="M322 176 C345 176, 355 155, 355 130 C355 105, 345 95, 365 95"
                className={styles.graphicAccentGreenStroke}
                strokeWidth="2"
                opacity="0.4"
                fill="none"
                strokeDasharray="4 4"
            />
            {/* Arrow head */}
            <path d="M362 90 L370 95 L362 100" className={styles.graphicAccentGreenStroke} strokeWidth="2" opacity="0.4" fill="none" />

            {/* Google Calendar icon representation - adjusted */}
            <rect x="370" y="80" width="30" height="30" rx="4" className={styles.graphicAccentGreenFill} opacity="0.2" />
            <rect x="375" y="85" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="387" y="85" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="375" y="97" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
            <rect x="387" y="97" width="8" height="8" rx="1" fill="currentColor" opacity="0.3" />
        </svg>
    );
}

// Career Insights - Analytics chart with growth trajectory
export function InsightsGraphic() {
    return (
        <svg
            viewBox="0 0 400 300"
            width="400"
            height="300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Gradient definition for growth line - ID needs to be unique if used multiple times, but here scoped to component */}
            <defs>
                <linearGradient id="growthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" className={styles.graphicGradientStart} />
                    <stop offset="100%" className={styles.graphicGradientEnd} />
                </linearGradient>
            </defs>

            {/* Chart container - Increased width 280 to 300 */}
            <rect
                x="50"
                y="50"
                width="300"
                height="200"
                rx="8"
                fill="currentColor"
                opacity="0.06"
            />

            {/* Y-axis - shifted left 10px */}
            <line x1="80" y1="70" x2="80" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.15" />
            {/* X-axis */}
            <line x1="80" y1="220" x2="330" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.15" />

            {/* Horizontal grid lines - wider */}
            <line x1="80" y1="100" x2="330" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.06" strokeDasharray="4 4" />
            <line x1="80" y1="140" x2="330" y2="140" stroke="currentColor" strokeWidth="1" opacity="0.06" strokeDasharray="4 4" />
            <line x1="80" y1="180" x2="330" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.06" strokeDasharray="4 4" />

            {/* Growth trajectory line - stretched */}
            <path
                d="M90 200 C120 195, 140 180, 160 165 C180 150, 200 130, 230 110 C260 95, 290 85, 320 75"
                stroke="url(#growthGradient)"
                strokeWidth="2.5"
                opacity="0.9"
                fill="none"
                strokeLinecap="round"
            />

            {/* Area fill under the line */}
            <path
                d="M90 200 C120 195, 140 180, 160 165 C180 150, 200 130, 230 110 C260 95, 290 85, 320 75 L320 220 L90 220 Z"
                fill="url(#growthGradient)"
                opacity="0.15"
            />

            {/* Data points on the line */}
            <circle cx="90" cy="200" r="4" className={styles.graphicAccentBlueFill} opacity="0.5" />
            <circle cx="160" cy="165" r="4" className={styles.graphicAccentBlueFill} opacity="0.6" />
            <circle cx="230" cy="110" r="4" className={styles.graphicAccentDarkBlueFill} opacity="0.7" />
            <circle cx="320" cy="75" r="5" className={styles.graphicAccentDarkBlueFill} opacity="0.8" />

            {/* Y-axis labels - shifted */}
            <rect x="55" y="95" width="18" height="8" rx="2" fill="currentColor" opacity="0.15" />
            <rect x="55" y="135" width="18" height="8" rx="2" fill="currentColor" opacity="0.12" />
            <rect x="55" y="175" width="18" height="8" rx="2" fill="currentColor" opacity="0.1" />

            {/* Progress indicators on right side - shifted right */}
            <rect x="360" y="80" width="30" height="35" rx="4" fill="currentColor" opacity="0.1" />
            <rect x="365" y="88" width="15" height="6" rx="3" fill="currentColor" opacity="0.25" />
            <rect x="365" y="100" width="20" height="5" rx="2" fill="currentColor" opacity="0.15" />

            <rect x="360" y="125" width="30" height="35" rx="4" fill="currentColor" opacity="0.1" />
            <rect x="365" y="133" width="12" height="6" rx="3" fill="currentColor" opacity="0.25" />
            <rect x="365" y="145" width="18" height="5" rx="2" fill="currentColor" opacity="0.15" />

            <rect x="360" y="170" width="30" height="35" rx="4" fill="currentColor" opacity="0.1" />
            <rect x="365" y="178" width="16" height="6" rx="3" fill="currentColor" opacity="0.25" />
            <rect x="365" y="190" width="20" height="5" rx="2" fill="currentColor" opacity="0.15" />
        </svg>
    );
}
