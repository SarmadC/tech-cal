'use client';

import { motion } from 'framer-motion';

interface CategoryBarChartProps {
    categories: {
        id: string;
        name: string;
        eventCount: number;
    }[];
}

export function CategoryBarChart({ categories }: CategoryBarChartProps) {
    // Sort categories by count descending
    const sortedCategories = [...categories].sort((a, b) => b.eventCount - a.eventCount);

    // Take top 8 to avoid overcrowding, or maybe more if scrollable. 
    // Let's do top 10 and make it scrollable if needed, but for now a simple list is good.
    const displayCategories = sortedCategories.slice(0, 10);
    const maxCount = Math.max(...displayCategories.map((c) => c.eventCount), 1);

    return (
        <div className="w-full space-y-3 pl-2 sm:pl-3">
            {displayCategories.map((category, index) => (
                <div key={category.id} className="group grid grid-cols-[132px_1fr_40px] items-center gap-4 text-xs">
                    <span className="font-medium text-foreground-secondary group-hover:text-foreground-primary transition-colors truncate text-left">
                        {category.name}
                    </span>

                    {/* Track */}
                    <div className="h-8 w-full bg-foreground-primary/5 rounded-sm overflow-hidden flex items-center px-1">
                        <motion.div
                            initial={{ width: 0 }}
                            // Minimum width of 2px
                            animate={{ width: `${Math.max((category.eventCount / maxCount) * 100, 1)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
                            className="h-6 bg-gradient-to-r from-primary/85 to-primary/55 rounded-sm group-hover:from-primary group-hover:to-primary/70 transition-all duration-300"
                        />
                    </div>

                    <span className="font-medium text-foreground-primary text-right">
                        {category.eventCount}
                    </span>
                </div>
            ))}
            {categories.length > 10 && (
                <div className="pt-2 text-center text-xs text-foreground-tertiary">
                    + {categories.length - 10} more categories
                </div>
            )}
        </div>
    );
}
