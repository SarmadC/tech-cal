'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { ChartLine, Trophy, Lightbulb, TrendUp, CheckCircle } from '@phosphor-icons/react';
import { calculateEventAlignment } from '@/utils/uiScoringAdapter';
import { doesEventMatchGoal } from '@/utils/eventGoalAlignment';
import { getCanonicalSkillMeta } from '@/utils/skillTaxonomy';
import type { CareerGoal, CareerProfile, Event, TrackedEventRecord } from '@/types';

interface CareerImpactInsightsCardProps {
  careerProfile: CareerProfile;
  trackedEvents: TrackedEventRecord[];
}

interface SkillProgress {
  skill: string;
  eventsAttended: number;
  progressLevel: 'beginner' | 'learning' | 'proficient';
  nextMilestone: string;
}

interface AttendedEventAlignment {
  event: Event;
  normalizedMatchedSkills: string[];
  matchedGoals: CareerGoal[];
  networkingAligned: boolean;
}

const NETWORKING_KEYWORDS = [
  'network',
  'meetup',
  'community',
  'mixer',
  'social',
  'connect',
  'roundtable'
] as const;

function normalizeSkill(skill: string): string {
  const canonical = getCanonicalSkillMeta(skill)?.name ?? skill;
  return canonical.trim().toLowerCase();
}

function isNetworkingEvent(event: Event): boolean {
  const eventText = `${event.title} ${event.description} ${event.category?.name ?? ''}`.toLowerCase();
  const tagText = (event.tags || []).map(tag => tag.name.toLowerCase()).join(' ');
  return NETWORKING_KEYWORDS.some(keyword => eventText.includes(keyword) || tagText.includes(keyword));
}

export function CareerImpactInsightsCard({
  careerProfile,
  trackedEvents
}: CareerImpactInsightsCardProps) {
  const theme = useTimelineTheme();

  // Compute attended event alignments once and reuse for metrics/insights.
  const attendedAlignments = useMemo<AttendedEventAlignment[]>(() => {
    return trackedEvents
      .filter((record): record is TrackedEventRecord & { event: Event } => record.status === 'attended' && !!record.event)
      .map(record => {
        const alignment = calculateEventAlignment(record.event, careerProfile);
        const profileGoals = new Set(careerProfile.careerGoals);

        const matchedGoals = careerProfile.careerGoals.filter(goal =>
          alignment.matchedGoals.includes(goal) || doesEventMatchGoal(record.event, goal)
        );

        const normalizedMatchedSkills = alignment.matchedSkills
          .map(normalizeSkill)
          .filter(Boolean);

        const networkingAligned =
          matchedGoals.includes('networking') ||
          alignment.alignmentReasons.some(reason => reason.type === 'networking') ||
          isNetworkingEvent(record.event);

        return {
          event: record.event,
          normalizedMatchedSkills,
          matchedGoals: matchedGoals.filter(goal => profileGoals.has(goal)),
          networkingAligned
        };
      });
  }, [trackedEvents, careerProfile]);

  // Analyze skill development from attended events.
  const skillAnalysis = useMemo(() => {
    const skillMap = new Map<string, { label: string; count: number }>();

    careerProfile.skillsToLearn.forEach(skill => {
      const canonicalLabel = getCanonicalSkillMeta(skill)?.name ?? skill;
      skillMap.set(normalizeSkill(skill), { label: canonicalLabel, count: 0 });
    });

    attendedAlignments.forEach(({ normalizedMatchedSkills }) => {
      normalizedMatchedSkills.forEach(matchedSkill => {
        const existing = skillMap.get(matchedSkill);
        if (existing) {
          existing.count += 1;
        }
      });
    });

    const progressList: SkillProgress[] = Array.from(skillMap.values())
      .map(({ label, count }): SkillProgress => ({
        skill: label,
        eventsAttended: count,
        progressLevel: count >= 5 ? 'proficient' : count >= 2 ? 'learning' : 'beginner',
        nextMilestone: count >= 5
          ? 'Maintain with advanced events'
          : count >= 2
          ? `${Math.max(1, 5 - count)} more event${5 - count === 1 ? '' : 's'} to reach proficient`
          : 'Attend 1 relevant event to start momentum'
      }))
      .sort((a, b) => b.eventsAttended - a.eventsAttended)
      .slice(0, 5);

    return progressList;
  }, [careerProfile, attendedAlignments]);

  // Calculate career impact metrics from attended events.
  const impactMetrics = useMemo(() => {
    const totalEvents = attendedAlignments.length;
    const targetSkills = new Set(careerProfile.skillsToLearn.map(normalizeSkill));

    const skillAlignedCount = attendedAlignments.filter(({ normalizedMatchedSkills }) => {
      if (targetSkills.size === 0) {
        return normalizedMatchedSkills.length > 0;
      }
      return normalizedMatchedSkills.some(skill => targetSkills.has(skill));
    }).length;
    const skillAlignedPercentage = totalEvents > 0
      ? Math.round((skillAlignedCount / totalEvents) * 100)
      : 0;

    const goalAlignedCount = attendedAlignments.filter(alignment => alignment.matchedGoals.length > 0).length;
    const goalAlignedPercentage = totalEvents > 0
      ? Math.round((goalAlignedCount / totalEvents) * 100)
      : 0;

    const networkingCount = attendedAlignments.filter(alignment => alignment.networkingAligned).length;
    const networkingPercentage = totalEvents > 0
      ? Math.round((networkingCount / totalEvents) * 100)
      : 0;

    return {
      totalEvents,
      skillAlignedCount,
      skillAlignedPercentage,
      goalAlignedCount,
      goalAlignedPercentage,
      networkingCount,
      networkingPercentage
    };
  }, [attendedAlignments, careerProfile]);

  // Generate insights
  const insights = useMemo(() => {
    const insightsList: Array<{
      type: 'success' | 'info' | 'warning';
      icon: React.ComponentType<{ className?: string }>;
      message: string;
    }> = [];

    // Skill development insights
    if (skillAnalysis.length > 0 && skillAnalysis[0].eventsAttended > 0) {
      const topSkill = skillAnalysis[0];
      insightsList.push({
        type: 'success',
        icon: Trophy,
        message: `Great progress on ${topSkill.skill}! ${topSkill.eventsAttended} events attended.`
      });
    }

    // Goal alignment insights
    if (impactMetrics.goalAlignedPercentage >= 50) {
      insightsList.push({
        type: 'success',
        icon: CheckCircle,
        message: `${impactMetrics.goalAlignedPercentage}% of your events align with career goals.`
      });
    } else if (impactMetrics.totalEvents > 0) {
      insightsList.push({
        type: 'info',
        icon: Lightbulb,
        message: 'Consider attending more events aligned with your career goals.'
      });
    }

    // Networking insights
    if (careerProfile.networkingGoals.length > 0) {
      if (impactMetrics.networkingPercentage >= 30) {
        insightsList.push({
          type: 'success',
          icon: TrendUp,
          message: `Building your network well with ${impactMetrics.networkingCount} networking events.`
        });
      } else {
        insightsList.push({
          type: 'info',
          icon: Lightbulb,
          message: 'Add more networking events to expand your professional circle.'
        });
      }
    }

    // Skills to learn insights
    const unstartedSkills = skillAnalysis
      .filter(skill => skill.eventsAttended === 0)
      .map(skill => skill.skill);
    if (unstartedSkills.length > 0 && unstartedSkills.length <= 3) {
      insightsList.push({
        type: 'info',
        icon: Lightbulb,
        message: `Start learning ${unstartedSkills.slice(0, 2).join(' and ')} with relevant events.`
      });
    }

    return insightsList.slice(0, 4); // Top 4 insights
  }, [skillAnalysis, impactMetrics, careerProfile]);

  const attendedEventsCount = trackedEvents.filter(e => e.status === 'attended').length;

  if (attendedEventsCount === 0) {
    return (
      <Card className={`border ${theme.borderCard}`}>
        <CardHeader>
          <CardTitle className={`text-lg ${theme.textPrimary}`}>Career Impact Insights</CardTitle>
          <CardDescription className={theme.textSecondary}>
            Attend events to see your career progress
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <ChartLine className={`w-12 h-12 ${theme.textMuted} mx-auto mb-3`} />
          <p className={`text-sm ${theme.textPrimary} mb-2`}>No events attended yet</p>
          <p className={`text-xs ${theme.textMuted}`}>
            Mark events as &quot;attended&quot; to track your career impact
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border ${theme.borderCard}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={`text-lg ${theme.textPrimary}`}>Career Impact Insights</CardTitle>
            <CardDescription className={theme.textSecondary}>
              How events contribute to your career goals
            </CardDescription>
          </div>
          <ChartLine className={`w-5 h-5 ${theme.textMuted}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Impact Metrics */}
        <div className="space-y-4">
          <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Event Alignment</h4>

          {/* Skill Alignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={theme.textPrimary}>Skill Development</span>
              <span className={theme.textMuted}>
                {impactMetrics.skillAlignedCount} / {impactMetrics.totalEvents} events
              </span>
            </div>
            <Progress value={impactMetrics.skillAlignedPercentage} className="h-2" />
            <p className={`text-xs ${theme.textMuted}`}>
              {impactMetrics.skillAlignedPercentage}% of events support your skill goals
            </p>
          </div>

          {/* Goal Alignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={theme.textPrimary}>Career Goals</span>
              <span className={theme.textMuted}>
                {impactMetrics.goalAlignedCount} / {impactMetrics.totalEvents} events
              </span>
            </div>
            <Progress value={impactMetrics.goalAlignedPercentage} className="h-2" />
            <p className={`text-xs ${theme.textMuted}`}>
              {impactMetrics.goalAlignedPercentage}% of events align with career goals
            </p>
          </div>

          {/* Networking Impact */}
          {careerProfile.networkingGoals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={theme.textPrimary}>Networking</span>
                <span className={theme.textMuted}>
                  {impactMetrics.networkingCount} / {impactMetrics.totalEvents} events
                </span>
              </div>
              <Progress value={impactMetrics.networkingPercentage} className="h-2" />
              <p className={`text-xs ${theme.textMuted}`}>
                {impactMetrics.networkingPercentage}% of events focused on networking
              </p>
            </div>
          )}
        </div>

        {/* Skill Progress */}
        {skillAnalysis.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Skills in Progress</h4>
            <div className="space-y-2">
              {skillAnalysis.map(skill => (
                <div
                  key={skill.skill}
                  className={`p-3 rounded-lg border ${theme.borderCard}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${theme.textPrimary}`}>
                        {skill.skill}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {skill.progressLevel}
                      </Badge>
                    </div>
                    <span className={`text-xs ${theme.textMuted}`}>
                      {skill.eventsAttended} events
                    </span>
                  </div>
                  <p className={`text-xs ${theme.textMuted}`}>{skill.nextMilestone}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold ${theme.textPrimary}`}>Insights & Recommendations</h4>
            <div className="space-y-2">
              {insights.map((insight, idx) => {
                const Icon = insight.icon;
                const bgColor = insight.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : insight.type === 'warning'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/20';

                const iconColor = insight.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : insight.type === 'warning'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-blue-600 dark:text-blue-400';

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg ${bgColor}`}
                  >
                    <Icon className={`w-4 h-4 ${iconColor} mt-0.5 flex-shrink-0`} />
                    <p className={`text-xs ${theme.textPrimary}`}>{insight.message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
