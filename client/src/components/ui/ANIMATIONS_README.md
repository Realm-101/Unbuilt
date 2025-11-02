# Animation System

## Overview

Comprehensive animation system built on Framer Motion with consistent timing, easing, and full support for `prefers-reduced-motion`. Provides reusable animated components and utilities for creating smooth, accessible animations.

## Features

- ✅ Consistent animation timing and easing across the app
- ✅ Respects `prefers-reduced-motion` preference
- ✅ Reusable animated components
- ✅ Micro-interactions for buttons and interactive elements
- ✅ Page transitions
- ✅ Modal and drawer animations
- ✅ Stagger animations for lists
- ✅ Collapse/expand animations
- ✅ TypeScript support

## Animation Constants

### Duration

```typescript
import { ANIMATION_DURATION } from "@/lib/animations";

ANIMATION_DURATION.instant  // 0s
ANIMATION_DURATION.fast     // 0.15s
ANIMATION_DURATION.normal   // 0.3s
ANIMATION_DURATION.slow     // 0.5s
ANIMATION_DURATION.slower   // 0.7s
```

### Easing

```typescript
import { ANIMATION_EASING } from "@/lib/animations";

ANIMATION_EASING.linear      // [0, 0, 1, 1]
ANIMATION_EASING.easeIn      // [0.4, 0, 1, 1]
ANIMATION_EASING.easeOut     // [0, 0, 0.2, 1]
ANIMATION_EASING.easeInOut   // [0.4, 0, 0.2, 1]
ANIMATION_EASING.spring      // [0.34, 1.56, 0.64, 1]
ANIMATION_EASING.smooth      // [0.25, 0.1, 0.25, 1]
ANIMATION_EASING.snappy      // [0.68, -0.55, 0.265, 1.55]
```

## Animated Components

### Basic Animations

```typescript
import {
  AnimatedFade,
  AnimatedSlideUp,
  AnimatedSlideDown,
  AnimatedSlideLeft,
  AnimatedSlideRight,
  AnimatedScale,
  AnimatedPop,
} from "@/components/ui/animated";

// Fade in
<AnimatedFade>
  <YourContent />
</AnimatedFade>

// Slide up
<AnimatedSlideUp>
  <YourContent />
</AnimatedSlideUp>

// Scale
<AnimatedScale>
  <YourContent />
</AnimatedScale>

// Pop (spring effect)
<AnimatedPop>
  <YourContent />
</AnimatedPop>
```

### Collapse/Expand

```typescript
import { AnimatedCollapse } from "@/components/ui/animated";

const [isOpen, setIsOpen] = useState(false);

<AnimatedCollapse isOpen={isOpen}>
  <YourContent />
</AnimatedCollapse>
```

### Stagger Animations

```typescript
import {
  AnimatedStaggerContainer,
  AnimatedStaggerItem,
} from "@/components/ui/animated";

<AnimatedStaggerContainer>
  {items.map((item) => (
    <AnimatedStaggerItem key={item.id}>
      <ItemCard item={item} />
    </AnimatedStaggerItem>
  ))}
</AnimatedStaggerContainer>
```

### Page Transitions

```typescript
import { AnimatedPage, AnimatePresence } from "@/components/ui/animated";
import { useLocation } from "wouter";

function App() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <AnimatedPage key={location}>
        <YourPageContent />
      </AnimatedPage>
    </AnimatePresence>
  );
}
```

### Modal/Dialog Animations

```typescript
import { AnimatedModal, AnimatedBackdrop, AnimatePresence } from "@/components/ui/animated";

function MyModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <AnimatedBackdrop onClick={onClose} />
          <AnimatedModal>
            <YourModalContent />
          </AnimatedModal>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Button Micro-interactions

```typescript
import { AnimatedButton } from "@/components/ui/animated";

// Automatic tap and hover animations
<AnimatedButton onClick={handleClick}>
  Click Me
</AnimatedButton>

// Or use with regular Button component
import { motion } from "framer-motion";
import { buttonTapAnimation, buttonHoverAnimation } from "@/lib/animations";

<motion.button
  whileTap={buttonTapAnimation}
  whileHover={buttonHoverAnimation}
>
  Click Me
</motion.button>
```

## Custom Animations

### Using Variants

```typescript
import { motion } from "framer-motion";
import { fadeVariants, slideUpVariants } from "@/lib/animations";

// Use predefined variants
<motion.div
  variants={fadeVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  <YourContent />
</motion.div>

// Combine variants
<motion.div
  variants={{
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  }}
  initial="hidden"
  animate="visible"
>
  <YourContent />
</motion.div>
```

### Creating Custom Variants

```typescript
import { createVariants, ANIMATION_DURATION } from "@/lib/animations";

const customVariants = createVariants({
  hidden: { opacity: 0, x: -100 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: ANIMATION_DURATION.normal },
  },
});

<motion.div variants={customVariants} initial="hidden" animate="visible">
  <YourContent />
</motion.div>
```

## Reduced Motion Support

All animations automatically respect the user's `prefers-reduced-motion` preference.

### Using the Hook

```typescript
import { useReducedMotion } from "@/lib/animations";

function MyComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        scale: reducedMotion ? 1 : [1, 1.1, 1],
      }}
    >
      <YourContent />
    </motion.div>
  );
}
```

### Manual Check

```typescript
import { prefersReducedMotion } from "@/lib/animations";

if (prefersReducedMotion()) {
  // Skip animations
} else {
  // Run animations
}
```

## Common Patterns

### Pattern 1: List Item Entrance

```typescript
import { AnimatedStaggerContainer, AnimatedStaggerItem } from "@/components/ui/animated";

function ItemList({ items }) {
  return (
    <AnimatedStaggerContainer>
      {items.map((item) => (
        <AnimatedStaggerItem key={item.id}>
          <ItemCard item={item} />
        </AnimatedStaggerItem>
      ))}
    </AnimatedStaggerContainer>
  );
}
```

### Pattern 2: Conditional Content

```typescript
import { AnimatedCollapse } from "@/components/ui/animated";

function ExpandableSection({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {title}
      </button>
      <AnimatedCollapse isOpen={isOpen}>
        {children}
      </AnimatedCollapse>
    </div>
  );
}
```

### Pattern 3: Modal with Backdrop

```typescript
import { AnimatedModal, AnimatedBackdrop, AnimatePresence } from "@/components/ui/animated";

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <AnimatedBackdrop onClick={onClose} />
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <AnimatedModal>
              {children}
            </AnimatedModal>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Pattern 4: Page Transitions

```typescript
import { AnimatedPage, AnimatePresence } from "@/components/ui/animated";
import { Route, Switch, useLocation } from "wouter";

function App() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch location={location}>
        <Route path="/">
          <AnimatedPage key="home">
            <HomePage />
          </AnimatedPage>
        </Route>
        <Route path="/about">
          <AnimatedPage key="about">
            <AboutPage />
          </AnimatedPage>
        </Route>
      </Switch>
    </AnimatePresence>
  );
}
```

### Pattern 5: Loading State Transition

```typescript
import { AnimatedFade, AnimatePresence } from "@/components/ui/animated";

function DataDisplay() {
  const { data, isLoading } = useQuery("data", fetchData);

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <AnimatedFade key="loading">
          <LoadingSkeleton />
        </AnimatedFade>
      ) : (
        <AnimatedFade key="content">
          <DataContent data={data} />
        </AnimatedFade>
      )}
    </AnimatePresence>
  );
}
```

### Pattern 6: Hover Card

```typescript
import { motion } from "framer-motion";
import { scaleVariants } from "@/lib/animations";

function HoverCard({ children }) {
  return (
    <motion.div
      variants={scaleVariants}
      whileHover="visible"
      initial="hidden"
      className="cursor-pointer"
    >
      {children}
    </motion.div>
  );
}
```

## Micro-interactions

### Button Press

```typescript
import { motion } from "framer-motion";
import { buttonTapAnimation } from "@/lib/animations";

<motion.button whileTap={buttonTapAnimation}>
  Click Me
</motion.button>
```

### Icon Rotation

```typescript
import { motion } from "framer-motion";
import { rotateVariants } from "@/lib/animations";

const [isOpen, setIsOpen] = useState(false);

<motion.div
  variants={rotateVariants}
  animate={isOpen ? "rotated" : "initial"}
>
  <ChevronDownIcon />
</motion.div>
```

### Shake on Error

```typescript
import { motion } from "framer-motion";
import { shakeVariants } from "@/lib/animations";

const [hasError, setHasError] = useState(false);

<motion.div
  animate={hasError ? "shake" : ""}
  variants={shakeVariants}
>
  <Input />
</motion.div>
```

## Performance Optimization

### Use Transform Properties

Prefer `transform` properties (x, y, scale, rotate) over layout properties (width, height, top, left) for better performance.

```typescript
// ✅ Good - uses transform
<motion.div animate={{ x: 100, scale: 1.2 }} />

// ❌ Avoid - triggers layout
<motion.div animate={{ left: 100, width: 200 }} />
```

### Layout Animations

For layout changes, use `layout` prop:

```typescript
<motion.div layout>
  {/* Content that changes size */}
</motion.div>
```

### Lazy Loading

Lazy load Framer Motion for better initial load:

```typescript
import { lazy, Suspense } from "react";

const AnimatedComponent = lazy(() => import("./AnimatedComponent"));

<Suspense fallback={<div>Loading...</div>}>
  <AnimatedComponent />
</Suspense>
```

## Accessibility

### ARIA Attributes

Add appropriate ARIA attributes for animated content:

```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  aria-live="polite"
  aria-busy={isAnimating}
>
  <YourContent />
</motion.div>
```

### Focus Management

Manage focus for animated modals and overlays:

```typescript
import { useEffect, useRef } from "react";

function AnimatedModal({ isOpen }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatedModal ref={modalRef} tabIndex={-1}>
      <YourContent />
    </AnimatedModal>
  );
}
```

### Reduced Motion

Always respect `prefers-reduced-motion`:

```typescript
import { useReducedMotion } from "@/lib/animations";

function MyComponent() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      animate={{
        opacity: 1,
        y: reducedMotion ? 0 : [20, 0],
      }}
    >
      <YourContent />
    </motion.div>
  );
}
```

## Best Practices

### Do's
✅ Use consistent timing and easing from constants
✅ Respect `prefers-reduced-motion` preference
✅ Use transform properties for better performance
✅ Add ARIA attributes for animated content
✅ Keep animations subtle and purposeful
✅ Test animations on low-end devices

### Don'ts
❌ Don't animate layout properties (width, height, top, left)
❌ Don't use overly long animations (>0.7s)
❌ Don't animate too many elements simultaneously
❌ Don't forget exit animations
❌ Don't use animations without purpose
❌ Don't ignore reduced motion preferences

## Testing

```typescript
import { render, screen } from "@testing-library/react";
import { AnimatedFade } from "@/components/ui/animated";

test("animated component renders", () => {
  render(
    <AnimatedFade>
      <div>Content</div>
    </AnimatedFade>
  );
  
  expect(screen.getByText("Content")).toBeInTheDocument();
});

test("respects reduced motion", () => {
  // Mock prefers-reduced-motion
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));

  // Test component behavior
});
```

## Integration with Existing Components

### Enhancing Existing Components

```typescript
import { motion } from "framer-motion";
import { fadeVariants } from "@/lib/animations";
import { Card } from "@/components/ui/card";

// Wrap existing component
const AnimatedCard = motion(Card);

<AnimatedCard variants={fadeVariants} initial="hidden" animate="visible">
  <CardContent />
</AnimatedCard>
```

### Adding to Button Component

```typescript
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { buttonTapAnimation, buttonHoverAnimation } from "@/lib/animations";

const MotionButton = motion(Button);

<MotionButton
  whileTap={buttonTapAnimation}
  whileHover={buttonHoverAnimation}
>
  Click Me
</MotionButton>
```
