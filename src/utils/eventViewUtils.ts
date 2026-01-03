// src/utils/eventViewUtils.ts

import { 
    Question as QuestionIcon, 
    Users as UsersIcon, 
    Globe as GlobeIcon, 
    Monitor as MonitorIcon, 
    MapPin as MapPinIcon,
    Code as CodeIcon,
    ChalkboardSimple as ChalkboardSimpleIcon,
    Presentation as PresentationIcon,
    Storefront as StorefrontIcon,
    Rocket as RocketIcon,
    SquaresFour as SquaresFourIcon
} from '@phosphor-icons/react';
import { Event, MultiDayEventInstance, EventType } from '@/types';
import { formatTime } from '@/utils/dateUtils';

/**
 * Shared utilities for event processing and display across day and week views
 */

// ============================================
// ICON UTILITIES
// ============================================

export const getIconForCategory = (categoryName: string) => {
    const name = (categoryName || '').toLowerCase().trim();
    
    // Hackathon and coding events (check most specific terms first)
    if (name.includes('hackathon') || name.includes('buildathon') || 
        name.includes('codeathon') || name.includes('datathon') || 
        name.includes('ideathon') || name.includes('coding challenge') || 
        name.includes('code jam') || name.includes('hack')) {
        return CodeIcon;
    }
    
    // Product, Product Launch, Release, Announcement (check before other generic terms)
    if (name === 'product' || name.includes('product launch') || name.includes('demo day') || 
        name.includes('release') || name.includes('announcement') || 
        name.includes('unveil')) {
        return RocketIcon;
    }
    
    // Trade Show, Expo, Exhibition (check before generic "show")
    if (name.includes('trade show') || name.includes('tradeshow') || 
        name.includes('expo') || name.includes('exhibition') || 
        name.includes('showcase') || name.includes('fair')) {
        return StorefrontIcon;
    }
    
    // Summit, Forum, Symposium (high-level discussions)
    if (name.includes('summit') || name.includes('forum') || 
        name.includes('symposium') || name.includes('congress')) {
        return PresentationIcon;
    }
    
    // Training, Bootcamp, Course (educational intensive learning)
    // Check bootcamp before training to avoid conflicts
    if (name.includes('bootcamp') || name.includes('training') || 
        name.includes('course') || name.includes('tutorial') || 
        name.includes('masterclass') || name.includes('certification')) {
        return ChalkboardSimpleIcon;
    }
    
    // Workshop (hands-on sessions, distinguish from training)
    // Check after training to prioritize training for "training workshop"
    if (name.includes('workshop') || name.includes('hands-on')) {
        return MonitorIcon;
    }
    
    // Conference (check after more specific terms)
    if (name.includes('conference') || name.includes('convention')) {
        return UsersIcon;
    }
    
    // Webinar (online events)
    if (name.includes('webinar') || name.includes('online event') || 
        name.includes('virtual session')) {
        return GlobeIcon;
    }
    
    // Networking, Meetup (community events)
    if (name.includes('networking') || name.includes('meetup') || 
        name.includes('mixer') || name.includes('social') || 
        name.includes('community')) {
        return MapPinIcon;
    }
    
    // Other / Miscellaneous (catch-all category)
    if (name === 'other' || name.includes('misc') || name.includes('miscellaneous') ||
        name.includes('general') || name.includes('uncategorized')) {
        return SquaresFourIcon;
    }
    
    // Default fallback
    return QuestionIcon;
};

// ============================================
// EVENT POSITIONING & SIZING
// ============================================

export interface EventVisualInfo {
    startRow: number;
    endRow: number;
    span: number;
    isContinuingFromPreviousDay: boolean;
    isContinuingToNextDay: boolean;
    dayNumber: number;
    isActuallyMultiDay: boolean;
}

/**
 * Calculate visual positioning information for events in day view grid
 */
export const getEventVisualInfo = (
    event: Event | MultiDayEventInstance,
    startHour: number = 0,  // Add startHour parameter
    endHour: number = 24     // Add endHour parameter
): EventVisualInfo => {
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);

    // Get day boundaries (for clamping)
    const dayStart = new Date(eventStart);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(eventStart);
    dayEnd.setHours(endHour, 59, 59, 999);

    // Clamp to visible time range
    const clampedStart = eventStart < dayStart ? dayStart : eventStart;
    const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

    // Calculate minutes from startHour (consistent with week view)
    const startMinutes = Math.max(0, (clampedStart.getHours() - startHour) * 60 + clampedStart.getMinutes());
    const endMinutes = Math.max(0, (clampedEnd.getHours() - startHour) * 60 + clampedEnd.getMinutes());

    // Convert to grid rows (30 min = 1 row, +1 for 1-based grid)
    const startRow = Math.floor(startMinutes / 30) + 1;
    const endRow = Math.ceil(endMinutes / 30) + 1;
    const span = endRow - startRow;

    // Rest remains the same...
    const isInstance = 'isInstance' in event && event.isInstance;
    const dayInfo = isInstance ? (event as MultiDayEventInstance).dayInfo : undefined;



    return {
        startRow,
        endRow,
        span,
        isContinuingFromPreviousDay: dayInfo ? !dayInfo.isFirstDay : false,
        isContinuingToNextDay: dayInfo ? !dayInfo.isLastDay : false,
        dayNumber: dayInfo?.currentDay || 1,
        isActuallyMultiDay: dayInfo ? dayInfo.totalDays > 1 : false,
    };
};

/**
 * Calculate visual positioning information for events in week view grid
 * Uses the same timezone logic as day view but adapted for week view time slots
 */
// ============================================
// src/utils/getWeekEventVisualInfo.ts
// Add this function to your eventViewUtils.ts file
// ============================================
export function getWeekEventVisualInfo(
    event: Event,
    startHour: number,
    endHour: number,
    currentDay: Date
) {
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;

    // Get day boundaries
    const dayStart = new Date(currentDay);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(endHour, 59, 59, 999);

    // Clamp event times to day boundaries
    const clampedStart = eventStart < dayStart ? dayStart : eventStart;
    const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

    // Calculate grid positions (2 slots per hour)
    const startMinutes = (clampedStart.getHours() - startHour) * 60 + clampedStart.getMinutes();
    const endMinutes = (clampedEnd.getHours() - startHour) * 60 + clampedEnd.getMinutes();

    // Convert to grid rows (each 30 min = 1 row, +1 for 1-based grid)
    const startRow = Math.floor(startMinutes / 30) + 1;
    const endRow = Math.ceil(endMinutes / 30) + 1;

    // Calculate span for visual adjustments
    const span = endRow - startRow;

    // Check if event continues from previous or to next day
    const isContinuingFromPreviousDay = eventStart < dayStart;
    const isContinuingToNextDay = eventEnd > dayEnd;

    return {
        startRow,
        endRow,
        span,
        isContinuingFromPreviousDay,
        isContinuingToNextDay
    };
}

/**
 * Calculate event height for week view based on duration
 */
export const getWeekEventHeight = (event: Event): number => {
    if (!event.endTime) return 60; // Default height for events without end time
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    // Scale height based on duration, with min/max bounds
    return Math.max(40, Math.min(200, durationMinutes * 1.2));
};

// ============================================
// EVENT FILTERING & GROUPING
// ============================================

/**
 * Check if event falls on specific day
 */
export const isEventOnDay = (event: Event, day: Date): boolean => {
    const eventStart = new Date(event.startTime);
    return eventStart.toDateString() === day.toDateString();
};

/**
 * Filter events for a specific day (for week view spanning)
 */
export const getEventsForWeekDay = (
    events: Event[], 
    day: Date,
    startHour: number = 6,
    endHour: number = 23
): Event[] => {
    return events.filter(event => {
        if (!event || !event.startTime) return false;
        
        const eventStart = new Date(event.startTime);
        
        // Check if event is on the same day
        if (eventStart.toDateString() !== day.toDateString()) return false;
        
        const eventHour = eventStart.getHours();
        
        // Include events that start within or extend into the visible time range
        const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);
        const eventEndHour = eventEnd.getHours();
        
        // Event is visible if it starts before end time and ends after start time
        return eventHour <= endHour && (eventEndHour >= startHour || eventEnd.getDate() !== eventStart.getDate());
    });
};

/**
 * Filter events for a specific day and time slot
 */
export const getEventsForDayAndTimeSlot = (
    events: Event[], 
    day: Date, 
    timeSlot: { hour: number }
): Event[] => {
    return events.filter(event => {
        if (!isEventOnDay(event, day)) return false;
        
        const eventStart = new Date(event.startTime);
        const eventHour = eventStart.getHours();
        
        return eventHour === timeSlot.hour;
    });
};

/**
 * Group events by time slots for week view
 */
export const categorizeEventsByTimeSlot = (
    events: Event[], 
    timeSlots: Array<{ hour: number }>,
    weekDays: Date[]
): Map<string, Event[]> => {
    const categorized = new Map<string, Event[]>();
    
    weekDays.forEach((day, dayIndex) => {
        timeSlots.forEach(timeSlot => {
            const key = `${timeSlot.hour}-${dayIndex}`;
            const dayEvents = getEventsForDayAndTimeSlot(events, day, timeSlot);
            categorized.set(key, dayEvents);
        });
    });
    
    return categorized;
};

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Generate time slots for different views with enhanced data structure
 */
export const generateTimeSlots = (startHour: number = 0, endHour: number = 23, interval: number = 1) => {
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour += interval) {
        const time24 = `${hour.toString().padStart(2, '0')}:00`;
        
        // Use simpler manual formatting to avoid timezone issues with date parsing
        // We want the grid to explicitly show "5 AM", "6 AM" etc. regardless of UTC/Local conversions
        const ampm = hour >= 12 && hour < 24 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? (hour % 12) : (hour === 0 || hour === 24 ? 12 : hour);
        const time12 = `${displayHour}:00 ${ampm}`;
        
        slots.push({ 
            hour,
            time24,
            time12
        });
    }
    return slots;
};

/**
 * Generate enhanced time slots for week view specifically
 */
export const generateWeekTimeSlots = (startHour: number = 6, endHour: number = 23) => {
    return generateTimeSlots(startHour, endHour, 1);
};

/**
 * Generate week days starting from Monday
 */
export const getWeekDays = (startDate: Date): Date[] => {
    const weekStart = new Date(startDate);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
    });
};

/**
 * Format day header for week view
 */
export const formatDayHeader = (date: Date): { dayNumber: string; dayName: string } => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
        dayNumber: date.getDate().toString(),
        dayName: dayNames[date.getDay()]
    };
};

// ============================================
// CATEGORY UTILITIES  
// ============================================

/**
 * Create category column mapping for day view
 */
export const createCategoryColumnMap = (categories: EventType[]): Map<string, number> => {
    const map = new Map<string, number>();
    categories.forEach((cat, index) => map.set(cat.id, index + 2));
    return map;
};

/**
 * Get category by event type ID
 */
export const getCategoryById = (categories: EventType[], eventTypeId: string): EventType | undefined => {
    return categories.find(cat => cat.id === eventTypeId);
};

// ============================================
// OVERLAP DETECTION UTILITIES
// ============================================

/**
 * Check if two events overlap in time
 */
export const doEventsOverlap = (event1: Event | MultiDayEventInstance, event2: Event | MultiDayEventInstance): boolean => {
    const start1 = new Date(event1.startTime);
    const end1 = event1.endTime ? new Date(event1.endTime) : new Date(start1.getTime() + 60 * 60 * 1000);
    
    const start2 = new Date(event2.startTime);
    const end2 = event2.endTime ? new Date(event2.endTime) : new Date(start2.getTime() + 60 * 60 * 1000);
    
    // Events overlap if one starts before the other ends and vice versa
    return start1 < end2 && start2 < end1;
};

/**
 * Detects overlapping events for visual purposes (e.g., applying blur effects)
 * Returns a Map where each event ID is mapped to whether it overlaps with any other events
 */
export function detectOverlappingEvents(
    events: (Event | MultiDayEventInstance)[]
): Map<string, boolean> {
    const overlapMap = new Map<string, boolean>();

    // Initialize all events as non-overlapping
    events.forEach(event => {
        overlapMap.set(event.id, false);
    });

    // Check each pair of events for overlaps
    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const event1 = events[i];
            const event2 = events[j];

            // Skip if they're in different categories
            if (event1.eventTypeId !== event2.eventTypeId) {
                continue;
            }

            const start1 = new Date(event1.startTime);
            const end1 = event1.endTime ? new Date(event1.endTime) : new Date(start1.getTime() + 60 * 60 * 1000);
            const start2 = new Date(event2.startTime);
            const end2 = event2.endTime ? new Date(event2.endTime) : new Date(start2.getTime() + 60 * 60 * 1000);

            // Check if events overlap in time
            if (start1 < end2 && start2 < end1) {
                overlapMap.set(event1.id, true);
                overlapMap.set(event2.id, true);
            }
        }
    }

    return overlapMap;
}

// ============================================
// OVERLAP LAYOUT CALCULATION FOR WEEK VIEW
// ============================================

export interface EventLayoutInfo {
    columnIndex: number;
    totalColumns: number;
}

/**
 * Calculate column layout for overlapping events within a single day
 * Uses a time-sweep algorithm to find maximum simultaneous overlaps and assigns columns
 * Implements the "Cluster & Split" algorithm for proper width distribution
 */
export function calculateOverlapLayout(
    events: (Event | MultiDayEventInstance)[]
): Map<string, EventLayoutInfo> {
    const layoutMap = new Map<string, EventLayoutInfo>();
    
    if (events.length === 0) return layoutMap;
    
    // Convert events to time-based format for easier processing
    // CRITICAL: Use the same ID that TimeSlotGrid uses for lookups
    // For multi-day instances, this is originalEventId, otherwise event.id
    const eventTimes = events.map(event => {
        const start = new Date(event.startTime).getTime();
        const end = event.endTime 
            ? new Date(event.endTime).getTime() 
            : start + 3600000; // Default 1 hour if no end time
        
        // Match the ID logic in TimeSlotGrid.tsx line 217
        const eventId = 'originalEventId' in event ? (event as any).originalEventId : event.id;
        
        return {
            event,
            start,
            end,
            id: eventId
        };
    });
    
    // Build overlapping clusters using transitive closure
    // If A overlaps B and B overlaps C, all three are in the same cluster
    const clusters: typeof eventTimes[] = [];
    const eventToCluster = new Map<string, number>();
    
    for (const eventTime of eventTimes) {
        // Find all clusters that this event overlaps with
        const overlappingClusterIndices = new Set<number>();
        
        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];
            const overlapsWithCluster = cluster.some(clusterEventTime => {
                return eventTime.start < clusterEventTime.end && clusterEventTime.start < eventTime.end;
            });
            
            if (overlapsWithCluster) {
                overlappingClusterIndices.add(i);
            }
        }
        
        if (overlappingClusterIndices.size === 0) {
            // Create new cluster
            const newClusterIndex = clusters.length;
            clusters.push([eventTime]);
            eventToCluster.set(eventTime.id, newClusterIndex);
        } else {
            // Merge all overlapping clusters into the first one
            const clusterIndices = Array.from(overlappingClusterIndices).sort((a, b) => a - b);
            const targetClusterIndex = clusterIndices[0];
            const targetCluster = clusters[targetClusterIndex];
            
            // Add this event to the target cluster
            targetCluster.push(eventTime);
            eventToCluster.set(eventTime.id, targetClusterIndex);
            
            // Merge other overlapping clusters into the target
            for (let i = clusterIndices.length - 1; i > 0; i--) {
                const clusterIndex = clusterIndices[i];
                const clusterToMerge = clusters[clusterIndex];
                
                // Move all events from this cluster to target
                for (const eventTimeToMerge of clusterToMerge) {
                    targetCluster.push(eventTimeToMerge);
                    eventToCluster.set(eventTimeToMerge.id, targetClusterIndex);
                }
                
                // Remove the merged cluster
                clusters.splice(clusterIndex, 1);
                
                // Update cluster indices for events that were in clusters after the removed one
                for (const [eventId, clusterIdx] of eventToCluster.entries()) {
                    if (clusterIdx > clusterIndex) {
                        eventToCluster.set(eventId, clusterIdx - 1);
                    }
                }
            }
        }
    }
    
    // For each cluster, calculate maximum simultaneous overlaps using time-sweep
    for (const cluster of clusters) {
        // Create time points for sweep line algorithm
        const timePoints: Array<{ time: number; type: 'start' | 'end'; eventId: string }> = [];
        
        for (const eventTime of cluster) {
            timePoints.push({ time: eventTime.start, type: 'start', eventId: eventTime.id });
            timePoints.push({ time: eventTime.end, type: 'end', eventId: eventTime.id });
        }
        
        // Sort by time, with starts before ends at the same time
        timePoints.sort((a, b) => {
            if (a.time !== b.time) return a.time - b.time;
            // If times are equal, process starts before ends
            if (a.type !== b.type) return a.type === 'start' ? -1 : 1;
            return 0;
        });
        
        // Sweep through time to find maximum simultaneous overlaps
        let currentOverlaps = 0;
        let maxSimultaneousOverlaps = 0;
        
        for (const point of timePoints) {
            if (point.type === 'start') {
                currentOverlaps++;
                maxSimultaneousOverlaps = Math.max(maxSimultaneousOverlaps, currentOverlaps);
            } else {
                currentOverlaps--;
            }
        }
        
        const totalColumns = maxSimultaneousOverlaps;
        
        // Assign columns using greedy algorithm (first available column)
        const eventColumns = new Map<string, number>();
        const columns: number[] = []; // Track when each column becomes free (end time)
        
        // Sort cluster events by start time, then by duration (longer first)
        const sortedCluster = [...cluster].sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            return (b.end - b.start) - (a.end - a.start);
        });
        
        for (const eventTime of sortedCluster) {
            // Find first available column
            let assignedColumn = -1;
            for (let i = 0; i < columns.length; i++) {
                if (columns[i] <= eventTime.start) {
                    assignedColumn = i;
                    columns[i] = eventTime.end;
                    break;
                }
            }
            
            // If no column available, create new one
            if (assignedColumn === -1) {
                assignedColumn = columns.length;
                columns.push(eventTime.end);
            }
            
            eventColumns.set(eventTime.id, assignedColumn);
        }
        
        // Set layout info for all events in this cluster
        for (const eventTime of cluster) {
            layoutMap.set(eventTime.id, {
                columnIndex: eventColumns.get(eventTime.id) || 0,
                totalColumns
            });
        }
    }
    
    return layoutMap;
}


