import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import AuthScreenContent from '@/components/auth/AuthScreenContent';
import { renderWithProviders } from './renderWithProviders';

const mockUseMobileAuth: any = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  AntDesign: () => null,
  FontAwesome: () => null,
}));

jest.mock('expo-apple-authentication', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  return {
    __esModule: true,
    AppleAuthenticationButton: ({ onPress, testID }: any) =>
      React.createElement(
        Pressable,
        { accessibilityRole: 'button', onPress, testID },
        React.createElement(Text, null, 'Continue with Apple')
      ),
    AppleAuthenticationButtonType: {
      CONTINUE: 'continue',
    },
    AppleAuthenticationButtonStyle: {
      WHITE: 'white',
    },
  };
});

describe('auth screen', () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();
  const mockSignInWithOAuth = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMobileAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      requestPasswordReset: jest.fn(),
    });
  });

  it('renders the provider-first entry state without github', () => {
    renderWithProviders(<AuthScreenContent />);

    expect(screen.getByTestId('oauth-apple')).toBeTruthy();
    expect(screen.getByTestId('oauth-google')).toBeTruthy();
    expect(screen.getByTestId('auth-email-entry')).toBeTruthy();
    expect(screen.queryByText('Continue with GitHub')).toBeNull();
    expect(screen.queryByText('Email address')).toBeNull();
  });

  it('opens the email form from the email entry button', () => {
    renderWithProviders(<AuthScreenContent />);

    fireEvent.press(screen.getByTestId('auth-email-entry'));

    expect(screen.getByText('Continue with email')).toBeTruthy();
    expect(screen.getByText('Email address')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
    expect(screen.getByText('Forgot your password?')).toBeTruthy();
    expect(screen.getByText("Don't have an account?")).toBeTruthy();
    expect(screen.getByText('Create one')).toBeTruthy();
  });

  it('starts the correct oauth flow for the apple and google buttons', async () => {
    renderWithProviders(<AuthScreenContent />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('oauth-apple'));
    });
    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenNthCalledWith(1, 'apple'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('oauth-google'));
    });
    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenNthCalledWith(2, 'google'));
  });

  it('routes forgot-password taps to the native reset screen', () => {
    renderWithProviders(<AuthScreenContent />);

    fireEvent.press(screen.getByTestId('auth-email-entry'));
    fireEvent.press(screen.getByText('Forgot your password?'));

    expect(mockRouterPush).toHaveBeenCalledWith('/forgot-password');
  });
});
