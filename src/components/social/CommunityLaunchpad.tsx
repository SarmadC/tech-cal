'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle, Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import UserCard from '@/components/social/UserCard';
import type { CommunityLaunchpadData, CommunityLaunchpadTask } from '@/types/community';
import { sendTelemetryEvent } from '@/utils/telemetryClient';
import { useSnackbar } from '@/contexts/SnackbarContext';

function formatCompactCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatEventDate(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'Date TBD';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

interface CommunityLaunchpadProps {
  data: CommunityLaunchpadData;
}

const PROFILE_SETTINGS_HREF = '/dashboard/settings?tab=profile';

export default function CommunityLaunchpad({ data }: CommunityLaunchpadProps) {
  const { showSuccess, showError } = useSnackbar();
  const [isCopyingInvite, setIsCopyingInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const profileCompletionFinishedSent = useRef(false);
  const orderedTasks = useMemo(() => {
    return [...data.progress.tasks].sort((left, right) => {
      if (left.completed === right.completed) {
        return left.weight - right.weight;
      }
      return left.completed ? 1 : -1;
    });
  }, [data.progress.tasks]);
  const nextTask = useMemo(
    () => orderedTasks.find((task) => !task.completed) ?? null,
    [orderedTasks]
  );

  const trackAction = (action: string, metadata?: Record<string, unknown>) => {
    void sendTelemetryEvent({
      eventType: 'community_launchpad_action_click',
      context: {
        surface: 'community_launchpad',
        action,
      },
      metadata,
    });
  };

  useEffect(() => {
    void sendTelemetryEvent({
      eventType: 'community_launchpad_viewed',
      context: {
        surface: 'community_page',
      },
      metadata: {
        publicProfileCount: data.metrics.publicProfileCount,
        weeklyActiveCommunityUsers: data.metrics.weeklyActiveCommunityUsers,
      },
    });
  }, [data.metrics.publicProfileCount, data.metrics.weeklyActiveCommunityUsers]);

  useEffect(() => {
    if (data.progress.completionPercent < 100 || profileCompletionFinishedSent.current) {
      return;
    }

    profileCompletionFinishedSent.current = true;
    void sendTelemetryEvent({
      eventType: 'profile_completion_finished',
      context: {
        surface: 'community_launchpad',
      },
      metadata: {
        completionPercent: data.progress.completionPercent,
      },
    });
  }, [data.progress.completionPercent]);

  const handleTaskClick = (task: CommunityLaunchpadTask) => {
    if (task.completed) {
      return;
    }

    trackAction('profile_task_click', {
      taskId: task.id,
      completionPercent: data.progress.completionPercent,
    });

    void sendTelemetryEvent({
      eventType: task.telemetryEvent,
      context: {
        surface: 'community_launchpad',
        taskId: task.id,
      },
      metadata: {
        completionPercent: data.progress.completionPercent,
      },
    });
  };

  const handleCircleClick = (circleId: string) => {
    trackAction('circle_click', { circleId });
    void sendTelemetryEvent({
      eventType: 'circle_joined',
      context: {
        surface: 'community_launchpad',
      },
      metadata: {
        circleId,
      },
    });
  };

  const handleCopyInvite = async () => {
    let inviteMethod: 'share_sheet' | 'clipboard' = 'share_sheet';

    try {
      setIsCopyingInvite(true);

      const inviteUrl = `${window.location.origin}/signup?ref=community`;

      try {
        await navigator.share({
          title: 'Join me on Kure-Cal',
          text: 'Build your orbit with me on Kure-Cal.',
          url: inviteUrl,
        });
        showSuccess('Invite ready to send.');
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') {
          return;
        }

        inviteMethod = 'clipboard';
        await navigator.clipboard.writeText(inviteUrl);
        showSuccess('Invite link copied.');
      }

      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
      void sendTelemetryEvent({
        eventType: 'invite_link_copied',
        context: {
          surface: 'community_launchpad',
        },
        metadata: {
          inviteTarget: data.inviteTarget,
          method: inviteMethod,
        },
      });
    } catch (_error) {
      showError('Could not copy invite link.');
    } finally {
      setIsCopyingInvite(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--foreground-tertiary)]">Community</p>
          <h1 className="text-2xl font-semibold text-[var(--foreground-primary)] sm:text-3xl">Build your orbit</h1>
          <p className="max-w-2xl text-sm text-[var(--foreground-secondary)]">
            Community is just getting started. You’re early. Complete your profile, join a circle, and help shape the
            network.
          </p>
          <p className="text-xs text-[var(--foreground-tertiary)]">
            Early access: {formatCompactCount(data.metrics.publicProfileCount)} public profiles and{' '}
            {formatCompactCount(data.metrics.weeklyActiveCommunityUsers)} active users in the last 7 days.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 sm:items-center">
          <Button
            asChild
            size="sm"
            onClick={() => {
              if (nextTask) {
                handleTaskClick(nextTask);
              } else {
                trackAction('profile_complete_review');
              }
            }}
          >
            <Link href={nextTask?.ctaHref || PROFILE_SETTINGS_HREF}>
              {nextTask ? nextTask.ctaLabel : 'Profile complete'}
              <ArrowRight size={14} />
            </Link>
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleCopyInvite} disabled={isCopyingInvite}>
            {inviteCopied ? 'Invite link copied' : 'Invite peers'}
          </Button>
          <p className="text-xs text-[var(--foreground-tertiary)] sm:ml-1">
            {nextTask ? `Next best step: ${nextTask.title}` : 'All launch tasks completed'}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">Public Profiles</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground-primary)]">
              {formatCompactCount(data.metrics.publicProfileCount)} / {formatCompactCount(data.metrics.publicProfileThreshold)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">Weekly Active</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground-primary)]">
              {formatCompactCount(data.metrics.weeklyActiveCommunityUsers)} /{' '}
              {formatCompactCount(data.metrics.weeklyActiveThreshold)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] p-3">
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--foreground-tertiary)]">Your Progress</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground-primary)]">{data.progress.completionPercent}% complete</p>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-2 text-xs">
          <a href="#community-profile-progress" className="rounded-md border border-[var(--border-default)] px-2 py-1 text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]">
            Profile
          </a>
          <a href="#community-featured-members" className="rounded-md border border-[var(--border-default)] px-2 py-1 text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]">
            Members
          </a>
          <a href="#community-circles" className="rounded-md border border-[var(--border-default)] px-2 py-1 text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]">
            Circles
          </a>
          <a href="#community-events" className="rounded-md border border-[var(--border-default)] px-2 py-1 text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]">
            Events
          </a>
        </nav>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section
            id="community-profile-progress"
            className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Profile Completion</h2>
              <span className="text-xs text-[var(--foreground-tertiary)]">{data.progress.completionPercent}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[var(--background-main)]">
              <div
                className="h-2 rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, data.progress.completionPercent))}%` }}
              />
            </div>

            <ul className="mt-4 space-y-3">
              {orderedTasks.map((task) => (
                <li key={task.id} className="rounded-lg border border-[var(--border-default)] p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-[var(--foreground-primary)]">
                        {task.completed ? (
                          <CheckCircle size={14} className="text-[var(--accent-primary)]" weight="fill" />
                        ) : (
                          <span className="inline-flex h-3.5 w-3.5 rounded-full border border-[var(--border-default)]" />
                        )}
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{task.description}</p>
                    </div>
                    <Button asChild size="sm" variant={task.completed ? 'secondary' : 'outline'}>
                      <Link href={task.ctaHref} onClick={() => handleTaskClick(task)}>
                        {task.completed ? 'Review' : task.ctaLabel}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="community-featured-members"
            className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5"
          >
            <div className="flex items-center gap-2">
              <Sparkle size={14} className="text-[var(--foreground-tertiary)]" />
              <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Featured Members</h2>
            </div>

            {data.featuredMembers.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--foreground-secondary)]">
                Featured members will appear here as the network grows.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {data.featuredMembers.map((member) => (
                  <UserCard
                    key={member.id}
                    user={member}
                    telemetrySurface="community_launchpad_featured_member"
                  />
                ))}
              </div>
            )}
          </section>

          <section
            id="community-circles"
            className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5"
          >
            <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Join a Circle</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.circles.map((circle) => (
                <article key={circle.id} className="rounded-lg border border-[var(--border-default)] p-4">
                  <h3 className="text-sm font-medium text-[var(--foreground-primary)]">{circle.name}</h3>
                  <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{circle.description}</p>
                  <Button asChild variant="link" size="sm" className="mt-2 h-6 px-0">
                    <Link href={circle.href} onClick={() => handleCircleClick(circle.id)}>
                      Explore circle
                    </Link>
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">{data.weeklyPrompt.title}</h2>
            <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{data.weeklyPrompt.body}</p>
            <Button asChild variant="link" size="sm" className="mt-2 h-6 px-0">
              <Link
                href={data.weeklyPrompt.actionHref}
                onClick={() => trackAction('weekly_prompt_action_click')}
              >
                {data.weeklyPrompt.actionLabel}
              </Link>
            </Button>
          </section>
        </div>
        <aside className="space-y-6">
          <section
            id="community-events"
            className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5"
          >
            <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Upcoming Event</h2>
            {data.upcomingEvent ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-[var(--foreground-primary)]">{data.upcomingEvent.title}</p>
                <p className="text-xs text-[var(--foreground-secondary)]">
                  {formatEventDate(data.upcomingEvent.startTime)}
                  {data.upcomingEvent.location ? ` · ${data.upcomingEvent.location}` : ''}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link
                    href={data.upcomingEvent.href}
                    onClick={() => {
                      void sendTelemetryEvent({
                        eventType: 'event_rsvp_clicked',
                        context: {
                          surface: 'community_launchpad',
                        },
                        metadata: {
                          eventId: data.upcomingEvent?.id,
                        },
                      });
                      trackAction('upcoming_event_rsvp', { eventId: data.upcomingEvent?.id });
                    }}
                  >
                    RSVP
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--foreground-secondary)]">
                No upcoming event is scheduled yet.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Invite {data.inviteTarget} peers</h2>
            <p className="mt-2 text-xs text-[var(--foreground-secondary)]">
              Bring high-signal collaborators into the network and improve discovery quality faster.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={handleCopyInvite}>
              {inviteCopied ? 'Link copied' : 'Copy invite link'}
            </Button>
          </section>

          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
            <h2 className="text-sm font-semibold text-[var(--foreground-primary)]">Starter Resources</h2>
            <ul className="mt-3 space-y-3">
              {data.starterResources.map((resource) => (
                <li key={resource.id} className="rounded-lg border border-[var(--border-default)] p-3">
                  <p className="text-sm font-medium text-[var(--foreground-primary)]">{resource.title}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{resource.description}</p>
                  <Button asChild variant="link" size="sm" className="mt-1 h-6 px-0">
                    <Link
                      href={resource.href}
                      onClick={() => trackAction('starter_resource_click', { resourceId: resource.id })}
                    >
                      Open
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </main>
  );
}
