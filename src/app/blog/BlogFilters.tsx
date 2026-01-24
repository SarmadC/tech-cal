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

        // Use router.push to navigate
        router.push(`${pathname}${query}`);

    }, [debouncedSearchTerm, selectedCategory, pathname, router, searchParams]);


    return (
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-6 mb-12">
            {/* Category Buttons - Minimal List */}
            <div className="flex flex-wrap gap-1">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 rounded-md text-sm transition-all border ${selectedCategory === category
                            ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium shadow-sm'
                            : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-white/5'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Search Input - Glass Style */}
            <div className="w-full md:w-64 relative group">
                <label htmlFor="blog-search" className="sr-only">Search blog posts</label>
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                    id="blog-search"
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium"
                />
            </div>
        </div>
    );
}
