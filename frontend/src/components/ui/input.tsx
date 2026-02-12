import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full px-4 py-3 
            text-gray-900 text-base font-medium
            bg-white
            border-2 border-gray-300 rounded-lg 
            placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            transition-colors
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';