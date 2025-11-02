import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserPreferencesStore } from "@/stores/userPreferencesStore";

export interface TabDefinition {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface TabbedContentProps {
  tabs: TabDefinition[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  persistSelection?: boolean;
  persistKey?: string;
  className?: string;
  tabListClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  enableSwipeGestures?: boolean;
  lazyLoad?: boolean;
  syncWithUrl?: boolean;
}

/**
 * TabbedContent component with smooth transitions and advanced features
 * 
 * Features:
 * - Smooth tab switching with Framer Motion transitions
 * - Keyboard navigation (Arrow keys, Home, End)
 * - Lazy loading for tab content
 * - URL hash synchronization for deep linking
 * - Mobile swipe gestures using touch events
 * - State persistence in user preferences
 * 
 * Requirements: 12.1, 12.2, 8.4, 15.1
 */
export const TabbedContent = React.forwardRef<HTMLDivElement, TabbedContentProps>(
  ({
    tabs,
    defaultTab,
    onChange,
    persistSelection = false,
    persistKey,
    className,
    tabListClassName,
    tabClassName,
    contentClassName,
    enableSwipeGestures = true,
    lazyLoad = true,
    syncWithUrl = false,
  }, ref) => {
    const { expandedSections, setExpandedSection } = useUserPreferencesStore();
    const tabListRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    
    // Track which tabs have been loaded (for lazy loading)
    const [loadedTabs, setLoadedTabs] = React.useState<Set<string>>(new Set());
    
    // Touch gesture state
    const [touchStart, setTouchStart] = React.useState<number | null>(null);
    const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

    // Determine initial active tab
    const getInitialTab = (): string => {
      // 1. Check URL hash if syncWithUrl is enabled
      if (syncWithUrl && typeof window !== 'undefined') {
        const hash = window.location.hash.slice(1);
        if (hash && tabs.some(t => t.id === hash)) {
          return hash;
        }
      }
      
      // 2. Check persisted state
      if (persistSelection && persistKey) {
        const persisted = expandedSections[`tab-${persistKey}`];
        if (persisted && tabs.some(t => t.id === persisted)) {
          return persisted as string;
        }
      }
      
      // 3. Use defaultTab
      if (defaultTab && tabs.some(t => t.id === defaultTab)) {
        return defaultTab;
      }
      
      // 4. Fall back to first non-disabled tab
      return tabs.find(t => !t.disabled)?.id || tabs[0]?.id || '';
    };

    const [activeTab, setActiveTab] = React.useState<string>(getInitialTab);

    // Mark initial tab as loaded
    React.useEffect(() => {
      if (activeTab) {
        setLoadedTabs(prev => new Set(prev).add(activeTab));
      }
    }, []);

    // Sync with URL hash
    React.useEffect(() => {
      if (!syncWithUrl || typeof window === 'undefined') return;

      const handleHashChange = () => {
        const hash = window.location.hash.slice(1);
        if (hash && tabs.some(t => t.id === hash)) {
          handleTabChange(hash);
        }
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }, [syncWithUrl, tabs]);

    const handleTabChange = (tabId: string) => {
      const tab = tabs.find(t => t.id === tabId);
      if (!tab || tab.disabled) return;

      setActiveTab(tabId);
      
      // Mark tab as loaded for lazy loading
      setLoadedTabs(prev => new Set(prev).add(tabId));
      
      // Persist selection
      if (persistSelection && persistKey) {
        setExpandedSection(`tab-${persistKey}`, tabId as any);
      }
      
      // Update URL hash
      if (syncWithUrl && typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${tabId}`);
      }
      
      // Call onChange callback
      onChange?.(tabId);
    };

    const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
      const enabledTabs = tabs.filter(t => !t.disabled);
      const currentEnabledIndex = enabledTabs.findIndex(t => t.id === tabs[currentIndex].id);
      
      let newIndex = currentEnabledIndex;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          newIndex = currentEnabledIndex > 0 ? currentEnabledIndex - 1 : enabledTabs.length - 1;
          break;
        case 'ArrowRight':
          event.preventDefault();
          newIndex = currentEnabledIndex < enabledTabs.length - 1 ? currentEnabledIndex + 1 : 0;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = enabledTabs.length - 1;
          break;
        default:
          return;
      }

      const newTab = enabledTabs[newIndex];
      if (newTab) {
        handleTabChange(newTab.id);
        // Focus the new tab button
        const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]');
        const actualIndex = tabs.findIndex(t => t.id === newTab.id);
        (tabButtons?.[actualIndex] as HTMLElement)?.focus();
      }
    };

    // Touch gesture handlers for mobile swipe
    const handleTouchStart = (e: React.TouchEvent) => {
      if (!enableSwipeGestures) return;
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!enableSwipeGestures) return;
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!enableSwipeGestures || !touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;
      
      const currentIndex = tabs.findIndex(t => t.id === activeTab);
      const enabledTabs = tabs.filter(t => !t.disabled);
      const currentEnabledIndex = enabledTabs.findIndex(t => t.id === activeTab);

      if (isLeftSwipe && currentEnabledIndex < enabledTabs.length - 1) {
        // Swipe left - go to next tab
        handleTabChange(enabledTabs[currentEnabledIndex + 1].id);
      } else if (isRightSwipe && currentEnabledIndex > 0) {
        // Swipe right - go to previous tab
        handleTabChange(enabledTabs[currentEnabledIndex - 1].id);
      }
    };

    const activeTabData = tabs.find(t => t.id === activeTab);

    return (
      <div ref={ref} className={cn("w-full", className)}>
        {/* Tab List */}
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Content tabs"
          className={cn(
            "flex items-center gap-1 border-b overflow-x-auto",
            tabListClassName
          )}
        >
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                aria-disabled={tab.disabled}
                tabIndex={isActive ? 0 : -1}
                disabled={tab.disabled}
                onClick={() => handleTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium",
                  "transition-colors whitespace-nowrap",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tab.disabled && "opacity-50 cursor-not-allowed",
                  tabClassName
                )}
              >
                {tab.icon && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {tab.icon}
                  </span>
                )}
                
                <span>{tab.label}</span>
                
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                    aria-label={`${tab.badge} items`}
                  >
                    {tab.badge}
                  </span>
                )}
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div
          ref={contentRef}
          className="relative mt-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const shouldRender = !lazyLoad || loadedTabs.has(tab.id);
              
              if (!shouldRender) return null;

              return (
                <motion.div
                  key={tab.id}
                  id={`tabpanel-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${tab.id}`}
                  hidden={!isActive}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : 10 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className={cn(
                    !isActive && "absolute inset-0 pointer-events-none",
                    contentClassName
                  )}
                >
                  {tab.content}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

TabbedContent.displayName = "TabbedContent";
