import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
}

export interface ProgressBarProps {
  /**
   * Current step index (0-based)
   */
  currentStep: number;
  
  /**
   * Array of steps
   */
  steps: ProgressStep[];
  
  /**
   * Whether to show step labels
   */
  showLabels?: boolean;
  
  /**
   * Whether to show step numbers
   */
  showNumbers?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
  
  /**
   * Orientation
   */
  orientation?: "horizontal" | "vertical";
}

/**
 * ProgressBar Component
 * 
 * Displays a multi-step progress indicator with labels and descriptions.
 * 
 * @example
 * ```tsx
 * const steps = [
 *   { id: "1", label: "Validate", description: "Validating data" },
 *   { id: "2", label: "Process", description: "Processing request" },
 *   { id: "3", label: "Complete", description: "Finishing up" },
 * ];
 * 
 * <ProgressBar currentStep={1} steps={steps} />
 * ```
 */
export function ProgressBar({
  currentStep,
  steps,
  showLabels = true,
  showNumbers = true,
  className,
  orientation = "horizontal",
}: ProgressBarProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (orientation === "vertical") {
    return (
      <div className={cn("flex flex-col gap-4", className)} role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    isPending && "border-muted text-muted-foreground"
                  )}
                >
                  {showNumbers && (
                    <span className="text-sm font-medium">
                      {isCompleted ? "✓" : index + 1}
                    </span>
                  )}
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 h-12 transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              {showLabels && (
                <div className="flex-1 pb-8">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCurrent && "text-foreground",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={cn("space-y-4", className)} role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {/* Progress bar */}
      <Progress value={progress} className="h-2" />

      {/* Steps */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-2 flex-1"
            >
              {/* Step indicator */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "border-primary text-primary bg-primary/10",
                  isPending && "border-muted text-muted-foreground"
                )}
              >
                {showNumbers && (
                  <span className="text-sm font-medium">
                    {isCompleted ? "✓" : index + 1}
                  </span>
                )}
              </div>

              {/* Step label */}
              {showLabels && (
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent && "text-foreground",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && isCurrent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * useProgressBar Hook
 * 
 * Convenient hook for managing progress bar state
 * 
 * @example
 * ```tsx
 * const steps = [
 *   { id: "1", label: "Step 1" },
 *   { id: "2", label: "Step 2" },
 *   { id: "3", label: "Step 3" },
 * ];
 * 
 * const { currentStep, nextStep, prevStep, goToStep, ProgressBar } = useProgressBar(steps);
 * 
 * return (
 *   <>
 *     <ProgressBar />
 *     <button onClick={nextStep}>Next</button>
 *   </>
 * );
 * ```
 */
export function useProgressBar(steps: ProgressStep[], initialStep = 0) {
  const [currentStep, setCurrentStep] = React.useState(initialStep);

  const nextStep = React.useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const prevStep = React.useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = React.useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, steps.length - 1)));
  }, [steps.length]);

  const reset = React.useCallback(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const ProgressBarComponent = React.useCallback(
    (props: Omit<ProgressBarProps, "currentStep" | "steps">) => (
      <ProgressBar currentStep={currentStep} steps={steps} {...props} />
    ),
    [currentStep, steps]
  );

  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    reset,
    isFirstStep,
    isLastStep,
    progress,
    ProgressBar: ProgressBarComponent,
  };
}
