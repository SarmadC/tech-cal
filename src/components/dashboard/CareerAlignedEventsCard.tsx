'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { Target, TrendUp, Users, BookOpen, Sparkle, ArrowRight, X } from '@phosphor-icons/react';
import type { CareerProfile, Event, EventType } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import EventDetailPanel to avoid SSR issues
const EventDetailPanel = dynamic(
  () => import('@/components/calendar/EventDetailPanel'),
  { ssr: false }
);

interface CareerAlignedEventsCardProps {
  careerProfile: CareerProfile;
  upcomingEvents: Event[];
  eventTypes: EventType[];
}

interface EventCareerAlignment {
  event: Event;
  alignmentScore: number;
  alignmentReasons: Array<{
    type: 'skill' | 'goal' | 'interest' | 'learning-style' | 'networking';
    reason: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }>;
  matchedSkills: string[];
  matchedGoals: string[];
}

export function CareerAlignedEventsCard({
  careerProfile,
  upcomingEvents,
  eventTypes
}: CareerAlignedEventsCardProps) {
  const theme = useTimelineTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Function to calculate alignment for any event (memoized to prevent useMemo warnings)
  const calculateEventAlignment = useCallback((event: Event): EventCareerAlignment => {
    const alignmentReasons: EventCareerAlignment['alignmentReasons'] = [];
    let alignmentScore = 0;
    const matchedSkills: string[] = [];
    const matchedGoals: string[] = [];

    const eventTitle = event.title.toLowerCase();
    const eventDesc = event.description.toLowerCase();
    const eventText = `${eventTitle} ${eventDesc}`;

    // Check skill alignment (skills to learn = higher priority)
    careerProfile.skillsToLearn.forEach(skill => {
      if (eventText.includes(skill.toLowerCase())) {
        alignmentScore += 20;
        matchedSkills.push(skill);
        alignmentReasons.push({
          type: 'skill',
          reason: `Learn ${skill}`,
          icon: BookOpen,
          color: 'text-blue-600 dark:text-blue-400'
        });
      }
    });

    // Check primary skills (maintenance/advancement)
    careerProfile.primarySkills.slice(0, 5).forEach(skill => {
      if (eventText.includes(skill.toLowerCase())) {
        alignmentScore += 10;
        matchedSkills.push(skill);
        alignmentReasons.push({
          type: 'skill',
          reason: `Advance ${skill} skills`,
          icon: TrendUp,
          color: 'text-green-600 dark:text-green-400'
        });
      }
    });

    // Check career goals alignment
    careerProfile.careerGoals.forEach(goal => {
      const goalKeywords = {
        'skill-development': ['workshop', 'training', 'bootcamp', 'course', 'learn'],
        'career-advancement': ['leadership', 'management', 'promotion', 'senior'],
        'role-transition': ['career', 'transition', 'new role', 'switch'],
        'leadership-growth': ['leadership', 'management', 'team', 'executive'],
        'entrepreneurship': ['startup', 'founder', 'business', 'entrepreneurship'],
        'networking': ['networking', 'meetup', 'connections', 'community'],
        'specialization': ['expert', 'advanced', 'deep dive', 'mastery'],
        'generalization': ['full-stack', 'broad', 'overview', 'introduction']
      };

      const keywords = goalKeywords[goal as keyof typeof goalKeywords] || [];
      const hasMatch = keywords.some(keyword => eventText.includes(keyword));

      if (hasMatch) {
        alignmentScore += 15;
        matchedGoals.push(goal);
        alignmentReasons.push({
          type: 'goal',
          reason: `Supports ${goal.replace('-', ' ')}`,
          icon: Target,
          color: 'text-purple-600 dark:text-purple-400'
        });
      }
    });

    // Check interests alignment
    careerProfile.interests.slice(0, 5).forEach(interest => {
      if (eventText.includes(interest.toLowerCase())) {
        alignmentScore += 8;
        alignmentReasons.push({
          type: 'interest',
          reason: `Matches interest: ${interest}`,
          icon: Sparkle,
          color: 'text-pink-600 dark:text-pink-400'
        });
      }
    });

    // Check learning style alignment
    const learningStyleKeywords: Record<string, string[]> = {
      'hands-on': ['workshop', 'lab', 'hands-on', 'practical', 'coding'],
      'theoretical': ['lecture', 'presentation', 'keynote', 'talk'],
      'interactive': ['panel', 'discussion', 'q&a', 'interactive'],
      'networking': ['networking', 'meetup', 'mixer', 'social'],
      'case-studies': ['case study', 'real-world', 'example', 'demo'],
      'peer-learning': ['community', 'peer', 'group', 'collaborative']
    };

    careerProfile.learningStyle.forEach(style => {
      const keywords = learningStyleKeywords[style] || [];
      const hasMatch = keywords.some(keyword => eventText.includes(keyword));

      if (hasMatch) {
        alignmentScore += 5;
        alignmentReasons.push({
          type: 'learning-style',
          reason: `Fits ${style.replace('-', ' ')} learning`,
          icon: BookOpen,
          color: 'text-orange-600 dark:text-orange-400'
        });
      }
    });

    // Check networking goals alignment
    if (careerProfile.networkingGoals.length > 0 &&
        (eventText.includes('networking') || eventText.includes('meetup') || eventText.includes('community'))) {
      alignmentScore += 10;
      alignmentReasons.push({
        type: 'networking',
        reason: 'Networking opportunity',
        icon: Users,
        color: 'text-teal-600 dark:text-teal-400'
      });
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, alignmentScore);

    return {
      event,
      alignmentScore: normalizedScore,
      alignmentReasons: alignmentReasons.slice(0, 4), // Top 4 reasons
      matchedSkills: [...new Set(matchedSkills)],
      matchedGoals: [...new Set(matchedGoals)]
    };
  }, [careerProfile]);

  // Calculate alignment for each event (top 10 for main view)
  const alignedEvents = useMemo(() => {
    const scoredEvents: EventCareerAlignment[] = upcomingEvents.map(calculateEventAlignment);

    // Sort by alignment score and return top 10
    return scoredEvents
      .filter(e => e.alignmentScore > 0)
      .sort((a, b) => b.alignmentScore - a.alignmentScore)
      .slice(0, 10);
  }, [upcomingEvents, calculateEventAlignment]);

  // Calculate all events for modal view
  const allAlignedEvents = useMemo(() => {
    const scoredEvents: EventCareerAlignment[] = upcomingEvents.map(calculateEventAlignment);
    
    return scoredEvents
      .filter(e => e.alignmentScore > 0)
      .sort((a, b) => b.alignmentScore - a.alignmentScore);
  }, [upcomingEvents, calculateEventAlignment]);

  // Calculate category distribution
  const categoryStats = useMemo(() => {
    const perfect = alignedEvents.filter(e => e.alignmentScore >= 80).length;
    const strong = alignedEvents.filter(e => e.alignmentScore >= 50 && e.alignmentScore < 80).length;
    const moderate = alignedEvents.filter(e => e.alignmentScore >= 20 && e.alignmentScore < 50).length;

    return { perfect, strong, moderate, total: alignedEvents.length };
  }, [alignedEvents]);

  if (alignedEvents.length === 0) {
    return (
      <Card className={`border ${theme.borderCard}`}>
        <CardHeader>
          <CardTitle className={`text-lg ${theme.textPrimary}`}>Career-Aligned Events</CardTitle>
          <CardDescription className={theme.textSecondary}>
            No upcoming events match your career profile yet
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className={`w-12 h-12 ${theme.textMuted} mx-auto mb-3`} />
          <p className={`text-sm ${theme.textPrimary} mb-2`}>Check back soon</p>
          <p className={`text-xs ${theme.textMuted}`}>
            New events are added regularly
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border ${theme.borderCard} glass-card">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-lg text-glass-primary">Career-Aligned Events</CardTitle>
          <CardDescription className="text-glass-secondary">
            {categoryStats.total} events matched to your career goals
          </CardDescription>
        </div>
        
        {/* Simplified Category Stats - Horizontal */}
        <div className="flex items-center gap-6 pt-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${categoryStats.perfect > 0 ? 'bg-green-500' : 'bg-glass-accent'}`} />
            <span className="text-sm text-glass-tertiary">{categoryStats.perfect} Perfect</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${categoryStats.strong > 0 ? 'bg-blue-500' : 'bg-glass-accent'}`} />
            <span className="text-sm text-glass-tertiary">{categoryStats.strong} Strong</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${categoryStats.moderate > 0 ? 'bg-glass-accent' : 'bg-glass-accent'}`} />
            <span className="text-sm text-glass-tertiary">{categoryStats.moderate} Good</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cleaner Event Cards */}
        <div className="space-y-3">
          {alignedEvents.map(({ event, alignmentScore, alignmentReasons, matchedSkills }) => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="block p-4 rounded-lg bg-glass-accent-light border border-glass-border hover:bg-glass-accent transition-all group cursor-pointer"
            >
              {/* Event Header - Cleaner Layout */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-semibold text-glass-primary mb-1 line-clamp-1 group-hover:underline">
                    {event.title}
                  </h5>
                  <p className="text-xs text-glass-tertiary">
                    {new Date(event.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={alignmentScore >= 80 ? "default" : alignmentScore >= 50 ? "secondary" : "outline"}
                    className="text-xs font-medium"
                  >
                    {alignmentScore}%
                  </Badge>
                </div>
              </div>

              {/* Match Score Bar - Thinner */}
              <div className="mb-3">
                <Progress value={alignmentScore} className="h-1" />
              </div>

              {/* Key Reasons - Clean Text Only */}
              <div className="flex flex-wrap gap-3">
                {/* Show top 2 most important reasons */}
                {alignmentReasons.slice(0, 2).map((reason, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-glass-tertiary px-2 py-1 rounded-full border border-glass-border"
                  >
                    {reason.reason}
                  </span>
                ))}
                
                {/* Show skills if any */}
                {matchedSkills.length > 0 && (
                  <span className="text-xs text-glass-tertiary px-2 py-1 rounded-full border border-glass-border">
                    {matchedSkills.length === 1 ? matchedSkills[0] : `${matchedSkills.length} skills`}
                  </span>
                )}
                
                {/* Show count if more reasons exist */}
                {alignmentReasons.length > 2 && (
                  <span className="text-xs text-glass-tertiary px-2 py-1 rounded-full border border-glass-border">
                    +{alignmentReasons.length - 2} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View All Modal */}
        {allAlignedEvents.length > alignedEvents.length && (
          <>
            <Button 
              variant="ghost" 
              className="w-full text-sm text-glass-primary hover:underline pt-2"
              onClick={() => setIsModalOpen(true)}
            >
              View all {allAlignedEvents.length} upcoming events →
            </Button>
            
            {/* Modal Overlay */}
            {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <div 
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setIsModalOpen(false)}
                />
                
                {/* Modal Content - Glass Effect */}
                <div className="relative glass-card max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-glass-border">
                    <h2 className="text-xl font-semibold text-glass-primary">
                      All Career-Aligned Events
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 text-glass-secondary hover:text-glass-primary"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-4">
                      {allAlignedEvents.map(({ event, alignmentScore, alignmentReasons, matchedSkills }) => (
                        <div
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsModalOpen(false);
                          }}
                          className="block p-4 rounded-lg bg-glass-accent-light border border-glass-border hover:bg-glass-accent transition-all group cursor-pointer"
                        >
                          {/* Event Header - Cleaner Layout */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-glass-primary mb-1 line-clamp-1 group-hover:underline">
                                {event.title}
                              </h5>
                              <p className="text-xs text-glass-tertiary">
                                {new Date(event.startTime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={alignmentScore >= 80 ? "default" : alignmentScore >= 50 ? "secondary" : "outline"}
                                className="text-xs font-medium"
                              >
                                {alignmentScore}%
                              </Badge>
                              <ArrowRight className="w-4 h-4 text-glass-tertiary group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>

                          {/* Match Score Bar - Thinner */}
                          <div className="mb-3">
                            <Progress value={alignmentScore} className="h-1" />
                          </div>

                          {/* Key Reasons - Condensed */}
                          <div className="flex flex-wrap gap-3">
                            {/* Show top 2 most important reasons */}
                            {alignmentReasons.slice(0, 2).map((reason, idx) => (
                              <span
                                key={idx}
                                className="text-xs text-glass-tertiary px-2 py-1 rounded-full border border-glass-border"
                              >
                                {reason.reason}
                              </span>
                            ))}
                            
                            {/* Show skills if any */}
                            {matchedSkills.length > 0 && (
                              <span className="text-xs text-glass-tertiary px-2 py-1 rounded-full border border-glass-border">
                                {matchedSkills.length === 1 ? matchedSkills[0] : `${matchedSkills.length} skills`}
                              </span>
                            )}
                            
                            {/* Show count if more reasons exist */}
                            {alignmentReasons.length > 2 && (
                              <span className="text-xs text-glass-tertiary px-2 py-1 rounded-full border border-glass-border">
                                +{alignmentReasons.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* EventDetailPanel */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          />
          
          {/* EventDetailPanel - Scrollable */}
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="min-h-full flex items-center justify-center py-8">
              <EventDetailPanel
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                categories={eventTypes}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
