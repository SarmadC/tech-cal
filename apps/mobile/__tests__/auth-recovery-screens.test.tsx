import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '@/app/forgot-password';
import ResetPasswordScreen from '@/app/auth/reset-password';
import { renderWithProviders } from './renderWithProviders';

const mockUseMobileAuth: any = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
}));

describe('native auth recovery screens', () => {
  const mockRequestPasswordReset: any = jest.fn();
  const mockUpdatePassword: any = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMobileAuth.mockReturnValue({
      session: { user: { id: 'user-1' } },
      profile: { fullName: 'Ada Lovelace' },
      isLoading: false,
      isHydratingProfile: false,
      requestPasswordReset: mockRequestPasswordReset,
      updatePassword: mockUpdatePassword,
    });
    mockRequestPasswordReset.mockResolvedValue(undefined);
    mockUpdatePassword.mockResolvedValue(undefined);
  });

  it('requests a native password reset link from the forgot-password screen', async () => {
    renderWithProviders(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('forgot-password-email'), 'ada@example.com');

    await act(async () => {
      fireEvent.press(screen.getByTestId('forgot-password-submit'));
    });

    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledWith('ada@example.com'));
    expect(screen.getByText('Check your inbox')).toBeTruthy();
  });

  it('updates the password and routes back into the app', async () => {
    renderWithProviders(<ResetPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('reset-password-password'), 'new-password-1');
    fireEvent.changeText(screen.getByTestId('reset-password-confirm'), 'new-password-1');

    await act(async () => {
      fireEvent.press(screen.getByTestId('reset-password-submit'));
    });

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith('new-password-1'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/discover');
  });

  it('shows the expired recovery state when there is no active mobile session', () => {
    mockUseMobileAuth.mockReturnValue({
      session: null,
      profile: null,
      isLoading: false,
      isHydratingProfile: false,
      requestPasswordReset: mockRequestPasswordReset,
      updatePassword: mockUpdatePassword,
    });

    renderWithProviders(<ResetPasswordScreen />);

    expect(screen.getByText('Reset link expired')).toBeTruthy();
    fireEvent.press(screen.getByTestId('reset-password-request-new'));
    expect(mockRouterReplace).toHaveBeenCalledWith('/forgot-password');
  });
});
