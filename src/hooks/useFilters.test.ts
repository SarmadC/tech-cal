// src/hooks/useFilters.test.ts (Best Practice Version)

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFilters } from './useFilters';
import * as NextNavigation from 'next/navigation';

// Mock the entire module
vi.mock('next/navigation');

// Create spies that we can reference in our tests
const mockRouterPush = vi.fn();

describe('useFilters Hook', () => {

    beforeEach(() => {
        // Reset spies before each test
        vi.clearAllMocks();

        // Set up the default mock implementations for the router hooks
        vi.spyOn(NextNavigation, 'useRouter').mockReturnValue({ push: mockRouterPush } as any);
        vi.spyOn(NextNavigation, 'usePathname').mockReturnValue('/calendar');
    });

    it('should correctly read initial filters from the URL', () => {
        // Arrange: For this specific test, control the return value of useSearchParams
        vi.spyOn(NextNavigation, 'useSearchParams').mockReturnValue(new URLSearchParams('?q=initial&categories=cat1'));

        const { result } = renderHook(() => useFilters());

        expect(result.current.activeFilters.searchTerm).toBe('initial');
        expect(result.current.activeFilters.categories).toEqual(['cat1']);
    });

    it('should update the URL when setting a new search term', () => {
        // Arrange
        vi.spyOn(NextNavigation, 'useSearchParams').mockReturnValue(new URLSearchParams('?categories=cat1'));
        const { result } = renderHook(() => useFilters());

        // Act
        act(() => {
            result.current.setFilters({ searchTerm: 'new-search' });
        });

        // Assert
        expect(mockRouterPush).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/calendar?categories=cat1&q=new-search');
    });

    it('should update the URL when adding a new category', () => {
        // Arrange
        vi.spyOn(NextNavigation, 'useSearchParams').mockReturnValue(new URLSearchParams('?q=initial&categories=cat1'));
        const { result } = renderHook(() => useFilters());

        // Act
        act(() => {
            result.current.setFilters({ categories: ['cat1', 'cat2'] });
        });

        // Assert
        expect(mockRouterPush).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/calendar?q=initial&categories=cat1%2Ccat2');
    });

    it('should remove a filter from the URL when it is set to an empty value', () => {
        // Arrange
        vi.spyOn(NextNavigation, 'useSearchParams').mockReturnValue(new URLSearchParams('?q=initial&categories=cat1'));
        const { result } = renderHook(() => useFilters());

        // Act
        act(() => {
            result.current.setFilters({ searchTerm: '' });
        });

        // Assert
        expect(mockRouterPush).toHaveBeenCalledTimes(1);
        expect(mockRouterPush).toHaveBeenCalledWith('/calendar?categories=cat1');
    });

    it('should handle an empty initial URL gracefully', () => {
        // Arrange
        vi.spyOn(NextNavigation, 'useSearchParams').mockReturnValue(new URLSearchParams(''));
        const { result } = renderHook(() => useFilters());

        // Assert on initial state
        expect(result.current.activeFilters.searchTerm).toBe('');
        expect(result.current.activeFilters.categories).toEqual([]);

        // Act
        act(() => {
            result.current.setFilters({ searchTerm: 'first-search' });
        });

        // Assert on the result of the action
        expect(mockRouterPush).toHaveBeenCalledWith('/calendar?q=first-search');
    });
});