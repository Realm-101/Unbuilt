/**
 * Mobile Optimization Utilities
 * 
 * Provides utilities for optimizing performance on mobile devices,
 * including image compression, animation simplification, and resource management.
 */

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  return window.innerWidth < 768;
}

/**
 * Check if device has limited resources (low-end mobile)
 */
export function isLowEndDevice(): boolean {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Check for low memory (if available)
  const hasLowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory < 4 : false;
  
  // Check for slow connection
  const connection = (navigator as any).connection;
  const hasSlowConnection = connection ? 
    (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : false;
  
  return prefersReducedMotion || hasLowMemory || hasSlowConnection;
}

/**
 * Get animation duration based on device capabilities
 */
export function getAnimationDuration(): number {
  if (isLowEndDevice()) {
    return 0; // No animations on low-end devices
  }
  if (isMobileDevice()) {
    return 150; // Faster animations on mobile
  }
  return 300; // Normal animations on desktop
}

/**
 * Get animation classes based on device capabilities
 */
export function getAnimationClasses(): string {
  if (isLowEndDevice()) {
    return ''; // No animation classes
  }
  if (isMobileDevice()) {
    return 'transition-all duration-150'; // Simplified animations
  }
  return 'transition-all duration-300'; // Full animations
}

/**
 * Compress image URL for mobile (if using a CDN with query params)
 */
export function compressImageUrl(url: string, quality: number = 75): string {
  if (!isMobileDevice()) {
    return url;
  }
  
  // Add quality parameter if URL supports it
  // This is a placeholder - adjust based on your CDN
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}quality=${quality}&width=800`;
}

/**
 * Lazy load images on mobile
 */
export function shouldLazyLoadImages(): boolean {
  return isMobileDevice();
}

/**
 * Get max visible messages for mobile
 */
export function getMaxVisibleMessages(): number {
  if (isLowEndDevice()) {
    return 10;
  }
  if (isMobileDevice()) {
    return 20;
  }
  return 50;
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback: () => void, timeout: number = 1000): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources(): void {
  // Preload fonts
  const fonts = [
    'Inter',
    // Add other critical fonts
  ];
  
  fonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = `/fonts/${font}.woff2`;
    document.head.appendChild(link);
  });
}

/**
 * Reduce motion for accessibility and performance
 */
export function shouldReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || isLowEndDevice();
}
