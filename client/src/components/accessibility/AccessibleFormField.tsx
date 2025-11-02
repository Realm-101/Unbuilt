import { cn } from '@/lib/utils';
import { useId } from 'react';

interface AccessibleFormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

/**
 * Accessible form field wrapper with proper ARIA attributes
 * Automatically connects labels, errors, and hints to form controls
 */
export function AccessibleFormField({
  label,
  error,
  hint,
  required = false,
  children,
  className,
}: AccessibleFormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Clone the child element and add ARIA attributes
  const childWithProps = React.cloneElement(children, {
    id,
    'aria-required': required,
    'aria-invalid': !!error,
    'aria-describedby': [
      hint ? hintId : null,
      error ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
  });

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      {childWithProps}

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Import React for cloneElement
import * as React from 'react';
