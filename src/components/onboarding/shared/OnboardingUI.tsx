'use client';

import React from 'react';
import { WarningCircle, X, CheckCircle, Info } from '@phosphor-icons/react';

// Shared UI components for onboarding to follow DRY principle

interface ErrorAlertProps {
  error: string;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss, className = '' }) => (
  <div className={`bg-red-50 border border-red-200 rounded-lg p-3 flex items-center ${className}`}>
    <WarningCircle size={16} className="text-red-500 mr-2 flex-shrink-0" />
    <span className="text-red-600 text-sm flex-1">{error}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="ml-2 text-red-500 hover:text-red-700 transition-colors"
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
  <div className={`bg-green-50 border border-green-200 rounded-lg p-3 flex items-center ${className}`}>
    <CheckCircle size={16} className="text-green-500 mr-2 flex-shrink-0" />
    <span className="text-green-600 text-sm flex-1">{message}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="ml-2 text-green-500 hover:text-green-700 transition-colors"
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
  <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center ${className}`}>
    <Info size={16} className="text-blue-500 mr-2 flex-shrink-0" />
    <span className="text-blue-600 text-sm flex-1">{message}</span>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="ml-2 text-blue-500 hover:text-blue-700 transition-colors"
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
  <div className={`text-center py-12 ${className}`}>
    <div className="text-gray-400 mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-4">{description}</p>
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
  <div className={`mb-6 ${className}`}>
    <div className="flex items-center space-x-3 mb-2">
      {icon && <div className="text-blue-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    {description && (
      <p className="text-sm text-gray-600">{description}</p>
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
    className={`
      p-4 rounded-lg border-2 transition-all cursor-pointer
      ${selected 
        ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `}
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
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
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
    <div className={`animate-spin ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full border-2 border-gray-300 border-t-blue-600 rounded-full" />
    </div>
  );
};

// Utility functions for common patterns
export const getProficiencyColor = (proficiency: string): string => {
  const colorMap: Record<string, string> = {
    beginner: 'bg-red-100 text-red-700 border-red-200',
    intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    advanced: 'bg-blue-100 text-blue-700 border-blue-200',
    expert: 'bg-green-100 text-green-700 border-green-200'
  };
  return colorMap[proficiency] || 'bg-gray-100 text-gray-700 border-gray-200';
};

export const getRoleColor = (role: string): string => {
  const colorMap: Record<string, string> = {
    'frontend-developer': 'border-blue-200 bg-blue-50 hover:bg-blue-100',
    'backend-developer': 'border-green-200 bg-green-50 hover:bg-green-100',
    'full-stack-developer': 'border-purple-200 bg-purple-50 hover:bg-purple-100',
    'mobile-developer': 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
    'ui-ux-designer': 'border-pink-200 bg-pink-50 hover:bg-pink-100',
    'product-manager': 'border-orange-200 bg-orange-50 hover:bg-orange-100',
    'data-scientist': 'border-teal-200 bg-teal-50 hover:bg-teal-100',
    'devops-engineer': 'border-gray-200 bg-gray-50 hover:bg-gray-100',
    'qa-engineer': 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100',
    'tech-lead': 'border-amber-200 bg-amber-50 hover:bg-amber-100',
    'project-manager': 'border-cyan-200 bg-cyan-50 hover:bg-cyan-100',
    'flexible': 'border-violet-200 bg-violet-50 hover:bg-violet-100'
  };
  return colorMap[role] || 'border-gray-200 bg-gray-50 hover:bg-gray-100';
};

