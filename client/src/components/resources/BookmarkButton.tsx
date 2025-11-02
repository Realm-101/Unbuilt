import React, { useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTouchFriendly } from "@/hooks/useTouchFriendly";
import { useToast } from "@/hooks/use-toast";

export interface BookmarkButtonProps {
  resourceId: number;
  isBookmarked: boolean;
  bookmarkCount?: number;
  onToggle: (resourceId: number, isBookmarked: boolean) => Promise<void>;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "default";
  showCount?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * BookmarkButton - Toggle button for bookmarking resources
 * 
 * Features:
 * - Create toggle button with filled/outline states
 * - Add optimistic updates
 * - Show bookmark count
 * - Add tooltip with status
 * 
 * Requirements: 7
 */
export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  resourceId,
  isBookmarked: initialIsBookmarked,
  bookmarkCount = 0,
  onToggle,
  size = "md",
  variant = "ghost",
  showCount = false,
  className,
  disabled = false,
}) => {
  const { isTouchDevice } = useTouchFriendly();
  const { toast } = useToast();
  
  // Local state for optimistic updates
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLoading, setIsLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(bookmarkCount);
  
  // Update local state when prop changes
  React.useEffect(() => {
    setIsBookmarked(initialIsBookmarked);
  }, [initialIsBookmarked]);
  
  React.useEffect(() => {
    setDisplayCount(bookmarkCount);
  }, [bookmarkCount]);
  
  // Handle bookmark toggle
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || isLoading) {
      return;
    }
    
    // Optimistic update
    const previousState = isBookmarked;
    const previousCount = displayCount;
    const newState = !isBookmarked;
    
    setIsBookmarked(newState);
    setDisplayCount(prev => newState ? prev + 1 : Math.max(0, prev - 1));
    setIsLoading(true);
    
    try {
      await onToggle(resourceId, newState);
      
      // Show success toast
      toast({
        title: newState ? "Bookmarked" : "Bookmark removed",
        description: newState 
          ? "Resource added to your bookmarks" 
          : "Resource removed from your bookmarks",
        duration: 2000,
      });
    } catch (error) {
      // Revert optimistic update on error
      setIsBookmarked(previousState);
      setDisplayCount(previousCount);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
      
      console.error("Failed to toggle bookmark:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get button size classes
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-7 w-7 p-0";
      case "lg":
        return "h-10 w-10 p-0";
      case "md":
      default:
        return "h-8 w-8 p-0";
    }
  };
  
  // Get icon size classes
  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "w-3.5 h-3.5";
      case "lg":
        return "w-5 h-5";
      case "md":
      default:
        return "w-4 h-4";
    }
  };
  
  // Tooltip text
  const tooltipText = isBookmarked 
    ? "Remove from bookmarks" 
    : "Add to bookmarks";
  
  const buttonContent = (
    <Button
      variant={variant}
      size="sm"
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={cn(
        getSizeClasses(),
        isTouchDevice && "min-h-[44px] min-w-[44px]",
        isBookmarked 
          ? "text-purple-400 hover:text-purple-300" 
          : "text-gray-500 hover:text-purple-400",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
      aria-label={tooltipText}
      aria-pressed={isBookmarked}
    >
      <div className="flex items-center gap-1.5">
        <Bookmark 
          className={cn(
            getIconSize(),
            isBookmarked && "fill-current",
            isLoading && "animate-pulse"
          )} 
        />
        {showCount && displayCount > 0 && (
          <span className="text-xs font-medium">
            {displayCount}
          </span>
        )}
      </div>
    </Button>
  );
  
  // Don't show tooltip on touch devices
  if (isTouchDevice) {
    return buttonContent;
  }
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{tooltipText}</p>
          {showCount && displayCount > 0 && (
            <p className="text-gray-400 mt-0.5">
              {displayCount} {displayCount === 1 ? 'bookmark' : 'bookmarks'}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
