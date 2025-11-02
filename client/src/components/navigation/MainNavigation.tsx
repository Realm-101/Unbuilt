import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Search,
  Lightbulb,
  Activity,
  BarChart3,
  History,
  Bookmark,
  FolderOpen,
  BookOpen,
  FileText,
  GraduationCap,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  Crown,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/stores/userPreferencesStore';

export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
  requiredRole?: UserRole[];
  requiredTier?: ('free' | 'pro' | 'enterprise')[];
  description?: string;
}

interface MainNavigationProps {
  user: {
    plan?: string;
    role?: UserRole;
  } | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

// Define navigation structure
const navigationStructure: NavigationItem[] = [
  {
    id: 'discover',
    label: 'Discover',
    icon: Search,
    path: '/discover',
    description: 'Find market gaps',
    children: [
      {
        id: 'new-search',
        label: 'New Search',
        icon: Search,
        path: '/',
        description: 'Start a new gap analysis',
      },
      {
        id: 'validate-idea',
        label: 'Validate Idea',
        icon: Lightbulb,
        path: '/validate-idea',
        description: 'Test your ideas',
      },
      {
        id: 'market-trends',
        label: 'Market Trends',
        icon: Activity,
        path: '/market-trends',
        description: 'Market heat map',
      },
    ],
  },
  {
    id: 'my-work',
    label: 'My Work',
    icon: FolderOpen,
    path: '/dashboard',
    description: 'Your analyses and projects',
    children: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        path: '/dashboard',
        description: 'Overview of your work',
      },
      {
        id: 'recent-searches',
        label: 'Recent Searches',
        icon: History,
        path: '/history',
        description: 'Your search history',
      },
      {
        id: 'favorites',
        label: 'Favorites',
        icon: Bookmark,
        path: '/saved',
        description: 'Saved analyses',
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: FolderOpen,
        path: '/projects',
        description: 'Organized collections',
      },
    ],
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: BookOpen,
    path: '/resources',
    description: 'Tools and learning',
    children: [
      {
        id: 'business-tools',
        label: 'Business Tools',
        icon: BarChart3,
        path: '/analytics',
        description: 'Analytics and insights',
        requiredTier: ['pro', 'enterprise'],
      },
      {
        id: 'templates',
        label: 'Templates',
        icon: FileText,
        path: '/templates',
        description: 'Ready-to-use templates',
        requiredTier: ['pro', 'enterprise'],
      },
      {
        id: 'learning-center',
        label: 'Learning Center',
        icon: GraduationCap,
        path: '/help',
        description: 'Guides and tutorials',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: User,
    path: '/account',
    description: 'Settings and billing',
    children: [
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        path: '/account',
        description: 'Your account details',
      },
      {
        id: 'subscription',
        label: 'Subscription',
        icon: Crown,
        path: '/subscribe',
        description: 'Manage your plan',
      },
      {
        id: 'billing',
        label: 'Billing',
        icon: CreditCard,
        path: '/billing',
        description: 'Payment and invoices',
        requiredTier: ['pro', 'enterprise'],
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings',
        description: 'Preferences and options',
      },
      {
        id: 'help',
        label: 'Help',
        icon: HelpCircle,
        path: '/help',
        description: 'Support and documentation',
      },
    ],
  },
];

export function MainNavigation({
  user,
  currentPath,
  onNavigate,
  className,
  variant = 'horizontal',
}: MainNavigationProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Filter navigation items based on user tier and role
  const filterNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .map((item) => {
        // Check tier requirements
        if (item.requiredTier && user) {
          const userTier = user.plan || 'free';
          if (!item.requiredTier.includes(userTier as any)) {
            // Add upgrade badge for premium features
            return {
              ...item,
              badge: 'PRO',
            };
          }
        }

        // Check role requirements
        if (item.requiredRole && user?.role) {
          if (!item.requiredRole.includes(user.role)) {
            return null;
          }
        }

        // Recursively filter children
        if (item.children) {
          return {
            ...item,
            children: filterNavigationItems(item.children),
          };
        }

        return item;
      })
      .filter((item): item is NavigationItem => item !== null);
  };

  const filteredNavigation = filterNavigationItems(navigationStructure);

  // Flatten navigation for keyboard navigation
  const flattenedItems = React.useMemo(() => {
    const items: NavigationItem[] = [];
    const flatten = (navItems: NavigationItem[]) => {
      navItems.forEach((item) => {
        items.push(item);
        if (item.children && expandedItems.has(item.id)) {
          flatten(item.children);
        }
      });
    };
    flatten(filteredNavigation);
    return items;
  }, [filteredNavigation, expandedItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (variant === 'horizontal') return; // Only for vertical navigation

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < flattenedItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0 && focusedIndex < flattenedItems.length) {
            e.preventDefault();
            const item = flattenedItems[focusedIndex];
            handleItemClick(item);
          }
          break;
        case 'Escape':
          setFocusedIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, flattenedItems, variant]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    } else {
      // Check if item requires upgrade
      if (item.badge === 'PRO' && user?.plan === 'free') {
        onNavigate('/subscribe');
      } else {
        onNavigate(item.path);
      }
    }
  };

  const isActive = (item: NavigationItem): boolean => {
    if (item.path === currentPath) return true;
    if (item.children) {
      return item.children.some((child) => isActive(child));
    }
    return false;
  };

  const renderNavigationItem = (
    item: NavigationItem,
    level: number = 0,
    index: number
  ) => {
    const Icon = item.icon;
    const active = isActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isFocused = focusedIndex === index;
    const isPremium = item.badge === 'PRO';

    return (
      <div key={item.id} className={cn(level > 0 && 'ml-4')}>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'w-full justify-start gap-2',
            variant === 'horizontal' && 'flex-shrink-0',
            isFocused && 'ring-2 ring-primary',
            level > 0 && 'text-sm'
          )}
          onClick={() => handleItemClick(item)}
          aria-current={active ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={item.description || item.label}
        >
          <Icon className="w-4 h-4" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge
              variant={isPremium ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                isPremium && 'bg-gradient-to-r from-yellow-500 to-orange-500'
              )}
            >
              {item.badge}
            </Badge>
          )}
        </Button>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && variant === 'vertical' && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child, childIndex) =>
              renderNavigationItem(
                child,
                level + 1,
                index + childIndex + 1
              )
            )}
          </div>
        )}
      </div>
    );
  };

  if (variant === 'horizontal') {
    return (
      <nav
        className={cn('flex items-center gap-1', className)}
        role="navigation"
        aria-label="Main navigation"
      >
        {filteredNavigation.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Button
              key={item.id}
              variant={active ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => handleItemClick(item)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.description || item.label}
            >
              <Icon className="w-4 h-4" />
              {item.label}
              {item.badge && (
                <Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className={cn('space-y-2', className)}
      role="navigation"
      aria-label="Main navigation"
    >
      {filteredNavigation.map((item, index) =>
        renderNavigationItem(item, 0, index)
      )}
    </nav>
  );
}
