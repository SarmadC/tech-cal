'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendUp, Users, BookOpen, Sparkle, ArrowRight, X, Info } from '@phosphor-icons/react';
import type { CareerProfile, Event, EventType } from '@/types';
import dynamic from 'next/dynamic';

// Dynamically import DashboardEventDetailModal to avoid SSR issues
const DashboardEventDetailModal = dynamic(
  () => import('@/components/dashboard/DashboardEventDetailModal'),
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
    contribution: number;
  }>;
  matchedSkills: string[];
  matchedGoals: string[];
}

export function CareerAlignedEventsCard({
  careerProfile,
  upcomingEvents,
  eventTypes
}: CareerAlignedEventsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'perfect' | 'strong' | 'good' | 'fair'>('all');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

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
        const contribution = 20;
        alignmentScore += contribution;
        matchedSkills.push(skill);
        alignmentReasons.push({
          type: 'skill',
          reason: `Learn ${skill}`,
          icon: BookOpen,
          color: 'text-blue-600 dark:text-blue-400',
          contribution
        });
      }
    });

    // Check primary skills (maintenance/advancement)
    careerProfile.primarySkills.slice(0, 5).forEach(skill => {
      if (eventText.includes(skill.toLowerCase())) {
        const contribution = 10;
        alignmentScore += contribution;
        matchedSkills.push(skill);
        alignmentReasons.push({
          type: 'skill',
          reason: `Advance ${skill} skills`,
          icon: TrendUp,
          color: 'text-green-600 dark:text-green-400',
          contribution
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
        const contribution = 15;
        alignmentScore += contribution;
        matchedGoals.push(goal);
        alignmentReasons.push({
          type: 'goal',
          reason: `Supports ${goal.replace('-', ' ')}`,
          icon: Target,
          color: 'text-purple-600 dark:text-purple-400',
          contribution
        });
      }
    });

    // Check interests alignment
    careerProfile.interests.slice(0, 5).forEach(interest => {
      if (eventText.includes(interest.toLowerCase())) {
        const contribution = 8;
        alignmentScore += contribution;
        alignmentReasons.push({
          type: 'interest',
          reason: `Matches interest: ${interest}`,
          icon: Sparkle,
          color: 'text-pink-600 dark:text-pink-400',
          contribution
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
      'peer': ['community', 'peer', 'group', 'collaborative']
    };

    careerProfile.learningStyle.forEach(style => {
      const keywords = learningStyleKeywords[style] || [];
      const hasMatch = keywords.some(keyword => eventText.includes(keyword));

      if (hasMatch) {
        const contribution = 5;
        alignmentScore += contribution;
        alignmentReasons.push({
          type: 'learning-style',
          reason: `Fits ${style.replace('-', ' ')} learning`,
          icon: BookOpen,
          color: 'text-orange-600 dark:text-orange-400',
          contribution
        });
      }
    });

    // Check networking goals alignment
    if (careerProfile.networkingGoals.length > 0 &&
        (eventText.includes('networking') || eventText.includes('meetup') || eventText.includes('community'))) {
      const contribution = 10;
      alignmentScore += contribution;
      alignmentReasons.push({
        type: 'networking',
        reason: 'Networking opportunity',
        icon: Users,
        color: 'text-teal-600 dark:text-teal-400',
        contribution
      });
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, alignmentScore);

    return {
      event,
      alignmentScore: normalizedScore,
      alignmentReasons: alignmentReasons, // Show all reasons
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
    const good = alignedEvents.filter(e => e.alignmentScore >= 20 && e.alignmentScore < 50).length;
    const fair = alignedEvents.filter(e => e.alignmentScore > 0 && e.alignmentScore < 20).length;

    return { perfect, strong, good, fair, total: alignedEvents.length };
  }, [alignedEvents]);

  // Filter events based on active filter
  const filteredEvents = useMemo(() => {
    switch (activeFilter) {
      case 'perfect':
        return alignedEvents.filter(e => e.alignmentScore >= 80);
      case 'strong':
        return alignedEvents.filter(e => e.alignmentScore >= 50 && e.alignmentScore < 80);
      case 'good':
        return alignedEvents.filter(e => e.alignmentScore >= 20 && e.alignmentScore < 50);
      case 'fair':
        return alignedEvents.filter(e => e.alignmentScore > 0 && e.alignmentScore < 20);
      default:
        return alignedEvents;
    }
  }, [alignedEvents, activeFilter]);

  // Get match quality label
  const getMatchQuality = (score: number) => {
    if (score >= 80) return 'Perfect';
    if (score >= 50) return 'Strong';
    if (score >= 20) return 'Good';
    return 'Fair';
  };

  // Get match quality color
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-blue-400';
    if (score >= 20) return 'text-blue-400';
    return 'text-gray-400';
  };

  if (alignedEvents.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-glass-primary">Career-Aligned Events</CardTitle>
          <CardDescription className="text-glass-secondary">
            No upcoming events match your career profile yet
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className="w-12 h-12 text-glass-tertiary mx-auto mb-3" />
          <p className="text-sm text-glass-primary mb-2">Check back soon</p>
          <p className="text-xs text-glass-tertiary">
            New events are added regularly
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-lg font-bold text-glass-primary">Career-Aligned Events</CardTitle>
          <CardDescription className="text-glass-secondary">
            {categoryStats.total} events matched to your career goals
          </CardDescription>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-white/20 text-glass-primary backdrop-blur-sm'
                : 'text-glass-tertiary hover:text-glass-secondary'
            }`}
          >
            All ({categoryStats.total})
          </button>
          <button
            onClick={() => setActiveFilter('perfect')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'perfect'
                ? 'bg-white/20 text-glass-primary backdrop-blur-sm'
                : 'text-glass-tertiary hover:text-glass-secondary'
            }`}
          >
            Perfect ({categoryStats.perfect})
          </button>
          <button
            onClick={() => setActiveFilter('strong')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'strong'
                ? 'bg-white/20 text-glass-primary backdrop-blur-sm'
                : 'text-glass-tertiary hover:text-glass-secondary'
            }`}
          >
            Strong ({categoryStats.strong})
          </button>
          <button
            onClick={() => setActiveFilter('good')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'good'
                ? 'bg-white/20 text-glass-primary backdrop-blur-sm'
                : 'text-glass-tertiary hover:text-glass-secondary'
            }`}
          >
            Good ({categoryStats.good})
          </button>
          <button
            onClick={() => setActiveFilter('fair')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'fair'
                ? 'bg-white/20 text-glass-primary backdrop-blur-sm'
                : 'text-glass-tertiary hover:text-glass-secondary'
            }`}
          >
            Fair ({categoryStats.fair})
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Event Cards */}
        <div className="space-y-0">
          {filteredEvents.map(({ event, alignmentScore, alignmentReasons }, index) => (
            <div key={event.id}>
              {index > 0 && (
                <div className="border-b border-white/10 my-4" />
              )}
              <div
                onClick={() => setSelectedEvent(event)}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group cursor-pointer rounded-lg"
              >
                {/* Event Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <h5 className="text-sm font-semibold text-glass-primary line-clamp-1 group-hover:underline">
                    {event.title}
                  </h5>
                  <p className="text-xs text-glass-tertiary flex-shrink-0">
                    {new Date(event.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Match Score and Info */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getMatchColor(alignmentScore)}`} />
                  <span className={`text-sm font-medium ${getMatchColor(alignmentScore)}`}>
                    {getMatchQuality(alignmentScore)} - {alignmentScore}%
                  </span>
                  <div className="relative">
                    <Info 
                      className="w-4 h-4 text-glass-tertiary cursor-help" 
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    />
                    {hoveredEventId === event.id && alignmentReasons.length > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                        <div className="text-xs text-white">
                          <div className="font-medium mb-2">Why this event matches:</div>
                          <ul className="space-y-1">
                            {alignmentReasons.map((reason, idx) => (
                              <li key={idx} className="flex items-center justify-between">
                                <span>{reason.reason}</span>
                                <span className="text-white/70">+{reason.contribution}%</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 pt-2 border-t border-white/20">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Total Match:</span>
                              <span className={`font-medium ${getMatchColor(alignmentScore)}`}>
                                {getMatchQuality(alignmentScore)} - {alignmentScore}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                      </div>
                    )}
                  </div>
                </div>

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
                
                {/* Modal Content */}
                <div className="relative glass-card max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/20">
                    <h2 className="text-xl font-semibold text-glass-primary">
                      All Career-Aligned Events
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 text-glass-tertiary hover:text-glass-secondary"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-0">
                      {allAlignedEvents.map(({ event, alignmentScore, alignmentReasons }, index) => (
                        <div key={event.id}>
                          {index > 0 && (
                            <div className="border-b border-white/10 my-4" />
                          )}
                          <div
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsModalOpen(false);
                            }}
                            className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group cursor-pointer rounded-lg"
                          >
                            {/* Event Info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-glass-primary line-clamp-1 group-hover:underline">
                                {event.title}
                              </h5>
                              <p className="text-xs text-glass-tertiary flex-shrink-0">
                                {new Date(event.startTime).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>

                            {/* Match Score and Info */}
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getMatchColor(alignmentScore)}`} />
                              <span className={`text-sm font-medium ${getMatchColor(alignmentScore)}`}>
                                {getMatchQuality(alignmentScore)} - {alignmentScore}%
                              </span>
                              <div className="relative">
                                <Info 
                                  className="w-4 h-4 text-glass-tertiary cursor-help" 
                                  onMouseEnter={() => setHoveredEventId(event.id)}
                                  onMouseLeave={() => setHoveredEventId(null)}
                                />
                                {hoveredEventId === event.id && alignmentReasons.length > 0 && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                                    <div className="text-xs text-white">
                                      <div className="font-medium mb-2">Why this event matches:</div>
                                      <ul className="space-y-1">
                                        {alignmentReasons.map((reason, idx) => (
                                          <li key={idx} className="flex items-center justify-between">
                                            <span>{reason.reason}</span>
                                            <span className="text-white/70">+{reason.contribution}%</span>
                                          </li>
                                        ))}
                                      </ul>
                                      <div className="mt-3 pt-2 border-t border-white/20">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">Total Match:</span>
                                          <span className={`font-medium ${getMatchColor(alignmentScore)}`}>
                                            {getMatchQuality(alignmentScore)} - {alignmentScore}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center ml-2">
                              <ArrowRight className="w-4 h-4 text-glass-tertiary group-hover:translate-x-0.5 transition-transform" />
                            </div>
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
      
      {/* EventDetailPanel Modal */}
      <DashboardEventDetailModal
        isOpen={selectedEvent !== null}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        categories={eventTypes}
      />
    </Card>
  );
}

