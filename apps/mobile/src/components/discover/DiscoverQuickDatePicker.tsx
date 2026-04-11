import type { MobileDiscoverDateRange } from '@kurecal/domain';

import { CalendarQuickDatePicker } from '../calendar/CalendarQuickDatePicker';

interface DiscoverQuickDatePickerProps {
  onApply: (value: MobileDiscoverDateRange) => void;
  onClose: () => void;
  presentation?: 'modal' | 'inline';
  value: MobileDiscoverDateRange;
  visible: boolean;
}

export function DiscoverQuickDatePicker({
  onApply,
  onClose,
  presentation = 'modal',
  value,
  visible,
}: DiscoverQuickDatePickerProps) {
  return (
    <CalendarQuickDatePicker
      applyLabel="Apply range"
      clearLabel="Clear"
      mode="range"
      onApply={onApply}
      onClose={onClose}
      presentation={presentation}
      title="Select date range"
      value={value}
      visible={visible}
    />
  );
}
