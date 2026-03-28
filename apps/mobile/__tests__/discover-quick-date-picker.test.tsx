import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { DiscoverQuickDatePicker } from '../components/discover/DiscoverQuickDatePicker';
import { renderWithProviders } from './renderWithProviders';

describe('DiscoverQuickDatePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 9, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies a selected date range', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    renderWithProviders(
      <DiscoverQuickDatePicker
        visible
        value={{ start: null, end: null }}
        onApply={onApply}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByLabelText('Choose March 10, 2026'));
    fireEvent.press(screen.getByLabelText('Choose March 14, 2026'));
    fireEvent.press(screen.getByText('Apply range'));

    expect(onApply).toHaveBeenCalledWith({
      start: '2026-03-10',
      end: '2026-03-14',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('cancels without mutating the applied range', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    renderWithProviders(
      <DiscoverQuickDatePicker
        visible
        value={{ start: null, end: null }}
        onApply={onApply}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByLabelText('Choose March 10, 2026'));
    fireEvent.press(screen.getByText('Cancel'));

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('clears an existing range when confirmed', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    renderWithProviders(
      <DiscoverQuickDatePicker
        visible
        value={{ start: '2026-03-10', end: '2026-03-14' }}
        onApply={onApply}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByText('Clear'));
    fireEvent.press(screen.getByText('Apply range'));

    expect(onApply).toHaveBeenCalledWith({
      start: null,
      end: null,
    });
  });

  it('swaps the range when the second date is earlier than the first date', () => {
    const onApply = jest.fn();

    renderWithProviders(
      <DiscoverQuickDatePicker
        visible
        value={{ start: null, end: null }}
        onApply={onApply}
        onClose={() => undefined}
      />
    );

    fireEvent.press(screen.getByLabelText('Choose March 14, 2026'));
    fireEvent.press(screen.getByLabelText('Choose March 10, 2026'));
    fireEvent.press(screen.getByText('Apply range'));

    expect(onApply).toHaveBeenCalledWith({
      start: '2026-03-10',
      end: '2026-03-14',
    });
  });

  it('clears the draft range when the same start date is tapped twice', () => {
    const onApply = jest.fn();

    renderWithProviders(
      <DiscoverQuickDatePicker
        visible
        value={{ start: null, end: null }}
        onApply={onApply}
        onClose={() => undefined}
      />
    );

    fireEvent.press(screen.getByLabelText('Choose March 10, 2026'));
    fireEvent.press(screen.getByLabelText('Choose March 10, 2026'));
    fireEvent.press(screen.getByText('Apply range'));

    expect(onApply).toHaveBeenCalledWith({
      start: null,
      end: null,
    });
  });
});
