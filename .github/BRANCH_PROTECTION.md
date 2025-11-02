# Branch Protection Configuration

This document describes the recommended branch protection rules for the Unbuilt repository to ensure E2E tests are required before merging.

## Required Status Checks

Configure the following status checks as required for the `main` and `develop` branches:

### E2E Test Checks
- `E2E Tests (chromium)` - Required
- `E2E Tests (firefox)` - Required
- `E2E Tests (webkit)` - Required
- `Mobile E2E Tests` - Required
- `PR E2E Test Status` - Required

## Branch Protection Rules

### Main Branch (`main`)

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale pull request approvals when new commits are pushed: ✅

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: ✅
   - Status checks that are required:
     - `E2E Tests (chromium)`
     - `E2E Tests (firefox)`
     - `E2E Tests (webkit)`
     - `Mobile E2E Tests`
     - `PR E2E Test Status`

3. **Require conversation resolution before merging**: ✅

4. **Require signed commits**: ⚠️ (Optional, recommended for security)

5. **Require linear history**: ✅

6. **Include administrators**: ✅ (Enforce rules for admins too)

7. **Restrict who can push to matching branches**
   - Only allow specific people, teams, or apps to push

### Develop Branch (`develop`)

Same rules as `main` branch, but with slightly relaxed requirements:

1. **Require pull request reviews before merging**
   - Required approving reviews: 1
   - Dismiss stale pull request approvals: ✅

2. **Require status checks to pass before merging**
   - Require branches to be up to date: ✅
   - Status checks that are required:
     - `E2E Tests (chromium)` (at minimum)
     - `PR E2E Test Status`

## Setting Up Branch Protection

### Via GitHub UI

1. Go to repository **Settings** → **Branches**
2. Click **Add rule** or edit existing rule
3. Enter branch name pattern (e.g., `main` or `develop`)
4. Enable the checkboxes as described above
5. In "Require status checks to pass before merging":
   - Search for and select each required status check
   - Enable "Require branches to be up to date before merging"
6. Click **Create** or **Save changes**

### Via GitHub API

```bash
# Set branch protection for main branch
curl -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "E2E Tests (chromium)",
        "E2E Tests (firefox)",
        "E2E Tests (webkit)",
        "Mobile E2E Tests",
        "PR E2E Test Status"
      ]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "required_approving_review_count": 1
    },
    "restrictions": null,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
  }'
```

## Bypassing Protection (Emergency Only)

In case of emergency (e.g., critical production bug), administrators can:

1. Temporarily disable branch protection
2. Push the fix directly
3. Re-enable branch protection immediately
4. Create a follow-up PR to add tests

**Note**: This should be documented and reviewed in a post-mortem.

## Testing Branch Protection

To verify branch protection is working:

1. Create a test branch
2. Make a change that will fail E2E tests
3. Open a PR to `main` or `develop`
4. Verify that:
   - E2E tests run automatically
   - PR shows failing status checks
   - Merge button is disabled
   - PR comment shows test failure details

## Monitoring

Monitor branch protection effectiveness:

- Track merge attempts blocked by failing tests
- Review test failure patterns
- Identify flaky tests that need fixing
- Measure time from PR creation to merge

## Troubleshooting

### Status checks not appearing

1. Ensure workflows are enabled in repository settings
2. Check that workflow files are in `.github/workflows/`
3. Verify workflow triggers include `pull_request`
4. Check GitHub Actions logs for errors

### Tests passing but merge still blocked

1. Verify all required status checks are listed in branch protection
2. Check that status check names match exactly (case-sensitive)
3. Ensure "Require branches to be up to date" is not blocking unnecessarily

### False positives blocking merges

1. Review test logs to identify flaky tests
2. Fix or skip flaky tests temporarily
3. Consider adjusting retry logic in Playwright config
4. Document known issues in test comments

## Best Practices

1. **Keep status checks minimal**: Only require critical tests
2. **Fast feedback**: Optimize test execution time
3. **Clear failures**: Ensure test failures are easy to understand
4. **Auto-retry**: Configure retries for flaky tests
5. **Regular review**: Periodically review and update protection rules

## Related Documentation

- [E2E Testing Guide](../server/__tests__/e2e/README.md)
- [GitHub Actions Workflows](./workflows/)
- [Contributing Guidelines](../CONTRIBUTING.md)
