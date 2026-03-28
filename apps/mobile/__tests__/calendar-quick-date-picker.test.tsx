import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { CalendarQuickDatePicker } from '../components/calendar/CalendarQuickDatePicker';
import { renderWithProviders } from './renderWithProviders';

describe('CalendarQuickDatePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 9, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies a selected date in single mode', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    renderWithProviders(
      <CalendarQuickDatePicker
        mode="single"
        visible
        value={null}
        onApply={onApply}
        onClose={onClose}
      />
    );

    fireEvent.press(screen.getByLabelText('Choose March 14, 2026'));
    fireEvent.press(screen.getByText('Go to date'));

    expect(onApply).toHaveBeenCalledWith('2026-03-14');
    expect(onClose).toHaveBeenCalled();
  });

  it('clears the selected date when confirmed', () => {
    const onApply = jest.fn();

    renderWithProviders(
      <CalendarQuickDatePicker
        mode="single"
        visible
        value="2026-03-14"
        onApply={onApply}
        onClose={() => undefined}
      />
    );

    fireEvent.press(screen.getByText('Clear'));
    fireEvent.press(screen.getByText('Go to date'));

    expect(onApply).toHaveBeenCalledWith(null);
  });
});
