import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  requiresInteraction?: boolean;
  highlightElement?: boolean;
}

export interface InteractiveTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onDismiss: () => void;
  startStep?: number;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * InteractiveTour component with spotlight effect and positioning logic
 * 
 * Features:
 * - Tour overlay with spotlight effect using React Portal
 * - TourStep component with smart positioning logic
 * - Smooth scrolling to target elements
 * - Keyboard navigation (Next, Previous, Escape)
 * - Progress indicator and step counter
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  steps,
  onComplete,
  onDismiss,
  startStep = 0
}) => {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(startStep);
  const [targetPosition, setTargetPosition] = React.useState<Position | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<{ top: number; left: number } | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  
  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoPrevious = currentStepIndex > 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Calculate target element position and scroll to it
  const updateTargetPosition = React.useCallback(() => {
    if (!currentStep?.target) {
      setTargetPosition(null);
      return;
    }

    const element = document.querySelector(currentStep.target);
    if (!element) {
      console.warn(`Tour target not found: ${currentStep.target}`);
      setTargetPosition(null);
      return;
    }

    // Scroll element into view
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Wait for scroll to complete before calculating position
    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const padding = 8; // Padding around highlighted element
      
      setTargetPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });
    }, 300);
  }, [currentStep]);

  // Calculate tooltip position based on target and placement
  const updateTooltipPosition = React.useCallback(() => {
    if (!targetPosition || !tooltipRef.current) {
      setTooltipPosition(null);
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const placement = currentStep.placement || 'bottom';
    const gap = 16; // Gap between target and tooltip
    
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = targetPosition.top - tooltipRect.height - gap;
        left = targetPosition.left + (targetPosition.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetPosition.top + targetPosition.height + gap;
        left = targetPosition.left + (targetPosition.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetPosition.top + (targetPosition.height - tooltipRect.height) / 2;
        left = targetPosition.left - tooltipRect.width - gap;
        break;
      case 'right':
        top = targetPosition.top + (targetPosition.height - tooltipRect.height) / 2;
        left = targetPosition.left + targetPosition.width + gap;
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;

    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    if (top < padding) {
      top = padding;
    } else if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setTooltipPosition({ top, left });
  }, [targetPosition, currentStep.placement]);

  // Update positions when step changes
  React.useEffect(() => {
    updateTargetPosition();
  }, [updateTargetPosition]);

  // Update tooltip position when target position changes
  React.useEffect(() => {
    if (targetPosition) {
      // Small delay to ensure tooltip has rendered
      setTimeout(updateTooltipPosition, 50);
    }
  }, [targetPosition, updateTooltipPosition]);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateTargetPosition]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onDismiss();
          break;
        case 'ArrowRight':
          if (canGoNext) {
            handleNext();
          }
          break;
        case 'ArrowLeft':
          if (canGoPrevious) {
            handlePrevious();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoNext, canGoPrevious, onDismiss]);

  const handleNext = () => {
    if (canGoNext) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  // Render tour overlay using portal
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop with spotlight effect */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm">
        {/* Spotlight cutout */}
        {targetPosition && currentStep.highlightElement !== false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute"
            style={{
              top: targetPosition.top,
              left: targetPosition.left,
              width: targetPosition.width,
              height: targetPosition.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(168, 85, 247, 0.5)',
              borderRadius: '8px',
              pointerEvents: 'none'
            }}
          >
            {/* Animated border */}
            <div className="absolute inset-0 rounded-lg border-2 border-purple-500 animate-pulse" />
          </motion.div>
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepIndex}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute"
          style={tooltipPosition ? {
            top: tooltipPosition.top,
            left: tooltipPosition.left
          } : {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Card className="w-[400px] max-w-[calc(100vw-32px)] bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-purple-500/30 shadow-2xl">
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Step {currentStepIndex + 1} of {steps.length}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-white hover:bg-white/10 -mt-1 -mr-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Content */}
              <div className="mb-5">
                <p className="text-gray-200 leading-relaxed">
                  {currentStep.content}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentStepIndex
                          ? "bg-purple-500"
                          : index < currentStepIndex
                          ? "bg-purple-700"
                          : "bg-gray-600"
                      )}
                    />
                  ))}
                </div>

                {isLastStep ? (
                  <Button
                    size="sm"
                    onClick={handleComplete}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  >
                    Finish
                    <Check className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              {/* Keyboard hints */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                  Use arrow keys to navigate • Press ESC to exit
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
};
