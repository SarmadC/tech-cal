'use client';

import { useEffect, useState, useCallback, RefObject, MutableRefObject } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// Type definitions for clarity - Exporting them for use in the component
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
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            renderer.dispose();
        };
    }, [canvasRef, scrollProgressRef]);
}

/**
 * Hook #2: Calculates and updates card positions on resize.
 * COMPLETELY FIXED: Accurate cell positioning
 */
export function useCardPositions(
    events: { date: string }[]
): [AllCardPositions, (container: HTMLElement) => void] {
    const [positions, setPositions] = useState<AllCardPositions>({ chaos: [], order: [] });

    const calculatePositions = useCallback((container: HTMLElement) => {
        // Calendar dimensions
        const calendarWidth = window.innerWidth > 768 
            ? Math.min(800, window.innerWidth * 0.8) 
            : window.innerWidth * 0.95;
        const calendarHeight = window.innerWidth > 768 ? 450 : 350;
        
        // Calendar position (centered)
        const calendarX = (window.innerWidth - calendarWidth) / 2;
        const calendarY = (window.innerHeight - calendarHeight) / 2 + 40;
        
        // Fixed header height
        const headerHeight = window.innerWidth > 768 ? 100 : 85;
        
        // Grid structure constants
        const borderWidth = 2;
        const gridPadding = 2;
        const gridGap = 2;
        
        // Calculate the actual grid dimensions
        const gridInnerWidth = calendarWidth - (2 * borderWidth) - (2 * gridPadding);
        const gridInnerHeight = calendarHeight - headerHeight - (2 * borderWidth) - (2 * gridPadding);
        
        // Cell dimensions (accounting for gaps between cells)
        const totalGapsX = gridGap * 6; // 6 gaps between 7 columns
        const totalGapsY = gridGap * 4; // 4 gaps between 5 rows
        const cellWidth = (gridInnerWidth - totalGapsX) / 7;
        const cellHeight = (gridInnerHeight - totalGapsY) / 5;
        
        // Card dimensions (slightly smaller than cells)
        const cardPadding = 3;
        const cardWidth = cellWidth - (2 * cardPadding);
        const cardHeight = cellHeight - (2 * cardPadding);
        
        // May 1st, 2025 is a Thursday (column 4 if Sunday is 0)
        const firstDayOffset = 4;

        // Generate chaos positions (random scatter)
        const newChaos = Array.from({ length: events.length }, () => ({
            x: Math.random() * (window.innerWidth - 240),
            y: Math.random() * (window.innerHeight - 120),
            rot: (Math.random() - 0.5) * 45,
            scale: 0.7 + Math.random() * 0.3
        }));
        
        // Calculate organized positions (calendar alignment)
        const newOrder = events.map((event, index) => {
            // Parse the day from the date string
            const dayOfMonth = parseInt(event.date.split(' ')[1]);
            
            // Special handling for events that might be on specific days
            // Map the event to the correct calendar cell
            let targetCell: number;
            
            // Since we have 9 events and specific dates, let's map them correctly
            const eventDateMap: { [key: number]: number } = {
                1: 1,   // May 1 - React Conf
                4: 4,   // May 4 - OpenAI DevDay (Sunday, first cell)
                7: 7,   // May 7 - Google I/O
                11: 11, // May 11 - WWDC (Sunday of week 2)
                13: 13, // May 13 - Microsoft Build
                15: 15, // May 15 - GitHub Universe
                19: 19, // May 19 - DockerCon
                21: 21, // May 21 - Next.js Conf
                30: 30  // May 30 - AWS re:Invent
            };
            
            targetCell = eventDateMap[dayOfMonth] || dayOfMonth;
            
            // Calculate which grid cell this date falls into
            const cellIndex = targetCell + firstDayOffset - 1;
            const col = cellIndex % 7;
            const row = Math.floor(cellIndex / 7);
            
            // Calculate the exact position for this card
            // Start position + column offset + gaps + padding
            const x = calendarX + borderWidth + gridPadding + 
                      (col * cellWidth) + (col * gridGap) + cardPadding;
                      
            const y = calendarY + headerHeight + borderWidth + gridPadding + 
                      (row * cellHeight) + (row * gridGap) + cardPadding;
            
            return { x, y };
        });

        // Store calculated values for use by other components
        container.dataset.calendarStartX = String(calendarX);
        container.dataset.calendarStartY = String(calendarY);
        container.dataset.calendarWidth = String(calendarWidth);
        container.dataset.calendarHeight = String(calendarHeight);
        container.dataset.cardWidth = String(cardWidth);
        container.dataset.cardHeight = String(cardHeight);

        setPositions({ chaos: newChaos, order: newOrder });
    }, [events]);

    return [positions, calculatePositions];
}

/**
 * Hook #3: Manages the GSAP ScrollTrigger animation.
 * Enhanced with smoother transitions
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
            
            const targetWidth = parseFloat(container.dataset.cardWidth || '100');
            const targetHeight = parseFloat(container.dataset.cardHeight || '60');
            
            // Original card dimensions
            const originalWidth = 240;
            const originalHeight = 120;

            cards.forEach((card, i) => {
                const chaos = positions.chaos[i];
                const order = positions.order[i];

                // Position interpolation
                const currentX = gsap.utils.interpolate(chaos.x, order.x, progress);
                const currentY = gsap.utils.interpolate(chaos.y, order.y, progress);
                const currentRot = gsap.utils.interpolate(chaos.rot, 0, progress);
                const currentScale = gsap.utils.interpolate(chaos.scale, 1, progress);

                // Smooth size transition throughout animation
                let currentWidth = originalWidth;
                let currentHeight = originalHeight;
                
                if (progress > 0.3) {
                    const sizeProgress = (progress - 0.3) / 0.7;
                    currentWidth = gsap.utils.interpolate(originalWidth, targetWidth, sizeProgress);
                    currentHeight = gsap.utils.interpolate(originalHeight, targetHeight, sizeProgress);
                }

                // Apply all transformations
                gsap.set(card, { 
                    x: currentX, 
                    y: currentY, 
                    rotation: currentRot, 
                    scale: currentScale,
                    width: currentWidth,
                    height: currentHeight
                });

                // Update card classes for styling changes
                card.classList.toggle('chaos-state', progress < 0.3);
                card.classList.toggle('organized', progress >= 0.3 && progress < 0.7);
                card.classList.toggle('calendar-view', progress >= 0.7);
            });
        };

        // Text animation timeline
        const textTl = gsap.timeline({ paused: true })
            .to([chaosTitle, chaosSubtitle], { opacity: 0, duration: 0.3 }, 0)
            .set([orderTitle, orderSubtitle], { display: 'block' }, 0.5)
            .to([orderTitle, orderSubtitle], { opacity: 1, duration: 0.3 }, 0.5);

        // Calendar frame animation
        const calendarFrame = container?.querySelector('.calendar-frame');
        const frameTl = gsap.timeline({ paused: true })
            .to(calendarFrame, { opacity: 1, duration: 0.5 }, 0.5);

        // Main scroll trigger
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