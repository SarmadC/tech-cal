'use client';

import React from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { EventType } from '@/types';
import { UnifiedFilterOptions, UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import TagCloud from './TagCloud';
import '@/app/styles/discovery-sidebar.css';

interface FilterSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className="filter-section filter-section-with-margin">
            {/* Divider removed for cleaner look */}
            <button
                className="flex items-center justify-between w-full mb-2 py-1 group text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{title}</h3>
                {isOpen ? (
                    <CaretUp size={12} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                ) : (
                    <CaretDown size={12} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                )}
            </button>

            {isOpen && (
                <div className="space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

interface RadioButtonOptionProps {
    label: string;
    count?: number;
    checked: boolean;
    onChange: () => void;
}

const RadioButtonOption: React.FC<RadioButtonOptionProps> = ({ label, count, checked, onChange }) => {
    return (
        <label className={`filter-option flex items-center justify-between h-7 px-2 rounded-md cursor-pointer group transition-all duration-150 ease-in-out ${checked
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`
                    w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150 flex-shrink-0
                    ${checked
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]'
                        : 'border-border bg-transparent group-hover:border-border-strong'
                    }
                `}>
                    {checked && (
                        <div className="w-[8px] h-[8px] rounded-full bg-[var(--brand-primary-foreground)]" />
                    )}
                </div>
                <input
                    type="radio"
                    className="hidden"
                    checked={checked}
                    onChange={onChange}
                />
                <span className="text-sm truncate">
                    {label}
                </span>
            </div>
            {count !== undefined && (
                <span className="text-xs tabular-nums text-[#525252] ml-2 flex-shrink-0">{count}</span>
            )}
        </label>
    );
};

interface CheckboxOptionProps {
    label: string;
    count?: number;
    checked: boolean;
    onChange: () => void;
}

const CheckboxOption: React.FC<CheckboxOptionProps> = ({ label, count, checked, onChange }) => {
    return (
        <label className={`filter-option flex items-center justify-between h-7 px-2 rounded-md cursor-pointer group transition-all duration-150 ease-in-out ${checked
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`
                    w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all duration-150 flex-shrink-0
                    ${checked
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]'
                        : 'border-border bg-transparent group-hover:border-border-strong'
                    }
                `}>
                    {checked && (
                        <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" className="text-[var(--brand-primary-foreground)]" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
                <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={onChange}
                />
                <span className="text-sm truncate">
                    {label}
                </span>
            </div>
            {count !== undefined && (
                <span className="text-xs tabular-nums text-[#525252] ml-2 flex-shrink-0">{count}</span>
            )}
        </label>
    );
};

export interface DiscoverySidebarProps {
    filters: Pick<UnifiedFilterOptions, 'format' | 'cost' | 'categories' | 'tags'>;
    onUpdateFilter: UpdateFilterHandler;
    categories: EventType[];
    events?: Array<{
        id: string;
        tags?: Array<{
            id: string;
            name: string;
            color?: string;
            category?: string;
        }>;
    }>;
    counts?: {
        format?: Record<string, number>;
        cost?: Record<string, number>;
        categories?: Record<string, number>;
    };
    mobileMode?: boolean;
}

// Memoize to prevent unnecessary re-renders when parent updates
const DiscoverySidebar: React.FC<DiscoverySidebarProps> = React.memo(({
    filters,
    onUpdateFilter,
    categories,
    events = [],
    counts = {},
    mobileMode = false
}) => {

    const toggleCategory = (catId: string) => {
        const current = filters.categories || [];
        const updated = current.includes(catId)
            ? current.filter(id => id !== catId)
            : [...current, catId];
        onUpdateFilter('categories', updated);
    };

    const toggleTag = (tagName: string) => {
        const current = filters.tags || [];
        const updated = current.includes(tagName)
            ? current.filter(tag => tag !== tagName)
            : [...current, tagName];
        onUpdateFilter('tags', updated);
    };

    return (
        <div className={`discovery-sidebar ${mobileMode ? 'w-full block' : 'hidden lg:block w-64 flex-shrink-0 pr-6'}`}>
            <div className={mobileMode ? "" : "discovery-sidebar-panel sticky top-6"}>
                {/* Header removed for cleaner look */}

                <FilterSection title="Event Format">
                    <CheckboxOption
                        label="All"
                        checked={filters.format === 'all'}
                        onChange={() => onUpdateFilter('format', 'all')}
                    />
                    <CheckboxOption
                        label="Virtual"
                        checked={filters.format === 'virtual'}
                        onChange={() => onUpdateFilter('format', 'virtual')}
                        count={counts.format?.virtual}
                    />
                    <CheckboxOption
                        label="In-Person"
                        checked={filters.format === 'in-person'}
                        onChange={() => onUpdateFilter('format', 'in-person')}
                        count={counts.format?.['in-person']}
                    />
                    <CheckboxOption
                        label="Hybrid"
                        checked={filters.format === 'hybrid'}
                        onChange={() => onUpdateFilter('format', 'hybrid')}
                        count={counts.format?.hybrid}
                    />
                </FilterSection>

                <FilterSection title="Cost">
                    <RadioButtonOption
                        label="Any"
                        checked={filters.cost === 'all'}
                        onChange={() => onUpdateFilter('cost', 'all')}
                    />
                    <RadioButtonOption
                        label="Free"
                        checked={filters.cost === 'free'}
                        onChange={() => onUpdateFilter('cost', 'free')}
                        count={counts.cost?.free}
                    />
                    <RadioButtonOption
                        label="Paid"
                        checked={filters.cost === 'paid'}
                        onChange={() => onUpdateFilter('cost', 'paid')}
                        count={counts.cost?.paid}
                    />
                </FilterSection>

                <FilterSection title="Categories">
                    {categories.map(cat => {
                        const count = counts.categories?.[cat.id];
                        if (count === 0) {
                            return null;
                        }

                        return (
                            <CheckboxOption
                                key={cat.id}
                                label={cat.name}
                                checked={filters.categories.includes(cat.id)}
                                onChange={() => toggleCategory(cat.id)}
                                count={count}
                            />
                        );
                    })}
                </FilterSection>

                {/* Tag Cloud Section */}
                {events.length > 0 && (
                    <FilterSection title="Popular Tags" defaultOpen={true}>
                        <TagCloud
                            events={events}
                            onTagClick={toggleTag}
                            selectedTags={filters.tags || []}
                            maxTags={15}
                        />
                    </FilterSection>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for arrays and objects
    const categoriesEqual = prevProps.filters.categories.length === nextProps.filters.categories.length &&
        prevProps.filters.categories.every((cat, idx) => cat === nextProps.filters.categories[idx]);

    const tagsEqual = (prevProps.filters.tags || []).length === (nextProps.filters.tags || []).length &&
        (prevProps.filters.tags || []).every((tag, idx) => tag === (nextProps.filters.tags || [])[idx]);

    const categoriesListEqual = prevProps.categories.length === nextProps.categories.length &&
        prevProps.categories.every((cat, idx) => cat.id === nextProps.categories[idx].id);

    const eventsEqual = prevProps.events?.length === nextProps.events?.length;

    return (
        prevProps.filters.format === nextProps.filters.format &&
        prevProps.filters.cost === nextProps.filters.cost &&
        categoriesEqual &&
        tagsEqual &&
        categoriesListEqual &&
        eventsEqual &&
        prevProps.counts?.format === nextProps.counts?.format &&
        prevProps.counts?.cost === nextProps.counts?.cost &&
        prevProps.counts?.categories === nextProps.counts?.categories
    );
});

DiscoverySidebar.displayName = 'DiscoverySidebar';

export default DiscoverySidebar;
