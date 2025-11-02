# Data-TestID Attribute Strategy

## Overview

This document defines the naming conventions and implementation strategy for `data-testid` attributes used in E2E testing. Using consistent, semantic `data-testid` attributes ensures stable, maintainable test selectors that don't break when CSS classes or IDs change.

## Why data-testid?

### Benefits
- **Stability**: Independent of styling changes
- **Clarity**: Explicitly marks elements for testing
- **Maintainability**: Easy to find and update
- **Performance**: Faster selector queries than complex CSS
- **Separation of Concerns**: Testing attributes separate from styling

### Avoid
❌ CSS classes (`.btn-primary`, `.card-header`)
❌ IDs (`#submit-button`, `#user-profile`)
❌ Complex CSS selectors (`.container > div:nth-child(2) > button`)
❌ XPath expressions

## Naming Conventions

### General Format

```
data-testid="{page}-{component}-{element}-{action}"
```

### Rules

1. **Use kebab-case**: All lowercase with hyphens
2. **Be descriptive**: Clear purpose without being verbose
3. **Include context**: Page or component name when helpful
4. **Action-oriented**: Include action for interactive elements
5. **Unique**: Each testid should be unique within a page

### Examples

```tsx
// ✅ Good
<button data-testid="login-submit">Login</button>
<input data-testid="login-email" />
<input data-testid="login-password" />
<div data-testid="login-error-message" />
<a data-testid="login-signup-link">Sign up</a>

// ❌ Bad
<button data-testid="btn">Login</button>  // Too generic
<input data-testid="emailInput" />  // Wrong case
<input data-testid="login_password" />  // Wrong separator
<div data-testid="error" />  // Not specific enough
```

## Component-Specific Conventions

### Authentication Components

**Login Page**
```tsx
data-testid="login-email"
data-testid="login-password"
data-testid="login-submit"
data-testid="login-error"
data-testid="login-signup-link"
data-testid="login-forgot-password-link"
```

**Registration Page**
```tsx
data-testid="register-email"
data-testid="register-password"
data-testid="register-confirm-password"
data-testid="register-submit"
data-testid="register-error"
data-testid="register-login-link"
```

### Dashboard Components

**Dashboard Page**
```tsx
data-testid="dashboard-new-search-button"
data-testid="dashboard-recent-searches"
data-testid="dashboard-favorites"
data-testid="dashboard-projects"
data-testid="dashboard-search-overview"
data-testid="dashboard-stats-card"
```

**Search Card**
```tsx
data-testid="search-card"
data-testid="search-card-title"
data-testid="search-card-score"
data-testid="search-card-date"
data-testid="search-card-favorite"
data-testid="search-card-delete"
```

### Search Components

**Search Page**
```tsx
data-testid="search-input"
data-testid="search-submit"
data-testid="search-progress"
data-testid="search-phase-indicator"
data-testid="search-cancel"
```

**Search Results**
```tsx
data-testid="results-executive-summary"
data-testid="results-innovation-score"
data-testid="results-feasibility-rating"
data-testid="results-roadmap"
data-testid="results-export-button"
data-testid="results-share-button"
data-testid="results-favorite-button"
```

### Conversation Components

**Conversation Page**
```tsx
data-testid="conversation-message-input"
data-testid="conversation-send-button"
data-testid="conversation-message-history"
data-testid="conversation-message"
data-testid="conversation-suggested-questions"
data-testid="conversation-export"
```

### Resource Library Components

**Resource Library**
```tsx
data-testid="resources-category-filter"
data-testid="resources-search-input"
data-testid="resources-card"
data-testid="resources-bookmark-button"
data-testid="resources-rating"
data-testid="resources-preview"
```

### Project Components

**Project Page**
```tsx
data-testid="project-create-button"
data-testid="project-name-input"
data-testid="project-card"
data-testid="project-search-list"
data-testid="project-delete-button"
```

### Navigation Components

**Header/Navigation**
```tsx
data-testid="nav-logo"
data-testid="nav-home"
data-testid="nav-dashboard"
data-testid="nav-resources"
data-testid="nav-profile"
data-testid="nav-logout"
data-testid="nav-mobile-menu"
```

### Form Components

**Generic Forms**
```tsx
data-testid="{form-name}-{field-name}"
data-testid="{form-name}-submit"
data-testid="{form-name}-cancel"
data-testid="{form-name}-error"
data-testid="{form-name}-success"
```

### Modal Components

**Modals**
```tsx
data-testid="{modal-name}-modal"
data-testid="{modal-name}-close"
data-testid="{modal-name}-confirm"
data-testid="{modal-name}-cancel"
```

## Dynamic Content

### Lists and Collections

For repeated elements, use a consistent pattern:

```tsx
// Container
<div data-testid="search-results-list">
  {/* Individual items */}
  {results.map((result, index) => (
    <div key={result.id} data-testid={`search-result-${index}`}>
      <h3 data-testid={`search-result-${index}-title`}>{result.title}</h3>
      <button data-testid={`search-result-${index}-view`}>View</button>
    </div>
  ))}
</div>
```

### Conditional Elements

For elements that appear conditionally:

```tsx
{isLoading && <div data-testid="loading-spinner" />}
{error && <div data-testid="error-message">{error}</div>}
{success && <div data-testid="success-message">Success!</div>}
```

## Implementation Guidelines

### Adding to Existing Components

1. **Identify interactive elements**: Buttons, inputs, links, forms
2. **Identify key content**: Headings, messages, results
3. **Add data-testid attributes**: Follow naming conventions
4. **Test selectors**: Verify uniqueness and stability

### Example Implementation

**Before:**
```tsx
export function LoginForm() {
  return (
    <form onSubmit={handleSubmit}>
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Login</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

**After:**
```tsx
export function LoginForm() {
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        placeholder="Email"
        data-testid="login-email"
      />
      <input 
        type="password" 
        placeholder="Password"
        data-testid="login-password"
      />
      <button 
        type="submit"
        data-testid="login-submit"
      >
        Login
      </button>
      {error && (
        <div 
          className="error"
          data-testid="login-error"
        >
          {error}
        </div>
      )}
    </form>
  );
}
```

## Helper Script Usage

Use the provided helper script to add data-testid attributes to components:

```bash
# Add data-testid to a specific component
node server/__tests__/helpers/add-testid.js client/src/pages/auth/login.tsx

# Add data-testid to all components in a directory
node server/__tests__/helpers/add-testid.js client/src/components/dashboard/

# Dry run (preview changes without applying)
node server/__tests__/helpers/add-testid.js --dry-run client/src/pages/auth/login.tsx
```

## Testing with data-testid

### In Page Objects

```typescript
export class LoginPage extends BasePage {
  // Define selectors using data-testid
  private readonly emailInput = '[data-testid="login-email"]';
  private readonly passwordInput = '[data-testid="login-password"]';
  private readonly submitButton = '[data-testid="login-submit"]';
  private readonly errorMessage = '[data-testid="login-error"]';

  async login(email: string, password: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.fill(this.passwordInput, password);
    await this.click(this.submitButton);
  }
}
```

### In Tests

```typescript
test('should display error for invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('invalid@example.com', 'wrongpassword');
  
  // Use data-testid in assertions
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
});
```

## Maintenance

### Regular Audits

1. **Check for duplicates**: Ensure testids are unique
2. **Verify naming**: Follow conventions consistently
3. **Remove unused**: Clean up testids for removed features
4. **Update documentation**: Keep this guide current

### When to Update

- Adding new features or components
- Refactoring existing components
- Fixing flaky tests due to selector issues
- After UI redesigns

## Best Practices

### DO

✅ Use semantic, descriptive names
✅ Keep names concise but clear
✅ Follow kebab-case convention
✅ Include context (page/component)
✅ Make testids unique within a page
✅ Add testids during development
✅ Document custom patterns

### DON'T

❌ Use generic names (`button`, `input`)
❌ Include implementation details (`redux-form-email`)
❌ Use dynamic values in testids
❌ Duplicate testids on the same page
❌ Change testids without updating tests
❌ Use testids for styling
❌ Add testids to every element (only test-relevant ones)

## Priority Components

Focus on adding data-testid attributes to these components first:

### High Priority (Phase 1)
1. Authentication (login, registration)
2. Dashboard (main navigation, search creation)
3. Search (input, submit, progress)
4. Search Results (summary, scores, actions)

### Medium Priority (Phase 2)
5. Conversations (messages, input)
6. Resource Library (filters, cards)
7. Projects (creation, management)
8. Settings (profile, preferences)

### Low Priority (Phase 3)
9. Help/Documentation
10. Analytics/Reports
11. Admin panels

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [E2E Testing Guide](../e2e/README.md)
- [Page Object Pattern](./README.md)

## Questions?

For questions or suggestions about data-testid strategy:
1. Review this document
2. Check existing implementations
3. Consult the team
4. Update this guide with new patterns
