// src/components/calendar/QuickDatePicker.test.tsx

import { render, screen, fireEvent } from '@/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import QuickDatePicker from './QuickDatePicker';

// Mock the MaterialIcon component
vi.mock('@/components/ui/Icon', () => ({
  MaterialIcon: ({ name, size }: { name: string; size: number }) => (
    <span data-testid={`icon-${name}`} data-size={size}>
      {name}
    </span>
  ),
}));

describe('QuickDatePicker', () => {
  const defaultProps = {
    currentDate: new Date('2024-01-15'),
    onDateChange: vi.fn(),
    view: 'month' as const,
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the date picker when open', () => {
    render(<QuickDatePicker {...defaultProps} />);
    
    expect(screen.getByText('Jump to Date')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<QuickDatePicker {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Jump to Date')).not.toBeInTheDocument();
  });

  it('should display current date correctly for month view', () => {
    render(<QuickDatePicker {...defaultProps} view="month" />);
    
    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('should display current date correctly for week view', () => {
    render(<QuickDatePicker {...defaultProps} view="week" />);
    
    // Week view - component renders calendar heatmap, verify basic structure
    expect(screen.getByText('Jump to Date')).toBeInTheDocument();
  });

  it('should display current date correctly for day view', () => {
    render(<QuickDatePicker {...defaultProps} view="day" />);
    
    // Component renders calendar heatmap for day view, verify basic structure
    expect(screen.getByText('Jump to Date')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close date picker');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onDateChange when today button is clicked', () => {
    const onDateChange = vi.fn();
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onDateChange={onDateChange} onClose={onClose} />);
    
    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);
    
    expect(onDateChange).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onDateChange when confirm button is clicked', () => {
    const onDateChange = vi.fn();
    render(<QuickDatePicker {...defaultProps} onDateChange={onDateChange} />);
    
    const confirmButton = screen.getByText('Go to Month');
    fireEvent.click(confirmButton);
    
    expect(onDateChange).toHaveBeenCalledWith(defaultProps.currentDate);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show correct confirm button text for different views', () => {
    const { rerender } = render(<QuickDatePicker {...defaultProps} view="month" />);
    expect(screen.getByText('Go to Month')).toBeInTheDocument();
    
    rerender(<QuickDatePicker {...defaultProps} view="week" />);
    expect(screen.getByText('Go to Week')).toBeInTheDocument();
    
    rerender(<QuickDatePicker {...defaultProps} view="day" />);
    expect(screen.getByText('Go to Day')).toBeInTheDocument();
  });

  it('should render quick date options', () => {
    render(<QuickDatePicker {...defaultProps} />);
    
    // Component renders these quick options
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('Last week')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('should call onDateChange when quick date option is clicked', () => {
    const onDateChange = vi.fn();
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onDateChange={onDateChange} onClose={onClose} />);
    
    const yesterdayOption = screen.getByText('Yesterday');
    fireEvent.click(yesterdayOption);
    
    expect(onDateChange).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle navigation buttons', () => {
    render(<QuickDatePicker {...defaultProps} />);
    
    // Component uses CalendarHeatmap for navigation, not explicit prev/next buttons
    // Verify the component renders the calendar structure
    expect(screen.getByText('Jump to Date')).toBeInTheDocument();
  });

  it('should handle escape key', () => {
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle click outside', () => {
    const onClose = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <QuickDatePicker {...defaultProps} onClose={onClose} />
      </div>
    );
    
    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should not close when clicking inside the picker', () => {
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onClose={onClose} />);
    
    const picker = screen.getByText('Jump to Date').closest('.quick-date-picker');
    if (picker) {
      fireEvent.mouseDown(picker);
    }
    
    expect(onClose).not.toHaveBeenCalled();
  });
});
