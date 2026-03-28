import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import IndexScreen from '@/app/index';
import AuthLayout from '@/app/(auth)/_layout';
import { renderWithProviders } from './renderWithProviders';

const mockUseMobileAuth: any = jest.fn();

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, `redirect:${href}`);
  },
  Stack: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'auth-stack');
  },
}));

describe('mobile auth routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes signed-in users without a profile to onboarding from the root screen', () => {
    mockUseMobileAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      profile: null,
      isLoading: false,
      isHydratingProfile: false,
    });

    const { getByText, queryByText } = renderWithProviders(<IndexScreen />);

    expect(getByText('redirect:/onboarding')).toBeTruthy();
    expect(queryByText('Loading your orbit')).toBeNull();
  });

  it('keeps the root screen on loading while profile hydration is in progress', () => {
    mockUseMobileAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      profile: null,
      isLoading: false,
      isHydratingProfile: true,
    });

    const { getByText, queryByText } = renderWithProviders(<IndexScreen />);

    expect(getByText('Loading your orbit')).toBeTruthy();
    expect(queryByText('redirect:/onboarding')).toBeNull();
  });

  it('routes authenticated users without a profile to onboarding from the auth layout', () => {
    mockUseMobileAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      profile: null,
      isLoading: false,
      isHydratingProfile: false,
    });

    const { getByText } = renderWithProviders(<AuthLayout />);

    expect(getByText('redirect:/onboarding')).toBeTruthy();
  });

  it('routes authenticated users with a profile to discover from the auth layout', () => {
    mockUseMobileAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      profile: { fullName: 'Ada Lovelace' },
      isLoading: false,
      isHydratingProfile: false,
    });

    const { getByText } = renderWithProviders(<AuthLayout />);

    expect(getByText('redirect:/(tabs)/discover')).toBeTruthy();
  });
});
