/**
 * Admin Loading Skeleton Component
 * 
 * Provides consistent loading states across admin views
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-background-tertiary/50',
                className
            )}
        />
    );
}

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex gap-4 pb-2 border-b border-default">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-4 flex-1" />
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

interface CardSkeletonProps {
    count?: number;
}

export function CardSkeleton({ count = 3 }: CardSkeletonProps) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-lg border border-default bg-background-main p-4 space-y-3"
                >
                    <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, j) => (
                            <div key={j} className="space-y-1">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface MetricSkeletonProps {
    count?: number;
}

export function MetricSkeleton({ count = 4 }: MetricSkeletonProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-lg border border-default bg-background-main p-4 space-y-2"
                >
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-16" />
                </div>
            ))}
        </div>
    );
}

interface PageSkeletonProps {
    title?: boolean;
    filters?: boolean;
    metrics?: boolean;
    content?: 'table' | 'cards';
}

export function PageSkeleton({ title = true, filters = true, metrics = false, content = 'cards' }: PageSkeletonProps) {
    return (
        <div className="space-y-6">
            {title && (
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
            )}

            {filters && (
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-24" />
                </div>
            )}

            {metrics && <MetricSkeleton />}

            <div className="rounded-lg border border-default bg-background-main p-6">
                {content === 'table' ? <TableSkeleton /> : <CardSkeleton />}
            </div>
        </div>
    );
}
