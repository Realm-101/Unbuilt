# Cross-Browser Testing Guide

## Overview

This document outlines the cross-browser testing strategy for the Unbuilt platform to ensure consistent functionality across all supported browsers and devices.

## Supported Browsers

### Desktop Browsers

| Browser | Minimum Version | Market Share | Priority |
|---------|----------------|--------------|----------|
| Chrome | 90+ | ~65% | High |
| Firefox | 88+ | ~10% | High |
| Safari | 14+ | ~15% | High |
| Edge | 90+ | ~5% | Medium |
| Opera | 76+ | ~2% | Low |

### Mobile Browsers

| Browser | Platform | Minimum Version | Priority |
|---------|----------|----------------|----------|
| Chrome | Android | 90+ | High |
| Safari | iOS | 14+ | High |
| Samsung Internet | Android | 14+ | Medium |
| Firefox | Android | 88+ | Low |

## Testing Strategy

### 1. Automated Cross-Browser Testing

#### Using Playwright

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install
```

#### Example Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Cross-browser compatibility', () => {
  test('should render dashboard correctly', async ({ page, browserName }) => {
    await page.goto('http://localhost:5000/dashboard');
    
    // Take screenshot for visual comparison
    await page.screenshot({ 
      path: `screenshots/${browserName}-dashboard.png` 
    });
    
    // Verify key elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="search-card"]')).toBeVisible();
  });
});
```

### 2. Manual Testing Checklist

#### Chrome Testing
- [ ] All pages load correctly
- [ ] Animations are smooth
- [ ] Forms submit properly
- [ ] WebSocket connections work
- [ ] Local storage persists
- [ ] Service workers function
- [ ] DevTools show no errors

#### Firefox Testing
- [ ] CSS Grid layouts work
- [ ] Flexbox layouts render correctly
- [ ] Custom fonts load
- [ ] SVG graphics display
- [ ] Video/audio elements work
- [ ] IndexedDB functions
- [ ] Console shows no warnings

#### Safari Testing
- [ ] Webkit-specific CSS works
- [ ] Touch events function
- [ ] Date pickers work
- [ ] File uploads work
- [ ] Smooth scrolling works
- [ ] Backdrop filters render
- [ ] No layout shifts

#### Edge Testing
- [ ] Chromium features work
- [ ] Legacy Edge fallbacks (if needed)
- [ ] Windows-specific features
- [ ] Touch screen support
- [ ] Pen input works

### 3. Mobile Browser Testing

#### iOS Safari
- [ ] Touch gestures work
- [ ] Viewport meta tag correct
- [ ] No horizontal scroll
- [ ] Safe area insets respected
- [ ] PWA features work
- [ ] Camera/photo upload works
- [ ] Keyboard doesn't break layout

#### Android Chrome
- [ ] Material Design components
- [ ] Pull-to-refresh works
- [ ] Swipe gestures function
- [ ] Back button behavior
- [ ] Share API works
- [ ] Notifications work
- [ ] Offline mode functions

### 4. Responsive Design Testing

#### Breakpoints to Test

```css
/* Mobile: 320px - 767px */
@media (max-width: 767px) { }

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop: 1024px+ */
@media (min-width: 1024px) { }

/* Large Desktop: 1440px+ */
@media (min-width: 1440px) { }
```

#### Device Testing Matrix

| Device | Screen Size | Browser | Priority |
|--------|-------------|---------|----------|
| iPhone 12/13 | 390x844 | Safari | High |
| iPhone SE | 375x667 | Safari | Medium |
| iPad | 768x1024 | Safari | High |
| Samsung Galaxy S21 | 360x800 | Chrome | High |
| Pixel 5 | 393x851 | Chrome | Medium |
| Desktop 1080p | 1920x1080 | Chrome | High |
| Desktop 4K | 3840x2160 | Chrome | Medium |

## Common Browser Issues and Solutions

### Issue: CSS Grid Not Working in Older Browsers

**Problem:** CSS Grid not supported in IE11
**Solution:** Use feature detection and fallbacks

```css
.grid-container {
  display: flex; /* Fallback */
  flex-wrap: wrap;
}

@supports (display: grid) {
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}
```

### Issue: Flexbox Bugs in Safari

**Problem:** Flexbox items don't shrink properly
**Solution:** Add explicit flex-basis

```css
.flex-item {
  flex: 1 1 0%; /* Instead of flex: 1 */
}
```

### Issue: Date Input Not Supported

**Problem:** `<input type="date">` not supported in all browsers
**Solution:** Use a date picker library

```tsx
import { DatePicker } from '@/components/ui/date-picker';

<DatePicker value={date} onChange={setDate} />
```

### Issue: Smooth Scrolling Not Working

**Problem:** `scroll-behavior: smooth` not supported
**Solution:** Use JavaScript polyfill

```typescript
if (!('scrollBehavior' in document.documentElement.style)) {
  import('smoothscroll-polyfill').then(smoothscroll => {
    smoothscroll.polyfill();
  });
}
```

### Issue: WebP Images Not Supported

**Problem:** WebP not supported in older browsers
**Solution:** Use picture element with fallbacks

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Description">
</picture>
```

### Issue: CSS Variables Not Supported

**Problem:** CSS custom properties not supported in IE11
**Solution:** Use PostCSS plugin or provide fallbacks

```css
.element {
  color: #3b82f6; /* Fallback */
  color: var(--primary); /* Modern browsers */
}
```

## Browser Feature Detection

### Using Modernizr

```bash
npm install --save-dev modernizr
```

```javascript
import Modernizr from 'modernizr';

if (Modernizr.flexbox) {
  // Use flexbox
} else {
  // Use fallback
}
```

### Using Feature Queries

```css
@supports (display: grid) {
  .container {
    display: grid;
  }
}

@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

## Performance Testing Across Browsers

### Metrics to Track

1. **First Contentful Paint (FCP)**
   - Target: < 1.8s
   - Test in all browsers

2. **Largest Contentful Paint (LCP)**
   - Target: < 2.5s
   - Verify images load quickly

3. **Time to Interactive (TTI)**
   - Target: < 3.8s
   - Check JavaScript execution

4. **Cumulative Layout Shift (CLS)**
   - Target: < 0.1
   - Verify no layout shifts

### Tools

- **Chrome DevTools** - Performance profiling
- **Firefox Developer Tools** - Network analysis
- **Safari Web Inspector** - Memory profiling
- **WebPageTest** - Multi-browser testing
- **Lighthouse** - Performance audits

## Automated Testing Setup

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './client/src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Running Tests

```bash
# Run all browsers
npx playwright test

# Run specific browser
npx playwright test --project=chromium

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report
```

## Visual Regression Testing

### Using Percy or Chromatic

```bash
# Install Percy
npm install --save-dev @percy/cli @percy/playwright

# Run visual tests
npx percy exec -- playwright test
```

### Example Visual Test

```typescript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('visual regression test', async ({ page }) => {
  await page.goto('/dashboard');
  await percySnapshot(page, 'Dashboard');
});
```

## Testing Checklist

Before each release:

- [ ] Run automated tests on all browsers
- [ ] Manual test on Chrome, Firefox, Safari
- [ ] Test on iOS Safari and Android Chrome
- [ ] Verify responsive layouts at all breakpoints
- [ ] Check performance metrics
- [ ] Run visual regression tests
- [ ] Test with slow network (3G)
- [ ] Test with JavaScript disabled (graceful degradation)
- [ ] Verify PWA features work
- [ ] Check console for errors/warnings
- [ ] Test with ad blockers enabled
- [ ] Verify HTTPS works correctly

## Continuous Integration

### GitHub Actions Example

```yaml
name: Cross-Browser Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Resources

- [Can I Use](https://caniuse.com/) - Browser support tables
- [MDN Browser Compatibility](https://developer.mozilla.org/en-US/docs/Web/Guide/Browser_compatibility)
- [Playwright Documentation](https://playwright.dev/)
- [BrowserStack](https://www.browserstack.com/) - Cloud testing
- [LambdaTest](https://www.lambdatest.com/) - Cross-browser testing
- [WebPageTest](https://www.webpagetest.org/) - Performance testing

## Reporting Issues

When reporting browser-specific issues:

1. **Browser and Version**
   - Example: Chrome 120.0.6099.109

2. **Operating System**
   - Example: Windows 11, macOS 14.2

3. **Steps to Reproduce**
   - Clear, numbered steps

4. **Expected vs Actual Behavior**
   - What should happen vs what does happen

5. **Screenshots/Videos**
   - Visual evidence of the issue

6. **Console Errors**
   - Any JavaScript errors

7. **Network Tab**
   - Failed requests or slow resources
