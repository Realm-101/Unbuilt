# Visual Regression Tests

This directory contains visual regression tests for the Unbuilt application. These tests capture screenshots and compare them against baseline images to detect unintended visual changes.

## Test Files

### theme-validation.e2e.test.ts
Tests the Neon Flame theme implementation:
- Verifies presence of flame colors (purple, red, orange, white)
- Tests color contrast ratios for WCAG compliance
- Validates theme consistency across pages
- Captures visual baselines for theme elements

### responsive-design.e2e.test.ts
Tests responsive layouts across viewports:
- Mobile (375px width)
- Tablet (768px width)
- Desktop (1440px width)
- Validates no horizontal scrolling
- Tests layout adaptation at each breakpoint
- Captures baselines for key pages at all viewports

### dark-mode.e2e.test.ts
Tests dark mode implementation:
- Verifies dark mode is enabled by default
- Tests dark background colors and contrast
- Validates dark mode consistency across pages
- Tests form and button styling in dark mode
- Captures dark mode baselines for all pages

## Running Visual Tests

### Run all visual tests
```bash
npm run test:e2e -- visual/
```

### Run specific test file
```bash
npm run test:e2e -- visual/theme-validation.e2e.test.ts
npm run test:e2e -- visual/responsive-design.e2e.test.ts
npm run test:e2e -- visual/dark-mode.e2e.test.ts
```

### Update baselines
When UI changes are intentional, update the baselines:
```bash
npm run test:e2e -- visual/ --update-snapshots
```

### Update specific test baselines
```bash
npm run test:e2e -- visual/theme-validation.e2e.test.ts --update-snapshots
```

## Visual Test Helper

The `visual-regression.helper.ts` provides utilities for:

### Screenshot Capture
```typescript
const visualHelper = createVisualHelper(page, 'test-name');

// Capture at all viewports
await visualHelper.captureAtViewports('page-name', VIEWPORT_PRESETS.all);

// Capture at specific viewport
await visualHelper.setViewport(VIEWPORTS.mobile);
await visualHelper.capture('page-name-mobile');
```

### Viewport Management
```typescript
// Set viewport
await visualHelper.setViewport(VIEWPORTS.mobile);
await visualHelper.setViewport(VIEWPORTS.tablet);
await visualHelper.setViewport(VIEWPORTS.desktop);

// Use viewport presets
VIEWPORT_PRESETS.mobile          // [mobile]
VIEWPORT_PRESETS.tablet          // [tablet]
VIEWPORT_PRESETS.desktop         // [desktop]
VIEWPORT_PRESETS.all             // [mobile, tablet, desktop]
VIEWPORT_PRESETS.mobileAndDesktop // [mobile, desktop]
```

### Page Preparation
```typescript
// Prepare page for screenshot (disable animations, wait for fonts/images)
await visualHelper.preparePage();

// Individual preparation steps
await visualHelper.disableAnimations();
await visualHelper.waitForFonts();
await visualHelper.waitForImages();
```

### Theme Testing
```typescript
// Get theme colors
const colors = await visualHelper.getThemeColors();

// Verify theme colors are present
const hasThemeColors = await visualHelper.verifyThemeColors();

// Get color contrast ratio
const ratio = await visualHelper.getContrastRatio('#ffffff', '#000000');

// Check dark mode
const isDark = await visualHelper.isDarkMode();
```

### Masking Dynamic Content
```typescript
// Mask timestamps, user avatars, etc.
await visualHelper.capture('page-name', {
  mask: visualHelper.getMaskSelectors()
});

// Custom mask selectors
await visualHelper.capture('page-name', {
  mask: ['[data-testid="timestamp"]', '[data-testid="user-avatar"]']
});
```

## Screenshot Options

### Default Options
```typescript
{
  fullPage: true,           // Capture full page
  maxDiffPixels: 100,       // Allow up to 100 pixels difference
  threshold: 0.2,           // 20% threshold for pixel matching
  animations: 'disabled'    // Disable animations
}
```

### Custom Options
```typescript
await visualHelper.capture('page-name', {
  fullPage: false,          // Capture viewport only
  maxDiffPixels: 150,       // Allow more difference
  threshold: 0.3,           // Higher threshold
  mask: ['[data-testid="dynamic"]']  // Mask dynamic content
});
```

## Baseline Management

### Baseline Location
Baselines are stored in:
```
server/__tests__/reports/visual-baselines/{test-name}/
```

### Screenshot Location
Current screenshots are stored in:
```
server/__tests__/reports/visual-screenshots/{test-name}/
```

### Diff Location
Diff images are stored in:
```
server/__tests__/reports/visual-diffs/{test-name}/
```

### Updating Baselines
```typescript
// Update all baselines for a test
await visualHelper.updateBaselines(
  ['homepage', 'dashboard', 'search'],
  VIEWPORT_PRESETS.all
);

// Clear all baselines
visualHelper.clearBaselines();

// Clear all diffs
visualHelper.clearDiffs();
```

## Best Practices

### 1. Prepare Pages Before Capture
Always prepare pages to ensure consistent screenshots:
```typescript
await visualHelper.preparePage();
```

### 2. Mask Dynamic Content
Mask timestamps, user-specific data, and other dynamic content:
```typescript
await visualHelper.capture('page-name', {
  mask: visualHelper.getMaskSelectors()
});
```

### 3. Use Appropriate Thresholds
- Use lower thresholds (0.1-0.2) for static pages
- Use higher thresholds (0.2-0.3) for dynamic pages
- Adjust maxDiffPixels based on page complexity

### 4. Test at Multiple Viewports
Always test responsive pages at all viewports:
```typescript
await visualHelper.captureAtViewports('page-name', VIEWPORT_PRESETS.all);
```

### 5. Disable Animations
Animations can cause flaky tests. Always disable them:
```typescript
await visualHelper.disableAnimations();
// or
await visualHelper.preparePage(); // includes disableAnimations
```

### 6. Wait for Resources
Wait for fonts and images to load:
```typescript
await visualHelper.waitForFonts();
await visualHelper.waitForImages();
// or
await visualHelper.preparePage(); // includes both
```

## Troubleshooting

### Tests Failing Due to Small Differences
Increase `maxDiffPixels` or `threshold`:
```typescript
await visualHelper.capture('page-name', {
  maxDiffPixels: 200,
  threshold: 0.3
});
```

### Tests Failing Due to Animations
Ensure animations are disabled:
```typescript
await visualHelper.disableAnimations();
```

### Tests Failing Due to Fonts
Wait for fonts to load:
```typescript
await visualHelper.waitForFonts();
```

### Tests Failing Due to Dynamic Content
Mask dynamic content:
```typescript
await visualHelper.capture('page-name', {
  mask: ['[data-testid="timestamp"]', '[data-testid="user-data"]']
});
```

### Viewing Diffs
Diff images are automatically generated and stored in:
```
server/__tests__/reports/visual-diffs/{test-name}/
```

Open the HTML report to view diffs:
```bash
npx playwright show-report
```

## CI/CD Integration

Visual tests run automatically in CI/CD pipelines. When tests fail:

1. Diff images are uploaded as artifacts
2. Review the diffs in the CI/CD artifacts
3. If changes are intentional, update baselines locally and commit
4. If changes are unintentional, fix the UI issue

## Requirements Coverage

These tests cover requirements:
- 7.1: Screenshot capture at multiple viewports
- 7.2: Pixel difference detection with thresholds
- 7.3: Side-by-side comparison images
- 7.4: Neon Flame theme color verification
- 7.5: Responsive design validation at mobile, tablet, desktop

## Related Documentation

- [E2E Testing Guide](../README.md)
- [Visual Regression Helper](../../helpers/visual-regression.helper.ts)
- [Playwright Screenshot Documentation](https://playwright.dev/docs/screenshots)
