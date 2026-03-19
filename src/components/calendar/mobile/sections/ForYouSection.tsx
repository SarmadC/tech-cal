'use client';

import React, { useRef } from 'react';
import { User } from '@phosphor-icons/react';
import { Event, AppProfile, TrackedEvent } from '@/types';
// Use consolidated Event type - recommendation functionality handled through EventWithCareerImpact
import { useForYouTracking } from '@/hooks/useRecommendationTracking';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { DiscoveryService } from '@/services/discoveryService';
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from '../DiscoveryCard';
import { sendTelemetryEvent } from '@/utils/telemetryClient';
// import CareerProfilePrompt from './CareerProfilePrompt'; // Removed - using enhanced empty state instead
import BentoGrid from '../../desktop/discovery/BentoGrid';

export interface ForYouSectionProps {
    events: Event[];
    userProfile: AppProfile | null;
    trackedEvents?: TrackedEvent[];
    onEventSelect?: (event: Event) => void;
    onTrackEvent?: (event: Event) => void;
    className?: string;
    limit?: number;
    userLocation?: { city?: string; country?: string; timezone?: string };
    renderAsBento?: boolean;
    skipPersonalization?: boolean;
}

const ForYouSection = React.memo<ForYouSectionProps>(({
    events,
    userProfile,
    trackedEvents: _trackedEvents = [],
    onEventSelect,
    onTrackEvent: _onTrackEvent,
    className = '',
    limit = 5,
    userLocation: _userLocation,
    renderAsBento = false,
    skipPersonalization = false
}) => {
    const careerProfileLoading = false;
    const hasCareerProfile = true;
    const { getAttendanceStatus, setAttendanceStatus } = useEventEngagement();
    const [pendingAttendanceIds, setPendingAttendanceIds] = React.useState<Set<string>>(new Set());

    // Personalized tracking for For You section
    const tracking = useForYouTracking();
    const {
        trackForYouView,
        trackForYouClick,
        isTrackingEnabled
    } = tracking;

    // Stable reference for trackForYouDisplay to prevent infinite re-renders
    const trackForYouDisplayRef = useRef(tracking.trackForYouDisplay);
    trackForYouDisplayRef.current = tracking.trackForYouDisplay;

    // Use React Query for caching and performance optimization (disabled in server-scored mode)
    const isLoading = false;
    const error: Error | null = null;

    // For now, we're using server-side scoring, so we use the passed events directly
    // (In the future, this could be replaced with React Query for client-side personalization)
    const personalizedEvents: Event[] = events;

    // Use passed events directly (they are already scored by the server)
    // If no personalized events, fall back to trending events
    const finalEvents = React.useMemo(() => {
        const now = new Date();

        // Filter to upcoming events, handling incomplete fields gracefully
        const upcomingEvents = events.filter(event => {
            // Check for incomplete event fields
            if (!event.startTime) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('[ForYouSection] Event missing startTime:', event.id, event.title);
                }
                return false; // Skip events without startTime
            }

            try {
                const eventDate = new Date(event.startTime);
                return eventDate > now;
            } catch (error) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('[ForYouSection] Invalid startTime:', event.id, event.startTime, error);
                }
                return false; // Skip events with invalid dates
            }
        });

        // Get score helper
        const getScore = (e: Event): number => {
            return (e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
        };

        // If we have events with scores, use them (be more lenient - accept any score > 0)
        const scoredEvents = upcomingEvents.filter(event => getScore(event) > 0);

        if (scoredEvents.length > 0) {
            // Sort by score and take top events
            const sorted = [...scoredEvents].sort((a, b) => {
                const aScore = getScore(a);
                const bScore = getScore(b);
                return bScore - aScore;
            });

            // Debug logging (dev mode only)
            if (process.env.NODE_ENV !== 'production') {
                console.log('[ForYouSection] Event filtering debug:', {
                    totalEvents: events.length,
                    upcomingEvents: upcomingEvents.length,
                    eventsWithScores: scoredEvents.length,
                    topScores: sorted.slice(0, 5).map(e => getScore(e)),
                    returningCount: Math.min(sorted.length, limit)
                });
            }

            return sorted.slice(0, limit);
        }

        // Fallback: use trending events if no scored events available
        if (upcomingEvents.length > 0) {
            const trending = DiscoveryService.getTrendingEvents(upcomingEvents, limit, _userLocation);
            if (trending.length > 0) {
                if (process.env.NODE_ENV !== 'production') {
                    console.log('[ForYouSection] Using trending fallback -', trending.length, 'events');
                }
                return trending.map(discoveryEvent => discoveryEvent as unknown as Event).slice(0, limit);
            }
        }

        if (process.env.NODE_ENV !== 'production') {
            console.warn('[ForYouSection] No events to display - total:', events.length, 'upcoming:', upcomingEvents.length);
        }

        return [];
    }, [events, limit, _userLocation]);

    // Debug logging (dev only)
    React.useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('ForYouSection Debug:', {
                hasCareerProfile,
                userProfile: !!userProfile,
                eventsCount: events.length,
                personalizedEventsCount: personalizedEvents.length,
                finalEventsCount: finalEvents.length,
                skipPersonalization,
                isLoading,
                error: false
            });
        }
    }, [hasCareerProfile, userProfile, events.length, personalizedEvents.length, finalEvents.length, skipPersonalization, isLoading, error]);

    const handleEventClick = React.useCallback((event: Event, position: number) => {
        // Track click interaction
        if (isTrackingEnabled) {
            trackForYouClick(event.id, position + 1);
        }

        onEventSelect?.(event);
    }, [onEventSelect, trackForYouClick, isTrackingEnabled]);

    const handleEventView = React.useCallback((event: Event, position: number) => {
        // Track view interaction
        if (isTrackingEnabled) {
            trackForYouView(event.id, position + 1);
        }
    }, [trackForYouView, isTrackingEnabled]);

    const isAttending = React.useCallback((eventId: string) => {
        return getAttendanceStatus(eventId) === 'attending';
    }, [getAttendanceStatus]);

    const handleAttendanceToggle = React.useCallback(async (event: Event) => {
        if (!event?.id || pendingAttendanceIds.has(event.id)) {
            return;
        }

        const currentlyAttending = getAttendanceStatus(event.id) === 'attending';
        setPendingAttendanceIds((prev) => new Set(prev).add(event.id));

        try {
            await setAttendanceStatus(event.id, currentlyAttending ? null : 'attending');
            void sendTelemetryEvent({
                eventType: 'discovery_attendance_toggle',
                context: {
                    surface: 'mobile',
                },
                metadata: {
                    eventId: event.id,
                    source: 'card_icon',
                    action: currentlyAttending ? 'clear_attending' : 'set_attending',
                },
            });
        } catch (error) {
            console.error('[ForYouSection] Failed to toggle attendance:', error);
        } finally {
            setPendingAttendanceIds((prev) => {
                const next = new Set(prev);
                next.delete(event.id);
                return next;
            });
        }
    }, [pendingAttendanceIds, getAttendanceStatus, setAttendanceStatus]);


    // Remove the CareerProfilePrompt - we'll handle this in the empty state below

    // Show loading state
    if (isLoading || careerProfileLoading) {
        return (
            <DiscoverySection
                title="For You"
                icon={<User size={20} weight="fill" />}
                className={className}
            >
                <div className="discovery-loading-state">
                    <div className="animate-pulse space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </DiscoverySection>
        );
    }

    // Show error state with retry option
    if (error) {
        return (
            <DiscoverySection
                title="For You"
                icon={<User size={20} weight="fill" />}
                className={className}
            >
                <div className="discovery-empty-state">
                    <User size={48} className="empty-icon" />
                    <div className="empty-title">Unable to load recommendations</div>
                    <div className="empty-subtitle">
                        There was an issue loading your personalized recommendations. Please try refreshing the page.
                    </div>
                </div>
            </DiscoverySection>
        );
    }

    // Show loading state
    if (isLoading) {
        return (
            <DiscoverySection
                title="For You"
                icon={<User size={20} weight="fill" />}
                className={className}
            >
                <div className="discovery-empty-state">
                    <div className="empty-icon-container">
                        <User size={48} className="empty-icon" />
                        <div className="empty-icon-bg"></div>
                    </div>
                    <div className="empty-title">Loading your recommendations...</div>
                    <div className="empty-subtitle">
                        We&apos;re finding the best events for your career goals.
                    </div>
                </div>
            </DiscoverySection>
        );
    }

    // Show error state
    if (error) {
        return (
            <DiscoverySection
                title="For You"
                icon={<User size={20} weight="fill" />}
                className={className}
            >
                <div className="discovery-empty-state">
                    <div className="empty-icon-container">
                        <User size={48} className="empty-icon" />
                        <div className="empty-icon-bg"></div>
                    </div>
                    <div className="empty-title">Unable to load recommendations</div>
                    <div className="empty-subtitle">
                        There was an issue loading your personalized events. Please try again.
                    </div>
                    <div className="empty-actions">
                        <button
                            className="empty-cta-primary"
                            onClick={() => {
                                console.log('Retry recommendations');
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            className="empty-cta-secondary"
                            onClick={() => {
                                console.log('Navigate to explore more');
                            }}
                        >
                            Browse All Events
                        </button>
                    </div>
                </div>
            </DiscoverySection>
        );
    }

    // Show empty state with helpful message if no events found
    if (finalEvents.length === 0) {
        const isColdStart = !userProfile;
        const hasUpcomingEvents = events.some(event => new Date(event.startTime) > new Date());

        return (
            <DiscoverySection
                title="For You"
                icon={<User size={20} weight="fill" />}
                className={className}
            >
                <div className="discovery-empty-state">
                    <div className="empty-icon-container">
                        <User size={48} className="empty-icon" />
                        <div className="empty-icon-bg"></div>
                    </div>
                    <div className="empty-title">
                        {isColdStart
                            ? 'Complete your profile for personalized recommendations'
                            : 'Building your personalized feed'}
                    </div>
                    <div className="empty-subtitle">
                        {isColdStart
                            ? 'Tell us about your skills and interests to get tailored event recommendations.'
                            : hasUpcomingEvents
                                ? 'We\'re analyzing upcoming events to find the best matches for you.'
                                : 'No upcoming events available at the moment. Check back soon!'}
                    </div>
                    <div className="empty-actions">
                        {isColdStart && (
                            <button
                                className="empty-cta-primary"
                                onClick={() => {
                                    console.log('Navigate to profile completion');
                                }}
                            >
                                Complete Profile
                            </button>
                        )}
                        <button
                            className={isColdStart ? "empty-cta-secondary" : "empty-cta-primary"}
                            onClick={() => {
                                console.log('Navigate to explore more');
                            }}
                        >
                            Browse All Events
                        </button>
                    </div>
                </div>
            </DiscoverySection>
        );
    }

    // Use consistent card size for all cards

    const cardsContent = finalEvents.map((event, index) => (
        <DiscoveryCard
            key={`${event.id}-${index}`}
            event={event}
            onClick={() => handleEventClick(event, index)}
            onView={() => handleEventView(event, index)}
            isAttending={isAttending(event.id)}
            isAttendanceUpdating={pendingAttendanceIds.has(event.id)}
            onAttendanceToggle={handleAttendanceToggle}
        />
    ));

    return (
        <DiscoverySection
            title="For You"
            icon={<User size={20} weight="fill" />}
            className={className}
            showViewAll={personalizedEvents.length >= limit}
            onViewAll={() => {
                // Handle view all - could navigate to a full personalized feed
                // TODO: Navigate to full personalized recommendations view
            }}
        >
            {renderAsBento ? (
                <BentoGrid>{cardsContent}</BentoGrid>
            ) : (
                <div className="discovery-cards-container">{cardsContent}</div>
            )}
        </DiscoverySection>
    );
});

ForYouSection.displayName = 'ForYouSection';

export default ForYouSection;
