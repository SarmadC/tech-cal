'use client';

import { useEffect, useState, useCallback, RefObject, MutableRefObject, useRef } from 'react';
// import * as THREE from 'three'; // Removed

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// Type definitions for clarity
type CardPosition = { x: number; y: number; };
type ChaosPosition = CardPosition & { rot: number; scale: number; };
export type AllCardPositions = { chaos: ChaosPosition[]; order: CardPosition[]; };
export type DomCache = {
    cards: NodeListOf<HTMLElement> | null;
    chaosTitle: HTMLElement | null;
    chaosSubtitle: HTMLElement | null;
    orderTitle: HTMLElement | null;
    orderSubtitle: HTMLElement | null;
};

import { debounce } from '@/utils/debounce';

// useThreeScene has been moved to useChaosThree.ts to isolate Three.js dependency

/**
 * Hook #2: Calculates card positions using actual DOM measurements for accuracy.
 */
export function useCardPositions(
    events: { date: string }[]
): [AllCardPositions, (container: HTMLElement) => void] {
    const [positions, setPositions] = useState<AllCardPositions>({ chaos: [], order: [] });
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calculatePositions = useCallback((container: HTMLElement) => {
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }

        // Wait for the calendar frame to be in the DOM
        const calendarFrame = container.querySelector('.calendar-frame');
        if (!calendarFrame) {
            console.warn('Calendar frame not found, retrying...');
            retryTimeoutRef.current = setTimeout(() => calculatePositions(container), 100);
            return;
        }

        // --- Configuration Constants ---
        const firstDayOffset = 4; // May 1st, 2025 is a Thursday (Sun=0)
        const CARD_MARGIN = 4; // Margin inside each cell for the card
        const DAY_NUMBER_HEIGHT = 24; // Height reserved for day number

        // --- Calculate calendar dimensions and position it ---
        // Adaptive sizing based on viewport with better space utilization
        let calendarWidth: number;
        let calendarHeight: number;

        if (window.innerWidth >= 1440) {
            // Large desktop: use more space
            calendarWidth = Math.min(1200, window.innerWidth * 0.75);
            calendarHeight = Math.min(600, window.innerHeight * 0.65);
        } else if (window.innerWidth >= 1024) {
            // Desktop: balanced size
            calendarWidth = Math.min(1000, window.innerWidth * 0.80);
            calendarHeight = Math.min(550, window.innerHeight * 0.60);
        } else if (window.innerWidth >= 768) {
            // Tablet: moderate size
            calendarWidth = window.innerWidth * 0.85;
            calendarHeight = Math.min(500, window.innerHeight * 0.55);
        } else {
            // Mobile: maximize screen usage
            calendarWidth = window.innerWidth * 0.92;
            calendarHeight = Math.min(450, window.innerHeight * 0.50);
        }

        const calendarX = (window.innerWidth - calendarWidth) / 2;
        const calendarY = Math.max(20, (window.innerHeight - calendarHeight) / 2);

        // Position the calendar frame
        const calendarEl = calendarFrame as HTMLElement;
        calendarEl.style.left = `${calendarX}px`;
        calendarEl.style.top = `${calendarY}px`;
        calendarEl.style.width = `${calendarWidth}px`;
        calendarEl.style.height = `${calendarHeight}px`;

        // Force a layout update and get actual measurements
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        calendarEl.offsetHeight; // Force reflow
        const calendarGrid = calendarEl.querySelector('.calendar-grid') as HTMLElement;

        if (!calendarGrid) {
            console.warn('Calendar grid not found');
            return;
        }

        const cells = calendarGrid.querySelectorAll('.calendar-cell');

        if (cells.length === 0) {
            console.warn('Calendar cells not found');
            return;
        }

        // Calculate cell dimensions from actual DOM
        const firstCell = cells[0] as HTMLElement;
        const cellRect = firstCell.getBoundingClientRect();
        const cellWidth = cellRect.width;
        const cellHeight = cellRect.height;

        // Calculate available space for cards in each cell
        const availableCardWidth = Math.max(50, cellWidth - (CARD_MARGIN * 2));
        const availableCardHeight = Math.max(30, cellHeight - DAY_NUMBER_HEIGHT - CARD_MARGIN);

        // Generate chaos positions (random)
        const newChaos = Array.from({ length: events.length }, () => ({
            x: Math.random() * (window.innerWidth - 240),
            y: Math.random() * (window.innerHeight - 120),
            rot: (Math.random() - 0.5) * 45,
            scale: 0.7 + Math.random() * 0.3
        }));

        // Get container position to establish coordinate system
        const containerRect = container.getBoundingClientRect();

        // Calculate order positions (calendar grid)
        const newOrder = events.map((event) => {
            const dayOfMonth = parseInt(event.date.split(' ')[1]);
            const cellIndex = dayOfMonth + firstDayOffset - 1;

            if (cellIndex < 0 || cellIndex >= cells.length) {
                console.warn(`Invalid cell index ${cellIndex} for day ${dayOfMonth}`);
                return { x: calendarX, y: calendarY };
            }

            const cell = cells[cellIndex] as HTMLElement;
            const cellRect = cell.getBoundingClientRect();

            // Convert viewport coordinates to container-relative coordinates
            const x = cellRect.left - containerRect.left + CARD_MARGIN;
            const y = cellRect.top - containerRect.top + DAY_NUMBER_HEIGHT + 2; // +2 for small gap

            return { x, y };
        });

        // Store calculated values for animation use
        container.dataset.calendarStartX = String(calendarX);
        container.dataset.calendarStartY = String(calendarY);
        container.dataset.calendarWidth = String(calendarWidth);
        container.dataset.calendarHeight = String(calendarHeight);
        container.dataset.cardWidth = String(availableCardWidth);
        container.dataset.cardHeight = String(availableCardHeight);

        setPositions({ chaos: newChaos, order: newOrder });
    }, [events]); // Include events as dependency for useCallback

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    return [positions, calculatePositions]; // 🚨 THIS WAS MISSING!
}

/**
 * Hook #3: Manages the GSAP ScrollTrigger animation with refined easing.
 */
export function useScrollAnimation(
    sectionRef: RefObject<HTMLElement | null>,
    containerRef: RefObject<HTMLElement | null>,
    domCacheRef: MutableRefObject<DomCache>,
    positions: AllCardPositions,
    scrollProgressRef: MutableRefObject<number>
) {
    const hasAnimatedRef = useRef(false);
    const initialVisibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!sectionRef.current || !containerRef.current || !domCacheRef.current.cards || positions.order.length === 0) return;

        const { cards, chaosTitle, chaosSubtitle, orderTitle, orderSubtitle } = domCacheRef.current;
        const container = containerRef.current;

        const updateCards = (progress: number) => {
            if (!container || !cards) return;

            const targetWidth = parseFloat(container.dataset.cardWidth || '120');
            const targetHeight = parseFloat(container.dataset.cardHeight || '40');
            const originalWidth = 240;
            const originalHeight = 100;

            // More gradual size transition - start later and finish earlier
            const SIZING_START_PROGRESS = 0.4;
            const SIZING_END_PROGRESS = 0.9;
            const SIZING_DURATION_PROGRESS = SIZING_END_PROGRESS - SIZING_START_PROGRESS;

            cards.forEach((card, i) => {
                const chaos = positions.chaos[i];
                const order = positions.order[i];

                if (!chaos || !order) {
                    console.warn('Missing positions for card:', i, { chaos, order });
                    return;
                }

                // Position interpolation with easing
                const positionEasing = gsap.parseEase("power2.inOut")(progress);
                gsap.set(card, {
                    x: gsap.utils.interpolate(chaos.x, order.x, positionEasing),
                    y: gsap.utils.interpolate(chaos.y, order.y, positionEasing),
                    rotation: gsap.utils.interpolate(chaos.rot, 0, positionEasing),
                    scale: gsap.utils.interpolate(chaos.scale, 1, positionEasing),
                });

                // Size interpolation with different timing
                let currentWidth, currentHeight;
                if (progress >= SIZING_START_PROGRESS && progress <= SIZING_END_PROGRESS) {
                    const sizeProgress = (progress - SIZING_START_PROGRESS) / SIZING_DURATION_PROGRESS;
                    const easedProgress = gsap.parseEase("power1.inOut")(sizeProgress);
                    currentWidth = gsap.utils.interpolate(originalWidth, targetWidth, easedProgress);
                    currentHeight = gsap.utils.interpolate(originalHeight, targetHeight, easedProgress);
                } else if (progress > SIZING_END_PROGRESS) {
                    currentWidth = targetWidth;
                    currentHeight = targetHeight;
                } else {
                    currentWidth = originalWidth;
                    currentHeight = originalHeight;
                }

                gsap.set(card, {
                    width: currentWidth,
                    height: currentHeight
                });

                // State classes for different visual styles
                card.classList.toggle('chaos-state', progress < 0.3);
                card.classList.toggle('organizing', progress >= 0.3 && progress < 0.7);
                card.classList.toggle('calendar-view', progress >= 0.7);
            });
        };

        // Create master timeline for smooth 2-second animation
        const masterTimeline = gsap.timeline({
            duration: 2,
            ease: "power2.inOut",
            paused: true,
            onUpdate: () => {
                const progress = masterTimeline.progress();
                scrollProgressRef.current = progress;
                updateCards(progress);
            },
            onComplete: () => {
                // Re-enable scrolling after animation completes
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }
        });

        // Set up text animations
        masterTimeline
            .to([chaosTitle, chaosSubtitle], { opacity: 0, duration: 0.3 }, 0)
            .set([orderTitle, orderSubtitle], { display: 'block' }, 1)
            .to([orderTitle, orderSubtitle], { opacity: 1, duration: 0.3 }, 1);

        // Set up calendar frame animation
        const calendarFrame = container?.querySelector('.calendar-frame');
        if (calendarFrame) {
            masterTimeline.to(calendarFrame, { opacity: 1, duration: 0.5 }, 1);
        }

        // IntersectionObserver to trigger animation when section is mostly in view
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimatedRef.current) {
                        hasAnimatedRef.current = true;
                        // Disable scrolling during animation
                        document.body.style.overflow = 'hidden';
                        document.documentElement.style.overflow = 'hidden';
                        masterTimeline.play();
                    }
                });
            },
            {
                threshold: 0.8, // Trigger when 80% of section is visible
                rootMargin: '0px'
            }
        );

        observer.observe(sectionRef.current);

        // Check if section is already mostly visible and trigger animation immediately
        const checkInitialVisibility = () => {
            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
                const visibilityRatio = visibleHeight / rect.height;
                const isMostlyVisible = visibilityRatio >= 0.8;
                
                if (isMostlyVisible && !hasAnimatedRef.current) {
                    hasAnimatedRef.current = true;
                    document.body.style.overflow = 'hidden';
                    document.documentElement.style.overflow = 'hidden';
                    masterTimeline.play();
                }
            }
        };

        // Check after a short delay to ensure DOM is ready
        initialVisibilityTimeoutRef.current = setTimeout(checkInitialVisibility, 100);

        return () => {
            // Clear the initial visibility timeout to prevent state updates on unmounted component
            if (initialVisibilityTimeoutRef.current) {
                clearTimeout(initialVisibilityTimeoutRef.current);
                initialVisibilityTimeoutRef.current = null;
            }
            observer.disconnect();
            masterTimeline.kill();
            // Ensure scrolling is re-enabled on cleanup
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [sectionRef, containerRef, domCacheRef, positions, scrollProgressRef]);
}