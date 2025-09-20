// src/components/calendar/MobileBottomTabNavigation.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileBottomTabNavigation from './MobileBottomTabNavigation';

// Mock the MaterialIcon component
vi.mock('@/components/ui/Icon', () => ({
  MaterialIcon: ({ name, size }: { name: string; size: number }) => (
    <span data-testid={`icon-${name}`} data-size={size}>
      {name}
    </span>
  ),
}));

describe('MobileBottomTabNavigation', () => {
    const defaultProps = {
        currentView: 'month' as const,
        onViewChange: vi.fn(),
        onToggleSidebar: vi.fn(),
        onToggleFilters: vi.fn(),
        onDateChange: vi.fn(),
        activeFilterCount: 0,
        isSidebarOpen: false,
        currentDate: new Date(),
      filters: {
        searchTerm: '',
        format: 'all' as const,
        cost: 'all' as const,
        difficulty: 'all' as const,
        myTracked: false,
        myNetwork: false,
        recommended: false,
        categories: [],
        dateRange: { start: null, end: null },
        timePreference: 'all' as const,
        availability: 'all' as const,
        popularity: 'all' as const,
        duration: 'all' as const,
        sortBy: 'default' as const,
      },
        onUpdateFilter: vi.fn(),
        onResetFilters: vi.fn(),
        onApplyQuickFilter: vi.fn(),
        searchSuggestions: [],
        onSearchSuggestionSelect: vi.fn(),
    };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component with all navigation elements', () => {
    render(<MobileBottomTabNavigation {...defaultProps} />);
    
    // Check for header elements
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByLabelText('Open sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Open search and filters')).toBeInTheDocument();
    
    // Check for bottom tab buttons
    expect(screen.getByLabelText('Switch to Month view')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to Week view')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to Day view')).toBeInTheDocument();
  });

  it('should show active state for current view', () => {
    render(<MobileBottomTabNavigation {...defaultProps} currentView="week" />);
    
    const weekButton = screen.getByLabelText('Switch to Week view');
    expect(weekButton).toHaveClass('active');
  });

  it('should call onViewChange when tab is clicked', () => {
    const onViewChange = vi.fn();
    render(<MobileBottomTabNavigation {...defaultProps} onViewChange={onViewChange} />);
    
    const dayButton = screen.getByLabelText('Switch to Day view');
    fireEvent.click(dayButton);
    
    expect(onViewChange).toHaveBeenCalledWith('day');
  });

  it('should call onToggleSidebar when sidebar button is clicked', () => {
    const onToggleSidebar = vi.fn();
    render(<MobileBottomTabNavigation {...defaultProps} onToggleSidebar={onToggleSidebar} />);
    
    const sidebarButton = screen.getByLabelText('Open sidebar');
    fireEvent.click(sidebarButton);
    
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it('should open search filter when search button is clicked', () => {
    render(<MobileBottomTabNavigation {...defaultProps} />);
    
    const searchButton = screen.getByLabelText('Open search and filters');
    fireEvent.click(searchButton);
    
    // The search filter modal should be rendered
    expect(screen.getByText('Search & Filters')).toBeInTheDocument();
  });

  it('should show filter badge when activeFilterCount > 0', () => {
    render(<MobileBottomTabNavigation {...defaultProps} activeFilterCount={3} />);
    
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show correct sidebar button state when sidebar is open', () => {
    render(<MobileBottomTabNavigation {...defaultProps} isSidebarOpen={true} />);
    
    expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Open sidebar')).not.toBeInTheDocument();
  });

  it('should render all view options with correct icons', () => {
    render(<MobileBottomTabNavigation {...defaultProps} />);
    
    // Check that all expected icons are rendered
    expect(screen.getByTestId('icon-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('icon-event')).toBeInTheDocument();
    expect(screen.getByTestId('icon-time')).toBeInTheDocument();
    expect(screen.getByTestId('icon-menu')).toBeInTheDocument();
    expect(screen.getByTestId('icon-search')).toBeInTheDocument();
  });
});
