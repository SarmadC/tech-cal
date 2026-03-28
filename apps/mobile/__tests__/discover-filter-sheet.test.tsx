import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import {
  DiscoverFilterSheet,
  type DiscoverDraftFilters,
} from '../components/discover/DiscoverFilterSheet';
import { renderWithProviders } from './renderWithProviders';

const requestPermissionMock = Location.requestForegroundPermissionsAsync as unknown as {
  mockResolvedValue: (value: unknown) => unknown;
};
const currentPositionMock = Location.getCurrentPositionAsync as unknown as {
  mockImplementation: (fn: () => Promise<unknown>) => unknown;
};
const reverseGeocodeMock = Location.reverseGeocodeAsync as unknown as {
  mockResolvedValue: (value: unknown) => unknown;
};

const DEFAULT_FILTERS: DiscoverDraftFilters = {
  tags: [],
  location: '',
  dateRange: {
    start: null,
    end: null,
  },
  cost: 'all',
};

const COUNTS = {
  format: {
    virtual: 0,
    'in-person': 0,
    hybrid: 0,
  },
  cost: {
    free: 2,
    paid: 1,
  },
  categories: {},
  tags: {
    ai: 1,
    cloud: 2,
  },
};

const TAGS = [
  { value: 'ai', label: 'AI', count: 1 },
  { value: 'cloud', label: 'Cloud', count: 2 },
];

function FilterSheetHarness({ profileTimezone = 'America/Edmonton' }: { profileTimezone?: string | null }) {
  const [value, setValue] = useState<DiscoverDraftFilters>(DEFAULT_FILTERS);

  return (
    <DiscoverFilterSheet
      visible
      value={value}
      tags={TAGS}
      counts={COUNTS}
      resultCount={3}
      activeFilterCount={0}
      profileTimezone={profileTimezone}
      onChange={setValue}
      onApply={() => undefined}
      onClose={() => undefined}
      onReset={() => setValue(DEFAULT_FILTERS)}
    />
  );
}

describe('DiscoverFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders standard-case section headers and removes category and format controls', () => {
    renderWithProviders(<FilterSheetHarness />);

    expect(screen.queryByText('Categories')).toBeNull();
    expect(screen.queryByText('Event format')).toBeNull();
    expect(screen.getByText('Popular tags')).toBeTruthy();
    expect(screen.getByText('Date range')).toBeTruthy();

    const sectionStyle = StyleSheet.flatten(screen.getByText('Popular tags').props.style);
    expect(sectionStyle.textTransform).toBeUndefined();
  });

  it('shows a loading state while resolving the current location', () => {
    currentPositionMock.mockImplementation(() => new Promise(() => undefined));

    requestPermissionMock.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });

    renderWithProviders(<FilterSheetHarness profileTimezone="America/New_York" />);

    fireEvent.press(screen.getByText('Use current location'));
    expect(screen.getByText('Detecting location...')).toBeTruthy();
  });

  it('fills the location field from geolocation results', async () => {
    requestPermissionMock.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    currentPositionMock.mockImplementation(async () => ({
      coords: {
        latitude: 52.52,
        longitude: 13.405,
      },
    }));
    reverseGeocodeMock.mockResolvedValue([{ city: 'Berlin' }]);

    renderWithProviders(<FilterSheetHarness profileTimezone="America/New_York" />);

    await act(async () => {
      fireEvent.press(screen.getByText('Use current location'));
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Location filter').props.value).toBe('Berlin');
    });
  });

  it('falls back to timezone-derived city when device location is unavailable', async () => {
    requestPermissionMock.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    });

    renderWithProviders(<FilterSheetHarness profileTimezone="America/Edmonton" />);

    fireEvent.press(screen.getByText('Use current location'));

    await waitFor(() => {
      expect(screen.getByLabelText('Location filter').props.value).toBe('Edmonton');
    });
  });

  it('opens the quick date picker from the date range field', () => {
    renderWithProviders(<FilterSheetHarness />);

    fireEvent.press(screen.getByLabelText('Choose date range'));

    expect(screen.getByText('Select date range')).toBeTruthy();
  });
});
