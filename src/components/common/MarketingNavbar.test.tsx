import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { render, screen, within } from '@/utils/test-utils';
import MarketingNavbar from './MarketingNavbar';

const mockUseDeviceDetection = vi.fn();
const mockCapture = vi.fn();

vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => mockUseDeviceDetection(),
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: mockCapture }),
}));

vi.mock('@/components/ui/resizable-navbar', () => ({
  Navbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NavBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NavItems: ({ items }: { items: Array<{ name: string; link: string }> }) => (
    <div>
      {items.map((item) => (
        <a key={item.link} href={item.link}>
          {item.name}
        </a>
      ))}
    </div>
  ),
  MobileNav: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NavbarLogo: () => <Link href="/">Kure-Cal</Link>,
  NavbarButton: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
  MobileNavHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MobileNavToggle: ({
    isOpen,
    onClick,
  }: {
    isOpen: boolean;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {isOpen ? 'Close menu' : 'Open menu'}
    </button>
  ),
  MobileNavMenu: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div>{children}</div> : null),
}));

describe('MarketingNavbar', () => {
  beforeEach(() => {
    mockCapture.mockReset();
  });

  it('shows the resources flyout on desktop hover', async () => {
    mockUseDeviceDetection.mockReturnValue({ isMobile: false, isReady: true });

    render(<MarketingNavbar />);

    const trigger = screen.getByRole('button', { name: /open resources menu/i });
    await userEvent.hover(trigger);

    expect(screen.getByRole('link', { name: /events dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cfp deadlines/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /city directory/i })).toBeInTheDocument();
  });

  it('opens the resources flyout from the mobile header', async () => {
    mockUseDeviceDetection.mockReturnValue({ isMobile: true, isReady: true });

    render(<MarketingNavbar />);

    const headerButton = screen.getByRole('button', { name: 'Resources' });
    await userEvent.click(headerButton);

    const cityDirectoryLink = screen.getByRole('link', { name: /city directory/i });
    expect(cityDirectoryLink).toHaveAttribute('href', '/events/cities');
  });

  it('keeps the hamburger menu links separate from the resources flyout', async () => {
    mockUseDeviceDetection.mockReturnValue({ isMobile: true, isReady: true });

    render(<MarketingNavbar />);

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const mobileMenu = screen.getByText('Features').closest('div');
    expect(within(mobileMenu ?? document.body).getByText('Pricing')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /city directory/i })).not.toBeInTheDocument();
  });
});
