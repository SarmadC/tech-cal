'use client';

import { Users, Calendar, Handshake } from '@phosphor-icons/react';

interface ProfileNetworkingGoalsProps {
  networkingGoals: string[];
  preferredEventTypes: string[];
  learningStyle: string[];
}

function formatLabel(value: string): string {
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatNetworkingGoal(goal: string): string {
  const labels: Record<string, string> = {
    'find-mentors': 'Find mentors',
    'find-mentees': 'Mentor others',
    'find-peers': 'Connect with peers',
    'find-collaborators': 'Find collaborators',
    'find-customers': 'Business development',
    'find-employers': 'Job opportunities',
    'find-employees': 'Hiring',
    'industry-insights': 'Industry insights',
    'thought-leadership': 'Establish expertise',
  };
  return labels[goal] || formatLabel(goal);
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    conference: 'Conferences',
    workshop: 'Workshops',
    meetup: 'Meetups',
    webinar: 'Webinars',
    hackathon: 'Hackathons',
    summit: 'Summits',
    bootcamp: 'Bootcamps',
    certification: 'Certifications',
    panel: 'Panels',
    keynote: 'Keynotes',
    networking: 'Networking events',
    'trade-show': 'Trade shows',
  };
  return labels[type] || formatLabel(type);
}

function formatLearningStyle(style: string): string {
  const labels: Record<string, string> = {
    'hands-on': 'Hands-on workshops',
    theoretical: 'Lectures & presentations',
    interactive: 'Panel discussions',
    networking: 'Networking sessions',
    'case-studies': 'Case studies',
    'peer-learning': 'Peer learning',
  };
  return labels[style] || formatLabel(style);
}

export default function ProfileNetworkingGoals({
  networkingGoals,
  preferredEventTypes,
  learningStyle,
}: ProfileNetworkingGoalsProps) {
  const hasNetworkingInfo = networkingGoals.length > 0 || preferredEventTypes.length > 0;

  if (!hasNetworkingInfo && learningStyle.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Networking & Events</h2>
        <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
          No networking preferences added yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
      <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Networking & Events</h2>

      {networkingGoals.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Handshake className="w-4 h-4 text-[var(--foreground-tertiary)]" />
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)]">
              Networking Goals
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {networkingGoals.map((goal) => (
              <span
                key={goal}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {formatNetworkingGoal(goal)}
              </span>
            ))}
          </div>
        </div>
      )}

      {preferredEventTypes.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[var(--foreground-tertiary)]" />
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)]">
              Preferred Event Types
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferredEventTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              >
                {formatEventType(type)}
              </span>
            ))}
          </div>
        </div>
      )}

      {learningStyle.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-[var(--foreground-tertiary)]" />
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)]">
              Learning Style
            </h3>
          </div>
          <ul className="space-y-1.5">
            {learningStyle.map((style) => (
              <li key={style} className="text-sm text-[var(--foreground-primary)] flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[var(--foreground-secondary)]" />
                {formatLearningStyle(style)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {networkingGoals.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--background-main)] border border-[var(--border-default)]">
          <p className="text-xs text-[var(--foreground-secondary)]">
            <strong className="text-[var(--foreground-primary)]">Looking to connect?</strong>{' '}
            This person is open to{' '}
            {networkingGoals.includes('find-collaborators')
              ? 'collaboration opportunities'
              : networkingGoals.includes('find-mentors')
              ? 'mentorship'
              : networkingGoals.includes('find-peers')
              ? 'peer connections'
              : 'professional networking'}
            . Reach out if your goals align!
          </p>
        </div>
      )}
    </section>
  );
}
