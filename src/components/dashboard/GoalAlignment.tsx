'use client';

import React, { useMemo } from 'react';
// Glass card design - no longer using shadcn Card component
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { GraduationCap, ArrowRight, Sparkle, Target } from '@phosphor-icons/react';
import type { CareerProfile, TrackedEventRecord, Event, CareerGoal } from '@/types';
import { getMatchingGoals, getGoalTarget } from '@/utils/eventGoalAlignment';

interface GoalAlignmentProps {
  careerProfile: CareerProfile | null;
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

const GOAL_LABELS: Partial<Record<CareerGoal, string>> = {
  'skill-development': 'Skill Development',
  'role-transition': 'Role Transition',
  'leadership-growth': 'Leadership Growth',
  'networking': 'Networking'
};

export function GoalAlignment({ careerProfile, trackedEvents, upcomingEvents, className = '' }: GoalAlignmentProps) {
  const alignmentData = useMemo(() => {
    if (!careerProfile || careerProfile.careerGoals.length === 0) {
      return { chartData: [], nudges: [] };
    }

    const chartData = careerProfile.careerGoals.reduce<Array<{
      goal: string;
      timeSpent: number;
      available: number;
      coverage: number;
      isPriority: boolean;
    }>>((acc, goal) => {
      const label = GOAL_LABELS[goal] || goal.replace('-', ' ');

      const timeSpent = trackedEvents.filter(record => {
        if (record.status !== 'attended' || !record.event) return false;
        return getMatchingGoals(record.event, [goal]).includes(goal);
      }).length;

      const available = upcomingEvents.filter(event => {
        return getMatchingGoals(event, [goal]).includes(goal);
      }).length;

      const target = getGoalTarget(goal);
      const coverage = target > 0 ? Math.min((timeSpent / target) * 100, 100) : 0;

      acc.push({
        goal: label,
        timeSpent,
        available,
        coverage,
        isPriority: coverage < 30
      });

      return acc;
    }, []);

    // Generate nudges
    const uncoveredGoal = chartData.find(g => g.coverage < 30 && g.available > 0);
    const strongGoal = chartData.find(g => g.coverage >= 60);

    const nudges = [];
    if (uncoveredGoal) {
      nudges.push({
        type: 'fill-gap',
        icon: Target,
        title: 'Fill an Uncovered Area',
        description: `${uncoveredGoal.available} ${uncoveredGoal.goal} events available`,
        action: 'Explore',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20'
      });
    }
    if (strongGoal) {
      nudges.push({
        type: 'double-down',
        icon: Sparkle,
        title: 'Double Down on Strength',
        description: `Continue with ${strongGoal.goal} (${strongGoal.coverage.toFixed(0)}% coverage)`,
        action: 'View Events',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20'
      });
    }

    return { chartData, nudges };
  }, [careerProfile, trackedEvents, upcomingEvents]);

  if (!careerProfile || alignmentData.chartData.length === 0) {
    return (
      <div className={`glass-card glass-glow p-8 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="w-5 h-5 text-glass-secondary" weight="regular" />
          <h3 className="text-sm font-medium text-glass-primary">
            Goal Alignment
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-glass-secondary">
            Set career goals in your profile to see alignment analytics
          </p>
        </div>
      </div>
    );
  }

  const avgCoverage = alignmentData.chartData.reduce((sum, g) => sum + g.coverage, 0) / alignmentData.chartData.length;

  return (
    <div className={`glass-card glass-glow p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-glass-secondary" weight="regular" />
          <div>
            <h3 className="text-sm font-medium text-glass-primary">
              Career Goals
            </h3>
            <p className="text-xs text-glass-tertiary mt-0.5">
              Progress & alignment
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-white/5 rounded-lg">
          <span className="text-sm font-medium text-glass-primary">
            {avgCoverage.toFixed(0)}%
          </span>
        </div>
      </div>
      <div>
        {/* Alignment Chart - Monochrome */}
        <ChartContainer config={{
          coverage: { label: 'Coverage %', color: 'rgba(128, 128, 128, 0.7)' }
        }}>
          <BarChart
            data={alignmentData.chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
            height={180}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="goal"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              domain={[0, 100]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      <div key="content" className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Coverage:</span>
                          <span className="font-semibold">{Number(value).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Time spent:</span>
                          <span className="font-semibold">{data.timeSpent} events</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Available:</span>
                          <span className="font-semibold text-blue-600">{data.available}</span>
                        </div>
                      </div>,
                      ''
                    ];
                  }}
                />
              }
            />
            <Bar dataKey="coverage" radius={[8, 8, 0, 0]}>
              {alignmentData.chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.isPriority ? 'hsl(14, 90%, 53%)' : 'hsl(142, 76%, 36%)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Contextual Nudges */}
        {alignmentData.nudges.length > 0 && (
          <div className="mt-4 space-y-2">
            {alignmentData.nudges.map((nudge, index) => {
              const Icon = nudge.icon;
              return (
                <button
                  key={index}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 ${nudge.bgColor} rounded-lg`}>
                      <Icon className={`w-3.5 h-3.5 ${nudge.color}`} weight="bold" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {nudge.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {nudge.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <span>{nudge.action}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
