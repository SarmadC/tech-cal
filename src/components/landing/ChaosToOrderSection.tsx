'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { eventsData } from '@/data/landing-page-data';
import { AnimatedEventCard, AnimationPosition } from './AnimatedEventCard';

export function ChaosToOrderSection() {
    const chaosSectionRef = useRef<HTMLElement>(null);
    const [animationPositions, setAnimationPositions] = useState<AnimationPosition[]>([]);

    const { scrollYProgress } = useScroll({
        target: chaosSectionRef,
        offset: ["start start", "end end"]
    });

    useEffect(() => {
        const setupPositions = () => {
            if (!chaosSectionRef.current) return;
            const sectionWidth = chaosSectionRef.current.getBoundingClientRect().width;
            const isMobile = window.innerWidth <= 768;
            const cardWidth = isMobile ? 180 : 220;
            const cardHeight = 135;
            const padding = 20;
            const cols = isMobile ? 2 : 4;
            const eventsToAnimate = isMobile ? eventsData.slice(0, 8) : eventsData;

            const gridWidth = cols * cardWidth + (cols - 1) * padding;
            const gridHeight = Math.ceil(eventsToAnimate.length / cols) * (cardHeight + padding);
            const gridStartX = (sectionWidth - gridWidth) / 2;
            const gridStartY = (window.innerHeight - gridHeight) * 0.5;

            const positions = eventsToAnimate.map((_, index) => {
                const chaosState = {
                    x: Math.random() * (sectionWidth - cardWidth),
                    y: window.innerHeight + Math.random() * 200,
                    scale: 0.5 + Math.random() * 0.5,
                    rot: (Math.random() - 0.5) * 90
                };
                const col = index % cols;
                const row = Math.floor(index / cols);
                const organizedState = {
                    x: gridStartX + col * (cardWidth + padding),
                    y: gridStartY + row * (cardHeight + padding),
                    scale: 1,
                    rot: 0
                };
                return { chaos: chaosState, organized: organizedState };
            });
            setAnimationPositions(positions);
        };
        setupPositions();
        window.addEventListener('resize', setupPositions);
        return () => window.removeEventListener('resize', setupPositions);
    }, []);

    const chaosHeaderOpacity = useTransform(scrollYProgress, [0.1, 0.4], [1, 0]);
    const solutionHeaderOpacity = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);

    return (
        <section className="chaos-to-order" ref={chaosSectionRef}>
            <div className="animation-pinner">
                <div className="events-container">
                    {animationPositions.map((pos, index) => (
                        <AnimatedEventCard
                            key={index}
                            eventData={eventsData[index]}
                            positions={pos}
                            scrollYProgress={scrollYProgress}
                        />
                    ))}
                </div>
                <div className="header-container">
                    <motion.div className="chaos-header" style={{ opacity: chaosHeaderOpacity }}>
                        <h2 className="chaos-title">The Problem</h2>
                        <p className="chaos-subtitle">Information scattered everywhere...</p>
                    </motion.div>
                    <motion.div className="solution-header" style={{ opacity: solutionHeaderOpacity }}>
                        <h2 className="solution-title">The Solution</h2>
                        <p className="solution-subtitle">Everything organized, nothing missed.</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}