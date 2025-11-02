/**
 * Reusable animated components using Framer Motion
 * All animations respect prefers-reduced-motion preference
 */

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  fadeVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  slideRightVariants,
  scaleVariants,
  popVariants,
  collapseVariants,
  staggerContainerVariants,
  staggerItemVariants,
  pageTransitionVariants,
  modalVariants,
  modalBackdropVariants,
  toastVariants,
  buttonTapAnimation,
  buttonHoverAnimation,
} from "@/lib/animations";

/**
 * Animated container with fade-in effect
 */
export const AnimatedFade = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={fadeVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedFade.displayName = "AnimatedFade";

/**
 * Animated container with slide-up effect
 */
export const AnimatedSlideUp = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={slideUpVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedSlideUp.displayName = "AnimatedSlideUp";

/**
 * Animated container with slide-down effect
 */
export const AnimatedSlideDown = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={slideDownVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedSlideDown.displayName = "AnimatedSlideDown";

/**
 * Animated container with slide-left effect
 */
export const AnimatedSlideLeft = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={slideLeftVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedSlideLeft.displayName = "AnimatedSlideLeft";

/**
 * Animated container with slide-right effect
 */
export const AnimatedSlideRight = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={slideRightVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedSlideRight.displayName = "AnimatedSlideRight";

/**
 * Animated container with scale effect
 */
export const AnimatedScale = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={scaleVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedScale.displayName = "AnimatedScale";

/**
 * Animated container with pop/spring effect
 */
export const AnimatedPop = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={popVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedPop.displayName = "AnimatedPop";

/**
 * Animated collapsible container
 */
export interface AnimatedCollapseProps extends HTMLMotionProps<"div"> {
  isOpen: boolean;
}

export const AnimatedCollapse = React.forwardRef<
  HTMLDivElement,
  AnimatedCollapseProps
>(({ className, isOpen, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("overflow-hidden", className)}
    variants={collapseVariants}
    initial={isOpen ? "expanded" : "collapsed"}
    animate={isOpen ? "expanded" : "collapsed"}
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedCollapse.displayName = "AnimatedCollapse";

/**
 * Animated stagger container (children animate in sequence)
 */
export const AnimatedStaggerContainer = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={staggerContainerVariants}
    initial="hidden"
    animate="visible"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedStaggerContainer.displayName = "AnimatedStaggerContainer";

/**
 * Animated stagger item (use inside AnimatedStaggerContainer)
 */
export const AnimatedStaggerItem = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={staggerItemVariants}
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedStaggerItem.displayName = "AnimatedStaggerItem";

/**
 * Animated page container (for page transitions)
 */
export const AnimatedPage = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={pageTransitionVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedPage.displayName = "AnimatedPage";

/**
 * Animated modal/dialog container
 */
export const AnimatedModal = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={modalVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedModal.displayName = "AnimatedModal";

/**
 * Animated modal backdrop
 */
export const AnimatedBackdrop = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("fixed inset-0 bg-background/80 backdrop-blur-sm", className)}
    variants={modalBackdropVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedBackdrop.displayName = "AnimatedBackdrop";

/**
 * Animated toast/notification container
 */
export const AnimatedToast = React.forwardRef<
  HTMLDivElement,
  HTMLMotionProps<"div">
>(({ className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={className}
    variants={toastVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    {...props}
  >
    {children}
  </motion.div>
));
AnimatedToast.displayName = "AnimatedToast";

/**
 * Animated button with tap and hover effects
 */
export const AnimatedButton = React.forwardRef<
  HTMLButtonElement,
  HTMLMotionProps<"button">
>(({ className, children, ...props }, ref) => (
  <motion.button
    ref={ref}
    className={className}
    whileTap={buttonTapAnimation}
    whileHover={buttonHoverAnimation}
    {...props}
  >
    {children}
  </motion.button>
));
AnimatedButton.displayName = "AnimatedButton";

/**
 * Animated presence wrapper (for exit animations)
 * Use this to wrap components that need exit animations
 */
export { AnimatePresence } from "framer-motion";
