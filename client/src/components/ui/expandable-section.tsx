import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPreferencesStore } from "@/stores/userPreferencesStore";

export interface ExpandableSectionProps {
  id: string;
  title: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  persistState?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

/**
 * ExpandableSection component with smooth animations and state persistence
 * 
 * Features:
 * - Smooth expand/collapse animations using Framer Motion
 * - Keyboard accessible (Enter/Space to toggle)
 * - State persistence in user preferences store
 * - ARIA attributes for screen readers
 * - Optional summary preview when collapsed
 * 
 * Requirements: 3.2, 3.4, 15.1
 */
export const ExpandableSection = React.forwardRef<
  HTMLDivElement,
  ExpandableSectionProps
>(({
  id,
  title,
  summary,
  children,
  defaultExpanded = false,
  persistState = true,
  icon,
  badge,
  className,
  headerClassName,
  contentClassName,
}, ref) => {
  const { expandedSections, setExpandedSection } = useUserPreferencesStore();
  
  // Use persisted state if available, otherwise use defaultExpanded
  const persistedExpanded = persistState ? expandedSections[id] : undefined;
  const [isExpanded, setIsExpanded] = React.useState(
    persistedExpanded !== undefined ? persistedExpanded : defaultExpanded
  );

  // Sync with persisted state when it changes
  React.useEffect(() => {
    if (persistState && persistedExpanded !== undefined) {
      setIsExpanded(persistedExpanded);
    }
  }, [persistedExpanded, persistState]);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (persistState) {
      setExpandedSection(id, newExpanded);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Toggle on Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      ref={ref}
      className={cn("border rounded-lg overflow-hidden", className)}
      data-expanded={isExpanded}
    >
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`expandable-content-${id}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer",
          "hover:bg-accent/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          headerClassName
        )}
      >
        <div className="flex items-center gap-3 flex-1">
          {icon && (
            <div className="flex-shrink-0" aria-hidden="true">
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base truncate">
                {title}
              </h3>
              {badge !== undefined && (
                <span
                  className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary"
                  aria-label={`${badge} items`}
                >
                  {badge}
                </span>
              )}
            </div>
            
            {/* Summary preview when collapsed */}
            {!isExpanded && summary && (
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {summary}
              </div>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-shrink-0 ml-2"
          aria-hidden="true"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`expandable-content-${id}`}
            role="region"
            aria-labelledby={`expandable-header-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={cn("p-4 pt-0 border-t", contentClassName)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ExpandableSection.displayName = "ExpandableSection";
