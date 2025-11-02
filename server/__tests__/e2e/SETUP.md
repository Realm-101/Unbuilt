# E2E Testing Setup Guide

This guide walks you through setting up Playwright for E2E testing.

## Prerequisites

- Node.js 20+
- npm 10+
- Git

## Installation Steps

### 1. Install Dependencies

Dependencies are already installed via `package.json`. If you need to reinstall:

```bash
npm install
```

### 2. Install Playwright Browsers

Install the required browsers (Chromium, Firefox, WebKit):

```bash
npm run test:e2e:install
```

This will download and install:
- Chromium (for Chrome/Edge testing)
- Firefox
- WebKit (for Safari testing)
- System dependencies (on Linux)

**Note**: This step is required before running E2E tests for the first time.

### 3. Verify Installation

Run the example test to verify setup:

```bash
npm run test:e2e
```

You should see output indicating tests are running and passing.

## Configuration

### Environment Variables

Create a `.env.test` file for test-specific configuration:

```bash
# Test environment
TEST_ENV=local

# Base URLs
TEST_BASE_URL=http://localhost:5000
TEST_API_URL=http://localhost:5000/api

# Test credentials (optional)
TEST_ADMIN_EMAIL=admin@test.unbuilt.local
TEST_ADMIN_PASSWORD=TestAdmin123!@#
TEST_USER_EMAIL=user@test.unbuilt.local
TEST_USER_PASSWORD=TestUser123!@#
```

### Playwright Configuration

The main configuration is in `playwright.config.ts` at the project root. Key settings:

- **Test directory**: `./server/__tests__/e2e`
- **Timeout**: 30 seconds
- **Retries**: 2 in CI, 0 locally
- **Workers**: 4 in CI, unlimited locally
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Specific Browser

```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Mobile Tests

```bash
npm run test:e2e:mobile
```

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npm run test:e2e:debug
```

### UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Specific Test File

```bash
npx playwright test auth/login.e2e.test.ts
```

### Specific Test

```bash
npx playwright test -g "should login successfully"
```

## Viewing Reports

### HTML Report

After tests run, view the HTML report:

```bash
npm run test:e2e:report
```

This opens an interactive report in your browser showing:
- Test results
- Screenshots
- Videos
- Traces
- Performance metrics

### CI Reports

In CI, reports are uploaded as artifacts:
- HTML report: `server/__tests__/reports/html/`
- JUnit XML: `server/__tests__/reports/junit/results.xml`
- JSON: `server/__tests__/reports/json/results.json`

## Debugging

### Playwright Inspector

Run tests with the Playwright Inspector:

```bash
npm run test:e2e:debug
```

This opens a GUI where you can:
- Step through tests
- Inspect elements
- View console logs
- See network requests

### Traces

Generate trace files for debugging:

```bash
npx playwright test --trace on
```

View traces:

```bash
npx playwright show-trace server/__tests__/reports/test-results/trace.zip
```

### Screenshots

Screenshots are automatically captured on failure and saved to:
```
server/__tests__/reports/screenshots/
```

### Videos

Videos are recorded on failure and saved to:
```
server/__tests__/reports/test-results/
```

## Code Generation

Generate test code by recording interactions:

```bash
npm run test:e2e:codegen
```

This opens a browser where you can:
1. Interact with the application
2. See generated test code
3. Copy code to your test files

## Troubleshooting

### Browsers Not Installed

**Error**: `Executable doesn't exist at ...`

**Solution**: Install browsers:
```bash
npm run test:e2e:install
```

### Port Already in Use

**Error**: `Port 5000 is already in use`

**Solution**: Stop the dev server or change the port in `playwright.config.ts`

### Tests Timing Out

**Error**: `Test timeout of 30000ms exceeded`

**Solution**: 
1. Increase timeout in test:
   ```typescript
   test.setTimeout(60000);
   ```
2. Or in config:
   ```typescript
   timeout: 60000
   ```

### Flaky Tests

**Issue**: Tests pass sometimes, fail other times

**Solution**:
1. Add proper waits:
   ```typescript
   await page.waitForSelector('[data-testid="element"]');
   ```
2. Use Playwright's auto-waiting assertions:
   ```typescript
   await expect(page.locator('[data-testid="element"]')).toBeVisible();
   ```
3. Increase retries temporarily:
   ```typescript
   test.describe.configure({ retries: 2 });
   ```

### CI Failures

**Issue**: Tests pass locally but fail in CI

**Solution**:
1. Run tests in headless mode locally:
   ```bash
   npx playwright test --headed=false
   ```
2. Check CI logs for specific errors
3. Download CI artifacts (screenshots, videos, traces)
4. Ensure CI has proper environment variables

## Next Steps

1. **Write Tests**: Start with authentication tests in `auth/`
2. **Create Page Objects**: Add Page Objects in `../page-objects/`
3. **Add Test Data**: Create factories in `../fixtures/`
4. **Configure CI**: Set up GitHub Actions workflow
5. **Review Documentation**: Read the [E2E Testing Guide](../../../docs/E2E_TESTING_GUIDE.md)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [E2E Testing Guide](../../../docs/E2E_TESTING_GUIDE.md)
- [Steering File](../../../.kiro/steering/e2e-testing.md)
- [Page Objects](../page-objects/README.md)
- [Configuration](../config/README.md)

## Support

For questions or issues:
1. Check this setup guide
2. Review the [E2E Testing Guide](../../../docs/E2E_TESTING_GUIDE.md)
3. Consult the [Playwright Documentation](https://playwright.dev)
4. Ask in team chat or create an issue
