import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

/**
 * ProgressIndicator Component
 * 
 * Displays a multi-step progress indicator with step labels.
 * 
 * @example
 * ```tsx
 * <ProgressIndicator 
 *   steps={['Upload', 'Process', 'Complete']} 
 *   currentStep={1} 
 * />
 * ```
 */
export function ProgressIndicator({ 
  steps, 
  currentStep, 
  className 
}: ProgressIndicatorProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('w-full space-y-4', className)}>
      <Progress value={progress} className="h-2" />
      
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="flex flex-col items-center gap-2 flex-1"
          >
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
              index < currentStep && 'bg-primary border-primary text-primary-foreground',
              index === currentStep && 'border-primary text-primary',
              index > currentStep && 'border-muted text-muted-foreground'
            )}>
              {index < currentStep ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>
            <span className={cn(
              'text-xs text-center',
              index <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LinearProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

/**
 * LinearProgress Component
 * 
 * Displays a linear progress bar with optional label and percentage.
 * 
 * @example
 * ```tsx
 * <LinearProgress 
 *   value={75} 
 *   label="Processing..." 
 *   showPercentage 
 * />
 * ```
 */
export function LinearProgress({ 
  value, 
  max = 100, 
  label,
  showPercentage = false,
  className 
}: LinearProgressProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={cn('w-full space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && <span className="font-medium">{percentage}%</span>}
        </div>
      )}
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
