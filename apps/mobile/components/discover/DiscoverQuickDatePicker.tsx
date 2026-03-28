import type { MobileDiscoverDateRange } from '@kurecal/domain';
import { CalendarQuickDatePicker } from '@/components/calendar/CalendarQuickDatePicker';

interface DiscoverQuickDatePickerProps {
  visible: boolean;
  value: MobileDiscoverDateRange;
  onApply: (value: MobileDiscoverDateRange) => void;
  onClose: () => void;
  presentation?: 'modal' | 'inline';
}

export function DiscoverQuickDatePicker({
  visible,
  value,
  onApply,
  onClose,
  presentation = 'modal',
}: DiscoverQuickDatePickerProps) {
  return (
    <CalendarQuickDatePicker
      mode="range"
      visible={visible}
      value={value}
      onApply={onApply}
      onClose={onClose}
      presentation={presentation}
      title="Select date range"
      applyLabel="Apply range"
      clearLabel="Clear"
    />
  );
}
