'use client';

import { motion, useTransform, MotionValue } from 'framer-motion';
import { eventsData } from '@/data/landing-page-data';

interface PositionState { x: number; y: number; scale: number; rot: number; }
export interface AnimationPosition { chaos: PositionState; organized: PositionState; }

interface AnimatedEventCardProps {
    eventData: typeof eventsData[0];
    positions: AnimationPosition;
    scrollYProgress: MotionValue<number>;
}

export function AnimatedEventCard({ eventData, positions, scrollYProgress }: AnimatedEventCardProps) {
    const x = useTransform(scrollYProgress, [0, 1], [positions.chaos.x, positions.organized.x]);
    const y = useTransform(scrollYProgress, [0, 1], [positions.chaos.y, positions.organized.y]);
    const scale = useTransform(scrollYProgress, [0, 1], [positions.chaos.scale, positions.organized.scale]);
    const rotate = useTransform(scrollYProgress, [0, 1], [positions.chaos.rot, positions.organized.rot]);

    return (
        <motion.div className="floating-event" style={{ x, y, scale, rotate }}>
            <div className="event-header">
                <div className="event-company-tag">{eventData.company}</div>
                <div className="event-date-badge">{eventData.date}</div>
            </div>
            <div className="floating-event-title">{eventData.title}</div>
            <div className="floating-event-type">{eventData.type}</div>
        </motion.div>
    );
}