'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarBlank,
  Eye,
  Handshake,
  MapPin,
  Monitor,
  SignIn,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FollowButton from '@/components/social/FollowButton';
import {
  formatCommunityTabCount,
  type CommunityNetworkingHomeViewModel,
} from '@/components/social/community-page-shared';
import {
  formatFollowUpRecency,
  formatNetworkingDayBadge,
  formatNetworkingEventDate,
  formatNetworkingEventTime,
  formatNetworkingLocation,
  formatViewerContextLabel,
  getEventOpportunityCopy,
  getFollowUpCopy,
  getMeetPeopleCopy,
  getNetworkingDisplayName,
  getNetworkingRelationshipLabels,
} from '@/components/social/community-networking-shared';
import type {
  NetworkingFollowUpCard,
  NetworkingOpportunityEvent,
  NetworkingPersonCard,
} from '@/types/community';

interface DesktopCommunityHomePageProps {
  viewModel: CommunityNetworkingHomeViewModel;
}

function PersonAvatar({
  fullName,
  username,
  avatarUrl,
}: {
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
}) {
  const displayName = getNetworkingDisplayName({ fullName, username });

  return (
    <Avatar className="h-12 w-12 border border-white/15 shadow-sm">
      <AvatarImage src={avatarUrl || ''} alt={displayName} />
      <AvatarFallback className="bg-[var(--background-main)] text-xs font-semibold text-[var(--foreground-primary)]">
        {displayName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function SurfaceSection({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[var(--border-default)]/80 bg-[var(--background-secondary)]/86 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-[var(--border-default)]/65 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--foreground-tertiary)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground-primary)]">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-secondary)]">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  body,
  ctas,
}: {
  title: string;
  body: string;
  ctas: Array<{ href: string; label: string; primary?: boolean }>;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--border-default)] bg-[var(--background-main)]/35 p-8">
      <h3 className="text-xl font-semibold text-[var(--foreground-primary)]">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--foreground-secondary)]">
        {body}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {ctas.map((cta) => (
          <Link
            key={cta.href}
            href={cta.href}
            className={
              cta.primary
                ? 'inline-flex items-center gap-2 rounded-full bg-[var(--foreground-primary)] px-4 py-2.5 text-sm font-medium text-[var(--background-main)] transition-opacity hover:opacity-90'
                : 'inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-main)]/45'
            }
          >
            {cta.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function OpportunityEventCard({ event }: { event: NetworkingOpportunityEvent }) {
  const { day, month } = formatNetworkingDayBadge(event.startTime);

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-[var(--border-default)] bg-[var(--background-main)]/48 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(18,184,134,0.18),rgba(250,204,21,0.18))]">
            <span className="text-[22px] font-semibold leading-none text-[var(--foreground-primary)]">
              {day}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
              {month}
            </span>
          </div>
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
              {formatViewerContextLabel(event.viewerContext)}
            </p>
            <h3 className="mt-3 text-lg font-semibold leading-snug text-[var(--foreground-primary)]">
              {event.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--foreground-tertiary)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank size={14} />
                <span>
                  {formatNetworkingEventDate(event.startTime)} ·{' '}
                  {formatNetworkingEventTime(event.startTime)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                {event.format === 'virtual' ? <Monitor size={14} /> : <MapPin size={14} />}
                <span>{formatNetworkingLocation(event.location, event.format)}</span>
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-default)] px-3 py-2 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-secondary)]"
        >
          View event
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border-default)]/70 bg-[var(--background-secondary)]/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
            Public profiles
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground-primary)]">
            {formatCommunityTabCount(event.visibleAttendeeCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)]/70 bg-[var(--background-secondary)]/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
            In your network
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground-primary)]">
            {formatCommunityTabCount(event.networkAttendingCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)]/70 bg-[var(--background-secondary)]/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
            Total attending
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--foreground-primary)]">
            {formatCommunityTabCount(event.totalAttendeeCount)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--foreground-secondary)]">
        {getEventOpportunityCopy(event)}
      </p>

      {event.attendeePreview.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {event.attendeePreview.map((person) => (
            <Link
              key={person.id}
              href={`/u/${person.username}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--background-secondary)]/60 px-2.5 py-2 text-xs font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-secondary)]"
            >
              <PersonAvatar
                fullName={person.fullName}
                username={person.username}
                avatarUrl={person.avatarUrl}
              />
              <span className="pr-1">{getNetworkingDisplayName(person)}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SharedEventLinks({
  events,
}: {
  events: Array<{ id: string; slug: string; title: string }>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {events.map((event) => (
        <Link
          key={event.id}
          href={`/events/${event.slug}`}
          className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-primary)] transition-colors hover:bg-[var(--background-secondary)]"
        >
          {event.title}
        </Link>
      ))}
    </div>
  );
}

function RelationshipChips({
  person,
}: {
  person: NetworkingPersonCard | NetworkingFollowUpCard;
}) {
  const labels = getNetworkingRelationshipLabels(person);

  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function MeetPeopleCard({ person }: { person: NetworkingPersonCard }) {
  const displayName = getNetworkingDisplayName(person);

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-[var(--border-default)] bg-[var(--background-main)]/48 p-5">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/u/${person.username}`} className="flex min-w-0 items-start gap-4">
          <PersonAvatar
            fullName={person.fullName}
            username={person.username}
            avatarUrl={person.avatarUrl}
          />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[var(--foreground-primary)]">
              {displayName}
            </h3>
            <p className="truncate text-sm text-[var(--foreground-secondary)]">
              @{person.username}
            </p>
            {person.headline ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground-secondary)]">
                {person.headline}
              </p>
            ) : null}
          </div>
        </Link>
        <FollowButton userId={person.id} compact telemetrySurface="community_meet_people" />
      </div>

      <RelationshipChips person={person} />

      <p className="mt-4 text-sm leading-6 text-[var(--foreground-secondary)]">
        {getMeetPeopleCopy(person)}
      </p>

      <SharedEventLinks events={person.sharedEvents} />

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-default)] pt-4 text-sm">
        <span className="text-[var(--foreground-tertiary)]">
          Soonest overlap:{' '}
          <span className="text-[var(--foreground-primary)]">
            {person.soonestSharedEventStartTime
              ? formatNetworkingEventDate(person.soonestSharedEventStartTime)
              : 'TBA'}
          </span>
        </span>
        <Link
          href={`/u/${person.username}`}
          className="font-medium text-[var(--foreground-primary)] underline decoration-[var(--border-default)] underline-offset-4"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}

function FollowUpCard({ person }: { person: NetworkingFollowUpCard }) {
  const displayName = getNetworkingDisplayName(person);

  return (
    <article className="flex flex-col rounded-[28px] border border-[var(--border-default)] bg-[var(--background-main)]/48 p-5">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/u/${person.username}`} className="flex min-w-0 items-start gap-4">
          <PersonAvatar
            fullName={person.fullName}
            username={person.username}
            avatarUrl={person.avatarUrl}
          />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[var(--foreground-primary)]">
              {displayName}
            </h3>
            <p className="truncate text-sm text-[var(--foreground-secondary)]">
              @{person.username}
            </p>
            {person.headline ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground-secondary)]">
                {person.headline}
              </p>
            ) : null}
          </div>
        </Link>
        <FollowButton userId={person.id} compact telemetrySurface="community_follow_up" />
      </div>

      <RelationshipChips person={person} />

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--foreground-secondary)]">
        <span>{getFollowUpCopy(person)}</span>
        {person.mostRecentSharedEventStartTime ? (
          <span className="rounded-full bg-[var(--background-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground-primary)]">
            {formatFollowUpRecency(person.mostRecentSharedEventStartTime)}
          </span>
        ) : null}
      </div>

      <SharedEventLinks events={person.sharedEvents} />

      <div className="mt-5 flex items-center justify-between border-t border-[var(--border-default)] pt-4 text-sm">
        <span className="text-[var(--foreground-tertiary)]">
          Most recent event:{' '}
          <span className="text-[var(--foreground-primary)]">
            {person.mostRecentSharedEventStartTime
              ? formatNetworkingEventDate(person.mostRecentSharedEventStartTime)
              : 'TBA'}
          </span>
        </span>
        <Link
          href={`/u/${person.username}`}
          className="font-medium text-[var(--foreground-primary)] underline decoration-[var(--border-default)] underline-offset-4"
        >
          View profile
        </Link>
      </div>
    </article>
  );
}

export default function DesktopCommunityHomePage({
  viewModel,
}: DesktopCommunityHomePageProps) {
  const { isSignedIn, summary, priorityEvents, meetPeople, followUps } = viewModel;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(18,184,134,0.10),transparent_42%),linear-gradient(180deg,var(--background-main)_0%,rgba(255,255,255,0.02)_100%)]">
      <div className="mx-auto max-w-[1360px] px-4 pb-16 pt-12 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_340px]">
          <div className="rounded-[36px] border border-[var(--border-default)]/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.10)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--foreground-tertiary)]">
              Community
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground-primary)] sm:text-5xl lg:text-6xl">
              Meet people through the events you&apos;re already tracking.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--foreground-secondary)] sm:text-lg">
              Community is now a networking desk for your calendar. It ranks the
              best rooms to show up in, the public profiles you can meet there, and
              the people worth following up with after the event.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--border-default)] bg-[var(--background-main)]/42 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
                  Best Events
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground-primary)]">
                  {formatCommunityTabCount(summary.trackedUpcomingCount)}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--border-default)] bg-[var(--background-main)]/42 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
                  People You Can Meet
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground-primary)]">
                  {formatCommunityTabCount(summary.visibleOpportunityCount)}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--border-default)] bg-[var(--background-main)]/42 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--foreground-tertiary)]">
                  Follow Ups
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground-primary)]">
                  {formatCommunityTabCount(summary.followUpCount)}
                </p>
              </div>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-[30px] border border-[var(--border-default)] bg-[var(--background-secondary)]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                How It Works
              </p>
              <div className="mt-5 space-y-4 text-sm text-[var(--foreground-secondary)]">
                <div className="flex gap-3">
                  <Sparkle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p>Upcoming saved and attending events are ranked by visible people and network signal.</p>
                </div>
                <div className="flex gap-3">
                  <UsersThree size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p>Attendees are deduped across your events so the same person does not flood the page.</p>
                </div>
                <div className="flex gap-3">
                  <Handshake size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p>Recent shared events are turned into follow-up prompts while the context is still warm.</p>
                </div>
              </div>
            </div>

            {!isSignedIn ? (
              <div className="rounded-[30px] border border-[var(--border-default)] bg-[var(--background-secondary)]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground-tertiary)]">
                  Sign In
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[var(--foreground-primary)]">
                  Turn Community into your event networking desk.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground-secondary)]">
                  Sign in to connect your saved events, attending status, and public attendee profiles.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/login?redirect=%2Fcommunity"
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground-primary)] px-4 py-2.5 text-sm font-medium text-[var(--background-main)]"
                  >
                    <SignIn size={16} />
                    Log in
                  </Link>
                  <Link
                    href="/signup?redirect=%2Fcommunity"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border-default)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)]"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : null}

            {isSignedIn && !summary.attendanceVisibilityEnabled ? (
              <div className="rounded-[30px] border border-amber-500/25 bg-amber-500/8 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Visibility Tip
                </p>
                <h2 className="mt-3 text-xl font-semibold text-[var(--foreground-primary)]">
                  Turn on attendance visibility.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground-secondary)]">
                  When your attendance is public, other attendees can recognize you across events and the networking loop becomes reciprocal.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 px-4 py-2.5 text-sm font-medium text-[var(--foreground-primary)] transition-colors hover:bg-amber-500/10"
                >
                  <Eye size={16} />
                  Open settings
                </Link>
              </div>
            ) : null}
          </aside>
        </section>

        <div className="mt-8 space-y-8">
          <SurfaceSection
            eyebrow="01"
            title="Best Events to Meet People"
            description="These are the upcoming events you already saved or marked attending, ordered by how much public networking signal is available."
          >
            {isSignedIn && priorityEvents.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {priorityEvents.map((event) => (
                  <OpportunityEventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  isSignedIn
                    ? 'No strong event-networking matches yet.'
                    : 'Sign in to see which events are best for meeting people.'
                }
                body={
                  isSignedIn
                    ? 'Start by saving events, marking yourself as attending, and checking rooms where people share their attendance publicly.'
                    : 'Once you sign in, Community will rank your saved and attending events by who you can meet there.'
                }
                ctas={
                  isSignedIn
                    ? [
                        { href: '/events', label: 'Browse events', primary: true },
                        { href: '/dashboard/settings', label: 'Attendance settings' },
                      ]
                    : [
                        { href: '/login?redirect=%2Fcommunity', label: 'Log in', primary: true },
                        { href: '/events', label: 'Browse events' },
                      ]
                }
              />
            )}
          </SurfaceSection>

          <SurfaceSection
            eyebrow="02"
            title="People You Can Meet"
            description="People are deduped across those priority events, then sorted by relationship strength and overlap so your next introductions are obvious."
          >
            {isSignedIn && meetPeople.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {meetPeople.map((person) => (
                  <MeetPeopleCard key={person.id} person={person} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No public attendee matches yet."
                body="When attendees keep their profiles public and share attendance, they will show up here with follow actions and shared event context."
                ctas={[
                  { href: '/events', label: 'Find upcoming events', primary: true },
                  { href: '/dashboard/settings', label: 'Enable visibility' },
                ]}
              />
            )}
          </SurfaceSection>

          <SurfaceSection
            eyebrow="03"
            title="Follow Up After Events"
            description="Recent shared events from the last two weeks stay visible here so you can reconnect while the conversation is still fresh."
          >
            {isSignedIn && followUps.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {followUps.map((person) => (
                  <FollowUpCard key={person.id} person={person} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recent follow-ups yet."
                body="Once you attend events with public attendee activity, Community will surface the people worth reconnecting with here."
                ctas={[
                  { href: '/events', label: 'Mark events attending', primary: true },
                  { href: '/dashboard/settings', label: 'Attendance settings' },
                ]}
              />
            )}
          </SurfaceSection>
        </div>
      </div>
    </main>
  );
}
