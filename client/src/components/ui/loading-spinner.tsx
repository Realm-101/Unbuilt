import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

/**
 * LoadingSpinner Component
 * 
 * Displays an animated loading spinner with optional text.
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="md" text="Loading..." />
 * ```
 */
export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

/**
 * FullPageLoader Component
 * 
 * Displays a full-page loading overlay with spinner.
 * 
 * @example
 * ```tsx
 * <FullPageLoader text="Loading your data..." />
 * ```
 */
export function FullPageLoader({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <LoadingSpinner size="xl" text={text} />
    </div>
  );
}

/**
 * InlineLoader Component
 * 
 * Displays an inline loading spinner for buttons or small spaces.
 * 
 * @example
 * ```tsx
 * <Button disabled>
 *   <InlineLoader /> Loading...
 * </Button>
 * ```
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('w-4 h-4 animate-spin', className)} />
  );
}
