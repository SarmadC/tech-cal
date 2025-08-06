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
        
        const particlesMaterial = new THREE.PointsMaterial({ size: 0.05, vertexColors: false, transparent: true, opacity: 0.6, color: 0x6366f1, blending: THREE.AdditiveBlending });
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
 */
export function useCardPositions(
    // The hook now expects the event data to have a specific shape
    events: { date: string }[]
): [AllCardPositions, (container: HTMLElement) => void] {
    const [positions, setPositions] = useState<AllCardPositions>({ chaos: [], order: [] });

    const calculatePositions = useCallback((container: HTMLElement) => {
        const calendarWidth = window.innerWidth > 768 ? Math.min(800, window.innerWidth * 0.8) : window.innerWidth * 0.95;
        const calendarHeight = window.innerWidth > 768 ? 450 : 350;
        const startX = (window.innerWidth - calendarWidth) / 2;
        const startY = (window.innerHeight - calendarHeight) / 2 + 40;
        const cellWidth = calendarWidth / 7;
        const cellHeight = (calendarHeight - 80) / 5;
        
        // May 1st, 2025 is a Thursday. If Sunday is column 0, Thursday is column 4.
        const firstDayOffset = 4;

        const newChaos = Array.from({ length: events.length }, () => ({
            x: Math.random() * (window.innerWidth - 240),
            y: Math.random() * (window.innerHeight - 120),
            rot: (Math.random() - 0.5) * 45,
            scale: 0.7 + Math.random() * 0.3
        }));
        
        // Dynamically calculate order positions based on the actual event date
        const newOrder = events.map(event => {
            const dayOfMonth = parseInt(event.date.split(' ')[1]);
            const cellIndex = dayOfMonth + firstDayOffset - 1;
            const col = cellIndex % 7;
            const row = Math.floor(cellIndex / 7);
            
            return {
                x: startX + col * cellWidth + 4,
                y: startY + 80 + row * cellHeight + 4
            };
        });

        container.dataset.calendarStartX = String(startX);
        container.dataset.calendarStartY = String(startY);
        container.dataset.calendarWidth = String(calendarWidth);
        container.dataset.calendarHeight = String(calendarHeight);
        container.dataset.cardWidth = String(cellWidth - 8);
        container.dataset.cardHeight = String(cellHeight - 8);

        setPositions({ chaos: newChaos, order: newOrder });
    }, [events]);

    return [positions, calculatePositions];
}
/**
 * Hook #3: Manages the GSAP ScrollTrigger animation.
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

            cards.forEach((card, i) => {
                const chaos = positions.chaos[i];
                const order = positions.order[i];

                const currentX = gsap.utils.interpolate(chaos.x, order.x, progress);
                const currentY = gsap.utils.interpolate(chaos.y, order.y, progress);
                const currentRot = gsap.utils.interpolate(chaos.rot, 0, progress);
                const currentScale = gsap.utils.interpolate(chaos.scale, 1, progress);

                gsap.set(card, { x: currentX, y: currentY, rotation: currentRot, scale: currentScale });

                if (progress > 0.5) {
                    const sizeProgress = (progress - 0.5) * 2;
                    gsap.set(card, {
                        width: 240 + (targetWidth - 240) * sizeProgress,
                        height: 120 + (targetHeight - 120) * sizeProgress
                    });
                }

                card.classList.toggle('chaos-state', progress < 0.3);
                card.classList.toggle('calendar-view', progress > 0.7);
            });
        };

        const textTl = gsap.timeline({ paused: true })
            .to([chaosTitle, chaosSubtitle], { opacity: 0, duration: 0.3 }, 0)
            .set([orderTitle, orderSubtitle], { display: 'block' }, 0.5)
            .to([orderTitle, orderSubtitle], { opacity: 1, duration: 0.3 }, 0.5);

        const calendarFrame = container?.querySelector('.calendar-frame');
        const frameTl = gsap.timeline({ paused: true }).to(calendarFrame, { opacity: 1 }, 0.5);

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