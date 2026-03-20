import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/utils/test-utils';
import SettingsMobileView from './SettingsMobileView';
import type { AppProfile } from '@/types';

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    useSearchParams: vi.fn(),
    usePathname: vi.fn(),
    useCareerProfile: vi.fn(),
    calculateCareerProfileCompletion: vi.fn(),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mocks.push }),
    useSearchParams: () => mocks.useSearchParams(),
    usePathname: () => mocks.usePathname(),
}));

vi.mock('next-themes', () => ({
    useTheme: () => ({
        theme: 'system',
        resolvedTheme: 'dark',
    }),
}));

vi.mock('@/hooks/useCareerProfile', () => ({
    useCareerProfile: () => mocks.useCareerProfile(),
}));

vi.mock('@/utils/careerProfileUtils', () => ({
    calculateCareerProfileCompletion: (...args: unknown[]) => mocks.calculateCareerProfileCompletion(...args),
}));

vi.mock('@/components/common/UnifiedMobileNavbar', () => ({
    default: () => <div data-testid="mobile-navbar" />,
}));

vi.mock('./ProfileSettingsForm', () => ({
    default: () => <div data-testid="profile-settings-form">Profile Settings Form</div>,
}));

vi.mock('./SettingsMobileCareer', () => ({
    default: () => <div data-testid="settings-mobile-career">Career Settings</div>,
}));

vi.mock('./SettingsMobileIntegration', () => ({
    default: () => <div data-testid="settings-mobile-integrations">Integration Settings</div>,
}));

vi.mock('./SettingsMobileAppearance', () => ({
    default: () => <div data-testid="settings-mobile-appearance">Appearance Settings</div>,
}));

vi.mock('./SettingsMobileBilling', () => ({
    default: () => <div data-testid="settings-mobile-billing">Billing Settings</div>,
}));

const profile: AppProfile = {
    id: 'user-1',
    fullName: 'Taylor Dev',
    avatarUrl: null,
    timezone: 'UTC',
    preferences: {},
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
};

describe('SettingsMobileView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.usePathname.mockReturnValue('/dashboard/settings');
        mocks.useCareerProfile.mockReturnValue({
            careerProfile: null,
            optionalSections: [],
        });
        mocks.calculateCareerProfileCompletion.mockReturnValue(64);
    });

    it('renders the mobile settings menu and pushes the selected tab into the query string', async () => {
        const user = userEvent.setup();
        mocks.useSearchParams.mockReturnValue(new URLSearchParams());

        render(<SettingsMobileView profile={profile} />);

        expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByText('Career Profile')).toBeInTheDocument();
        expect(screen.getByText('64%')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /appearance/i }));

        expect(mocks.push).toHaveBeenCalledWith('/dashboard/settings?tab=appearance');
    });

    it('renders the detail view for the active tab and navigates back to the settings root', async () => {
        const user = userEvent.setup();
        mocks.useSearchParams.mockReturnValue(new URLSearchParams('tab=appearance'));

        render(<SettingsMobileView profile={profile} />);

        expect(screen.getByTestId('settings-mobile-appearance')).toBeInTheDocument();
        expect(screen.getByText('Appearance')).toBeInTheDocument();

        await user.click(screen.getByRole('button'));

        expect(mocks.push).toHaveBeenCalledWith('/dashboard/settings?');
    });
});
