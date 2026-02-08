// src/app/blog/BlogFilters.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { useState, useEffect } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/[0.08] pb-4">
            {/* Category Buttons - Linear Style: Segmented Control feel */}
            <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar p-1">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-200 ${selectedCategory === category
                            ? 'bg-white/[0.08] text-zinc-100 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Search Input - Linear Style: Minimal, icon-driven, subtle background */}
            <div className="w-full md:w-64 relative group">
                <label htmlFor="blog-search" className="sr-only">Search</label>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlass size={16} className="text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
                </div>
                <input
                    id="blog-search"
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 pr-3 py-1.5 bg-transparent border border-transparent rounded-lg leading-5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:bg-white/[0.04] focus:border-white/[0.08] focus:text-zinc-100 focus:placeholder-zinc-500 sm:text-sm transition-all duration-200"
                />
            </div>
        </div>
    );
}
