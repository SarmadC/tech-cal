'use client';

import React from 'react';
import { CheckCircle } from '@phosphor-icons/react';

interface RadioGroupOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  id: string;
  name: string;
  options: RadioGroupOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  ariaDescribedBy?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  id,
  name,
  options,
  value,
  onChange,
  label,
  hint,
  error,
  required = false,
  ariaDescribedBy: _ariaDescribedBy
}) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-3">
      {label && (
        <label htmlFor={`${id}-0`} className="block text-sm font-medium text-gray-900">
          {label}
          {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      {hint && (
        <p id={hintId} className="text-sm text-gray-600">
          {hint}
        </p>
      )}
      
      <div
        role="radiogroup"
        id={id}
        aria-describedby={describedBy}
        aria-required={required}
        className="space-y-2"
      >
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          const isSelected = value === option.value;
          
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={`
                flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer
                transition-all duration-200 min-h-[44px]
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
              `}
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              
              <div className="flex-shrink-0">
                {isSelected ? (
                  <CheckCircle size={20} className="text-blue-600" weight="fill" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    {option.description}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
