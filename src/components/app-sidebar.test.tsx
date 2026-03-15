import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebar from './app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const mocks = vi.hoisted(() => ({
  usePathname: vi.fn(),
  signOut: vi.fn(),
  authState: {
    user: {
      id: 'user-123',
      email: 'ada@example.com',
    },
    profile: {
      id: 'user-123',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      timezone: null,
      preferences: null,
      createdAt: null,
      updatedAt: null,
    },
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.usePathname(),
}));

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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.authState.user,
    profile: mocks.authState.profile,
    signOut: mocks.signOut,
  }),
}));

function renderSidebar(defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
    </SidebarProvider>
  );
}

describe('AppSidebar account menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePathname.mockReturnValue('/community');
    mocks.signOut.mockResolvedValue(undefined);
    mocks.authState.user = {
      id: 'user-123',
      email: 'ada@example.com',
    };
    mocks.authState.profile = {
      id: 'user-123',
      fullName: 'Ada Lovelace',
      avatarUrl: null,
      timezone: null,
      preferences: null,
      createdAt: null,
      updatedAt: null,
    };
  });

  it('renders the expanded account trigger and signs out from the menu', async () => {
    const user = userEvent.setup();

    renderSidebar(true);

    const trigger = screen.getByRole('button', {
      name: 'Open account menu for Ada Lovelace',
    });

    expect(within(trigger).getByText('Ada Lovelace')).toBeInTheDocument();
    expect(within(trigger).getByText('AL')).toBeInTheDocument();

    await user.click(trigger);

    expect(await screen.findByText('Sign out')).toBeInTheDocument();
    expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(1);

    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the collapsed avatar-only trigger with an accessible label and signs out', async () => {
    const user = userEvent.setup();

    renderSidebar(false);

    const trigger = screen.getByRole('button', {
      name: 'Open account menu for Ada Lovelace',
    });

    expect(trigger).toHaveAttribute('title', 'Open account menu for Ada Lovelace');
    expect(within(trigger).queryByText('Ada Lovelace')).not.toBeInTheDocument();

    await user.click(trigger);

    const signOutMenuItem = await screen.findByRole('menuitem', { name: /sign out/i });

    await user.click(signOutMenuItem);

    await waitFor(() => {
      expect(mocks.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
