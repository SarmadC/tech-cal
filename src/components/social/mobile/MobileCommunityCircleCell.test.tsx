import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobileCommunityCircleCell from '@/components/social/mobile/MobileCommunityCircleCell';

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

describe('MobileCommunityCircleCell', () => {
  it('renders the joined circle row with open navigation', () => {
    render(
      <MobileCommunityCircleCell
        circle={{
          id: 'circle-1',
          name: 'Design Systems Guild',
          description: 'People building design systems.',
          href: '/circle/design-systems',
          isJoined: true,
          memberCount: 42,
        }}
        variant="joined"
      />
    );

    expect(screen.getByText('Design Systems')).toBeInTheDocument();
    expect(screen.queryByText('42 members')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/circle/design-systems');
  });

  it('renders the discover state and preserves the join action', async () => {
    const onToggle = vi.fn().mockResolvedValue(undefined);

    render(
      <MobileCommunityCircleCell
        circle={{
          id: 'circle-2',
          name: 'Mobile Builders',
          description: 'A circle for mobile teams.',
          href: '/circle/mobile-builders',
          isJoined: false,
          memberCount: 18,
        }}
        variant="discover"
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('circle-2', false);
    });
    expect(screen.getByRole('link', { name: /Mobile/i })).toHaveAttribute(
      'href',
      '/circle/mobile-builders'
    );
  });
});
