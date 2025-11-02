# Accessibility Components

This directory contains comprehensive accessibility components and utilities to ensure WCAG 2.1 Level AA compliance throughout the Unbuilt platform.

## Components

### SkipLink
Allows keyboard users to skip directly to main content.

```tsx
import { SkipLink } from '@/components/accessibility';

<SkipLink href="#main-content">Skip to main content</SkipLink>
```

### AriaLiveRegion
Announces dynamic content changes to screen readers.

```tsx
import { AriaLiveRegion, useAriaAnnounce } from '@/components/accessibility';

// Component usage
<AriaLiveRegion message="Search completed" politeness="polite" />

// Hook usage
const { announce } = useAriaAnnounce();
announce('Item added to cart', 'polite');
```

### AccessibleFormField
Wraps form inputs with proper labels, hints, and error messages.

```tsx
import { AccessibleFormField } from '@/components/accessibility';

<AccessibleFormField
  label="Email Address"
  hint="We'll never share your email"
  error={errors.email}
  required
>
  <input type="email" />
</AccessibleFormField>
```

### AccessibleStatus
Displays status messages with icons and proper ARIA attributes.

```tsx
import { AccessibleStatus, ScoreIndicator } from '@/components/accessibility';

<AccessibleStatus type="success">
  Your changes have been saved
</AccessibleStatus>

<ScoreIndicator
  score={85}
  maxScore={100}
  label="Innovation Score"
/>
```

### AccessibleImage
Image component with proper alt text, loading states, and fallbacks.

```tsx
import { AccessibleImage } from '@/components/accessibility';

<AccessibleImage
  src="/path/to/image.jpg"
  alt="Description of the image"
  longDescription="Detailed description for complex images"
/>

// Decorative images
<AccessibleImage
  src="/decoration.svg"
  alt=""
  decorative
/>
```

### AccessibleChart
Wraps charts with accessible data table alternatives.

```tsx
import { AccessibleChart, generateChartDescription } from '@/components/accessibility';

const data = [
  { label: 'Jan', value: 100 },
  { label: 'Feb', value: 150 },
];

<AccessibleChart
  data={data}
  title="Monthly Revenue"
  description={generateChartDescription(data)}
>
  <YourChartComponent data={data} />
</AccessibleChart>
```

### AccessibleTable
Semantic data table with proper headers and captions.

```tsx
import { AccessibleTable } from '@/components/accessibility';

<AccessibleTable
  caption="Quarterly Sales Data"
  headers={['Quarter', 'Revenue', 'Growth']}
  rows={[
    ['Q1', '$100k', '10%'],
    ['Q2', '$150k', '50%'],
  ]}
/>
```

### AccessibilitySettings
Settings panel for users to customize accessibility features.

```tsx
import { AccessibilitySettings, useAccessibilitySettings } from '@/components/accessibility';

// Settings panel
<AccessibilitySettings />

// Check settings in components
const settings = useAccessibilitySettings();
if (settings.reducedMotion) {
  // Skip animations
}
```

## Hooks

### useFocusTrap
Traps focus within a container (for modals and dialogs).

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

const MyModal = ({ isOpen }) => {
  const focusTrapRef = useFocusTrap(isOpen);
  
  return (
    <div ref={focusTrapRef}>
      {/* Modal content */}
    </div>
  );
};
```

## Utilities

### Color Contrast Utilities
Check and ensure WCAG color contrast compliance.

```tsx
import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  accessibleColors,
  getAccessibleTextColor,
} from '@/lib/accessibility';

// Check contrast ratio
const ratio = getContrastRatio(
  { r: 255, g: 255, b: 255 },
  { r: 0, g: 0, b: 0 }
);

// Check WCAG compliance
const isAccessible = meetsWCAGAA(ratio, 'normal'); // true for 4.5:1+

// Use pre-defined accessible colors
const textColor = accessibleColors.text.primary;

// Get accessible text color for any background
const color = getAccessibleTextColor('#1a1a1a');
```

## Accessibility Features

### Focus Management
- Visible focus indicators on all interactive elements
- Focus trap in modals and dialogs
- Focus restoration when closing modals
- Skip links for keyboard navigation

### ARIA Attributes
- Proper labels for icon buttons
- Descriptive text for form fields
- Live regions for dynamic content
- Role attributes for custom components

### Color Contrast
- All text meets WCAG AA 4.5:1 contrast ratio
- Interactive elements have sufficient contrast
- Status colors include icons and text (not color alone)
- High contrast mode available

### Alternative Text
- All images have descriptive alt text
- Charts include data table alternatives
- Complex images have long descriptions
- Decorative images properly marked

### Accessibility Settings
- High contrast mode toggle
- Reduced motion preference
- Screen reader optimized mode
- Settings persist across sessions
- Respects system preferences

## CSS Classes

### Focus Indicators
All interactive elements automatically receive visible focus indicators.

### High Contrast Mode
```css
.high-contrast {
  /* Applied when high contrast mode is enabled */
}
```

### Reduced Motion
```css
.reduce-motion {
  /* Applied when reduced motion is enabled */
}

@media (prefers-reduced-motion: reduce) {
  /* Respects system preference */
}
```

### Screen Reader Optimized
```css
.screen-reader-optimized {
  /* Applied when screen reader mode is enabled */
}
```

### Screen Reader Only
```css
.sr-only {
  /* Visually hidden but available to screen readers */
}
```

## Testing

### Keyboard Navigation
- Test all interactive elements with Tab key
- Ensure focus is visible
- Test modal focus traps
- Verify skip links work

### Screen Readers
- Test with NVDA (Windows)
- Test with JAWS (Windows)
- Test with VoiceOver (macOS/iOS)
- Verify ARIA labels are announced

### Color Contrast
- Use browser DevTools accessibility panel
- Test with axe DevTools extension
- Verify all text meets 4.5:1 ratio
- Test high contrast mode

### Reduced Motion
- Enable system reduced motion preference
- Verify animations are disabled
- Test with accessibility settings toggle

## Best Practices

1. **Always provide alt text** for images (empty string for decorative)
2. **Use semantic HTML** (button, nav, main, etc.)
3. **Include ARIA labels** for icon-only buttons
4. **Test with keyboard** before shipping
5. **Verify color contrast** for all text
6. **Provide text alternatives** for color-coded information
7. **Respect user preferences** (reduced motion, high contrast)
8. **Test with screen readers** regularly

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
