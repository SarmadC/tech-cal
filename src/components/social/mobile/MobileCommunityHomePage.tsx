'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CalendarBlank,
  Eye,
  Handshake,
  MapPin,
  Monitor,
  SignIn,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react';
import MobileAppShell from '@/components/common/mobile/MobileAppShell';
import MobileHeader from '@/components/common/mobile/MobileHeader';
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

interface MobileCommunityHomePageProps {
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
    <Avatar className="h-11 w-11 border border-white/10">
      <AvatarImage src={avatarUrl || ''} alt={displayName} />
      <AvatarFallback className="bg-[var(--background-main)] text-[11px] font-semibold text-[var(--foreground-primary)]">
        {displayName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function MobileSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--mobile-app-surface-border)] bg-[var(--mobile-app-card-bg)]/92 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground-primary)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MobileEmptyState({
  title,
  body,
  ctas,
}: {
  title: string;
  body: string;
  ctas: Array<{ href: string; label: string; primary?: boolean }>;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--mobile-app-surface-border)] bg-[var(--background-main)]/28 p-5">
      <h3 className="text-base font-semibold text-[var(--foreground-primary)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {ctas.map((cta) => (
          <Link
            key={cta.href}
            href={cta.href}
            className={
              cta.primary
                ? 'inline-flex items-center rounded-full bg-[var(--foreground-primary)] px-3 py-2 text-sm font-medium text-[var(--background-main)]'
                : 'inline-flex items-center rounded-full border border-[var(--mobile-app-surface-border)] px-3 py-2 text-sm font-medium text-[var(--foreground-primary)]'
            }
          >
            {cta.label}
          </Link>
        ))}
      </div>
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
          className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function OpportunityEventCard({ event }: { event: NetworkingOpportunityEvent }) {
  const { day, month } = formatNetworkingDayBadge(event.startTime);

  return (
    <article className="rounded-[24px] border border-[var(--mobile-app-surface-border)] bg-[var(--background-main)]/32 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-[1.1rem] bg-[linear-gradient(145deg,rgba(18,184,134,0.16),rgba(250,204,21,0.18))]">
          <span className="text-[20px] font-semibold leading-none text-[var(--foreground-primary)]">
            {day}
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--foreground-tertiary)]">
            {month}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
            {formatViewerContextLabel(event.viewerContext)}
          </span>
          <h3 className="mt-2 text-[15px] font-semibold leading-6 text-[var(--foreground-primary)]">
            {event.title}
          </h3>
          <div className="mt-2 space-y-1 text-[12px] text-[var(--foreground-tertiary)]">
            <p className="inline-flex items-center gap-1.5">
              <CalendarBlank size={13} />
              <span>
                {formatNetworkingEventDate(event.startTime)} ·{' '}
                {formatNetworkingEventTime(event.startTime)}
              </span>
            </p>
            <p className="inline-flex items-center gap-1.5">
              {event.format === 'virtual' ? <Monitor size={13} /> : <MapPin size={13} />}
              <span>{formatNetworkingLocation(event.location, event.format)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-[var(--background-secondary)]/55 px-2 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--foreground-tertiary)]">
            Public
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground-primary)]">
            {formatCommunityTabCount(event.visibleAttendeeCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--background-secondary)]/55 px-2 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--foreground-tertiary)]">
            Network
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground-primary)]">
            {formatCommunityTabCount(event.networkAttendingCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--background-secondary)]/55 px-2 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--foreground-tertiary)]">
            Total
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground-primary)]">
            {formatCommunityTabCount(event.totalAttendeeCount)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--foreground-secondary)]">
        {getEventOpportunityCopy(event)}
      </p>

      {event.attendeePreview.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {event.attendeePreview.map((person) => (
            <Link
              key={person.id}
              href={`/u/${person.username}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--mobile-app-surface-border)] bg-[var(--background-secondary)]/55 px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground-primary)]"
            >
              <PersonAvatar
                fullName={person.fullName}
                username={person.username}
                avatarUrl={person.avatarUrl}
              />
              <span>{getNetworkingDisplayName(person)}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <Link
        href={`/events/${event.slug}`}
        className="mt-4 inline-flex items-center rounded-full border border-[var(--mobile-app-surface-border)] px-3 py-2 text-sm font-medium text-[var(--foreground-primary)]"
      >
        View event
      </Link>
    </article>
  );
}

function PersonCard({ person }: { person: NetworkingPersonCard | NetworkingFollowUpCard }) {
  const displayName = getNetworkingDisplayName(person);
  const isMeetPeople = 'sharedUpcomingEventCount' in person;

  return (
    <article className="rounded-[24px] border border-[var(--mobile-app-surface-border)] bg-[var(--background-main)]/32 p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/u/${person.username}`} className="flex min-w-0 items-start gap-3">
          <PersonAvatar
            fullName={person.fullName}
            username={person.username}
            avatarUrl={person.avatarUrl}
          />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-[var(--foreground-primary)]">
              {displayName}
            </h3>
            <p className="truncate text-sm text-[var(--foreground-secondary)]">
              @{person.username}
            </p>
            {person.headline ? (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--foreground-secondary)]">
                {person.headline}
              </p>
            ) : null}
          </div>
        </Link>
        <FollowButton
          userId={person.id}
          compact
          telemetrySurface={isMeetPeople ? 'community_meet_people_mobile' : 'community_follow_up_mobile'}
        />
      </div>

      <RelationshipChips person={person} />

      <p className="mt-4 text-sm leading-6 text-[var(--foreground-secondary)]">
        {isMeetPeople ? getMeetPeopleCopy(person as NetworkingPersonCard) : getFollowUpCopy(person as NetworkingFollowUpCard)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {person.sharedEvents.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="rounded-full border border-[var(--mobile-app-surface-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--foreground-primary)]"
          >
            {event.title}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--mobile-app-surface-border)] pt-3 text-sm">
        <span className="text-[var(--foreground-tertiary)]">
          {isMeetPeople
            ? (person as NetworkingPersonCard).soonestSharedEventStartTime
              ? formatNetworkingEventDate(
                  (person as NetworkingPersonCard).soonestSharedEventStartTime || ''
                )
              : 'TBA'
            : (person as NetworkingFollowUpCard).mostRecentSharedEventStartTime
              ? formatFollowUpRecency(
                  (person as NetworkingFollowUpCard).mostRecentSharedEventStartTime || ''
                )
              : 'Recently'}
        </span>
        <Link href={`/u/${person.username}`} className="font-medium text-[var(--foreground-primary)]">
          View profile
        </Link>
      </div>
    </article>
  );
}

export default function MobileCommunityHomePage({
  viewModel,
}: MobileCommunityHomePageProps) {
  const { isSignedIn, summary, priorityEvents, meetPeople, followUps } = viewModel;

  return (
    <MobileAppShell
      headerClassName="pb-1"
      contentClassName="pt-2"
      header={
        <MobileHeader
          eyebrow="Community"
          title="Meet people through the events you track."
          subtitle="Community now prioritizes networking signal from your saved and attending events."
          meta={
            <>
              <span className="mobile-header__metaPill">
                {formatCommunityTabCount(summary.trackedUpcomingCount)} event opportunities
              </span>
              <span className="mobile-header__metaPill">
                {formatCommunityTabCount(summary.visibleOpportunityCount)} people to meet
              </span>
            </>
          }
          data-testid="mobile-community-home-header"
        />
      }
    >
      <main className="space-y-4 px-1 pb-6">
        {!isSignedIn ? (
          <section className="rounded-[28px] border border-[var(--mobile-app-surface-border)] bg-[var(--mobile-app-card-bg)]/92 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600">
                <SignIn size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground-primary)]">
                  Sign in to unlock event networking.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
                  Your saved events, attending state, and public attendee matches will show up here once you sign in.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/login?redirect=%2Fcommunity"
                className="inline-flex items-center rounded-full bg-[var(--foreground-primary)] px-3.5 py-2 text-sm font-medium text-[var(--background-main)]"
              >
                Log in
              </Link>
              <Link
                href="/signup?redirect=%2Fcommunity"
                className="inline-flex items-center rounded-full border border-[var(--mobile-app-surface-border)] px-3.5 py-2 text-sm font-medium text-[var(--foreground-primary)]"
              >
                Create account
              </Link>
            </div>
          </section>
        ) : null}

        {isSignedIn && !summary.attendanceVisibilityEnabled ? (
          <section className="rounded-[28px] border border-amber-500/20 bg-amber-500/8 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700">
                <Eye size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground-primary)]">
                  Turn on attendance visibility.
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">
                  It helps other attendees find you across the same rooms and makes the networking loop reciprocal.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="mt-3 inline-flex items-center rounded-full border border-amber-500/25 px-3 py-2 text-sm font-medium text-[var(--foreground-primary)]"
                >
                  Open settings
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <MobileSection
          title="Best Events to Meet People"
          description="Upcoming saved and attending events ranked by public attendee signal."
        >
          {isSignedIn && priorityEvents.length > 0 ? (
            <div className="space-y-3">
              {priorityEvents.map((event) => (
                <OpportunityEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title={
                isSignedIn
                  ? 'No event-networking matches yet.'
                  : 'Sign in to rank your best networking events.'
              }
              body={
                isSignedIn
                  ? 'Save events, mark yourself attending, and look for rooms where people share attendance publicly.'
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
        </MobileSection>

        <MobileSection
          title="People You Can Meet"
          description="People are deduped across those priority events and sorted by relationship signal first."
        >
          {isSignedIn && meetPeople.length > 0 ? (
            <div className="space-y-3">
              {meetPeople.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title="No public attendee matches yet."
              body="When attendees keep their profile public and share attendance, they will show up here with follow actions and event context."
              ctas={[
                { href: '/events', label: 'Find events', primary: true },
                { href: '/dashboard/settings', label: 'Enable visibility' },
              ]}
            />
          )}
        </MobileSection>

        <MobileSection
          title="Follow Up After Events"
          description="Recent shared events from the last two weeks stay visible here so the next conversation is easy."
        >
          {isSignedIn && followUps.length > 0 ? (
            <div className="space-y-3">
              {followUps.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title="No recent follow-ups yet."
              body="Attend a few events with public attendee activity and Community will surface the people worth reconnecting with here."
              ctas={[
                { href: '/events', label: 'Mark events attending', primary: true },
                { href: '/dashboard/settings', label: 'Attendance settings' },
              ]}
            />
          )}
        </MobileSection>

        <section className="rounded-[28px] border border-[var(--mobile-app-surface-border)] bg-[var(--mobile-app-card-bg)]/88 p-4">
          <div className="space-y-3 text-sm text-[var(--foreground-secondary)]">
            <div className="flex gap-3">
              <Sparkle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <p>Best Events weighs timing, visible profiles, and network signal together.</p>
            </div>
            <div className="flex gap-3">
              <UsersThree size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <p>People You Can Meet removes duplicates across events so the same attendee stays readable.</p>
            </div>
            <div className="flex gap-3">
              <Handshake size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <p>Follow Up After Events keeps the last two weeks of shared rooms visible while context is fresh.</p>
            </div>
          </div>
        </section>
      </main>
    </MobileAppShell>
  );
}
