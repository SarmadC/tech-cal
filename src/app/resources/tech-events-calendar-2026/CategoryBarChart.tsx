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
    const maxCount = Math.max(...displayCategories.map(c => c.eventCount), 1);

    return (
        <div className="w-full space-y-3">
            {displayCategories.map((category, index) => (
                <div key={category.id} className="relative group">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground-secondary group-hover:text-foreground-primary transition-colors truncate pr-2">
                            {category.name}
                        </span>
                        <span className="font-mono text-foreground-tertiary">
                            {category.eventCount}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(category.eventCount / maxCount) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
                            className="h-full bg-gradient-to-r from-primary/85 to-primary/55 rounded-full group-hover:from-primary group-hover:to-primary/70 transition-all duration-300"
                        />
                    </div>
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
