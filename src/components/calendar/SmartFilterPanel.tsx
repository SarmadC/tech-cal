// src/components/calendar/SmartFilterPanel.tsx
import React, { FC } from 'react';
import {
    X,
    Filter,
    DollarSign,
    Users,
    TrendingUp,
    Calendar,
    Wifi,
    Star,
    CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SmartFilterOptions } from '@/hooks/useSmartFilters';

interface SmartFilterPanelProps {
    filters: SmartFilterOptions;
    onUpdateFilter: <K extends keyof SmartFilterOptions>(key: K, value: SmartFilterOptions[K]) => void;
    onResetFilters: () => void;
    onApplyQuickFilter: (filterType: string) => void;
    activeFilterCount: number;
    isOpen: boolean;
    onClose: () => void;
}

const SmartFilterPanel: FC<SmartFilterPanelProps> = ({
    filters,
    onUpdateFilter,
    onResetFilters,
    onApplyQuickFilter,
    activeFilterCount,
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    const quickFilters = [
        { id: 'this-week', label: 'This Week', icon: Calendar },
        { id: 'free-events', label: 'Free Events', icon: DollarSign },
        { id: 'virtual-only', label: 'Virtual Only', icon: Wifi },
        { id: 'no-conflicts', label: 'No Conflicts', icon: CheckCircle },
        { id: 'trending', label: 'Trending', icon: TrendingUp },
        { id: 'my-level', label: 'My Level', icon: Star },
    ];

    return (
        <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
            {/* Mobile overlay */}
            <div className="lg:hidden fixed inset-0 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-80 bg-background-elevated border-l border-border-default shadow-xl lg:relative lg:w-full lg:h-auto lg:shadow-none lg:border lg:rounded-lg overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-5 h-5 text-accent-primary" />
                        <h3 className="font-semibold text-foreground-primary">Smart Filters</h3>
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="bg-accent-primary text-white">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Quick Filters */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground-primary mb-3">Quick Filters</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {quickFilters.map(filter => {
                                const Icon = filter.icon;
                                return (
                                    <Button
                                        key={filter.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onApplyQuickFilter(filter.id)}
                                        className="flex items-center space-x-2 justify-start"
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="text-xs">{filter.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Format Filter */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground-primary mb-3">Format</h4>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'All Formats', icon: Calendar },
                                { value: 'virtual', label: 'Virtual', icon: Wifi },
                                { value: 'in-person', label: 'In-Person', icon: Users },
                                { value: 'hybrid', label: 'Hybrid', icon: Star }
                            ].map(option => (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="format"
                                        value={option.value}
                                        checked={filters.format === option.value}
                                        onChange={(e) => onUpdateFilter('format', e.target.value as SmartFilterOptions['format'])}
                                        className="text-accent-primary"
                                    />
                                    <option.icon className="w-4 h-4 text-foreground-tertiary" />
                                    <span className="text-sm text-foreground-secondary">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Cost Filter */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground-primary mb-3">Cost</h4>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'All Events' },
                                { value: 'free', label: 'Free Only' },
                                { value: 'paid', label: 'Paid Events' }
                            ].map(option => (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="cost"
                                        value={option.value}
                                        checked={filters.cost === option.value}
                                        onChange={(e) => onUpdateFilter('cost', e.target.value as SmartFilterOptions['cost'])}
                                        className="text-accent-primary"
                                    />
                                    <span className="text-sm text-foreground-secondary">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty Filter */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground-primary mb-3">Difficulty Level</h4>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'All Levels' },
                                { value: 'beginner', label: 'Beginner' },
                                { value: 'intermediate', label: 'Intermediate' },
                                { value: 'advanced', label: 'Advanced' }
                            ].map(option => (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="difficulty"
                                        value={option.value}
                                        checked={filters.difficulty === option.value}
                                        onChange={(e) => onUpdateFilter('difficulty', e.target.value as SmartFilterOptions['difficulty'])}
                                        className="text-accent-primary"
                                    />
                                    <span className="text-sm text-foreground-secondary">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Time Preference */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground-primary mb-3">Time Preference</h4>
                        <div className="space-y-2">
                            {[
                                { value: 'all', label: 'Any Time' },
                                { value: 'work-hours', label: 'Work Hours (9-5)' },
                                { value: 'after-hours', label: 'After Hours' },
                                { value: 'weekends', label: 'Weekends' }
                            ].map(option => (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="timePreference"
                                        value={option.value}
                                        checked={filters.timePreference === option.value}
                                        onChange={(e) => onUpdateFilter('timePreference', e.target.value as SmartFilterOptions['timePreference'])}
                                        className="text-accent-primary"
                                    />
                                    <span className="text-sm text-foreground-secondary">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Personal Filters */}
                    <div>
                        <h4 className="text-sm font-medium text-foreground-primary mb-3">Personal</h4>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.myTracked}
                                    onChange={(e) => onUpdateFilter('myTracked', e.target.checked)}
                                    className="text-accent-primary"
                                />
                                <span className="text-sm text-foreground-secondary">My Tracked Events</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.myNetwork}
                                    onChange={(e) => onUpdateFilter('myNetwork', e.target.checked)}
                                    className="text-accent-primary"
                                />
                                <span className="text-sm text-foreground-secondary">My Network is Attending</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.recommended}
                                    onChange={(e) => onUpdateFilter('recommended', e.target.checked)}
                                    className="text-accent-primary"
                                />
                                <span className="text-sm text-foreground-secondary">Recommended for Me</span>
                            </label>
                        </div>
                    </div>

                    {/* Reset Button */}
                    {activeFilterCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={onResetFilters}
                            className="w-full"
                        >
                            Reset All Filters
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartFilterPanel;