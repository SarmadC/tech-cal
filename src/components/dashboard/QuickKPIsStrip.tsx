'use client';

import React, { useMemo, useState } from 'react';
import { 
  Target, 
  CheckCircle, 
  Clock,
  Star,
  Plus
} from '@phosphor-icons/react';
import { subDays, differenceInDays } from 'date-fns';
import type { TrackedEventRecord, CareerProfile } from '@/types';

interface QuickKPIsStripProps {
  trackedEvents: TrackedEventRecord[];
  careerProfile?: CareerProfile;
  className?: string;
}

// Constants for configuration - single source of truth
const KPI_CONFIG = {
  highImpactThreshold: 7.5,
  highImpactGoal: 8,
  attendRateGoal: 80,
  timeToImpactGoal: 14,
  skillsGoal: 100,
  // Impact scores for different event types
  impactScores: {
    workshop: 8.5,
    conference: 8.0,
    summit: 8.2,
    default: 7.0
  },
  minDataPoints: {
    highImpact: 3,
    attendRate: 5,
    timeToImpact: 3,
    skills: 5
  },
  stateThresholds: {
    onTrackProgress: 100,      // 100% of goal
    watchProgress: 70,          // 70% of goal
    inverseWatchMultiplier: 1.2 // 20% over goal for inverse metrics
  },
  deltaThresholds: {
    percentagePoints: 2,        // 2pp absolute change
    days: 1,                    // 1 day absolute change
    relativePercent: 5          // 5% relative change
  },
  sparklineWeeks: 12
} as const;

export function QuickKPIsStrip({ trackedEvents, careerProfile, className = '' }: QuickKPIsStripProps) {
  const kpis = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    
    // Helper to filter events by date range and status
    const getEventsByDateAndStatus = (
      startDate: Date, 
      endDate?: Date, 
      statuses: string[] = ['attended']
    ) => 
      trackedEvents.filter(event => {
        if (!event.status || !statuses.includes(event.status)) return false;
        const eventDate = new Date(event.trackedAt);
        return endDate 
          ? eventDate >= startDate && eventDate < endDate
          : eventDate >= startDate;
      });
    
    // Convenience aliases
    const getAttendedEvents = (startDate: Date, endDate?: Date) => 
      getEventsByDateAndStatus(startDate, endDate, ['attended']);
    
    const getRsvpdEvents = (startDate: Date, endDate?: Date) =>
      getEventsByDateAndStatus(startDate, endDate, ['attending', 'attended']);
    
    // Filter events by time periods
    const last30DaysEvents = getAttendedEvents(thirtyDaysAgo);
    const last60DaysEvents = getAttendedEvents(sixtyDaysAgo);
    const previous30DaysEvents = getAttendedEvents(sixtyDaysAgo, thirtyDaysAgo);

    // Helper to check if event is high-impact
    const isHighImpact = (event: TrackedEventRecord) => {
      const title = event.event?.title?.toLowerCase() || '';
      const baseImpact = title.includes('workshop') ? KPI_CONFIG.impactScores.workshop : 
                       title.includes('conference') ? KPI_CONFIG.impactScores.conference :
                       title.includes('summit') ? KPI_CONFIG.impactScores.summit : 
                       KPI_CONFIG.impactScores.default;
      return baseImpact >= KPI_CONFIG.highImpactThreshold;
    };

    // 1. HIGH-IMPACT ATTENDANCES PER MONTH (North Star candidate)
    const highImpactAttendances = last30DaysEvents.filter(isHighImpact).length;
    const prevHighImpactAttendances = previous30DaysEvents.filter(isHighImpact).length;
    const highImpactDelta = prevHighImpactAttendances > 0 
      ? Math.round(((highImpactAttendances - prevHighImpactAttendances) / prevHighImpactAttendances) * 100)
      : highImpactAttendances > 0 ? 100 : 0;
    const highImpactGoal = KPI_CONFIG.highImpactGoal;
    
    // Find top driver for high-impact events
    const eventTypes = last30DaysEvents.filter(isHighImpact).reduce((acc, event) => {
      const title = event.event?.title?.toLowerCase() || '';
      const type = title.includes('workshop') ? 'workshops' :
                   title.includes('conference') ? 'conferences' :
                   title.includes('summit') ? 'summits' : 'events';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topDriver = Object.entries(eventTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'events';

    // 2. RSVP → ATTEND RATE
    const rsvpdEventsLast30 = getRsvpdEvents(thirtyDaysAgo);
    const attendedLast30 = rsvpdEventsLast30.filter(e => e.status === 'attended').length;
    
    const rsvpdEventsPrev30 = getRsvpdEvents(sixtyDaysAgo, thirtyDaysAgo);
    const attendedPrev30 = rsvpdEventsPrev30.filter(e => e.status === 'attended').length;
    
    const attendRate = rsvpdEventsLast30.length > 0
      ? Math.round((attendedLast30 / rsvpdEventsLast30.length) * 100)
      : 0;
    const prevAttendRate = rsvpdEventsPrev30.length > 0
      ? Math.round((attendedPrev30 / rsvpdEventsPrev30.length) * 100)
      : 0;
    const attendRateDelta = attendRate - prevAttendRate;
    const attendRateGoal = KPI_CONFIG.attendRateGoal;

    // 3. TIME-TO-IMPACT (median days from RSVP to high-impact event attendance)
    const impactTimes: number[] = [];
    last30DaysEvents.filter(isHighImpact).forEach(event => {
      if (event.event?.startTime && event.trackedAt) {
        const rsvpDate = new Date(event.trackedAt);
        const eventDate = new Date(event.event.startTime);
        const daysDiff = differenceInDays(eventDate, rsvpDate);
        // Only include positive values (RSVP'd before event)
        if (daysDiff >= 0) {
          impactTimes.push(daysDiff);
        }
      }
    });
    
    const timeToImpact = impactTimes.length > 0
      ? Math.round(impactTimes.reduce((a, b) => a + b, 0) / impactTimes.length)
      : 0;
    const timeToImpactGoal = KPI_CONFIG.timeToImpactGoal;
    // Create a copy before sorting to avoid mutating original array
    const timeToImpactP80 = impactTimes.length > 0
      ? [...impactTimes].sort((a, b) => a - b)[Math.floor(impactTimes.length * 0.8)]
      : 0;


    // 5. SKILLS COVERAGE (if career profile available)
    let skillsCoverage = 0;
    let missingSkillsCount = 0;
    if (careerProfile && careerProfile.skillsToLearn.length > 0) {
      const skillsHit = new Set<string>();
      last60DaysEvents.forEach(event => {
        careerProfile.skillsToLearn.forEach(skill => {
          if (event.event?.title?.toLowerCase().includes(skill.toLowerCase())) {
            skillsHit.add(skill);
          }
        });
      });
      skillsCoverage = Math.round((skillsHit.size / careerProfile.skillsToLearn.length) * 100);
      missingSkillsCount = careerProfile.skillsToLearn.length - skillsHit.size;
    }
    const skillsGoal = KPI_CONFIG.skillsGoal;

    // Helper to calculate week boundaries
    const getWeekBounds = (weekIndex: number) => {
      const weeks = KPI_CONFIG.sparklineWeeks;
      return {
        start: subDays(now, (weeks - 1 - weekIndex + 1) * 7),
        end: subDays(now, (weeks - 1 - weekIndex) * 7)
      };
    };
    
    // Generate sparklines for last N weeks (configurable)
    const generateWeeklySparkline = (filterFn: (event: TrackedEventRecord) => boolean) => {
      return Array.from({ length: KPI_CONFIG.sparklineWeeks }, (_, i) => {
        const { start, end } = getWeekBounds(i);
        return getAttendedEvents(start, end).filter(filterFn).length;
      });
    };

    return {
      // Core metrics
      highImpactAttendances,
      highImpactDelta,
      highImpactGoal,
      topDriver,
      attendRate,
      attendRateDelta,
      attendRateGoal,
      timeToImpact,
      timeToImpactGoal,
      timeToImpactP80,
      skillsCoverage,
      missingSkillsCount,
      skillsGoal,
      // Sparklines (N-week trends)
      highImpactSparkline: generateWeeklySparkline(isHighImpact),
      attendRateSparkline: Array.from({ length: KPI_CONFIG.sparklineWeeks }, (_, i) => {
        const { start, end } = getWeekBounds(i);
        const weekRsvps = getRsvpdEvents(start, end);
        const weekAttended = weekRsvps.filter(e => e.status === 'attended').length;
        return weekRsvps.length > 0 ? (weekAttended / weekRsvps.length) * 100 : 0;
      }),
      timeToImpactSparkline: generateWeeklySparkline(isHighImpact),
      skillsSparkline: careerProfile ? Array.from({ length: KPI_CONFIG.sparklineWeeks }, (_, i) => {
        const { start, end } = getWeekBounds(i);
        const weekEvents = getAttendedEvents(start, end);
        
        const skillsHit = new Set<string>();
        weekEvents.forEach(event => {
          careerProfile.skillsToLearn.forEach(skill => {
            if (event.event?.title?.toLowerCase().includes(skill.toLowerCase())) {
              skillsHit.add(skill);
            }
          });
        });
        return careerProfile.skillsToLearn.length > 0
          ? (skillsHit.size / careerProfile.skillsToLearn.length) * 100
          : 0;
      }) : []
    };
  }, [trackedEvents, careerProfile]);

  // Helper to determine metric state (uses centralized thresholds)
  const getMetricState = (value: number, goal: number, inverse = false, hasEnoughData = false) => {
    // For zero values, show "establishing baseline" if not enough data
    if (value === 0) {
      return hasEnoughData ? 'at-risk' : 'establishing';
    }
    
    const progress = (value / goal) * 100;
    if (inverse) {
      // For metrics where lower is better (e.g., time-to-impact)
      if (value <= goal) return 'on-track';
      if (value <= goal * KPI_CONFIG.stateThresholds.inverseWatchMultiplier) return 'watch';
      return 'at-risk';
    }
    // For metrics where higher is better
    if (progress >= KPI_CONFIG.stateThresholds.onTrackProgress) return 'on-track';
    if (progress >= KPI_CONFIG.stateThresholds.watchProgress) return 'watch';
    return 'at-risk';
  };

  const getDeltaFormatted = (delta: number, unit: string = '%', inverse = false, baseValue: number = 0) => {
    // Gate color behind statistical significance (uses centralized thresholds)
    const absoluteThreshold = unit === 'pp' 
      ? KPI_CONFIG.deltaThresholds.percentagePoints 
      : unit === 'd' 
      ? KPI_CONFIG.deltaThresholds.days 
      : 1;
    const relativeThreshold = baseValue > 0 ? Math.abs((delta / baseValue) * 100) : 0;
    
    const isSignificant = Math.abs(delta) >= absoluteThreshold || relativeThreshold >= KPI_CONFIG.deltaThresholds.relativePercent;
    
    // Format time-based deltas with "faster/slower" semantics
    if (unit === 'd' && isSignificant) {
      const isFaster = inverse ? delta > 0 : delta < 0;
      const color = isFaster ? 'text-emerald-400' : 'text-red-400';
      const label = isFaster ? 'faster' : 'slower';
      return { text: `${Math.abs(delta)}d ${label} vs 4 wks`, color, significant: true };
    }
    
    if (delta === 0 || !isSignificant) {
      return { text: `${delta >= 0 ? '+' : ''}${delta}${unit} vs 4 wks`, color: 'text-white/40', significant: false };
    }
    
    const sign = delta > 0 ? '+' : '';
    const color = inverse 
      ? (delta < 0 ? 'text-emerald-400' : 'text-red-400')
      : (delta > 0 ? 'text-emerald-400' : 'text-red-400');
    return { text: `${sign}${delta}${unit} vs 4 wks`, color, significant: true };
  };

  const kpiCards: Array<{
    id: string;
    label: string;
    period: string;
    value: number;
    unit: string;
    goal: number;
    goalLabel: string;
    aggregation: string;
    delta: { text: string; color: string; significant: boolean } | null;
    sparklineData: number[];
    state: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    metadata: {
      primary: { label: string; value: string } | null;
      subtitle: string;
    };
    emptyState: {
      message: string;
      action: string;
      checklistLink: string;
    };
  }> = [
    {
      id: 'high-impact',
      label: 'High-Impact',
      period: 'per month',
      value: kpis.highImpactAttendances,
      unit: '/mo',
      goal: kpis.highImpactGoal,
      goalLabel: `${KPI_CONFIG.highImpactGoal}/mo`,
      aggregation: 'count',
      delta: getDeltaFormatted(kpis.highImpactDelta, '', false, kpis.highImpactAttendances),
      sparklineData: kpis.highImpactSparkline,
      state: getMetricState(kpis.highImpactAttendances, kpis.highImpactGoal, false, trackedEvents.length >= KPI_CONFIG.minDataPoints.highImpact),
      icon: Star,
      metadata: {
        primary: { label: 'Top', value: kpis.topDriver },
        subtitle: 'North Star metric'
      },
      emptyState: {
        message: 'No high-impact events yet',
        action: 'Track your first workshop',
        checklistLink: 'Find workshops & conferences'
      }
    },
    {
      id: 'attend-rate',
      label: 'Attend Rate',
      period: 'last 30 days',
      value: kpis.attendRate,
      unit: '%',
      goal: kpis.attendRateGoal,
      goalLabel: `${KPI_CONFIG.attendRateGoal}%`,
      aggregation: 'percentage',
      delta: getDeltaFormatted(kpis.attendRateDelta, 'pp', false, kpis.attendRate),
      sparklineData: kpis.attendRateSparkline,
      state: getMetricState(kpis.attendRate, kpis.attendRateGoal, false, trackedEvents.length >= KPI_CONFIG.minDataPoints.attendRate),
      icon: CheckCircle,
      metadata: {
        primary: null,
        subtitle: 'RSVP→Attend conversion'
      },
      emptyState: {
        message: 'No RSVPs tracked yet',
        action: 'RSVP to your first event',
        checklistLink: 'Connect RSVPs'
      }
    },
    {
      id: 'time-to-impact',
      label: 'Time-to-Impact',
      period: 'median days',
      value: kpis.timeToImpact,
      unit: 'd',
      goal: kpis.timeToImpactGoal,
      goalLabel: `${KPI_CONFIG.timeToImpactGoal}d`,
      aggregation: 'median',
      delta: null,
      sparklineData: kpis.timeToImpactSparkline,
      state: getMetricState(kpis.timeToImpact, kpis.timeToImpactGoal, true, trackedEvents.length >= KPI_CONFIG.minDataPoints.timeToImpact),
      icon: Clock,
      metadata: {
        primary: kpis.timeToImpactP80 > 0 ? { label: 'P80', value: `${kpis.timeToImpactP80}d` } : null,
        subtitle: 'RSVP to high-impact attend'
      },
      emptyState: {
        message: 'Building impact baseline',
        action: 'Attend more events',
        checklistLink: 'Track attendance'
      }
    },
  ];

  // Add Skills Progress if career profile is available
  if (careerProfile && careerProfile.skillsToLearn.length > 0) {
    kpiCards.push({
      id: 'skills-progress',
      label: 'Skills Progress',
      period: 'last 60 days',
      value: kpis.skillsCoverage,
      unit: '%',
      goal: kpis.skillsGoal,
      goalLabel: `${KPI_CONFIG.skillsGoal}%`,
      aggregation: 'coverage',
      delta: null,
      sparklineData: kpis.skillsSparkline,
      state: getMetricState(kpis.skillsCoverage, kpis.skillsGoal, false, trackedEvents.length >= KPI_CONFIG.minDataPoints.skills),
      icon: Target,
      metadata: {
        primary: kpis.missingSkillsCount > 0 ? { label: 'Skills left', value: `${kpis.missingSkillsCount}` } : null,
        subtitle: 'Target skills covered'
      },
      emptyState: {
        message: 'No skills tracked yet',
        action: 'Set target skills',
        checklistLink: 'Define career goals'
      }
    });
  }

  // Lightweight SVG sparkline component
  const SparklineSVG = React.memo(({ 
    data, 
    goal, 
    goalLabel,
    height = 32 
  }: { 
    data: number[]; 
    goal?: number; 
    goalLabel?: string;
    height?: number;
  }) => {
    if (data.length === 0) {
      // Placeholder sparkline for "no data yet" state
      return (
        <svg viewBox="0 0 100 100" className="w-full" style={{ height: `${height}px` }} preserveAspectRatio="none">
          <line
            x1="0"
            y1="50"
            x2="100"
            y2="50"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4,4"
            className="text-white/10"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[8px] fill-white/30"
          >
            No data
          </text>
        </svg>
      );
    }
    
    const max = Math.max(...data, goal || 0, 1);
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 100 - ((val / max) * 100);
      return `${x},${y}`;
    }).join(' ');
    
    const goalY = goal && goal > 0 ? 100 - ((goal / max) * 100) : null;
    
    return (
      <svg viewBox="0 0 100 100" className="w-full" style={{ height: `${height}px` }} preserveAspectRatio="none">
        {/* Goal line with label */}
        {goalY !== null && (
          <g>
            <line
              x1="0"
              y1={goalY}
              x2="100"
              y2={goalY}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              className="text-white/20"
            />
            {goalLabel && (
              <text
                x="98"
                y={goalY - 2}
                textAnchor="end"
                className="text-[6px] fill-white/40 font-medium"
                style={{ userSelect: 'none' }}
              >
                {goalLabel}
              </text>
            )}
          </g>
        )}
        {/* Sparkline path */}
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/60"
        />
        {/* Area fill */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill="currentColor"
          className="text-white/10"
        />
      </svg>
    );
  });
  SparklineSVG.displayName = 'SparklineSVG';

  // State badge component with enhanced contrast for glass backgrounds
  const StateBadge = ({ state }: { state: string }) => {
    const config = {
      // Enhanced contrast: darker backgrounds, brighter text for AA compliance
      'on-track': { label: 'On Track', color: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-400/30' },
      'watch': { label: 'Watch', color: 'text-amber-300', bg: 'bg-amber-500/20', border: 'border-amber-400/30' },
      'at-risk': { label: 'At Risk', color: 'text-red-300', bg: 'bg-red-500/20', border: 'border-red-400/30' },
      'establishing': { label: 'Establishing', color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-400/30' }
    }[state] || { label: 'Unknown', color: 'text-gray-300', bg: 'bg-gray-500/20', border: 'border-gray-400/30' };
    
    return (
      <span 
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border min-w-[80px] text-center ${config.bg} ${config.color} ${config.border}`}
        role="status"
        aria-label={`Status: ${config.label}`}
      >
        <span className={`w-1 h-1 rounded-full ${config.color.replace('text-', 'bg-')}`} />
        {config.label}
      </span>
    );
  };

  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);
  const [popoverRendered, setPopoverRendered] = useState<Set<string>>(new Set());

  // Generate aria-live summary for value changes
  const getAriaLiveSummary = (kpi: typeof kpiCards[0]) => {
    const deltaText = kpi.delta 
      ? `${kpi.delta.text.includes('+') ? 'up' : 'down'} ${Math.abs(parseInt(kpi.delta.text))} ${kpi.unit === '%' ? 'percent' : kpi.unit} versus 4 weeks`
      : 'no change';
    return `${kpi.label} ${kpi.value} ${kpi.unit}, ${deltaText}, ${kpi.state.replace('-', ' ')}`;
  };

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        // More intelligent empty state detection
        const isEmpty = kpi.value === 0 && trackedEvents.length === 0;
        
        return (
          <div
            key={kpi.id}
            className="relative glass-card p-4 hover:bg-white/5 transition-all focus-within:ring-2 focus-within:ring-white/20 group"
            style={{ minHeight: '172px' }}
            tabIndex={0}
            role="article"
            aria-label={getAriaLiveSummary(kpi)}
            aria-live="polite"
            onMouseEnter={() => {
              setHoveredKpi(kpi.id);
              // Mark popover as rendered on first hover (lazy load)
              if (!popoverRendered.has(kpi.id)) {
                setPopoverRendered(prev => new Set(prev).add(kpi.id));
              }
            }}
            onMouseLeave={() => setHoveredKpi(null)}
          >
            {isEmpty ? (
              /* Empty State */
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  <div className="p-3 rounded-xl bg-white/5 mb-3">
                    <Icon className="w-6 h-6 text-white/40" weight="regular" />
                  </div>
                  <p className="text-xs font-medium text-white/60 mb-1">{kpi.emptyState.message}</p>
                  <button className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white/80 transition-all focus:outline-none focus:ring-2 focus:ring-white/20">
                    <Plus className="w-3 h-3" />
                    {kpi.emptyState.action}
                  </button>
                </div>
                
                {/* Onboarding checklist link in footer - contextual per KPI */}
                <div className="mt-auto pt-2 border-t border-white/10">
                  <button 
                    className="w-full text-[10px] text-white/50 hover:text-white/70 transition-colors text-left px-2 py-1 rounded hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20"
                    aria-label={`Setup: ${kpi.emptyState.checklistLink}`}
                  >
                    → {kpi.emptyState.checklistLink}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Icon - Further reduced emphasis */}
                <div className="absolute top-3 right-3 opacity-25 group-hover:opacity-40 transition-opacity">
                  <Icon className="w-3.5 h-3.5 text-white/50" weight="regular" />
                </div>

                {/* Main Content - Left-aligned with shared baseline */}
                <div className="mb-2.5">
                  {/* Value and Unit - Aligned baseline with graceful truncation */}
                  <div className="flex items-baseline gap-1.5 mb-1.5 overflow-hidden" style={{ lineHeight: '32px' }}>
                    <span 
                      className="text-[32px] leading-none font-semibold text-white/95 tabular-nums truncate"
                      title={`${kpi.value.toLocaleString()}${kpi.unit}`}
                    >
                      {/* Format very small values to prevent misleading zeros */}
                      {kpi.value === 0 && trackedEvents.length > 0 
                        ? '0'
                        : kpi.value < 1 && kpi.value > 0
                        ? `<1`
                        : kpi.value.toLocaleString()
                      }
                    </span>
                    {kpi.unit && (
                      <span className="text-sm font-normal text-white/50 flex-shrink-0">{kpi.unit}</span>
                    )}
                  </div>

                  {/* Label with aggregation method and Period */}
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-white/70">
                      {kpi.label}
                      {kpi.aggregation && kpi.aggregation !== 'count' && (
                        <span className="ml-1 text-white/40 font-normal">({kpi.aggregation})</span>
                      )}
                    </p>
                    <p className="text-[11px] text-white/50">{kpi.period}</p>
              </div>
            </div>

                {/* Thin Divider */}
                <div className="h-px bg-white/10 my-3" />

                {/* Delta and State */}
                <div className="flex items-center justify-between mb-3">
                  {kpi.delta ? (
                    <span className={`text-xs font-medium ${kpi.delta.color}`}>
                      {kpi.delta.text}
                    </span>
                  ) : (
                    <span className="text-xs text-white/40">—</span>
                  )}
                  <StateBadge state={kpi.state} />
                </div>

                {/* Sparkline with Goal Line */}
                <div className="mt-2.5">
                  <SparklineSVG 
                    data={kpi.sparklineData} 
                    goal={kpi.goal} 
                    goalLabel={kpi.goalLabel}
                    height={36} 
                  />
                </div>

                {/* Metadata Footer - Single high-value item */}
                <div className="mt-2.5 flex items-center gap-2 text-[10px] text-white/50">
                  {kpi.metadata.primary && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 min-w-[60px] text-center">
                      {kpi.metadata.primary.label}: {kpi.metadata.primary.value}
                    </span>
                  )}
                </div>

                {/* "Why this moved" popover on hover - respects prefers-reduced-motion */}
                {/* Deferred render: only render popover content after first hover */}
                {hoveredKpi === kpi.id && popoverRendered.has(kpi.id) && (
                  <div 
                    className="absolute bottom-full left-0 mb-2 w-full p-3 bg-black/95 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg z-50 pointer-events-none motion-reduce:transition-none"
                    role="tooltip"
                  >
                    <p className="text-[10px] font-semibold text-white/95 mb-2">Why this moved</p>
                    <div className="space-y-1.5 text-[10px] text-white/70">
                      <div className="flex justify-between">
                        <span>Aggregation:</span>
                        <span className="text-white/90 font-medium">{kpi.aggregation || 'count'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time window:</span>
                        <span className="text-white/90 font-medium">Last {KPI_CONFIG.sparklineWeeks} weeks</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target goal:</span>
                        <span className="text-white/90 font-medium">{kpi.goalLabel || `${kpi.goal}${kpi.unit}`}</span>
                      </div>
                      {kpi.delta && kpi.delta.significant && (
                        <div className="flex justify-between pt-1 border-t border-white/10">
                          <span>Change:</span>
                          <span className={`font-medium ${kpi.delta.color}`}>
                            {kpi.delta.text}
                          </span>
                        </div>
                      )}
                      {kpi.metadata.subtitle && (
                        <p className="mt-1.5 pt-1.5 border-t border-white/10 text-white/60 italic">
                          {kpi.metadata.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

