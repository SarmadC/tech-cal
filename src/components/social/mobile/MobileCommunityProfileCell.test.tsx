import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobileCommunityProfileCell from '@/components/social/mobile/MobileCommunityProfileCell';

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

vi.mock('@/components/social/FollowButton', () => ({
  default: () => <button type="button">Follow</button>,
}));

describe('MobileCommunityProfileCell', () => {
  it('renders profile identity, social proof, and the follow action', () => {
    render(
      <MobileCommunityProfileCell
        profile={{
          id: 'profile-1',
          fullName: 'Ada Lovelace',
          avatarUrl: null,
          username: 'ada',
          headline: 'Founding engineer',
          joinedAt: '2026-01-01T00:00:00.000Z',
          followerCount: 12,
          followingCount: 8,
          currentRole: 'founder',
          seniority: 'senior',
          industry: 'developer tools',
        }}
      />
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByText('Founding engineer')).toBeInTheDocument();
    expect(screen.getByText('Founder · Senior')).toBeInTheDocument();
    expect(screen.getByText('developer tools')).toBeInTheDocument();
    expect(screen.getByText('12 followers')).toBeInTheDocument();
    expect(screen.getByText('8 following')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
  });
});
