import { fireEvent, render, screen } from '@/utils/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MobileSearchFilter from './MobileSearchFilter';

describe('MobileSearchFilter', () => {
  const defaultProps = {
    filters: {
      searchTerm: '',
      tags: [],
      locations: [],
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

  it('renders the discovery-style filter sheet and removes the old tabbed UI', () => {
    render(<MobileSearchFilter {...defaultProps} />);

    expect(screen.getByRole('dialog', { name: 'Calendar filters' })).toBeInTheDocument();
    expect(screen.getByText('Categories and format')).toBeInTheDocument();
    expect(screen.getByText('Location and timing')).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select date range' })).toHaveTextContent('Any date');
    expect(screen.queryByText('Quick filters')).not.toBeInTheDocument();
    expect(screen.queryByText('Difficulty')).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MobileSearchFilter {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog', { name: 'Calendar filters' })).not.toBeInTheDocument();
  });

  it('calls onClose when the sheet scrim is clicked', () => {
    const onClose = vi.fn();
    render(<MobileSearchFilter {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('updates the location field from the shared location control', () => {
    render(<MobileSearchFilter {...defaultProps} />);

    const locationInput = screen.getByLabelText('Location');
    fireEvent.change(locationInput, { target: { value: 'Edmonton' } });

    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('locations', ['Edmonton']);
  });

  it('updates the format filter from the new sheet rows', () => {
    render(<MobileSearchFilter {...defaultProps} />);

    fireEvent.click(screen.getByText('Virtual'));

    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('format', 'virtual');
  });

  it('renders categories in a collapsible section and toggles them', () => {
    render(
      <MobileSearchFilter
        {...defaultProps}
        events={[
          {
            id: 'event-1',
            createdAt: '2026-03-18T10:00:00.000Z',
            title: 'Build Hackathon',
            description: 'A weekend build sprint.',
            organizer: 'Tech Cal',
            location: 'Edmonton',
            status: 'published',
            startTime: '2026-03-20T10:00:00.000Z',
            endTime: '2026-03-21T18:00:00.000Z',
            sourceUrl: 'https://example.com',
            livestreamUrl: null,
            eventTypeId: 'hackathons',
            tags: [{ id: 'tag-1', name: 'AI', color: '#00d4ff', category: 'Topic' }],
          },
        ]}
        categories={[{ id: 'hackathons', name: 'Hackathons', color: '#00d4ff', description: 'Build-focused events' }]}
      />
    );

    fireEvent.click(screen.getByText('Hackathons'));

    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('categories', ['hackathons']);
  });

  it('renders discovery tag filters when tags are present', () => {
    render(
      <MobileSearchFilter
        {...defaultProps}
        events={[
          {
            id: 'event-1',
            createdAt: '2026-03-18T10:00:00.000Z',
            title: 'Frontend Summit',
            description: 'A design systems event.',
            organizer: 'Tech Cal',
            location: 'Remote',
            status: 'published',
            startTime: '2026-03-20T10:00:00.000Z',
            endTime: '2026-03-20T16:00:00.000Z',
            sourceUrl: 'https://example.com',
            livestreamUrl: null,
            eventTypeId: 'summits',
            tags: [{ id: 'tag-1', name: 'AI', color: '#00d4ff', category: 'Topic' }],
          },
        ]}
      />
    );

    expect(screen.getByText('Popular Tags')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /AI/i }));

    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('tags', ['ai']);
  });

  it('shows the reset action when filters are active', () => {
    render(<MobileSearchFilter {...defaultProps} activeFilterCount={3} />);

    expect(screen.getByText('3 active')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));

    expect(defaultProps.onResetFilters).toHaveBeenCalled();
  });

  it('closes on escape', () => {
    const onClose = vi.fn();
    render(<MobileSearchFilter {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });

  it('trims the location value on blur', () => {
    render(<MobileSearchFilter {...defaultProps} />);

    const locationInput = screen.getByLabelText('Location');
    fireEvent.blur(locationInput, { target: { value: '  Calgary  ' } });

    expect(defaultProps.onUpdateFilter).toHaveBeenCalledWith('locations', ['Calgary']);
  });
});
