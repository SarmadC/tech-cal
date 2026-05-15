'use client';

import React from 'react';
import { WarningCircle, X, CheckCircle, Info } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';

// Shared UI components for onboarding to follow DRY principle

interface ErrorAlertProps {
    error: string;
    onDismiss?: () => void;
    className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss, className = '' }) => (
    <div className={twMerge("bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center", className)}>
        <WarningCircle size={16} className="text-red-400 mr-2 flex-shrink-0" />
        <span className="text-red-200 text-sm flex-1">{error}</span>
        {onDismiss && (
            <button
                onClick={onDismiss}
                className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                type="button"
                title="Dismiss error"
            >
                <X size={16} />
            </button>
        )}
    </div>
);

interface SuccessAlertProps {
    message: string;
    onDismiss?: () => void;
    className?: string;
}

export const SuccessAlert: React.FC<SuccessAlertProps> = ({ message, onDismiss, className = '' }) => (
    <div className={twMerge("bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center", className)}>
        <CheckCircle size={16} className="text-emerald-400 mr-2 flex-shrink-0" />
        <span className="text-emerald-200 text-sm flex-1">{message}</span>
        {onDismiss && (
            <button
                onClick={onDismiss}
                className="ml-2 text-emerald-400 hover:text-emerald-300 transition-colors"
                type="button"
                title="Dismiss message"
            >
                <X size={16} />
            </button>
        )}
    </div>
);

interface InfoAlertProps {
    message: string;
    onDismiss?: () => void;
    className?: string;
}

export const InfoAlert: React.FC<InfoAlertProps> = ({ message, onDismiss, className = '' }) => (
    <div className={twMerge("bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center", className)}>
        <Info size={16} className="text-blue-400 mr-2 flex-shrink-0" />
        <span className="text-blue-200 text-sm flex-1">{message}</span>
        {onDismiss && (
            <button
                onClick={onDismiss}
                className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                type="button"
                title="Dismiss message"
            >
                <X size={16} />
            </button>
        )}
    </div>
);

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = ''
}) => (
    <div className={twMerge("text-center py-12", className)}>
        <div className="text-muted-foreground mb-4 flex justify-center opacity-50">
            {icon}
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
        {action}
    </div>
);

interface SectionHeaderProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    description,
    icon,
    className = ''
}) => (
    <div className={twMerge("mb-6", className)}>
        <div className="flex items-center space-x-3 mb-2">
            {icon && <div className="text-primary">{icon}</div>}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
        )}
    </div>
);

interface CardProps {
    children: React.ReactNode;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
    children,
    selected = false,
    onClick,
    className = '',
    disabled = false
}) => (
    <div
        className={twMerge(
            "p-4 rounded-lg border transition-all cursor-pointer relative overflow-hidden",
            selected
                ? "ring-1 ring-border border-transparent bg-secondary"
                : "border-border/50 bg-secondary/30 hover:bg-secondary/50 hover:border-border hover:shadow-lg",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}
        onClick={disabled ? undefined : onClick}
    >
        {children}
    </div>
);

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    className = ''
}) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full border';

    const variantClasses = {
        default: 'bg-secondary/50 border-border/50 text-muted-foreground',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        error: 'bg-red-500/10 border-red-500/20 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm'
    };

    return (
        <span className={twMerge(baseClasses, variantClasses[variant], sizeClasses[size], className)}>
            {children}
        </span>
    );
};

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    return (
        <BrandLoadingLogo
            className={twMerge("text-foreground", sizeClasses[size], className)}
            inline
            size={size === 'sm' ? 16 : size === 'md' ? 24 : 32}
        />
    );
};

// Utility functions for common patterns
export const getProficiencyColor = (proficiency: string): string => {
    // Not returning classes here anymore, but could be used for specific styling logic if needed
    // Using explicit classes in components is often better for Tailwind
    return '';
};

export const getRoleColor = (role: string): string => {
    // Return neutral base classes that will be overridden by state
    // We want a unified look, not rainbow cards unless selected or specifically highlighted
    return 'border-border/50 bg-secondary/30 hover:bg-secondary/50';
};
