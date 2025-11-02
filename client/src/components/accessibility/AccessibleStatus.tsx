import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type StatusType = 'success' | 'error' | 'warning' | 'info';

interface AccessibleStatusProps {
  type: StatusType;
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

/**
 * Accessible status component that doesn't rely solely on color
 * Includes icons and text to convey meaning
 */
export function AccessibleStatus({
  type,
  children,
  showIcon = true,
  className,
}: AccessibleStatusProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: 'Success',
      className: 'text-success',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      className: 'text-error',
    },
    warning: {
      icon: AlertTriangle,
      label: 'Warning',
      className: 'text-warning',
    },
    info: {
      icon: Info,
      label: 'Information',
      className: 'text-info',
    },
  };

  const { icon: Icon, label, className: statusClassName } = config[type];

  return (
    <div
      className={cn('flex items-start gap-2', statusClassName, className)}
      role="status"
      aria-label={label}
    >
      {showIcon && <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />}
      <div className="flex-1">
        <span className="sr-only">{label}: </span>
        {children}
      </div>
    </div>
  );
}

interface ScoreIndicatorProps {
  score: number;
  maxScore?: number;
  label: string;
  className?: string;
}

/**
 * Accessible score indicator that uses both color and text
 */
export function ScoreIndicator({
  score,
  maxScore = 100,
  label,
  className,
}: ScoreIndicatorProps) {
  const percentage = (score / maxScore) * 100;
  
  const getScoreType = (): StatusType => {
    if (percentage >= 75) return 'success';
    if (percentage >= 50) return 'info';
    if (percentage >= 25) return 'warning';
    return 'error';
  };

  const getScoreLabel = (): string => {
    if (percentage >= 75) return 'Excellent';
    if (percentage >= 50) return 'Good';
    if (percentage >= 25) return 'Fair';
    return 'Poor';
  };

  const type = getScoreType();
  const scoreLabel = getScoreLabel();

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold">
          {score}/{maxScore}
        </span>
      </div>
      
      <div className="relative">
        {/* Progress bar background */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          {/* Progress bar fill */}
          <div
            className={cn(
              'h-full transition-all duration-300',
              type === 'success' && 'bg-success',
              type === 'info' && 'bg-info',
              type === 'warning' && 'bg-warning',
              type === 'error' && 'bg-error'
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={maxScore}
            aria-label={`${label}: ${score} out of ${maxScore}, ${scoreLabel}`}
          />
        </div>
        
        {/* Text label for screen readers and visual users */}
        <span className="sr-only">
          {label}: {score} out of {maxScore}, rated as {scoreLabel}
        </span>
      </div>
      
      {/* Visual label */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded',
            type === 'success' && 'bg-success/20 text-success',
            type === 'info' && 'bg-info/20 text-info',
            type === 'warning' && 'bg-warning/20 text-warning',
            type === 'error' && 'bg-error/20 text-error'
          )}
        >
          {scoreLabel}
        </span>
      </div>
    </div>
  );
}
