import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CircleHero from '@/components/social/CircleHero';

const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

describe('CircleHero', () => {
  it('switches back to Join Circle after a successful leave', async () => {
    const user = userEvent.setup();
    const onJoinToggle = vi.fn().mockResolvedValue(true);

    render(
      <CircleHero
        id="circle-1"
        name="Product Circle"
        description="Product discussions."
        memberCount={10}
        isJoined={true}
        onJoinToggle={onJoinToggle}
      />
    );

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onJoinToggle).toHaveBeenCalledWith('circle-1', false);
    });

    expect(screen.getByRole('button', { name: /Join Circle/i })).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalled();
  });
});
