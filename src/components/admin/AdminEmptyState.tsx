/**
 * Admin Empty State Component
 * 
 * Consistent empty state UI across admin views
 */

import { MaterialIcon, IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: IconName;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'filtered' | 'error';
    className?: string;
}

export function AdminEmptyState({
    icon = 'info',
    title,
    description,
    action,
    variant = 'default',
    className,
}: EmptyStateProps) {
    const iconColors = {
        default: 'text-slate-400',
        filtered: 'text-blue-400',
        error: 'text-rose-400',
    };

    const bgColors = {
        default: 'bg-slate-800/30',
        filtered: 'bg-blue-500/10',
        error: 'bg-rose-500/10',
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-lg border border-slate-800/60 py-12 px-6 text-center',
                bgColors[variant],
                className
            )}
        >
            <div className={cn('mb-4 rounded-full p-3', bgColors[variant])}>
                <MaterialIcon name={icon} size={32} className={iconColors[variant]} />
            </div>
            <h3 className="text-lg font-medium text-slate-200">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
            {action && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="mt-4 border-slate-700 text-slate-200"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}

// Preset empty states for common scenarios
export function NoResultsEmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
    return (
        <AdminEmptyState
            icon="search"
            title="No results found"
            description="Try adjusting your search or filters to find what you're looking for."
            variant="filtered"
            action={onClearFilters ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
        />
    );
}

export function NoDataEmptyState({ entity }: { entity: string }) {
    return (
        <AdminEmptyState
            icon="info"
            title={`No ${entity} yet`}
            description={`When ${entity} are created, they will appear here.`}
            variant="default"
        />
    );
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
    return (
        <AdminEmptyState
            icon="error"
            title="Something went wrong"
            description="We couldn't load the data. Please try again."
            variant="error"
            action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
        />
    );
}

export function QueueEmptyState({ queueName }: { queueName: string }) {
    return (
        <AdminEmptyState
            icon="check-circle"
            title={`${queueName} is empty`}
            description="All items have been processed. Great job!"
            variant="default"
        />
    );
}
