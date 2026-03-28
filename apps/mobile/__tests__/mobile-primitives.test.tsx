import { describe, expect, it } from '@jest/globals';
import { Text } from 'react-native';
import { screen } from '@testing-library/react-native';
import { ListRow } from '../components/chrome/ListRow';
import { ScreenState } from '../components/chrome/ScreenState';
import { SectionCard } from '../components/chrome/SectionCard';
import { renderWithProviders } from './renderWithProviders';

describe('mobile primitives', () => {
  it('renders a shared section card shell', () => {
    renderWithProviders(
      <SectionCard title="Subscription" detail="RevenueCat-backed access.">
        <Text>Manage subscription</Text>
      </SectionCard>
    );

    expect(screen.getByText('Subscription')).toBeTruthy();
    expect(screen.getByText('RevenueCat-backed access.')).toBeTruthy();
    expect(screen.getByText('Manage subscription')).toBeTruthy();
  });

  it('renders shared screen states and list rows', () => {
    renderWithProviders(
      <>
        <ScreenState
          mode="error"
          title="Community unavailable"
          description="Tap back in a moment."
        />
        <ListRow
          title="Blocked member"
          subtitle="Muted across the app"
          trailing={<Text>Unblock</Text>}
        />
      </>
    );

    expect(screen.getByText('Community unavailable')).toBeTruthy();
    expect(screen.getByText('Tap back in a moment.')).toBeTruthy();
    expect(screen.getByText('Blocked member')).toBeTruthy();
    expect(screen.getByText('Muted across the app')).toBeTruthy();
    expect(screen.getByText('Unblock')).toBeTruthy();
  });
});
