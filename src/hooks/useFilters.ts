// src/hooks/useFilters.ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { EventFilters } from '@/types';

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // --- Read filters from the current URL ---
  const searchTerm = searchParams.get('q') || '';
  const categories = searchParams.get('categories')?.split(',') || [];
  
  // Combine into a single filter object
  const activeFilters: EventFilters = {
    searchTerm,
    categories,
  };

  // --- Create a function to update the URL ---
  const setFilters = useCallback(
    (newFilters: Partial<EventFilters>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      // Update search term
      if (newFilters.searchTerm !== undefined) {
        if (newFilters.searchTerm) {
          current.set('q', newFilters.searchTerm);
        } else {
          current.delete('q');
        }
      }

      // Update categories
      if (newFilters.categories !== undefined) {
        if (newFilters.categories.length > 0) {
          current.set('categories', newFilters.categories.join(','));
        } else {
          current.delete('categories');
        }
      }
      
      const search = current.toString();
      const query = search ? `?${search}` : '';

      router.push(`${pathname}${query}`);
    },
    [searchParams, pathname, router]
  );

  return {
    activeFilters,
    setFilters,
  };
}