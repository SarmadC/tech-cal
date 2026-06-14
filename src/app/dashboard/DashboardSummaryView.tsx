'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { MobileDashboardSummary } from '@kurecal/domain';

import AppSidebar from '@/components/app-sidebar';
import CareerProfilePrompt from '@/components/calendar/mobile/CareerProfilePrompt';
import { PageErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { usePastEventAttendancePrompt } from '@/hooks/usePastEventAttendancePrompt';

const PastEventAttendancePrompt = dynamic(
  () => import('@/components/dashboard/PastEventAttendancePrompt'),
  { ssr: false }
);

function SummaryCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-normal text-zinc-500 dark:text-zinc-400">
      {title}
    </h2>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>;
}

export default function DashboardSummaryView({
  summary,
}: {
  summary: MobileDashboardSummary;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const { hasCompletedOnboarding } = useCareerProfile();
  const {
    pendingEvents,
    snoozeEvent,
    markAttended,
    markNotAttended,
    hasPendingPrompts,
  } = usePastEventAttendancePrompt();

  const pulse = summary.networkPulse;

  return (
    <SidebarProvider>
      <div className="responsive-page-shell flex min-h-[100dvh] overflow-x-clip bg-zinc-50 text-zinc-950 dark:bg-[#0A0A0A] dark:text-white">
        <AppSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <PageErrorBoundary name="Dashboard">
              <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
                <DashboardHeader profile={profile} />

                {profile && !hasCompletedOnboarding ? (
                  <CareerProfilePrompt profile={profile} />
                ) : null}

                <SummaryCard className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm font-semibold text-zinc-300 dark:text-zinc-600">
                        {summary.hero.eyebrow}
                      </p>
                      <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
                        {summary.hero.title}
                      </h1>
                      <p className="mt-3 text-sm leading-6 text-zinc-300 dark:text-zinc-700 sm:text-base">
                        {summary.hero.subtitle}
                      </p>
                    </div>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 dark:bg-zinc-950 dark:text-white dark:hover:bg-zinc-800"
                      onClick={() => router.refresh()}
                      type="button"
                    >
                      Refresh
                    </button>
                  </div>
                </SummaryCard>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {summary.metrics.map((metric) => (
                    <SummaryCard key={metric.id}>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {metric.label}
                      </p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums">
                        {metric.value}
                      </p>
                      {metric.detail ? (
                        <p className="mt-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                          {metric.detail}
                        </p>
                      ) : null}
                    </SummaryCard>
                  ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
                  <div className="flex flex-col gap-5">
                    <SummaryCard>
                      <SectionTitle title={summary.recommendationsLabel} />
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {summary.recommendations.slice(0, 4).map((event) => (
                          <a
                            className="rounded-md border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-white/10 dark:hover:border-white/25"
                            href={`/event/${event.id}`}
                            key={event.id}
                          >
                            <p className="font-semibold">{event.title}</p>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                              {new Date(event.startTime).toLocaleString()}
                            </p>
                            {typeof event.score === 'number' ? (
                              <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                Fit {Math.round(event.score)}
                              </p>
                            ) : null}
                          </a>
                        ))}
                      </div>
                    </SummaryCard>

                    <SummaryCard>
                      <SectionTitle title="Attention queue" />
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {summary.topRecommendation ? (
                          <div className="rounded-md bg-zinc-100 p-4 dark:bg-white/5">
                            <p className="font-semibold">
                              {summary.topRecommendation.event.title}
                            </p>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                              Top fit in {summary.topRecommendation.daysUntil} days
                            </p>
                          </div>
                        ) : null}
                        {summary.careerOutcomes?.nextEventToRate ? (
                          <div className="rounded-md bg-zinc-100 p-4 dark:bg-white/5">
                            <p className="font-semibold">
                              Rate {summary.careerOutcomes.nextEventToRate.title}
                            </p>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                              Keep prediction quality calibrated.
                            </p>
                          </div>
                        ) : null}
                        {summary.showOpenCommitmentSlot ? (
                          <div className="rounded-md bg-zinc-100 p-4 dark:bg-white/5">
                            <p className="font-semibold">Open commitment slot</p>
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                              Pick one more event to keep momentum.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </SummaryCard>
                  </div>

                  <div className="flex flex-col gap-5">
                    <SummaryCard>
                      <SectionTitle title="Follow through" />
                      <div className="mt-4 space-y-3">
                        {summary.upcoming.length > 0 ? (
                          summary.upcoming.slice(0, 3).map((event) => (
                            <a
                              className="block rounded-md border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-white/10 dark:hover:border-white/25"
                              href={`/event/${event.id}`}
                              key={event.id}
                            >
                              <p className="font-semibold">{event.title}</p>
                              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {new Date(event.startTime).toLocaleString()}
                              </p>
                            </a>
                          ))
                        ) : (
                          <EmptyLine>No upcoming commitments yet.</EmptyLine>
                        )}
                      </div>
                    </SummaryCard>

                    {pulse ? (
                      <SummaryCard>
                        <SectionTitle title="Network pulse" />
                        <p className="mt-4 text-3xl font-semibold tabular-nums">
                          {pulse.confirmedConnectionCount}
                        </p>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                          Confirmed connections, with {pulse.pendingRequestCount}{' '}
                          pending follow-ups.
                        </p>
                      </SummaryCard>
                    ) : null}

                  </div>
                </div>
              </div>
            </PageErrorBoundary>
          </div>
        </main>
        {hasPendingPrompts ? (
          <PastEventAttendancePrompt
            pendingEvents={pendingEvents}
            onAttended={markAttended}
            onNotAttended={markNotAttended}
            onSnooze={snoozeEvent}
          />
        ) : null}
      </div>
    </SidebarProvider>
  );
}
