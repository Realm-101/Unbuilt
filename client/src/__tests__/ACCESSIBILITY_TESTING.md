# Accessibility Testing Guide

## Overview

This document outlines the accessibility testing strategy for the Unbuilt platform, ensuring WCAG 2.1 Level AA compliance.

## Automated Testing

### Tools Used

1. **jest-axe** - Automated accessibility testing
2. **@testing-library/react** - Component testing with accessibility in mind
3. **vitest** - Test runner

### Installation

```bash
npm install --save-dev jest-axe @axe-core/react
```

### Running Tests

```bash
# Run all accessibility tests
npm test -- accessibility.test.tsx

# Run with coverage
npm run test:coverage -- accessibility.test.tsx
```

## Test Categories

### 1. Component Accessibility

Tests that all interactive components meet accessibility standards:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility

### 2. Keyboard Navigation

Tests that all functionality is accessible via keyboard:
- Tab order is logical
- All interactive elements are focusable
- Keyboard shortcuts work correctly
- Focus indicators are visible

### 3. ARIA Attributes

Tests that ARIA attributes are properly implemented:
- `aria-label` for icon buttons
- `aria-describedby` for form fields
- `aria-live` for dynamic content
- `role` attributes for custom components

### 4. Color Contrast

Tests that text has sufficient contrast:
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Minimum 3:1 for UI components

### 5. Alternative Text

Tests that non-text content has alternatives:
- Images have descriptive alt text
- Icons have aria-labels
- Charts have text descriptions

### 6. Form Accessibility

Tests that forms are accessible:
- Labels are associated with inputs
- Error messages are announced
- Required fields are indicated
- Validation is accessible

### 7. Reduced Motion

Tests that animations respect user preferences:
- `prefers-reduced-motion` is respected
- Essential animations remain
- Non-essential animations are disabled

## Manual Testing Checklist

### Screen Reader Testing

Test with the following screen readers:

#### Windows
- **NVDA** (free, open-source)
  - Download: https://www.nvaccess.org/
  - Test all major user flows
  - Verify announcements are clear

- **JAWS** (commercial)
  - Test critical paths
  - Verify compatibility

#### macOS
- **VoiceOver** (built-in)
  - Enable: Cmd + F5
  - Test navigation
  - Verify rotor functionality

#### Mobile
- **TalkBack** (Android)
  - Test touch exploration
  - Verify gestures work

- **VoiceOver** (iOS)
  - Test with swipe gestures
  - Verify announcements

### Keyboard Navigation Testing

1. **Tab Navigation**
   - Tab through all interactive elements
   - Verify logical order
   - Check focus indicators are visible

2. **Keyboard Shortcuts**
   - Test all keyboard shortcuts
   - Verify they don't conflict
   - Check they work in all contexts

3. **Modal/Dialog Navigation**
   - Focus is trapped in modals
   - Escape closes modals
   - Focus returns to trigger element

4. **Form Navigation**
   - Tab through form fields
   - Submit with Enter key
   - Navigate with arrow keys where appropriate

### Visual Testing

1. **Zoom Testing**
   - Test at 200% zoom
   - Verify no content is cut off
   - Check layout remains usable

2. **Color Blindness**
   - Test with color blindness simulators
   - Verify information isn't conveyed by color alone
   - Check sufficient contrast

3. **High Contrast Mode**
   - Test in Windows High Contrast mode
   - Verify all content is visible
   - Check focus indicators work

### Mobile Testing

1. **Touch Targets**
   - Verify minimum 44x44px touch targets
   - Check spacing between targets
   - Test with different finger sizes

2. **Orientation**
   - Test in portrait and landscape
   - Verify content reflows properly
   - Check no functionality is lost

3. **Gestures**
   - Test swipe gestures
   - Verify pinch-to-zoom works
   - Check custom gestures are accessible

## Common Issues and Solutions

### Issue: Missing ARIA Labels

**Problem:** Icon buttons without text labels
**Solution:** Add `aria-label` attribute

```tsx
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>
```

### Issue: Poor Focus Indicators

**Problem:** Focus outline is not visible
**Solution:** Use custom focus styles

```css
.focus-visible:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Issue: Inaccessible Modals

**Problem:** Focus escapes modal
**Solution:** Use focus trap

```tsx
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Modal() {
  const modalRef = useFocusTrap();
  return <div ref={modalRef}>...</div>;
}
```

### Issue: Missing Form Labels

**Problem:** Input without associated label
**Solution:** Use proper label association

```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Issue: Insufficient Color Contrast

**Problem:** Text is hard to read
**Solution:** Use sufficient contrast ratios

```css
/* Minimum 4.5:1 for normal text */
color: hsl(0 0% 98%); /* foreground */
background: hsl(222.2 84% 4.9%); /* background */
```

## Accessibility Checklist

Before deploying, verify:

- [ ] All images have alt text
- [ ] All icon buttons have aria-labels
- [ ] All forms have proper labels
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader announcements are clear
- [ ] Modals trap focus properly
- [ ] Skip links are present
- [ ] Headings are in logical order
- [ ] ARIA live regions work correctly
- [ ] Reduced motion is respected
- [ ] Touch targets are at least 44x44px
- [ ] Content reflows at 200% zoom

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [NVDA Screen Reader](https://www.nvaccess.org/)

## Continuous Monitoring

1. **Automated Tests**
   - Run accessibility tests in CI/CD
   - Fail builds on violations
   - Track accessibility metrics

2. **Manual Audits**
   - Quarterly accessibility audits
   - User testing with assistive technology users
   - Regular screen reader testing

3. **User Feedback**
   - Collect accessibility feedback
   - Prioritize accessibility issues
   - Iterate based on real user needs
