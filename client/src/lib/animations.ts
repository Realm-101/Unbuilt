/**
 * Animation constants and utilities for consistent animations across the app
 * Respects user's prefers-reduced-motion preference
 */

import type { Variants, Transition } from "framer-motion";

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animation timing constants (in seconds)
 */
export const ANIMATION_DURATION = {
  instant: 0,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
} as const;

/**
 * Animation easing functions
 */
export const ANIMATION_EASING = {
  // Standard easings
  linear: [0, 0, 1, 1],
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  
  // Custom easings
  spring: [0.34, 1.56, 0.64, 1], // Bouncy spring
  smooth: [0.25, 0.1, 0.25, 1], // Smooth acceleration
  snappy: [0.68, -0.55, 0.265, 1.55], // Snappy with overshoot
} as const;

/**
 * Default transition configuration
 */
export const DEFAULT_TRANSITION: Transition = {
  duration: ANIMATION_DURATION.normal,
  ease: ANIMATION_EASING.easeInOut,
};

/**
 * Spring transition configuration
 */
export const SPRING_TRANSITION: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

/**
 * Get transition with reduced motion support
 */
export function getTransition(transition: Transition = DEFAULT_TRANSITION): Transition {
  if (prefersReducedMotion()) {
    return {
      duration: 0,
    };
  }
  return transition;
}

/**
 * Common animation variants
 */

// Fade animations
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

// Slide animations
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: getTransition(SPRING_TRANSITION),
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

// Collapse/Expand animations
export const collapseVariants: Variants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  expanded: { 
    height: "auto", 
    opacity: 1,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
};

// Stagger children animations
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

// Rotation animations
export const rotateVariants: Variants = {
  initial: { rotate: 0 },
  rotated: { 
    rotate: 180,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
};

// Shake animation (for errors)
export const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
    },
  },
};

/**
 * Micro-interaction animations for buttons and interactive elements
 */
export const buttonTapAnimation = {
  scale: prefersReducedMotion() ? 1 : 0.95,
  transition: { duration: ANIMATION_DURATION.fast },
};

export const buttonHoverAnimation = {
  scale: prefersReducedMotion() ? 1 : 1.02,
  transition: { duration: ANIMATION_DURATION.fast },
};

/**
 * Page transition variants
 */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

/**
 * Modal/Dialog transition variants
 */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.normal }),
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
  exit: { 
    opacity: 0,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

/**
 * Drawer/Sheet transition variants
 */
export const drawerVariants = {
  left: {
    hidden: { x: "-100%" },
    visible: { 
      x: 0,
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
    exit: { 
      x: "-100%",
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
  },
  right: {
    hidden: { x: "100%" },
    visible: { 
      x: 0,
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
    exit: { 
      x: "100%",
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
  },
  top: {
    hidden: { y: "-100%" },
    visible: { 
      y: 0,
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
    exit: { 
      y: "-100%",
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
  },
  bottom: {
    hidden: { y: "100%" },
    visible: { 
      y: 0,
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
    exit: { 
      y: "100%",
      transition: getTransition({ duration: ANIMATION_DURATION.normal }),
    },
  },
};

/**
 * Notification/Toast transition variants
 */
export const toastVariants: Variants = {
  hidden: { opacity: 0, y: -50, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: getTransition(SPRING_TRANSITION),
  },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: getTransition({ duration: ANIMATION_DURATION.fast }),
  },
};

/**
 * Loading spinner animation
 */
export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Pulse animation (for loading states)
 */
export const pulseVariants: Variants = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Utility function to create custom variants with reduced motion support
 */
export function createVariants(
  variants: Variants,
  options?: { respectReducedMotion?: boolean }
): Variants {
  const respectReducedMotion = options?.respectReducedMotion ?? true;

  if (!respectReducedMotion || !prefersReducedMotion()) {
    return variants;
  }

  // Remove animations if reduced motion is preferred
  const reducedVariants: Variants = {};
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === "object" && value !== null) {
      reducedVariants[key] = {
        ...value,
        transition: { duration: 0 },
      };
    } else {
      reducedVariants[key] = value;
    }
  }

  return reducedVariants;
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  const [reducedMotion, setReducedMotion] = React.useState(prefersReducedMotion());

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    
    const handleChange = () => {
      setReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return reducedMotion;
}

// Import React for the hook
import * as React from "react";
