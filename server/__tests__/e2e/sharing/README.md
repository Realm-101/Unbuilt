# Sharing and Export E2E Tests

This directory contains end-to-end tests for sharing and export functionality in the Unbuilt application.

## Test Files

### `share-links.e2e.test.ts`
Tests for share link generation, access, and management.

**Test Coverage:**
- Share link generation (with/without expiration)
- Clipboard integration
- Incognito mode access (unauthenticated)
- View count tracking
- Link revocation
- Analytics display
- Multiple link management

**Requirements:** 15.1, 15.2, 15.3, 15.5

### `exports.e2e.test.ts`
Tests for export functionality across multiple formats.

**Test Coverage:**
- PDF export
- Excel/CSV export
- JSON export
- PowerPoint export (Pro feature)
- Email delivery
- Pro customization (company name, author, themes)
- Progress tracking
- Error handling

**Requirements:** 15.1, 15.2, 15.3, 15.4, 15.5

## Running Tests

### Run All Sharing Tests
```bash
npm run test:e2e -- server/__tests__/e2e/sharing
```

### Run Specific Test File
```bash
# Share links only
npm run test:e2e -- server/__tests__/e2e/sharing/share-links.e2e.test.ts

# Exports only
npm run test:e2e -- server/__tests__/e2e/sharing/exports.e2e.test.ts
```

### Run with Specific Browser
```bash
npm run test:e2e:chromium -- server/__tests__/e2e/sharing
npm run test:e2e:firefox -- server/__tests__/e2e/sharing
npm run test:e2e:webkit -- server/__tests__/e2e/sharing
```

### Debug Mode
```bash
# Headed mode (see browser)
npm run test:e2e:headed -- server/__tests__/e2e/sharing/share-links.e2e.test.ts

# Debug mode (step through)
npm run test:e2e:debug -- server/__tests__/e2e/sharing/share-links.e2e.test.ts
```

### Run Specific Test
```bash
npm run test:e2e -- server/__tests__/e2e/sharing/share-links.e2e.test.ts --grep "should generate share link without expiration"
```

## Prerequisites

1. **Development Server**: Must be running on `http://localhost:5000`
   ```bash
   npm run dev
   ```

2. **Test User**: Account must exist with credentials:
   - Email: `test@example.com`
   - Password: `Test123!@#`

3. **Search Results**: At least one search result should be available
   - Tests will create one if none exist (takes 2-3 minutes)

## Test Structure

### Share Links Tests (11 tests)
```
Share Links
├── Link Generation (4 tests)
│   ├── Without expiration
│   ├── With expiration date
│   ├── Multiple links
│   └── Unique URLs
├── Access & Security (3 tests)
│   ├── Clipboard copy
│   ├── Incognito access
│   └── View tracking
└── Management (4 tests)
    ├── Link revocation
    ├── Cancel revocation
    ├── Analytics display
    └── Expired links
```

### Export Tests (18 tests)
```
Export Functionality
├── Formats (4 tests)
│   ├── PDF export
│   ├── Excel/CSV export
│   ├── JSON export
│   └── PowerPoint (Pro)
├── Features (6 tests)
│   ├── Modal display
│   ├── Progress tracking
│   ├── Format descriptions
│   ├── Result count
│   ├── Export messages
│   └── Button states
├── Email (2 tests)
│   ├── Send via email
│   └── Email validation
├── Pro Features (3 tests)
│   ├── Company name
│   ├── Author name
│   └── Presentation themes
└── Error Handling (3 tests)
    ├── Graceful errors
    ├── Cancel export
    └── Modal close
```

## Page Objects Used

### SharePage
Primary page object for share and export interactions.

**Key Methods:**
- `openShareDialog()` - Opens share dialog
- `createShareLink(expiration?)` - Creates new share link
- `getShareUrls()` - Gets all share URLs
- `copyShareLink(index)` - Copies link to clipboard
- `revokeShareLink(index, confirm)` - Revokes a link
- `getViewCount(index)` - Gets view count
- `openExportModal()` - Opens export modal
- `selectExportFormat(format)` - Selects export format
- `downloadExport()` - Downloads export file
- `setEmailRecipient(email)` - Sets email recipient
- `sendExportEmail()` - Sends export via email

### Supporting Page Objects
- `LoginPage` - Authentication
- `DashboardPage` - Navigation to searches
- `SearchPage` - Creating test searches
- `SearchResultsPage` - Viewing results

## Test Patterns

### AAA Pattern
All tests follow Arrange-Act-Assert:
```typescript
test('should do something', async ({ page }) => {
  // Arrange
  await sharePage.openShareDialog();
  
  // Act
  await sharePage.createShareLink();
  
  // Assert
  expect(await sharePage.getShareLinkCount()).toBeGreaterThan(0);
});
```

### Test Isolation
- Independent setup in `beforeEach`
- No dependencies between tests
- Clean state for each test

### Browser Contexts
- Incognito contexts for unauthenticated tests
- Proper context cleanup
- Multi-context scenarios

## Common Issues & Solutions

### Issue: Tests can't find share button
**Solution:** Ensure you're on a search results page with the Share button visible.

### Issue: Clipboard tests fail
**Solution:** Grant clipboard permissions in the test context:
```typescript
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
```

### Issue: Export download doesn't start
**Solution:** Ensure download event listener is set up before clicking export:
```typescript
const downloadPromise = page.waitForEvent('download');
await sharePage.downloadExport();
const download = await downloadPromise;
```

### Issue: View count doesn't update
**Solution:** Add small delay after accessing link for analytics to process:
```typescript
await page.goto(shareUrl);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Allow analytics to update
```

### Issue: Pro features not available
**Solution:** Tests check user plan and skip if not Pro:
```typescript
if (userPlan !== 'pro' && userPlan !== 'enterprise') {
  test.skip();
  return;
}
```

## Debugging Tips

### View Test Execution
```bash
npm run test:e2e:headed -- server/__tests__/e2e/sharing
```

### Step Through Tests
```bash
npm run test:e2e:debug -- server/__tests__/e2e/sharing/share-links.e2e.test.ts
```

### View Test Reports
```bash
npm run test:e2e:report
```

### Check Screenshots on Failure
Screenshots are saved to: `server/__tests__/reports/test-results/`

### Generate Trace Files
Traces are automatically generated on first retry. View with:
```bash
npx playwright show-trace server/__tests__/reports/test-results/trace.zip
```

## CI/CD Integration

Tests run automatically in CI with:
- Multi-browser execution (Chromium, Firefox, WebKit)
- Parallel execution (4 workers)
- Automatic retries (2 retries on failure)
- Artifact collection (screenshots, videos, traces)
- HTML, JUnit, and JSON reports

## Contributing

When adding new tests:

1. Follow the AAA pattern
2. Use Page Object methods (don't access page directly)
3. Add proper test descriptions
4. Include requirement references
5. Ensure test isolation
6. Handle async operations properly
7. Add error handling where appropriate
8. Update this README if adding new test files

## Related Documentation

- [E2E Testing Standards](../../../.kiro/steering/e2e-testing.md)
- [Page Objects README](../../page-objects/README.md)
- [SharePage Documentation](../../page-objects/share.page.ts)
- [Task 6 Completion Summary](./TASK_6_COMPLETION_SUMMARY.md)
