import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from '@/providers/AuthProvider';

const mockCreateURL: any = jest.fn();
const mockUseURL: any = jest.fn();
const mockOpenAuthSessionAsync: any = jest.fn();
const mockGetProfile: any = jest.fn();
const mockSyncRevenueCatIdentity: any = jest.fn();
const mockGetSession: any = jest.fn();
const mockOnAuthStateChange: any = jest.fn();
const mockSetSession: any = jest.fn();
const mockExchangeCodeForSession: any = jest.fn();
const mockVerifyOtp: any = jest.fn();
const mockSignInWithOAuth: any = jest.fn();
const mockSignInWithPassword: any = jest.fn();
const mockSignUp: any = jest.fn();
const mockResetPasswordForEmail: any = jest.fn();
const mockUpdateUser: any = jest.fn();
const mockSignOut: any = jest.fn();

let authStateChangeHandler: ((event: string, session: any) => void) | null = null;
let currentSession: any = null;

jest.mock('expo-linking', () => ({
  createURL: (...args: unknown[]) => mockCreateURL(...args),
  useURL: () => mockUseURL(),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) => mockOpenAuthSessionAsync(...args),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@/lib/mobileApi', () => ({
  getMobileApiClient: () => ({
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
  }),
}));

jest.mock('@/lib/revenuecat', () => ({
  syncRevenueCatIdentity: (...args: unknown[]) => mockSyncRevenueCatIdentity(...args),
}));

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  }),
}));

function Harness() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error('Auth context missing');
  }

  return (
    <>
      <Pressable onPress={() => auth.signInWithOAuth('google')} testID="oauth-trigger">
        <Text>{auth.session ? 'signed-in' : 'signed-out'}</Text>
      </Pressable>
      <Pressable onPress={() => auth.signOut()} testID="signout-trigger">
        <Text>sign-out</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          auth.signUp({
            name: 'Ada Lovelace',
            email: 'ada@example.com',
            password: 'password-1',
            confirmPassword: 'password-1',
            acceptTerms: true,
          })
        }
        testID="signup-trigger"
      >
        <Text>sign-up</Text>
      </Pressable>
      <Pressable
        onPress={() => auth.requestPasswordReset('ada@example.com')}
        testID="reset-trigger"
      >
        <Text>request-reset</Text>
      </Pressable>
      <Text testID="profile-state">{auth.profile?.fullName ?? 'no-profile'}</Text>
      <Text testID="loading-state">{auth.isLoading ? 'loading' : 'ready'}</Text>
      <Text testID="hydration-state">{auth.isHydratingProfile ? 'hydrating' : 'hydrated'}</Text>
      <Text testID="completion-state">{auth.isCompletingAuth ? 'processing' : 'idle'}</Text>
      <Text testID="completion-error">{auth.authCompletionError ?? 'no-error'}</Text>
      <Text testID="pending-route">{auth.pendingPostAuthRoute ?? 'no-route'}</Text>
    </>
  );
}

describe('AuthProvider OAuth flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateChangeHandler = null;
    currentSession = null;
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'kurecal-dev://auth/callback';

    mockCreateURL.mockReturnValue('exp://ignored');
    mockUseURL.mockReturnValue(null);
    mockGetProfile.mockResolvedValue({ success: true, data: { fullName: 'Ada' } });
    mockSyncRevenueCatIdentity.mockResolvedValue(undefined);
    mockGetSession.mockImplementation(async () => ({ data: { session: currentSession } }));
    mockOnAuthStateChange.mockImplementation((handler: typeof authStateChangeHandler) => {
      authStateChangeHandler = handler;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    mockSetSession.mockImplementation(
      async ({ access_token, refresh_token }: { access_token: string; refresh_token: string }) => {
      const session = {
        access_token,
        refresh_token,
        user: { id: 'user-1', email: 'ada@example.com' },
      };
      currentSession = session;
      authStateChangeHandler?.('SIGNED_IN', session);
      return { error: null };
      }
    );
    mockExchangeCodeForSession.mockImplementation(async () => {
      currentSession = {
        access_token: 'token-from-code',
        refresh_token: 'refresh-from-code',
        user: { id: 'user-1', email: 'ada@example.com' },
      };
      authStateChangeHandler?.('SIGNED_IN', currentSession);
      return { data: { session: currentSession }, error: null };
    });
    mockVerifyOtp.mockImplementation(async () => {
      currentSession = {
        access_token: 'token-from-otp',
        refresh_token: 'refresh-from-otp',
        user: { id: 'user-1', email: 'ada@example.com' },
      };
      authStateChangeHandler?.('SIGNED_IN', currentSession);
      return { data: { session: currentSession, user: currentSession.user }, error: null };
    });
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example.com/oauth' },
      error: null,
    });
    mockOpenAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'kurecal-dev://auth/callback#access_token=token-1&refresh_token=refresh-1',
    });
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    mockUpdateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSignOut.mockImplementation(async () => {
      currentSession = null;
      authStateChangeHandler?.('SIGNED_OUT', null);
      return { error: null };
    });
  });

  it('starts oauth with the native callback uri and restores the session', async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.press(await screen.findByTestId('oauth-trigger'));
    });

    await waitFor(() =>
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'kurecal-dev://auth/callback',
          skipBrowserRedirect: true,
        },
      })
    );

    expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
      'https://provider.example.com/oauth',
      'kurecal-dev://auth/callback'
    );

    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'token-1',
        refresh_token: 'refresh-1',
      })
    );

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('profile-state').props.children).toBe('Ada'));
    expect(screen.getByTestId('loading-state').props.children).toBe('ready');
    expect(screen.getByTestId('hydration-state').props.children).toBe('hydrated');
  });

  it('ignores unrelated deep links when restoring auth state', async () => {
    mockUseURL.mockReturnValue('kurecal-dev://settings');

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('resolves bootstrap loading when an existing session profile fetch succeeds', async () => {
    currentSession = {
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      user: { id: 'user-1', email: 'ada@example.com' },
    };

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    expect(screen.getByTestId('profile-state').props.children).toBe('Ada');
    expect(screen.getByTestId('loading-state').props.children).toBe('ready');
    expect(screen.getByTestId('hydration-state').props.children).toBe('hydrated');
  });

  it('resolves bootstrap loading when an existing session profile fetch fails', async () => {
    currentSession = {
      access_token: 'token-1',
      refresh_token: 'refresh-1',
      user: { id: 'user-1', email: 'ada@example.com' },
    };
    mockGetProfile.mockRejectedValue(new Error('profile fetch failed'));

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading-state').props.children).toBe('ready'));
    expect(screen.getByText('signed-in')).toBeTruthy();
    expect(screen.getByTestId('profile-state').props.children).toBe('no-profile');
    expect(screen.getByTestId('hydration-state').props.children).toBe('hydrated');
  });

  it('supports signing out and signing back in within the same provider instance', async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.press(await screen.findByTestId('oauth-trigger'));
    });

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByTestId('signout-trigger'));
    });

    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
    expect(screen.getByTestId('profile-state').props.children).toBe('no-profile');

    await act(async () => {
      fireEvent.press(screen.getByTestId('oauth-trigger'));
    });

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    expect(screen.getByTestId('profile-state').props.children).toBe('Ada');
  });

  it('settles into a signed-in no-profile state when auth state changes with no profile data', async () => {
    mockGetProfile.mockResolvedValue({ success: true, data: null });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading-state').props.children).toBe('ready'));

    await act(async () => {
      authStateChangeHandler?.('SIGNED_IN', {
        access_token: 'token-1',
        refresh_token: 'refresh-1',
        user: { id: 'user-1', email: 'ada@example.com' },
      });
    });

    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    expect(screen.getByTestId('profile-state').props.children).toBe('no-profile');
    expect(screen.getByTestId('hydration-state').props.children).toBe('hydrated');
  });

  it('uses the native email confirmation redirect for sign up', async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.press(await screen.findByTestId('signup-trigger'));
    });

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'ada@example.com',
        password: 'password-1',
        options: {
          data: { full_name: 'Ada Lovelace' },
          emailRedirectTo: 'kurecal-dev://auth/callback',
        },
      })
    );
  });

  it('uses the native recovery redirect for password reset requests', async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.press(await screen.findByTestId('reset-trigger'));
    });

    await waitFor(() =>
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', {
        redirectTo: 'kurecal-dev://auth/callback?type=recovery',
      })
    );
  });

  it('exchanges callback codes inside the native provider', async () => {
    mockUseURL.mockReturnValue('kurecal-dev://auth/callback?code=exchange-1');

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() => expect(mockExchangeCodeForSession).toHaveBeenCalledWith('exchange-1'));
    await waitFor(() => expect(screen.getByText('signed-in')).toBeTruthy());
    expect(screen.getByTestId('completion-error').props.children).toBe('no-error');
  });

  it('verifies recovery callbacks inside the native provider and queues the reset route', async () => {
    mockUseURL.mockReturnValue('kurecal-dev://auth/callback?token_hash=hash-1&type=recovery');

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'hash-1',
        type: 'recovery',
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('pending-route').props.children).toBe('/auth/reset-password')
    );
  });
});
