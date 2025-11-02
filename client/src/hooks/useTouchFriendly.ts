import { useState, useEffect } from 'react';

/**
 * Hook to detect if the device is mobile or touch-enabled
 * 
 * Returns:
 * - isMobile: true if viewport width is less than 768px
 * - isTouchDevice: true if device supports touch events
 * - isSmallScreen: true if viewport width is less than 640px
 */
export function useTouchFriendly() {
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if device supports touch
    const checkTouch = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - msMaxTouchPoints is IE specific
        navigator.msMaxTouchPoints > 0
      );
    };

    // Check viewport width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSmallScreen(window.innerWidth < 640);
    };

    // Initial checks
    setIsTouchDevice(checkTouch());
    checkMobile();

    // Listen for resize events
    const handleResize = () => {
      checkMobile();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile,
    isSmallScreen,
    isTouchDevice,
  };
}
