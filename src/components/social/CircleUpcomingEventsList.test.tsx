import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CircleUpcomingEventsList from '@/components/social/CircleUpcomingEventsList';
import type { CircleDiscussionUpcomingEvent } from '@/types/circleDiscussions';

/* eslint-disable @next/next/no-img-element */

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: { children: ReactNode }) => <span {...props}>{children}</span>,
  AvatarImage: ({ alt, src, ...props }: { alt?: string; src?: string }) => (
    <img alt={alt} src={src} {...props} />
  ),
  AvatarFallback: ({ children, ...props }: { children: ReactNode }) => <span {...props}>{children}</span>,
}));

function createEvents(): CircleDiscussionUpcomingEvent[] {
  return [
    {
      id: 'event-1',
      slug: 'ai-demo-night-event-1',
      title: 'AI Demo Night',
      startTime: '2026-03-20T18:00:00.000Z',
      organizerName: 'OpenAI',
      organizerLogoUrl: 'https://example.com/openai-logo.png',
    },
    {
      id: 'event-2',
      slug: 'community-workshop-event-2',
      title: 'Village Collective Workshop',
      startTime: '2026-03-21T18:00:00.000Z',
      organizerName: null,
      organizerLogoUrl: null,
    },
  ];
}

describe('CircleUpcomingEventsList', () => {
  it('renders organizer logos when available and falls back to initials when missing', () => {
    render(<CircleUpcomingEventsList events={createEvents()} />);

    expect(screen.getByRole('img', { name: 'OpenAI logo' })).toHaveAttribute(
      'src',
      expect.stringContaining('openai-logo.png')
    );
    expect(screen.getByText('VC')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI Demo Night/i })).toHaveAttribute(
      'href',
      '/events/ai-demo-night-event-1'
    );
  });
});
