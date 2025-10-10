'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { GraduationCap, HandWaving, Users, Lightbulb } from '@phosphor-icons/react';
import type { CareerProfile, Event, LearningStyle } from '@/types';

interface LearningStyleCardProps {
  careerProfile: CareerProfile;
  upcomingEvents: Event[];
}

const LEARNING_STYLE_CONFIGS: Record<LearningStyle, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  eventTypes: string[];
}> = {
  'hands-on': {
    icon: HandWaving,
    color: 'text-blue-600 dark:text-blue-400',
    description: 'Best for workshops, labs, and coding sessions',
    eventTypes: ['workshop', 'hackathon', 'bootcamp', 'training']
  },
  'theoretical': {
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    description: 'Best for lectures and presentations',
    eventTypes: ['conference', 'webinar', 'keynote', 'summit']
  },
  'interactive': {
    icon: Users,
    color: 'text-green-600 dark:text-green-400',
    description: 'Best for panel discussions and Q&A',
    eventTypes: ['panel', 'fireside-chat', 'roundtable', 'ama']
  },
  'networking': {
    icon: Users,
    color: 'text-orange-600 dark:text-orange-400',
    description: 'Best for meeting people and building connections',
    eventTypes: ['networking', 'meetup', 'mixer', 'social']
  },
  'case-studies': {
    icon: Lightbulb,
    color: 'text-yellow-600 dark:text-yellow-400',
    description: 'Best for real-world examples and analysis',
    eventTypes: ['conference', 'workshop', 'case-study', 'demo']
  },
  'peer-learning': {
    icon: Users,
    color: 'text-teal-600 dark:text-teal-400',
    description: 'Best for collaborative learning',
    eventTypes: ['meetup', 'study-group', 'hackathon', 'workshop']
  }
};

export function LearningStyleCard({
  careerProfile,
  upcomingEvents
}: LearningStyleCardProps) {
  const theme = useTimelineTheme();

  // Find relevant events for user's learning styles
  const matchedEvents = useMemo(() => {
    const eventTypeKeywords = careerProfile.learningStyle.flatMap(
      style => LEARNING_STYLE_CONFIGS[style].eventTypes
    );

    return upcomingEvents.filter(event => {
      const title = event.title.toLowerCase();
      const description = event.description.toLowerCase();
      return eventTypeKeywords.some(keyword =>
        title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase())
      );
    }).slice(0, 5);
  }, [careerProfile.learningStyle, upcomingEvents]);

  // Get time availability info
  const timeAvailabilityText = useMemo(() => {
    const map = {
      'very-limited': '< 2 hours/month',
      'limited': '2-8 hours/month',
      'moderate': '8-20 hours/month',
      'flexible': '20+ hours/month',
      'dedicated': 'Can take time off'
    };
    return map[careerProfile.availableTime];
  }, [careerProfile.availableTime]);

  // Get budget info
  const budgetText = useMemo(() => {
    const map = {
      'free-only': 'Free events only',
      'low': '$1-100/month',
      'moderate': '$100-500/month',
      'high': '$500-2000/month',
      'unlimited': 'No budget constraints'
    };
    return map[careerProfile.budget];
  }, [careerProfile.budget]);

  return (
    <Card className={`border ${theme.borderCard}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${theme.textPrimary}`}>Learning Preferences</CardTitle>
            <CardDescription className={theme.textSecondary}>
              {matchedEvents.length} matching events found
            </CardDescription>
          </div>
          <GraduationCap className={`w-5 h-5 ${theme.textMuted}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Learning Styles */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Your Learning Styles</h4>
          <div className="space-y-2">
            {careerProfile.learningStyle.map(style => {
              const config = LEARNING_STYLE_CONFIGS[style];
              const Icon = config.icon;
              return (
                <div
                  key={style}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${theme.borderCard}`}
                >
                  <div className={`p-2 rounded-lg border ${theme.borderCard}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-sm font-medium ${theme.textPrimary} capitalize`}>
                      {style.replace('-', ' ')}
                    </h5>
                    <p className={`text-xs ${theme.textMuted} mt-0.5`}>{config.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preferred Event Types */}
        {careerProfile.preferredEventTypes.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Preferred Event Types</h4>
            <div className="flex flex-wrap gap-2">
              {careerProfile.preferredEventTypes.map(type => (
                <Badge key={type} variant="secondary" className={`${theme.textPrimary} capitalize`}>
                  {type.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Time & Budget */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${theme.borderCard}`}>
            <p className={`text-xs ${theme.textMuted} mb-1`}>Time Available</p>
            <p className={`text-sm font-medium ${theme.textPrimary}`}>{timeAvailabilityText}</p>
          </div>
          <div className={`p-3 rounded-lg border ${theme.borderCard}`}>
            <p className={`text-xs ${theme.textMuted} mb-1`}>Budget</p>
            <p className={`text-sm font-medium ${theme.textPrimary}`}>{budgetText}</p>
          </div>
        </div>

        {/* Matched Events */}
        {matchedEvents.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Recommended Events</h4>
            <div className="space-y-2">
              {matchedEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${theme.borderCard} hover:${theme.hoverCard} transition-colors cursor-pointer`}
                >
                  <h5 className={`text-sm font-medium ${theme.textPrimary} mb-1 truncate`}>
                    {event.title}
                  </h5>
                  <p className={`text-xs ${theme.textMuted}`}>
                    {new Date(event.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
