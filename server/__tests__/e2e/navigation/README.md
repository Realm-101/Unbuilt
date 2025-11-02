# Navigation E2E Tests

This directory contains end-to-end tests for navigation functionality, including mobile navigation and responsive layouts.

## Test Files

### mobile-navigation.e2e.test.ts
Tests mobile-specific navigation features:
- **Hamburger Menu**: Open/close functionality, navigation, state management
- **Touch Targets**: Validates 44x44px minimum size (WCAG 2.1 AA)
- **Swipe Gestures**: Touch interactions and scrolling
- **Accessibility**: ARIA labels, focus management, keyboard navigation
- **State Management**: Menu state, orientation changes

**Requirements Covered**: 12.1, 12.2, 12.3

### responsive-layout.e2e.test.ts
Tests responsive design across different viewports:
- **iPhone Viewport (375x667)**: Mobile-optimized layout and interactions
- **Android Viewport (360x640)**: Smaller mobile viewport handling
- **Tablet Viewport (768x1024)**: Tablet-specific layout
- **No Horizontal Scrolling**: Validates across all viewports
- **Mobile Performance**: Tests on simulated 3G network
- **Breakpoint Transitions**: Smooth transitions between viewport sizes
- **Layout Stability**: Prevents layout shifts and content reflow

**Requirements Covered**: 12.1, 12.4, 12.5

## Running Tests

### Run all navigation tests
```bash
npm run test:e2e -- navigation/
```

### Run specific test file
```bash
npm run test:e2e -- navigation/mobile-navigation.e2e.test.ts
npm run test:e2e -- navigation/responsive-layout.e2e.test.ts
```

### Run on specific device
```bash
npm run test:e2e -- navigation/ --project="iPhone 12"
npm run test:e2e -- navigation/ --project="Pixel 5"
```

### Run with headed browser (for debugging)
```bash
npm run test:e2e -- navigation/ --headed
```

## Test Coverage

### Mobile Navigation
- ✅ Hamburger menu open/close
- ✅ Navigation item clicks
- ✅ Menu state management
- ✅ Touch target sizes (44x44px minimum)
- ✅ Touch interactions and gestures
- ✅ Keyboard navigation
- ✅ ARIA labels and accessibility
- ✅ Orientation changes

### Responsive Layouts
- ✅ iPhone viewport (375x667)
- ✅ Android viewport (360x640)
- ✅ Tablet viewport (768x1024)
- ✅ Desktop viewport (1440x900)
- ✅ No horizontal scrolling
- ✅ Content reflow prevention
- ✅ Layout shift prevention
- ✅ Breakpoint transitions
- ✅ Mobile performance on 3G
- ✅ Offline handling

## Key Features Tested

### Touch Target Compliance
All interactive elements meet WCAG 2.1 AA requirements:
- Minimum 44x44px touch targets
- Adequate spacing between targets
- Proper touch event handling

### Network Conditions
Tests simulate various network conditions:
- Slow 3G (100ms delay)
- Offline mode
- Slow API responses

### Viewport Sizes
Tests cover common device viewports:
- iPhone: 375x667
- Android: 360x640
- Tablet: 768x1024
- Desktop: 1440x900

## Debugging Tips

### View test in browser
```bash
npm run test:e2e -- navigation/mobile-navigation.e2e.test.ts --headed --debug
```

### Generate trace file
```bash
npm run test:e2e -- navigation/ --trace on
```

### View trace
```bash
npx playwright show-trace server/__tests__/reports/traces/trace.zip
```

### Take screenshots
Tests automatically capture screenshots on failure. Find them in:
```
server/__tests__/reports/screenshots/
```

## Common Issues

### Mobile menu not opening
- Check that the menu button selector is correct
- Verify the mobile viewport is set correctly
- Ensure animations have time to complete (use waitForTimeout)

### Touch targets too small
- Verify button/link has minimum 44x44px size
- Check padding and margin are included in touch target
- Test on actual mobile device if possible

### Horizontal scrolling detected
- Check for fixed-width elements
- Verify images are responsive
- Look for overflow: visible on containers
- Check for absolute positioned elements

### Layout shifts
- Ensure images have width/height attributes
- Avoid injecting content above the fold
- Use CSS containment where appropriate
- Reserve space for dynamic content

## Best Practices

1. **Always test on real devices** when possible
2. **Use data-testid attributes** for stable selectors
3. **Wait for animations** to complete before assertions
4. **Test touch and mouse** interactions on tablets
5. **Verify accessibility** on all viewports
6. **Check performance** on slow networks
7. **Test orientation changes** for mobile devices
8. **Validate no horizontal scroll** on all pages

## Related Documentation

- [E2E Testing Standards](../../../.kiro/steering/e2e-testing.md)
- [Page Object Pattern](../../page-objects/README.md)
- [Accessibility Testing](../accessibility/README.md)
- [Performance Testing](../performance/README.md)
