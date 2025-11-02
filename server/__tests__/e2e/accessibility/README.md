# Accessibility E2E Tests

This directory contains comprehensive accessibility tests for the Unbuilt application, ensuring WCAG 2.1 Level AA compliance.

## Test Files

### wcag-compliance.e2e.test.ts
Tests all pages for WCAG 2.1 AA compliance using axe-core. Includes:
- Homepage accessibility
- Login page accessibility
- Registration page accessibility
- Dashboard accessibility
- Search page accessibility
- Resource library accessibility
- Violation categorization by severity
- Remediation guidance

### color-contrast.e2e.test.ts
Tests color contrast ratios meet WCAG requirements:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- Tests buttons, links, form inputs, navigation
- Tests error messages
- Tests Neon Flame theme colors

### keyboard-navigation.e2e.test.ts
Tests keyboard accessibility:
- Tab navigation through interactive elements
- Visible focus indicators
- Enter and Space key activation
- Escape key for modals
- Focus trapping in modals
- Skip links for main content
- No keyboard traps
- Shift+Tab reverse navigation

### aria-landmarks.e2e.test.ts
Tests ARIA attributes and landmark regions:
- Valid ARIA attributes
- Main landmark (exactly one)
- Navigation landmarks
- Heading hierarchy
- Accessible button and link names
- Image alt text
- ARIA live regions
- Semantic HTML elements
- ARIA expanded states
- ARIA current for navigation

### form-accessibility.e2e.test.ts
Tests form accessibility:
- Form labels associated with inputs
- Required field indicators
- Error message associations
- Screen reader announcements
- Field descriptions
- Keyboard form submission
- Appropriate input types
- Autocomplete attributes
- Disabled field indicators
- Fieldset and legend usage

## Running Tests

### Run all accessibility tests
```bash
npm run test:e2e -- accessibility/
```

### Run specific test file
```bash
npm run test:e2e -- accessibility/wcag-compliance.e2e.test.ts
npm run test:e2e -- accessibility/color-contrast.e2e.test.ts
npm run test:e2e -- accessibility/keyboard-navigation.e2e.test.ts
npm run test:e2e -- accessibility/aria-landmarks.e2e.test.ts
npm run test:e2e -- accessibility/form-accessibility.e2e.test.ts
```

### Run in headed mode (see browser)
```bash
npm run test:e2e -- accessibility/ --headed
```

### Run with debug mode
```bash
npm run test:e2e -- accessibility/ --debug
```

## Accessibility Helper

All tests use the `AccessibilityHelper` class from `server/__tests__/helpers/accessibility.helper.ts`.

### Key Features

1. **WCAG 2.1 AA Configuration**: Pre-configured axe-core rules for Level AA compliance
2. **Violation Reporting**: Categorizes violations by severity (critical, serious, moderate, minor)
3. **Remediation Guidance**: Provides step-by-step fixes for common violations
4. **Specialized Tests**: Color contrast, keyboard navigation, ARIA, forms

### Usage Example

```typescript
import { createAccessibilityHelper } from '../../helpers/accessibility.helper';

test('should be accessible', async ({ page }) => {
  await page.goto('/');
  
  const a11yHelper = createAccessibilityHelper(page);
  const report = await a11yHelper.generateReport();
  
  if (!report.passed) {
    console.log(a11yHelper.formatViolationsForConsole(report.violations));
  }
  
  expect(report.violations).toHaveLength(0);
});
```

## WCAG 2.1 AA Requirements

### Level A (Must Have)
- Text alternatives for non-text content
- Captions for audio/video
- Adaptable content structure
- Distinguishable content (color not sole indicator)
- Keyboard accessible
- Enough time to read/use content
- No seizure-inducing content
- Navigable with clear focus
- Readable and understandable
- Predictable behavior
- Input assistance

### Level AA (Should Have)
- Captions for live audio
- Audio descriptions for video
- Color contrast 4.5:1 (normal text), 3:1 (large text)
- Resizable text up to 200%
- Images of text avoided
- Multiple ways to find pages
- Headings and labels descriptive
- Focus visible
- Language of page identified
- Consistent navigation
- Error identification and suggestions

## Common Violations and Fixes

### Color Contrast
**Issue**: Text doesn't have sufficient contrast against background
**Fix**: 
- Use darker text on light backgrounds
- Use lighter text on dark backgrounds
- Test with color contrast checker
- Aim for 4.5:1 for normal text, 3:1 for large text

### Missing Form Labels
**Issue**: Form inputs don't have associated labels
**Fix**:
```html
<!-- Option 1: Label with for attribute -->
<label for="email">Email</label>
<input id="email" type="email" />

<!-- Option 2: Wrapped label -->
<label>
  Email
  <input type="email" />
</label>

<!-- Option 3: ARIA label -->
<input type="email" aria-label="Email" />
```

### Missing Alt Text
**Issue**: Images don't have alternative text
**Fix**:
```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 25% in Q4" />

<!-- Decorative image -->
<img src="decoration.png" alt="" />
```

### Keyboard Navigation
**Issue**: Elements not reachable or no visible focus
**Fix**:
```css
/* Add visible focus indicator */
button:focus,
a:focus,
input:focus {
  outline: 2px solid #4A90E2;
  outline-offset: 2px;
}

/* Or use box-shadow */
button:focus {
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.5);
}
```

### Heading Order
**Issue**: Headings skip levels (h1 to h3)
**Fix**:
```html
<!-- Bad -->
<h1>Page Title</h1>
<h3>Section</h3>

<!-- Good -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### Missing Landmarks
**Issue**: Page doesn't have main landmark
**Fix**:
```html
<header>
  <nav>Navigation</nav>
</header>

<main>
  <h1>Main Content</h1>
  <!-- Page content -->
</main>

<footer>
  Footer content
</footer>
```

## Testing Strategy

1. **Automated Testing**: Run axe-core on all pages
2. **Manual Testing**: Test with keyboard only
3. **Screen Reader Testing**: Test with NVDA/JAWS/VoiceOver
4. **Color Blindness Testing**: Use color blindness simulators
5. **Zoom Testing**: Test at 200% zoom
6. **Mobile Testing**: Test on mobile devices

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Continuous Improvement

- Run accessibility tests on every PR
- Fix critical and serious violations immediately
- Address moderate violations in next sprint
- Review minor violations quarterly
- Update tests as new pages are added
- Keep axe-core and dependencies updated

## Support

For questions about accessibility testing:
1. Check this README
2. Review the accessibility helper utilities
3. Consult WCAG 2.1 guidelines
4. Ask in team chat or create an issue
