'use client';

import { useEffect, useState, useCallback, RefObject, MutableRefObject } from 'react';
import * as THREE from 'three';
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

// --- Debounce Helper Function with Improved Type Safety ---
function debounce<F extends (...args: unknown[]) => unknown>(
    func: F,
    wait: number
): (...args: Parameters<F>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(...args: Parameters<F>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

/**
 * Hook #1: Manages the Three.js scene and particle animation.
 */
export function useThreeScene(
    canvasRef: RefObject<HTMLCanvasElement | null>,
    scrollProgressRef: MutableRefObject<number>
) {
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0f172a, 10, 50);

        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 20);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 800;
        const positions = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i += 3) {
            const radius = 25 + Math.random() * 25;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: false,
            transparent: true,
            opacity: 0.6,
            color: 0x6366f1,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particles);

        let animationFrameId: number;
        const animate = (time: number) => {
            const t = time * 0.001;
            const chaosFactor = 1 - scrollProgressRef.current;

            particles.rotation.y = t * 0.03 * chaosFactor;
            particles.material.opacity = 0.2 + chaosFactor * 0.4;

            camera.position.z = 20 - scrollProgressRef.current * 10;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };
        animate(0);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        const debouncedHandleResize = debounce(handleResize, 150);
        window.addEventListener('resize', debouncedHandleResize);

        return () => {
            window.removeEventListener('resize', debouncedHandleResize);
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
        };
    }, [canvasRef, scrollProgressRef]);
}

/**
 * Hook #2: Calculates card positions using actual DOM measurements for accuracy.
 */
export function useCardPositions(
    events: { date: string }[]
): [AllCardPositions, (container: HTMLElement) => void] {
    const [positions, setPositions] = useState<AllCardPositions>({ chaos: [], order: [] });

    const calculatePositions = useCallback((container: HTMLElement) => {
        // Wait for the calendar frame to be in the DOM
        const calendarFrame = container.querySelector('.calendar-frame');
        if (!calendarFrame) {
            console.warn('Calendar frame not found, retrying...');
            setTimeout(() => calculatePositions(container), 100);
            return;
        }

        // --- Configuration Constants ---
        const firstDayOffset = 4; // May 1st, 2025 is a Thursday (Sun=0)
        const CARD_MARGIN = 4; // Margin inside each cell for the card
        const DAY_NUMBER_HEIGHT = 24; // Height reserved for day number

        // --- Calculate calendar dimensions and position it ---
        const calendarWidth = window.innerWidth > 768
            ? Math.min(900, window.innerWidth * 0.8)
            : window.innerWidth * 0.9;

        const calendarHeight = window.innerWidth > 768 ? 450 : 350;

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
    }, [events]);

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
                    console.warn(`Missing positions for card ${i}:`, { chaos, order });
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

        const textTl = gsap.timeline({ paused: true })
            .to([chaosTitle, chaosSubtitle], { opacity: 0, duration: 0.3 }, 0)
            .set([orderTitle, orderSubtitle], { display: 'block' }, 0.5)
            .to([orderTitle, orderSubtitle], { opacity: 1, duration: 0.3 }, 0.5);

        const calendarFrame = container?.querySelector('.calendar-frame');
        const frameTl = gsap.timeline({ paused: true })
            .to(calendarFrame, { opacity: 1, duration: 0.5 }, 0.5);

        const scrollTrigger = ScrollTrigger.create({
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.1,
            onUpdate: (self) => {
                scrollProgressRef.current = self.progress;
                updateCards(self.progress);
                textTl.progress(self.progress);
                frameTl.progress(self.progress);
            },
        });

        return () => {
            scrollTrigger.kill();
            textTl.kill();
            frameTl.kill();
        };
    }, [sectionRef, containerRef, domCacheRef, positions, scrollProgressRef]);
}