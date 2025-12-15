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
        <div className="mb-6 filter-section">
            <button
                className="flex items-center justify-between w-full mb-3 pb-2 border-b border-white/5 group text-foreground"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="font-medium text-xs uppercase tracking-[0.16em] text-muted-foreground/80">{title}</h3>
                {isOpen ? (
                    <CaretUp size={16} className="text-muted-foreground group-hover:text-foreground" />
                ) : (
                    <CaretDown size={16} className="text-muted-foreground group-hover:text-foreground" />
                )}
            </button>

            {isOpen && (
                <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {children}
                </div>
            )}
        </div>
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
        <label className="filter-option flex items-center gap-3 cursor-pointer group text-sm text-muted-foreground rounded-lg px-2 py-2 hover:bg-white/4 transition-colors">
            <div className={`
        w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200
        ${checked
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border bg-transparent group-hover:border-foreground/50'
                }
      `}>
                {checked && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                )}
            </div>
            <input
                type="checkbox"
                className="hidden"
                checked={checked}
                onChange={onChange}
            />
            <span className={`text-sm ${checked ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {label}
            </span>
            {count !== undefined && (
                <span className="ml-auto text-xs text-muted-foreground/70">({count})</span>
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
}

// Memoize to prevent unnecessary re-renders when parent updates
const DiscoverySidebar: React.FC<DiscoverySidebarProps> = React.memo(({
    filters,
    onUpdateFilter,
    categories,
    events = [],
    counts = {}
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
        <div className="discovery-sidebar hidden lg:block w-72 flex-shrink-0 pr-8">
            <div className="discovery-sidebar-panel sticky top-6 rounded-3xl border border-border/60 bg-card/80 dark:bg-card/20 p-6 shadow-lg backdrop-blur">
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-foreground">Filters</h2>
                </div>

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
                <CheckboxOption
                    label="Any"
                    checked={filters.cost === 'all'}
                    onChange={() => onUpdateFilter('cost', 'all')}
                />
                <CheckboxOption
                    label="Free"
                    checked={filters.cost === 'free'}
                    onChange={() => onUpdateFilter('cost', 'free')}
                    count={counts.cost?.free}
                />
                <CheckboxOption
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
