import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Skip link component for keyboard navigation
 * Allows users to skip to main content
 */
export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Position off-screen by default
        'sr-only',
        // Show when focused
        'focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999]',
        // Styling
        'bg-primary text-primary-foreground px-4 py-2 rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'font-medium transition-all',
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Set focus to the target element
          if (target instanceof HTMLElement) {
            target.focus();
          }
        }
      }}
    >
      {children}
    </a>
  );
}
