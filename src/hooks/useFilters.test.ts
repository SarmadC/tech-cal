// src/hooks/useFilters.test.ts

import { renderHook, act } from '@testing-library/react';
// vvv ADD THIS IMPORT vvv
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useFilters } from './useFilters';
import * as NextNavigation from 'next/navigation';

// Mock the entire next/navigation module
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
}));

// Create a spy that we can reference and reset
const mockRouterReplace = vi.fn();

describe('useFilters Hook', () => {

    beforeEach(() => {
        // Reset spies before each test
        vi.clearAllMocks();

        // Set up the default mock implementations for the router hooks
        // Now that we have imported `Mock`, this cast is type-safe.
        (NextNavigation.useRouter as Mock).mockReturnValue({ replace: mockRouterReplace });
        (NextNavigation.usePathname as Mock).mockReturnValue('/calendar');
    });

    it('should correctly read initial filters from the URL', () => {
        // Arrange
        (NextNavigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams('?q=initial&categories=cat1'));

        // Act
        const { result } = renderHook(() => useFilters());

        // Assert
        expect(result.current.activeFilters.searchTerm).toBe('initial');
        expect(result.current.activeFilters.categories).toEqual(['cat1']);
    });

    it('should update the URL when setting a new search term', () => {
        // Arrange
        (NextNavigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams('?categories=cat1'));
        const { result } = renderHook(() => useFilters());

        // Act
        act(() => {
            result.current.setFilters({ searchTerm: 'new-search' });
        });

        // Assert
        expect(mockRouterReplace).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).toHaveBeenCalledWith('/calendar?categories=cat1&q=new-search');
    });

    // ... (the rest of your tests in this file remain exactly the same)
    it('should update the URL when adding a new category', () => {
        // Arrange
        (NextNavigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams('?q=initial&categories=cat1'));
        const { result } = renderHook(() => useFilters());

        // Act
        act(() => {
            result.current.setFilters({ categories: ['cat1', 'cat2'] });
        });

        // Assert
        expect(mockRouterReplace).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).toHaveBeenCalledWith('/calendar?q=initial&categories=cat1%2Ccat2');
    });

    it('should remove a filter from the URL when it is set to an empty value', () => {
        // Arrange
        (NextNavigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams('?q=initial&categories=cat1'));
        const { result } = renderHook(() => useFilters());

        // Act
        act(() => {
            result.current.setFilters({ searchTerm: '' });
        });

        // Assert
        expect(mockRouterReplace).toHaveBeenCalledTimes(1);
        expect(mockRouterReplace).toHaveBeenCalledWith('/calendar?categories=cat1');
    });

    it('should handle an empty initial URL gracefully', () => {
        // Arrange
        (NextNavigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams(''));
        const { result } = renderHook(() => useFilters());

        // Assert on initial state
        expect(result.current.activeFilters.searchTerm).toBe('');
        expect(result.current.activeFilters.categories).toEqual([]);

        // Act
        act(() => {
            result.current.setFilters({ searchTerm: 'first-search' });
        });

        // Assert on the result of the action
        expect(mockRouterReplace).toHaveBeenCalledWith('/calendar?q=first-search');
    });
});