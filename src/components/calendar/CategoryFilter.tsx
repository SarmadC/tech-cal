// src/components/calendar/CategoryFilter.tsx
'use client';

import { FC, useState } from 'react';
import { Check, Filter, Eye, EyeOff } from 'lucide-react';
import type { AppEventType } from '@/types';

interface CategoryFilterProps {
    categories: AppEventType[];
    selectedCategories: Set<string>;
    onToggleCategory: (categoryId: string) => void;
}

export const CategoryFilter: FC<CategoryFilterProps> = ({
    categories,
    selectedCategories,
    onToggleCategory
}) => {
    const [showAllCategories, setShowAllCategories] = useState(false);
    const displayLimit = 6;

    const handleSelectAll = () => {
        categories.forEach(category => {
            if (!selectedCategories.has(category.id)) {
                onToggleCategory(category.id);
            }
        });
    };

    const handleDeselectAll = () => {
        categories.forEach(category => {
            if (selectedCategories.has(category.id)) {
                onToggleCategory(category.id);
            }
        });
    };

    const allSelected = categories.length > 0 && categories.every(cat => selectedCategories.has(cat.id));
    const noneSelected = selectedCategories.size === 0;
    const someSelected = selectedCategories.size > 0 && !allSelected;

    const visibleCategories = showAllCategories
        ? categories
        : categories.slice(0, displayLimit);

    const hasMoreCategories = categories.length > displayLimit;

    return (
        <div className="space-y-4">
            {/* Header with bulk actions */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Event Categories
                </h3>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={allSelected ? handleDeselectAll : handleSelectAll}
                        className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                        title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                        {allSelected ? (
                            <EyeOff className="w-4 h-4" />
                        ) : (
                            <Eye className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* Selection status */}
            <div className="text-xs text-gray-500">
                {noneSelected && 'No categories selected'}
                {someSelected && `${selectedCategories.size} of ${categories.length} selected`}
                {allSelected && 'All categories selected'}
            </div>

            {/* Category list */}
            <div className="space-y-2">
                {visibleCategories.map(category => {
                    const isSelected = selectedCategories.has(category.id);

                    return (
                        <label
                            key={category.id}
                            className={`
                flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all
                ${isSelected
                                    ? 'bg-gray-700 border border-gray-600'
                                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-800 hover:border-gray-700'
                                }
              `}
                        >
                            {/* Color indicator */}
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: category.color }}
                            />

                            {/* Category info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white truncate">
                                        {category.name}
                                    </span>
                                    {category.eventCount !== undefined && (
                                        <span className="text-xs text-gray-400 ml-2">
                                            {category.eventCount}
                                        </span>
                                    )}
                                </div>
                                {category.description && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {category.description}
                                    </p>
                                )}
                            </div>

                            {/* Checkbox */}
                            <div className="flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggleCategory(category.id)}
                                    className="sr-only"
                                />
                                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-gray-500 hover:border-gray-400'
                                    }
                `}>
                                    {isSelected && (
                                        <Check className="w-3 h-3 text-white" />
                                    )}
                                </div>
                            </div>
                        </label>
                    );
                })}
            </div>

            {/* Show more/less toggle */}
            {hasMoreCategories && (
                <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="w-full text-sm text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-700"
                >
                    {showAllCategories
                        ? `Show less (${categories.length - displayLimit} hidden)`
                        : `Show ${categories.length - displayLimit} more categories`
                    }
                </button>
            )}

            {/* Quick filter actions */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
                <button
                    onClick={() => {
                        // Select only high-activity categories (if eventCount exists)
                        categories.forEach(category => {
                            const shouldSelect = (category.eventCount || 0) > 5;
                            const isSelected = selectedCategories.has(category.id);
                            if (shouldSelect && !isSelected) {
                                onToggleCategory(category.id);
                            } else if (!shouldSelect && isSelected) {
                                onToggleCategory(category.id);
                            }
                        });
                    }}
                    className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                    <Filter className="w-3 h-3" />
                    <span>Popular Categories</span>
                </button>
            </div>
        </div>
    );
};

export default CategoryFilter;