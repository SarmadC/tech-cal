'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { Target, TrendUp, Clock, Calendar } from '@phosphor-icons/react';
import type { CareerProfile, TrackedEventRecord, Event } from '@/types';
import { SENIORITY_LEVELS, COMPANY_SIZE_OPTIONS } from '@/types/career';

interface CareerProgressHeroProps {
  careerProfile: CareerProfile;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
}

export function CareerProgressHero({
  careerProfile,
  trackedEvents,
  upcomingEvents
}: CareerProgressHeroProps) {
  const _theme = useTimelineTheme();

  // Calculate career progress metrics
  const metrics = useMemo(() => {
    // Only count ATTENDED events, not just tracked/bookmarked
    const attendedEvents = trackedEvents.filter(e => e.status === 'attended');
    const totalAttended = attendedEvents.length;

    const skillsLearned = careerProfile.primarySkills.length;
    const skillsToLearn = careerProfile.skillsToLearn.length;
    const skillProgress = skillsToLearn > 0
      ? Math.round((skillsLearned / (skillsLearned + skillsToLearn)) * 100)
      : 100;

    // Calculate goal progress based on timeframe
    const timeframeMap = {
      'immediate': 6,
      'short-term': 18,
      'medium-term': 36,
      'long-term': 60
    };
    const monthsToGoal = timeframeMap[careerProfile.timeframe];

    // Simple progress calculation: events ATTENDED / (estimated events needed)
    const estimatedEventsNeeded = monthsToGoal * 2; // Assume 2 events per month
    const goalProgress = Math.min(Math.round((totalAttended / estimatedEventsNeeded) * 100), 100);

    return {
      totalAttended,
      skillsLearned,
      skillsToLearn,
      skillProgress,
      goalProgress,
      monthsToGoal,
      upcomingCount: upcomingEvents.length
    };
  }, [careerProfile, trackedEvents, upcomingEvents]);

  // Get seniority label
  const seniorityLabel = SENIORITY_LEVELS.find(s => s.value === careerProfile.seniority)?.label || careerProfile.seniority;
  const companySizeLabel = COMPANY_SIZE_OPTIONS.find(c => c.value === careerProfile.companySize)?.label || careerProfile.companySize;

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-900/50 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Your Career Journey
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium px-3 py-1">
                {careerProfile.currentRole}
              </Badge>
              <Badge variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                {seniorityLabel}
              </Badge>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                • {careerProfile.industry}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                • {companySizeLabel}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Goal Progress */}
          <div className="p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Goal Progress</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.goalProgress}%</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">complete</span>
              </div>
              <Progress value={metrics.goalProgress} className="h-2 bg-gray-100 dark:bg-gray-700" />
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {metrics.totalAttended} events attended toward your {careerProfile.timeframe.replace('-', ' ')} goals
              </p>
            </div>
          </div>

          {/* Skills Development */}
          <div className="p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <TrendUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Skills Progress</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.skillsLearned}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">/ {metrics.skillsLearned + metrics.skillsToLearn}</span>
              </div>
              <Progress value={metrics.skillProgress} className="h-2 bg-gray-100 dark:bg-gray-700" />
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {metrics.skillsToLearn} skills remaining to learn
              </p>
            </div>
          </div>

          {/* Time to Goal */}
          <div className="p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Time to Goal</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.monthsToGoal}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">months</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
                {careerProfile.timeframe.replace('-', ' ')} timeframe ({new Date(new Date().setMonth(new Date().getMonth() + metrics.monthsToGoal)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
              </p>
            </div>
          </div>

          {/* Upcoming Opportunities */}
          <div className="p-5 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Opportunities</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics.upcomingCount}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">events</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mt-2">
                Upcoming events aligned with your career goals
              </p>
            </div>
          </div>
        </div>

        {/* Active Goals */}
        {careerProfile.careerGoals.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Active Career Goals</h4>
            <div className="flex flex-wrap gap-2">
              {careerProfile.careerGoals.map((goal) => (
                <Badge key={goal} variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                  {goal.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
