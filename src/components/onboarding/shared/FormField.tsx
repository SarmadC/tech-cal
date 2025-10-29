'use client';

import React from 'react';

// Shared form field components extracted from CareerOnboarding
// These ensure consistent styling across onboarding and quick-edit modals

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  description,
  error,
  required = false,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm opacity-70">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
};

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  error,
  className = '',
  ...props
}) => {
  return (
    <input
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
        error ? 'border-red-500' : ''
      } ${className}`}
      {...props}
    />
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  error,
  className = '',
  children,
  ...props
}) => {
  return (
    <select
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent transition-colors ${
        error ? 'border-red-500' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

interface CheckboxGroupProps {
  label: string;
  description?: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onChange: (values: string[]) => void;
  columns?: 1 | 2;
  className?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  description,
  options,
  selectedValues,
  onChange,
  columns = 2,
  className = ''
}) => {
  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium mb-3">
          {label}
        </label>
        {description && (
          <p className="text-sm opacity-70 mb-3">{description}</p>
        )}
        <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {options.map((option) => (
            <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                className="accent-primary"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// Green pill-style badge for completed states and learning goals
interface GreenBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export const GreenBadge: React.FC<GreenBadgeProps> = ({
  children,
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
      style={{
        backgroundColor: 'var(--success-light)',
        borderColor: 'var(--success)',
        color: 'var(--success)',
        boxShadow: 'var(--shadow-xs)'
      }}
    >
      {children}
    </span>
  );
};

// Section header component for consistent spacing and typography
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  timeEstimate?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  timeEstimate,
  className = ''
}) => {
  return (
    <div className={`text-center mb-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-1">{title}</h2>
      {timeEstimate && (
        <p className="text-sm opacity-70 mb-0">{timeEstimate}</p>
      )}
      {subtitle && (
        <p className="opacity-80 mt-2">{subtitle}</p>
      )}
    </div>
  );
};
