import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export interface EnhancedTooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delay?: number;
  interactive?: boolean;
  maxWidth?: number;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}

/**
 * EnhancedTooltip - An accessible tooltip component with smart positioning
 * 
 * Features:
 * - Wraps Radix UI Tooltip primitive
 * - Smart positioning to avoid viewport edges
 * - Keyboard accessible (focus triggers tooltip)
 * - Supports rich content (not just text)
 * - Respects reduced motion preferences
 * - Interactive mode for tooltips with clickable content
 * 
 * @example
 * ```tsx
 * <EnhancedTooltip content="This is a helpful tooltip">
 *   <Button>Hover me</Button>
 * </EnhancedTooltip>
 * ```
 */
export function EnhancedTooltip({
  children,
  content,
  side = "top",
  align = "center",
  delay = 200,
  interactive = false,
  maxWidth = 300,
  className,
  contentClassName,
  disabled = false,
}: EnhancedTooltipProps) {
  const [open, setOpen] = React.useState(false);
  
  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild>
          <span
            className={cn("inline-flex", className)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            tabIndex={0}
          >
            {children}
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={8}
            collisionPadding={8}
            style={{ maxWidth: `${maxWidth}px` }}
            className={cn(
              "z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg",
              "will-change-[transform,opacity]",
              !prefersReducedMotion && [
                "animate-in fade-in-0 zoom-in-95",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                "data-[side=bottom]:slide-in-from-top-2",
                "data-[side=left]:slide-in-from-right-2",
                "data-[side=right]:slide-in-from-left-2",
                "data-[side=top]:slide-in-from-bottom-2",
              ],
              contentClassName
            )}
            onPointerDownOutside={(e) => {
              if (!interactive) {
                setOpen(false);
              }
            }}
          >
            {typeof content === 'string' ? (
              <p className="leading-relaxed">{content}</p>
            ) : (
              content
            )}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/**
 * EnhancedTooltipContent - For use with custom tooltip implementations
 * Provides the styled content wrapper with smart positioning
 */
export const EnhancedTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    maxWidth?: number;
  }
>(({ className, sideOffset = 8, maxWidth = 300, children, ...props }, ref) => {
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={8}
      style={{ maxWidth: `${maxWidth}px` }}
      className={cn(
        "z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg",
        "will-change-[transform,opacity]",
        !prefersReducedMotion && [
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2",
          "data-[side=top]:slide-in-from-bottom-2",
        ],
        className
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-border" />
    </TooltipPrimitive.Content>
  );
});
EnhancedTooltipContent.displayName = "EnhancedTooltipContent";

// Re-export Radix primitives for advanced use cases
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipPortal = TooltipPrimitive.Portal;
