// src/app/blog/BlogFilters.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { useState, useEffect } from 'react';

interface BlogFiltersProps {
    categories: string[];
}

export default function BlogFilters({ categories }: BlogFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get initial state from URL
    const initialCategory = searchParams.get('category') || 'All';
    const initialSearch = searchParams.get('q') || '';

    // Local state for immediate input feedback
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [searchTerm, setSearchTerm] = useState(initialSearch);

    // Debounce search term to avoid too many navigations
    const debouncedSearchTerm = useDebounce(searchTerm, 400);

    // Effect to update URL when filters change
    useEffect(() => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));

        if (debouncedSearchTerm) {
            current.set('q', debouncedSearchTerm);
        } else {
            current.delete('q');
        }

        if (selectedCategory && selectedCategory !== 'All') {
            current.set('category', selectedCategory);
        } else {
            current.delete('category');
        }

        const search = current.toString();
        const query = search ? `?${search}` : '';

        // Use router.push to navigate, which will re-render the Server Component with new params
        router.push(`${pathname}${query}`);

    }, [debouncedSearchTerm, selectedCategory, pathname, router, searchParams]);


    return (
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search Input */}
            <div className="flex-1">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search articles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background-secondary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-foreground-primary"
                    />
                </div>
            </div>
            {/* Category Buttons */}
            <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category
                                ? 'bg-accent-primary text-white'
                                : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>
    );
}