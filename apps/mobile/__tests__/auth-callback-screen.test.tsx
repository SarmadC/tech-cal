import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import AuthCallbackScreen from '../app/auth/callback';
import { renderWithProviders } from './renderWithProviders';

const mockReplace: any = jest.fn();
const mockUseMobileAuth: any = jest.fn();
const mockRetryLastAuthCallback: any = jest.fn();
const mockClearAuthCompletionState = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

describe('Auth callback screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRetryLastAuthCallback.mockResolvedValue(undefined);
    mockUseMobileAuth.mockReturnValue({
      session: null,
      profile: null,
      isLoading: false,
      isHydratingProfile: false,
      isCompletingAuth: false,
      hasPendingAuthCallbackUrl: false,
      authCompletionError: null,
      pendingPostAuthRoute: null,
      retryLastAuthCallback: mockRetryLastAuthCallback,
      clearAuthCompletionState: mockClearAuthCompletionState,
    });
  });

  it('routes signed-in users with a profile to discover', async () => {
    mockUseMobileAuth.mockReturnValue({
      ...mockUseMobileAuth(),
      session: { user: { id: 'user-1' } },
      profile: { fullName: 'Ada Lovelace' },
    });

    renderWithProviders(<AuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/discover'));
    expect(screen.getByText('Opening your account')).toBeTruthy();
  });

  it('routes signed-in users without a profile to onboarding', async () => {
    mockUseMobileAuth.mockReturnValue({
      ...mockUseMobileAuth(),
      session: { user: { id: 'user-1' } },
      profile: null,
    });

    renderWithProviders(<AuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
  });

  it('keeps showing the loading screen while profile hydration is in flight', () => {
    mockUseMobileAuth.mockReturnValue({
      ...mockUseMobileAuth(),
      session: { user: { id: 'user-1' } },
      profile: null,
      isHydratingProfile: true,
    });

    renderWithProviders(<AuthCallbackScreen />);

    expect(screen.getByText('Completing sign in')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('routes recovery flows to the native reset password screen', async () => {
    mockUseMobileAuth.mockReturnValue({
      ...mockUseMobileAuth(),
      session: { user: { id: 'user-1' } },
      pendingPostAuthRoute: '/auth/reset-password',
    });

    renderWithProviders(<AuthCallbackScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/reset-password'));
  });

  it('renders a native error state with retry and back actions', async () => {
    mockUseMobileAuth.mockReturnValue({
      ...mockUseMobileAuth(),
      authCompletionError: 'Link expired',
    });

    renderWithProviders(<AuthCallbackScreen />);

    expect(screen.getByText('We could not finish sign in')).toBeTruthy();

    fireEvent.press(screen.getByTestId('auth-callback-retry'));
    expect(mockRetryLastAuthCallback).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('auth-callback-back'));
    expect(mockClearAuthCompletionState).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)');
  });
});
