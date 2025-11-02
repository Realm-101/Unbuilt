import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainNavigation } from './MainNavigation';
import type { UserRole } from '@/stores/userPreferencesStore';

interface MobileNavigationProps {
  user: {
    plan?: string;
    role?: UserRole;
    firstName?: string;
    email?: string;
  } | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function MobileNavigation({
  user,
  currentPath,
  onNavigate,
  className,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on navigation
  const handleNavigate = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sheetRef.current &&
        !sheetRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('lg:hidden', className)}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[400px] p-0"
        ref={sheetRef}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-left">
            {user ? (
              <div className="flex flex-col space-y-1">
                <span className="text-lg font-semibold">
                  {user.firstName || 'Menu'}
                </span>
                <span className="text-sm text-muted-foreground font-normal">
                  {user.email}
                </span>
              </div>
            ) : (
              <span className="text-lg font-semibold">Menu</span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 py-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          <MainNavigation
            user={user}
            currentPath={currentPath}
            onNavigate={handleNavigate}
            variant="vertical"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
