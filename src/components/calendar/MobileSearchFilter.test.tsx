// src/components/calendar/MobileSearchFilter.test.tsx

import { render, screen, fireEvent, waitFor } from '@/utils/test-utils';
import { describe, it, expect, vi } from 'vitest';
import MobileSearchFilter from './MobileSearchFilter';

// Mock the MaterialIcon component
vi.mock('@/components/ui/Icon', () => ({
  MaterialIcon: ({ name, size }: { name: string; size: number }) => (
    <span data-testid={`icon-${name}`} data-size={size}>
      {name}
    </span>
  ),
}));

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant }: { children: React.ReactNode; onClick: () => void; className: string; variant: string }) => (
    <button onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock the Badge component
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant: string; className: string }) => (
    <span className={className} data-variant={variant}>
      {children}
    </span>
  ),
}));

// Mock the useDebounce hook
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: unknown) => value,
}));

describe('MobileSearchFilter', () => {
  const defaultProps = {
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
    activeFilterCount: 0,
    isOpen: true,
    onClose: vi.fn(),
    events: [],
    categories: [],
    onSearchSuggestionSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the search filter when open', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    expect(screen.getByText('Search & Filters')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<MobileSearchFilter {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Search & Filters')).not.toBeInTheDocument();
  });

  it('should show search tab by default', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    const searchTab = screen.getByText('Search').closest('button');
    expect(searchTab).toHaveClass('active');
  });

  it('should switch to filters tab when clicked', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    const filtersTab = screen.getByText('Filters');
    fireEvent.click(filtersTab);
    
    expect(filtersTab.closest('button')).toHaveClass('active');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<MobileSearchFilter {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close search and filters');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle search input changes', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search events, organizers, topics...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    expect(searchInput).toHaveValue('test search');
  });

  it('should show search suggestions when provided', () => {
    const _suggestions = [
      { id: '1', title: 'Test Event', type: 'event' as const },
      { id: '2', title: 'Test Organizer', type: 'organizer' as const },
    ];
    
    render(<MobileSearchFilter {...defaultProps} events={[]} categories={[]} />);
    
    const searchInput = screen.getByPlaceholderText('Search events, organizers, topics...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.focus(searchInput);
    
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Organizer')).toBeInTheDocument();
  });

  it('should call onSearchSuggestionSelect when suggestion is clicked', () => {
    const onSearchSuggestionSelect = vi.fn();
    const suggestions = [
      { id: '1', title: 'Test Event', type: 'event' as const },
    ];
    
    render(<MobileSearchFilter {...defaultProps} events={[]} categories={[]} onSearchSuggestionSelect={onSearchSuggestionSelect} />);
    
    const searchInput = screen.getByPlaceholderText('Search events, organizers, topics...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.focus(searchInput);
    
    const suggestion = screen.getByText('Test Event');
    fireEvent.click(suggestion);
    
    expect(onSearchSuggestionSelect).toHaveBeenCalledWith(suggestions[0]);
  });

  it('should clear search input when clear button is clicked', () => {
    render(<MobileSearchFilter {...defaultProps} filters={{ ...defaultProps.filters, searchTerm: 'test' }} />);
    
    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);
    
    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('searchTerm', '');
  });

  it('should render quick filter buttons', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('Free Events')).toBeInTheDocument();
    expect(screen.getByText('Virtual')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('should call onApplyQuickFilter when quick filter is clicked', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    const quickFilter = screen.getByText('This Week');
    fireEvent.click(quickFilter);
    
    expect(defaultProps.onApplyQuickFilter).toHaveBeenCalledWith('this-week');
  });

  it('should render filter options in filters tab', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    // Switch to filters tab
    const filtersTab = screen.getByText('Filters');
    fireEvent.click(filtersTab);
    
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Cost')).toBeInTheDocument();
    expect(screen.getByText('Difficulty Level')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('should call onUpdateFilter when filter option is changed', () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    // Switch to filters tab
    const filtersTab = screen.getByText('Filters');
    fireEvent.click(filtersTab);
    
    const virtualOption = screen.getByDisplayValue('virtual');
    fireEvent.click(virtualOption);
    
    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('format', 'virtual');
  });

  it('should show reset button when filters are active', () => {
    render(<MobileSearchFilter {...defaultProps} activeFilterCount={2} />);
    
    // Switch to filters tab
    const filtersTab = screen.getByText('Filters');
    fireEvent.click(filtersTab);
    
    expect(screen.getByText('Reset All Filters')).toBeInTheDocument();
  });

  it('should call onResetFilters when reset button is clicked', () => {
    render(<MobileSearchFilter {...defaultProps} activeFilterCount={2} />);
    
    // Switch to filters tab
    const filtersTab = screen.getByText('Filters');
    fireEvent.click(filtersTab);
    
    const resetButton = screen.getByText('Reset All Filters');
    fireEvent.click(resetButton);
    
    expect(defaultProps.onResetFilters).toHaveBeenCalled();
  });

  it('should show filter count badge when active', () => {
    render(<MobileSearchFilter {...defaultProps} activeFilterCount={3} />);
    
    expect(screen.getAllByText('3')).toHaveLength(2); // Header badge and tab badge
  });

  it('should handle escape key', () => {
    const onClose = vi.fn();
    render(<MobileSearchFilter {...defaultProps} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should focus search input when search tab is active', async () => {
    render(<MobileSearchFilter {...defaultProps} />);
    
    // Wait for the focus effect to complete
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search events, organizers, topics...');
      expect(searchInput).toHaveFocus();
    }, { timeout: 1000 });
  });
});
