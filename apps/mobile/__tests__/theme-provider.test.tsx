import { describe, expect, it, jest } from '@jest/globals';
import { Pressable, Text } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { MobileThemeProvider, useAppTheme } from '@/providers/ThemeProvider';

function ThemeHarness() {
  const { preference, resolvedTheme, setThemePreference } = useAppTheme();

  return (
    <>
      <Text>{preference + ':' + resolvedTheme}</Text>
      <Pressable onPress={() => void setThemePreference('dark')}>
        <Text>Switch theme</Text>
      </Pressable>
    </>
  );
}

describe('MobileThemeProvider', () => {
  it('persists a theme override when the user changes appearance', async () => {
    render(
      <MobileThemeProvider>
        <ThemeHarness />
      </MobileThemeProvider>
    );

    expect(await screen.findByText(/system:/)).toBeTruthy();

    fireEvent.press(screen.getByText('Switch theme'));

    await waitFor(() => expect(screen.getByText('dark:dark')).toBeTruthy());
    expect(jest.mocked(SecureStore.setItemAsync)).toHaveBeenCalledWith('mobile-theme-preference', 'dark');
  });
});
