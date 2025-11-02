import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Enhanced Accordion component with smooth animations and accessibility
 * 
 * Features:
 * - Single-open accordion pattern (only one item open at a time)
 * - Smooth height animations using Framer Motion
 * - Full keyboard navigation support
 * - ARIA attributes for screen readers
 * - Respects reduced motion preferences
 * 
 * Requirements: 12.3, 12.4, 15.2
 */

export interface AccordionItemData {
  id: string;
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface EnhancedAccordionProps {
  items: AccordionItemData[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  itemClassName?: string;
  triggerClassName?: string;
  contentClassName?: string;
  type?: "single" | "multiple";
  collapsible?: boolean;
}

const EnhancedAccordion = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Root>,
  EnhancedAccordionProps
>(({
  items,
  defaultValue,
  onValueChange,
  className,
  itemClassName,
  triggerClassName,
  contentClassName,
  type = "single",
  collapsible = true,
}, ref) => {
  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const animationDuration = prefersReducedMotion ? 0 : 0.3;

  return (
    <AccordionPrimitive.Root
      ref={ref}
      type={type as any}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      collapsible={collapsible}
      className={cn("w-full space-y-2", className)}
    >
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.id}
          value={item.id}
          disabled={item.disabled}
          className={cn(
            "border rounded-lg overflow-hidden",
            "data-[state=open]:bg-accent/5",
            item.disabled && "opacity-50 cursor-not-allowed",
            itemClassName
          )}
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger
              className={cn(
                "flex flex-1 items-center justify-between p-4",
                "font-medium text-left transition-all",
                "hover:bg-accent/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                "group",
                triggerClassName
              )}
              aria-label={`Toggle ${item.title}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.icon && (
                  <div className="flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </div>
                )}
                
                <span className="flex-1 truncate">{item.title}</span>
                
                {item.badge !== undefined && (
                  <span
                    className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary flex-shrink-0"
                    aria-label={`${item.badge} items`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <motion.div
                className="flex-shrink-0 ml-2"
                animate={{ rotate: 0 }}
                aria-hidden="true"
              >
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </motion.div>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>

          <AccordionPrimitive.Content
            className={cn(
              "overflow-hidden",
              "data-[state=closed]:animate-accordion-up",
              "data-[state=open]:animate-accordion-down",
              contentClassName
            )}
            forceMount={prefersReducedMotion ? undefined : true}
          >
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animationDuration }}
              className="p-4 pt-0 border-t"
            >
              {item.content}
            </motion.div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
});

EnhancedAccordion.displayName = "EnhancedAccordion";

export { EnhancedAccordion };

// Also export individual components for more flexibility
export const AccordionRoot = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;
export const AccordionTrigger = AccordionPrimitive.Trigger;
export const AccordionContent = AccordionPrimitive.Content;
