'use client';

import React, { useMemo, useState } from 'react';
// Glass card design - no longer using shadcn Card component
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { Funnel, Warning } from '@phosphor-icons/react';
import { subDays } from 'date-fns';
import { calculatePredictions } from '@/utils/predictionUtils';
import type { TrackedEventRecord, Event } from '@/types';

interface PersonalFunnelProps {
  trackedEvents: TrackedEventRecord[];
  upcomingEvents: Event[];
  className?: string;
}

export function PersonalFunnel({ trackedEvents, upcomingEvents, className = '' }: PersonalFunnelProps) {
  const [timeframe, setTimeframe] = useState<30 | 90>(30);

  const funnelData = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, timeframe);

    // Filter events within timeframe
    const relevantTracked = trackedEvents.filter(event => {
      const eventDate = new Date(event.trackedAt);
      return eventDate >= startDate;
    });

    // Step 1: Recommended (all upcoming events are "recommended")
    const recommended = upcomingEvents.length;

    // Step 2: Tracked (bookmarked events)
    const tracked = relevantTracked.filter(e => 
      e.status === 'bookmarked' || e.status === 'attending' || e.status === 'attended'
    ).length;

    // Step 3: RSVP (attending)
    const rsvpd = relevantTracked.filter(e => 
      e.status === 'attending' || e.status === 'attended'
    ).length;

    // Step 4: Attended
    const attended = relevantTracked.filter(e => e.status === 'attended').length;

    // Calculate conversion rates
    const recommendToTrack = recommended > 0 ? (tracked / recommended) * 100 : 0;
    const trackToRsvp = tracked > 0 ? (rsvpd / tracked) * 100 : 0;
    const rsvpToAttend = rsvpd > 0 ? (attended / rsvpd) * 100 : 0;
    const overallConversion = recommended > 0 ? (attended / recommended) * 100 : 0;

    // Calculate median time between steps (simplified)
    // In production, track timestamps for each funnel stage
    const medianTrackTime = '2d'; // Simulated
    const medianRsvpTime = '5d';
    const medianAttendTime = '7d';

    return {
      steps: [
        {
          name: 'Recommended',
          count: recommended,
          rate: 100,
          medianTime: null
        },
        {
          name: 'Tracked',
          count: tracked,
          rate: recommendToTrack,
          medianTime: medianTrackTime
        },
        {
          name: 'RSVP',
          count: rsvpd,
          rate: trackToRsvp,
          medianTime: medianRsvpTime
        },
        {
          name: 'Attended',
          count: attended,
          rate: rsvpToAttend,
          medianTime: medianAttendTime
        }
      ],
      overallConversion
    };
  }, [trackedEvents, upcomingEvents, timeframe]);

  // Check if we have enough data
  const hasData = funnelData.steps.some(step => step.count > 0);
  
  // Get risk analysis from predictions
  const { dropOffRisk } = calculatePredictions(trackedEvents, upcomingEvents);

  return (
    <div className={`glass-card glass-glow p-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Funnel className="w-5 h-5 text-glass-secondary" weight="regular" />
            <h3 className="text-base font-medium text-glass-primary">
              Event Conversion Funnel
            </h3>
          </div>
          <p className="text-xs text-glass-tertiary">
            {funnelData.overallConversion.toFixed(1)}% end-to-end conversion
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe(30)}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              timeframe === 30
                ? 'bg-white/10 text-glass-primary'
                : 'bg-white/5 text-glass-tertiary hover:bg-white/8'
            }`}
          >
            30d
          </button>
          <button
            onClick={() => setTimeframe(90)}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
              timeframe === 90
                ? 'bg-white/10 text-glass-primary'
                : 'bg-white/5 text-glass-tertiary hover:bg-white/8'
            }`}
          >
            90d
          </button>
        </div>
      </div>
      <div>
        {/* Sophisticated Empty State */}
        {!hasData ? (
          <div className="py-12">
            <div className="max-w-sm mx-auto text-center">
              <div className="mb-6 inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <Funnel className="w-8 h-8 text-gray-400" weight="duotone" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Start Your Event Journey
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Track events to see how you discover, engage with, and attend tech opportunities.
              </p>
              <div className="space-y-3 text-left bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">1</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Browse recommended events</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Personalized to your career goals</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400">2</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Track interesting opportunities</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bookmark or RSVP to save your spot</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">3</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Attend and grow your career</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Track your conversion and progress here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Bar Chart Funnel - Monochrome Glass */}
        <ChartContainer config={{
          count: { label: 'Events', color: 'rgba(128, 128, 128, 0.7)' }
        }}>
          <BarChart
            data={funnelData.steps}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="name"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 600 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      <div key="content" className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Count:</span>
                          <span className="font-semibold">{data.count}</span>
                        </div>
                        {data.rate < 100 && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Conversion:</span>
                            <span className="font-semibold">{data.rate.toFixed(1)}%</span>
                          </div>
                        )}
                        {data.medianTime && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Median Time:</span>
                            <span className="font-semibold">{data.medianTime}</span>
                          </div>
                        )}
                      </div>,
                      ''
                    ];
                  }}
                />
              }
            />
            <Bar 
              dataKey="count" 
              fill="var(--color-count)"
              radius={[0, 8, 8, 0]}
              label={{ 
                position: 'right',
                formatter: (value: number, entry: { payload: { rate: number } }) => {
                  if (!entry || !entry.payload) return value;
                  const rate = entry.payload.rate;
                  return rate < 100 ? `${value} (${rate.toFixed(0)}%)` : value;
                },
                fill: 'hsl(var(--foreground))',
                fontSize: 12,
                fontWeight: 600
              }}
            />
          </BarChart>
        </ChartContainer>

        {/* Risk Indicator */}
        {dropOffRisk && (
          <div className={`mb-6 p-4 rounded-lg border ${
            dropOffRisk.severity === 'high' 
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
              : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30'
          }`}>
            <div className="flex items-start gap-3">
              <Warning className={`w-5 h-5 ${
                dropOffRisk.severity === 'high' ? 'text-red-600' : 'text-yellow-600'
              }`} weight="duotone" />
              <div>
                <p className={`text-sm font-semibold ${
                  dropOffRisk.severity === 'high' 
                    ? 'text-red-900 dark:text-red-300'
                    : 'text-yellow-900 dark:text-yellow-300'
                }`}>
                  {dropOffRisk.severity === 'high' ? 'High' : 'Medium'} drop-off at {dropOffRisk.stage}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {dropOffRisk.stage === 'RSVP → Attend' 
                    ? 'Add calendar reminders and prep checklists to improve attendance'
                    : 'Review bookmarked events and commit to RSVPs'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Rate Comparison with Benchmarks */}
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Step Conversion Rates
          </h4>
          <ChartContainer config={{
            rate: { label: 'Your Rate', color: 'rgba(128, 128, 128, 0.7)' }
          }}>
            <BarChart
              data={funnelData.steps.filter((_, idx) => idx > 0)}
              margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              height={180}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                domain={[0, 100]}
                label={{ 
                  value: 'Conversion %', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
                }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value, name, props) => {
                      const stepName = props.payload.name;
                      const benchmark = stepName === 'Attended' ? '70-90%' : '50-70%';
                      return [
                        <div key="content" className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Your rate:</span>
                            <span className="font-semibold">{Number(value).toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Benchmark:</span>
                            <span className="font-medium text-gray-500">{benchmark}</span>
                          </div>
                        </div>,
                        ''
                      ];
                    }}
                  />
                }
              />
              {/* Benchmark bands */}
              <ReferenceLine y={70} stroke="hsl(142, 76%, 36%)" strokeDasharray="5 5" strokeOpacity={0.3} />
              <ReferenceLine y={90} stroke="hsl(142, 76%, 36%)" strokeDasharray="5 5" strokeOpacity={0.3} />
              <ReferenceLine y={50} stroke="hsl(48, 96%, 53%)" strokeDasharray="3 3" strokeOpacity={0.3} />
              <Bar 
                dataKey="rate" 
                fill="var(--color-rate)"
                radius={[8, 8, 0, 0]}
                label={{ 
                  position: 'top',
                  formatter: (value: number) => `${value.toFixed(0)}%`,
                  fill: 'hsl(var(--foreground))',
                  fontSize: 12,
                  fontWeight: 600
                }}
              />
            </BarChart>
          </ChartContainer>
          
          {/* Benchmark Legend */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px bg-green-500 opacity-30" style={{ borderTop: '2px dashed' }}></div>
              <span>Target: 70-90%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px bg-yellow-500 opacity-30" style={{ borderTop: '2px dashed' }}></div>
              <span>Baseline: 50%</span>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
