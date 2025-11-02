import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

export interface LoadingOverlayProps {
  /**
   * Whether the overlay is visible
   */
  isLoading: boolean;
  
  /**
   * Loading message to display
   */
  message?: string;
  
  /**
   * Additional description text
   */
  description?: string;
  
  /**
   * Whether to blur the background
   */
  blur?: boolean;
  
  /**
   * Whether to render as a full-page overlay (uses portal)
   */
  fullPage?: boolean;
  
  /**
   * Custom className for the overlay container
   */
  className?: string;
  
  /**
   * Spinner size
   */
  spinnerSize?: "sm" | "md" | "lg";
}

const spinnerSizes = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

/**
 * LoadingOverlay Component
 * 
 * Displays a loading overlay with spinner and optional message.
 * Can be used as a full-page overlay or within a container.
 * 
 * @example
 * ```tsx
 * // Full page overlay
 * <LoadingOverlay 
 *   isLoading={isLoading} 
 *   message="Loading data..." 
 *   fullPage 
 * />
 * 
 * // Container overlay
 * <div className="relative">
 *   <LoadingOverlay isLoading={isLoading} message="Loading..." />
 *   <YourContent />
 * </div>
 * ```
 */
export function LoadingOverlay({
  isLoading,
  message,
  description,
  blur = true,
  fullPage = false,
  className,
  spinnerSize = "md",
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  const overlayContent = (
    <div
      className={cn(
        "flex items-center justify-center",
        fullPage ? "fixed inset-0 z-50" : "absolute inset-0 z-10",
        blur ? "backdrop-blur-sm" : "",
        "bg-background/80",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card border shadow-lg">
        <Loader2 
          className={cn("animate-spin text-primary", spinnerSizes[spinnerSize])} 
          aria-hidden="true"
        />
        
        {message && (
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">
              {message}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        
        <span className="sr-only">
          {message || "Loading"}
        </span>
      </div>
    </div>
  );

  if (fullPage && typeof document !== "undefined") {
    return createPortal(overlayContent, document.body);
  }

  return overlayContent;
}

/**
 * useLoadingOverlay Hook
 * 
 * Convenient hook for managing loading overlay state
 * 
 * @example
 * ```tsx
 * const { isLoading, startLoading, stopLoading, LoadingOverlay } = useLoadingOverlay();
 * 
 * async function handleAction() {
 *   startLoading("Processing...");
 *   await doSomething();
 *   stopLoading();
 * }
 * 
 * return (
 *   <>
 *     <LoadingOverlay />
 *     <button onClick={handleAction}>Do Something</button>
 *   </>
 * );
 * ```
 */
export function useLoadingOverlay(defaultMessage?: string) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState(defaultMessage);
  const [description, setDescription] = React.useState<string>();

  const startLoading = React.useCallback((msg?: string, desc?: string) => {
    setIsLoading(true);
    if (msg) setMessage(msg);
    if (desc) setDescription(desc);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const updateMessage = React.useCallback((msg: string, desc?: string) => {
    setMessage(msg);
    if (desc !== undefined) setDescription(desc);
  }, []);

  const LoadingOverlayComponent = React.useCallback(
    (props: Omit<LoadingOverlayProps, "isLoading" | "message" | "description">) => (
      <LoadingOverlay
        isLoading={isLoading}
        message={message}
        description={description}
        {...props}
      />
    ),
    [isLoading, message, description]
  );

  return {
    isLoading,
    startLoading,
    stopLoading,
    updateMessage,
    LoadingOverlay: LoadingOverlayComponent,
  };
}
