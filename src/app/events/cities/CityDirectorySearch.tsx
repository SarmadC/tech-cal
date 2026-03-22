'use client';

import {
    MagnifyingGlass,
    X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export default function CityDirectorySearch({
    cities: _cities,
    selectedCitySlug: _selectedCitySlug,
    searchQuery,
    onSearchQueryChange,
    onChooseCity: _onChooseCity,
}: {
    cities?: unknown[];
    selectedCitySlug?: string | null;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onChooseCity?: (citySlug: string) => void;
}) {
    return (
        <section className="relative z-10">
            <div className="max-w-3xl">
                <label htmlFor="city-directory-search" className="sr-only">
                    Search city pages
                </label>
                <div className="relative">
                    <MagnifyingGlass
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground-tertiary/70"
                    />
                    <input
                        id="city-directory-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => onSearchQueryChange(event.target.value)}
                        placeholder="Search cities"
                        className={cn(
                            'h-12 w-full rounded-full border border-border-subtle bg-background-main/45 pl-11 pr-12 text-sm text-foreground-primary',
                            'placeholder:text-foreground-tertiary/60 focus:border-sky-400/30 focus:outline-none focus:ring-2 focus:ring-sky-400/20'
                        )}
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            aria-label="Clear city search"
                            onClick={() => onSearchQueryChange('')}
                            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground-tertiary transition-colors hover:bg-white/6 hover:text-foreground-primary"
                        >
                            <X size={14} weight="bold" />
                        </button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
