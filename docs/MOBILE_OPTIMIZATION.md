# Mobile Optimization Guide

## Overview

The Action Plan feature has been optimized for mobile devices with responsive design, touch-friendly interactions, and mobile-specific gestures.

## Features

### 1. Responsive Layout

**Breakpoints:**
- Small screens: < 640px
- Mobile: < 768px
- Desktop: >= 768px

**Adaptive Components:**
- ActionPlanView: Stacks vertically on mobile, hides sidebar
- PhaseAccordion: Compact padding and font sizes on small screens
- TaskItem: Larger touch targets and always-visible action buttons
- Tabs: Condensed labels with icons only on small screens

### 2. Touch-Friendly Interactions

**Larger Touch Targets:**
- Task checkboxes have expanded touch areas (p-2 -m-2)
- Action buttons are larger on touch devices (h-10 w-10 vs h-8 w-8)
- Phase accordion triggers have adequate spacing

**Visual Feedback:**
- Active states with scale transforms on touch
- Reduced hover effects on touch devices
- Clear pressed states for better feedback

### 3. Swipe Gestures

**TaskItem Swipe Actions:**
- Swipe left: Reveal edit/delete actions
- Swipe right: Hide actions
- Visual hint appears when actions are revealed
- Auto-hide after 3 seconds

**Implementation:**
```typescript
const { elementRef } = useSwipeGesture({
  onSwipeLeft: () => setShowSwipeActions(true),
  onSwipeRight: () => setShowSwipeActions(false),
  threshold: 50, // Minimum swipe distance
  enabled: isTouchDevice,
});
```

### 4. Mobile-Friendly Drag and Drop

**Enhanced Touch Support:**
- TouchSensor added to dnd-kit configuration
- 250ms delay to distinguish from scrolling
- 5px tolerance for accidental touches
- Visual feedback during drag operations

**Configuration:**
```typescript
useSensor(TouchSensor, {
  activationConstraint: {
    delay: 250,
    tolerance: 5,
  },
})
```

### 5. Responsive Typography

**Font Sizes:**
- Headings: Reduced on small screens (text-2xl vs text-3xl)
- Body text: Adjusted for readability (text-sm vs text-base)
- Badges and labels: Smaller on mobile (text-xs)

### 6. Optimized Spacing

**Padding and Margins:**
- Reduced padding on small screens (p-3 vs p-4)
- Compact gaps between elements (gap-4 vs gap-6)
- Flexible layouts that adapt to screen size

## Hooks

### useTouchFriendly

Detects device capabilities and viewport size.

```typescript
const { isMobile, isSmallScreen, isTouchDevice } = useTouchFriendly();

// isMobile: true if width < 768px
// isSmallScreen: true if width < 640px
// isTouchDevice: true if device supports touch
```

### useSwipeGesture

Enables swipe gesture detection on touch devices.

```typescript
const { elementRef } = useSwipeGesture({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
  onSwipeUp: () => console.log('Swiped up'),
  onSwipeDown: () => console.log('Swiped down'),
  threshold: 50, // Minimum distance in pixels
  enabled: true,
});

<div ref={elementRef}>Swipeable content</div>
```

## Testing on Mobile Devices

### Browser DevTools

1. Open Chrome/Edge DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select a mobile device preset
4. Test touch interactions and gestures

### Real Device Testing

**iOS:**
- Safari: Test on iPhone (iOS 14+)
- Chrome: Test on iPhone (iOS 14+)

**Android:**
- Chrome: Test on Android device (Android 8+)
- Samsung Internet: Test on Samsung devices

### Key Test Scenarios

1. **Task Status Toggle:**
   - Tap checkbox to change status
   - Verify larger touch target works
   - Check visual feedback

2. **Swipe Gestures:**
   - Swipe left on task to reveal actions
   - Swipe right to hide actions
   - Verify hint appears

3. **Drag and Drop:**
   - Long press on task (250ms)
   - Drag to reorder
   - Verify smooth operation

4. **Responsive Layout:**
   - Rotate device (portrait/landscape)
   - Verify layout adapts
   - Check text readability

5. **Tab Navigation:**
   - Switch between Plan/Next Actions/Dashboard
   - Verify tabs are tappable
   - Check content displays correctly

## Performance Considerations

### Optimizations Applied

1. **Passive Event Listeners:**
   - Touch events use `{ passive: true }`
   - Improves scroll performance

2. **Debounced Resize:**
   - Window resize events are handled efficiently
   - Prevents excessive re-renders

3. **Conditional Rendering:**
   - Sidebar hidden on mobile
   - Reduces DOM complexity

4. **CSS Transforms:**
   - Scale transforms for feedback
   - Hardware-accelerated animations

### Best Practices

- Avoid hover-only interactions
- Provide visual feedback for all actions
- Use appropriate touch target sizes (min 44x44px)
- Test on real devices when possible
- Consider network conditions (slower on mobile)

## Accessibility

### Touch Accessibility

- All interactive elements have adequate touch targets
- Visual feedback for all touch interactions
- No hover-only functionality
- Keyboard navigation still works on mobile keyboards

### Screen Reader Support

- ARIA labels maintained on all interactive elements
- Semantic HTML structure preserved
- Focus management works with touch

## Known Limitations

1. **Drag and Drop:**
   - Requires 250ms press to activate
   - May feel slightly delayed compared to desktop

2. **Swipe Gestures:**
   - May conflict with browser gestures
   - Limited to horizontal swipes on tasks

3. **Sidebar:**
   - Hidden on mobile to save space
   - Recommendations shown inline instead

## Future Enhancements

- [ ] Pull-to-refresh for plan updates
- [ ] Pinch-to-zoom for progress charts
- [ ] Haptic feedback on task completion
- [ ] Offline mode with service workers
- [ ] Native app wrapper (Capacitor/React Native)

## Troubleshooting

### Swipe Not Working

- Ensure device supports touch events
- Check if threshold is too high
- Verify element has ref attached

### Drag and Drop Issues

- Increase delay if activating too easily
- Check if TouchSensor is configured
- Verify dnd-kit version compatibility

### Layout Issues

- Clear browser cache
- Check Tailwind CSS compilation
- Verify breakpoint values in config

## Resources

- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [dnd-kit Touch Support](https://docs.dndkit.com/api-documentation/sensors/touch)
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Web.dev Mobile UX](https://web.dev/mobile-ux/)
