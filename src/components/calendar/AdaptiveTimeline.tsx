'use client';

import { FC, useMemo, useState, useEffect } from 'react';
import { CalendarIcon, ListIcon, GridNineIcon, StackIcon, TableIcon } from '@phosphor-icons/react';
import { Event, AgendaItem } from '@/types';
import TimelineView from './TimelineView';
import SwimLaneTimeline from './SwimLaneTimeline';
import StackedTimeline from './StackedTimeline';
import MatrixTimeline from './MatrixTimeline';

interface AdaptiveTimelineProps {
    event: Event;
    forceLayout?: 'auto' | 'branching' | 'swimlane' | 'stacked' | 'matrix';
}

type LayoutType = 'branching' | 'swimlane' | 'stacked' | 'matrix';

const AdaptiveTimeline: FC<AdaptiveTimelineProps> = ({ event, forceLayout = 'auto' }) => {
    const agenda = event.agenda || [];
    const [userLayout, setUserLayout] = useState<LayoutType | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    
    // Detect mobile/narrow screens
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Analyze agenda characteristics
    const analysis = useMemo(() => {
        if (agenda.length === 0) return null;
        
        // Group by time slots to find max concurrent events
        const timeSlots = agenda.reduce((acc, item) => {
            const timeKey = `${item.startTime}-${item.endTime}`;
            if (!acc[timeKey]) acc[timeKey] = [];
            acc[timeKey].push(item);
            return acc;
        }, {} as Record<string, AgendaItem[]>);
        
        const maxConcurrent = Math.max(...Object.values(timeSlots).map(events => events.length));
        const trackCount = new Set(agenda.map(item => item.track || 'general')).size;
        const dayCount = new Set(agenda.map(item => item.dayNumber || 1)).size;
        const avgDuration = agenda.reduce((sum, item) => {
            const start = new Date(`2000-01-01T${item.startTime}`);
            const end = new Date(`2000-01-01T${item.endTime}`);
            return sum + (end.getTime() - start.getTime()) / (1000 * 60);
        }, 0) / agenda.length;
        
        return {
            totalEvents: agenda.length,
            maxConcurrent,
            trackCount,
            dayCount,
            avgDuration,
            hasComplexSchedule: maxConcurrent > 3 || trackCount > 2,
            isDense: agenda.length > 20,
            isMultiDay: dayCount > 1
        };
    }, [agenda]);
    
    // Determine optimal layout
    const optimalLayout = useMemo((): LayoutType => {
        if (!analysis) return 'branching';
        if (forceLayout !== 'auto') return forceLayout as LayoutType;
        if (userLayout) return userLayout;
        
        const { maxConcurrent, trackCount, isDense } = analysis;
        
        // Mobile-first: Always use stacked for narrow screens
        if (isMobile) return 'stacked';
        
        // Dense multi-track schedules -> Matrix
        if (isDense && trackCount > 3) return 'matrix';
        
        // Clear track organization -> Swim lanes  
        if (trackCount > 2 && maxConcurrent <= 4) return 'swimlane';
        
        // Many concurrent events but few tracks -> Stacked
        if (maxConcurrent > 4 && trackCount <= 2) return 'stacked';
        
        // Default: Enhanced branching timeline
        return 'branching';
    }, [analysis, forceLayout, userLayout, isMobile]);
    
    if (!analysis) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-sm">No timeline available for this event.</p>
            </div>
        );
    }
    
    const layouts = [
        { id: 'branching', name: 'Timeline', icon: ListIcon, description: 'Linear timeline with branches' },
        { id: 'swimlane', name: 'Tracks', icon: TableIcon, description: 'Track-based layout' },
        { id: 'stacked', name: 'Stacked', icon: StackIcon, description: 'Collapsible time slots' },
        { id: 'matrix', name: 'Grid', icon: GridNineIcon, description: 'Compact overview' }
    ] as const;
    
    const renderLayout = () => {
        try {
            switch (optimalLayout) {
                case 'swimlane':
                    return <SwimLaneTimeline event={event} />;
                case 'stacked':
                    return <StackedTimeline event={event} />;
                case 'matrix':
                    return <MatrixTimeline event={event} />;
                default:
                    return <TimelineView event={event} />;
            }
        } catch (error) {
            console.warn('Timeline layout error, falling back to simple timeline:', error);
            return <TimelineView event={event} />;
        }
    };
    
    return (
        <div className="space-y-4">
            {/* Layout selector and analysis */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="truncate">
                        {analysis.totalEvents} events
                        <span className="hidden sm:inline">
                            {analysis.trackCount > 1 && ` • ${analysis.trackCount} tracks`}
                            {analysis.maxConcurrent > 1 && ` • ${analysis.maxConcurrent} concurrent events`}
                        </span>
                    </span>
                </div>
                
                {/* Layout switcher - hide on mobile if stacked is forced */}
                {(!isMobile || userLayout) && (
                    <div className="flex items-center gap-1">
                        {userLayout && (
                            <button
                                onClick={() => setUserLayout(null)}
                                className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
                                title="Reset to auto-selection"
                            >
                                Auto
                            </button>
                        )}
                        <div className="flex items-center gap-1 bg-gray-800/30 rounded-lg p-1">
                            {layouts.map(({ id, name, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setUserLayout(id as LayoutType)}
                                    disabled={isMobile && id !== 'stacked' && !userLayout}
                                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                        optimalLayout === id
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                                    }`}
                                    title={layouts.find(l => l.id === id)?.description}
                                >
                                    <Icon className="w-3 h-3" />
                                    <span className="hidden sm:inline">{name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            
            {/* Selected timeline view */}
            {renderLayout()}
        </div>
    );
};

export default AdaptiveTimeline;