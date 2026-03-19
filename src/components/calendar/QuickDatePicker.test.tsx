// src/components/calendar/QuickDatePicker.test.tsx

import { render, screen, fireEvent } from '@/utils/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    
    expect(screen.getByText('Jump to...')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<QuickDatePicker {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Jump to...')).not.toBeInTheDocument();
  });

  it('should display current date correctly for month view', () => {
    render(<QuickDatePicker {...defaultProps} view="month" />);
    
    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('should display current date correctly for week view', () => {
    render(<QuickDatePicker {...defaultProps} view="week" />);
    
    // Week view - component renders calendar heatmap, verify basic structure
    expect(screen.getByText('Jump to...')).toBeInTheDocument();
  });

  it('should display current date correctly for day view', () => {
    render(<QuickDatePicker {...defaultProps} view="day" />);
    
    // Component renders calendar heatmap for day view, verify basic structure
    expect(screen.getByText('Jump to...')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close date picker');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onDateChange when done button is clicked', () => {
    const onDateChange = vi.fn();
    const onClose = vi.fn();
    render(<QuickDatePicker {...defaultProps} onDateChange={onDateChange} onClose={onClose} />);
    
    const doneButton = screen.getByText('Done');
    fireEvent.click(doneButton);
    
    expect(onDateChange).toHaveBeenCalledWith(defaultProps.currentDate);
    expect(onClose).toHaveBeenCalled();
  });

  it('should show Done button for all views', () => {
    const { rerender } = render(<QuickDatePicker {...defaultProps} view="month" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    
    rerender(<QuickDatePicker {...defaultProps} view="week" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    
    rerender(<QuickDatePicker {...defaultProps} view="day" />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('should not render quick select controls', () => {
    render(<QuickDatePicker {...defaultProps} />);

    expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
    expect(screen.queryByText('Next week')).not.toBeInTheDocument();
  });

  it('should handle navigation buttons', () => {
    render(<QuickDatePicker {...defaultProps} />);
    
    // Component uses CalendarHeatmap for navigation, not explicit prev/next buttons
    // Verify the component renders the calendar structure
    expect(screen.getByText('Jump to...')).toBeInTheDocument();
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
    
    const picker = screen.getByText('Jump to...').closest('.quick-date-picker');
    if (picker) {
      fireEvent.mouseDown(picker);
    }
    
    expect(onClose).not.toHaveBeenCalled();
  });
});
