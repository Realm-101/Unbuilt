# Documentation Validation E2E Tests

This directory contains E2E tests that validate the accuracy of documentation against the actual implementation.

## Test Files

### keyboard-shortcuts.e2e.test.ts

Tests all keyboard shortcuts documented in `docs/USER_GUIDE.md` to ensure they function correctly.

**Shortcuts Tested:**

**Global Shortcuts:**
- `Ctrl/Cmd + K` - Open global search
- `Ctrl/Cmd + N` - New gap analysis
- `Ctrl/Cmd + /` - Show shortcuts dialog
- `Esc` - Close dialogs/modals

**Navigation Shortcuts:**
- `Ctrl/Cmd + 1` - Navigate to Dashboard
- `Ctrl/Cmd + 2` - Navigate to Resources
- `Ctrl/Cmd + 3` - Navigate to Projects
- `Ctrl/Cmd + 4` - Navigate to Settings

**Search Results Shortcuts:**
- `E` - Expand all sections
- `C` - Collapse all sections
- `F` - Toggle favorite
- `S` - Share result

**Conversation Shortcuts:**
- `Ctrl/Cmd + Enter` - Send message
- `↑` - Edit last message
- `Ctrl/Cmd + Shift + C` - Clear conversation

**Additional Tests:**
- Shortcut conflict detection
- Rapid shortcut press handling
- Focus context handling
- Accessibility and discoverability

## Running Tests

```bash
# Run all documentation validation tests
npm run test:e2e -- server/__tests__/e2e/documentation

# Run specific test file
npm run test:e2e -- server/__tests__/e2e/documentation/keyboard-shortcuts.e2e.test.ts

# Run in headed mode for debugging
npm run test:e2e -- server/__tests__/e2e/documentation --headed

# Run with specific browser
npm run test:e2e -- server/__tests__/e2e/documentation --project=chromium
```

## Test Strategy

### Keyboard Shortcuts

1. **Functional Testing**: Verify each shortcut performs the expected action
2. **Conflict Detection**: Ensure shortcuts don't conflict with browser defaults
3. **Context Testing**: Verify shortcuts work regardless of focus context
4. **Accessibility**: Ensure shortcuts are discoverable and screen reader compatible

### Feature Availability (Coming Soon)

Will test:
- Free tier limits (5 searches/month, 3 projects)
- Pro tier features
- Upgrade prompts

### Navigation Paths (Coming Soon)

Will test:
- All menu paths from documentation
- Page location accuracy
- Breadcrumb navigation

### FAQ Links (Coming Soon)

Will test:
- Internal link validity
- External link status codes
- Email addresses and support channels

## Maintenance

### When to Update Tests

- When keyboard shortcuts are added, removed, or changed in the application
- When USER_GUIDE.md is updated with new shortcuts
- When shortcut behavior changes

### Updating Tests

1. Update the test file to match new shortcuts
2. Update the documentation comment at the top of the test file
3. Update this README with the new shortcuts
4. Run tests to verify all shortcuts work correctly

## Known Issues

- Some shortcuts may not work in certain browser contexts (e.g., browser extensions)
- Platform-specific shortcuts (Mac vs Windows/Linux) are handled automatically
- Tests may fail if the application UI structure changes significantly

## Requirements Coverage

- **Requirement 14.1**: Keyboard shortcut validation
  - All shortcuts from USER_GUIDE.md are tested
  - Shortcut functionality matches documentation
  - Shortcut conflicts are checked
