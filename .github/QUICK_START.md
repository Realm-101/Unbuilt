# CI/CD Quick Start Guide

Quick reference for working with CI/CD workflows in the Unbuilt project.

## For Developers

### Creating a Pull Request

1. **Create your branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes and commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/my-feature
   ```

3. **Open PR on GitHub**
   - E2E tests will run automatically
   - Wait for tests to complete (~15-20 minutes)
   - Check PR comment for results

4. **If tests fail**
   - Click "View Details" in PR status
   - Download artifacts (screenshots, videos)
   - Fix issues and push new commit
   - Tests will re-run automatically

5. **If tests pass**
   - Request review
   - Merge when approved

### Running Tests Locally

**Before pushing**:
```bash
# Run all E2E tests
npm run test:e2e

# Run specific browser
npm run test:e2e:chromium

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with UI mode (interactive)
npm run test:e2e:ui
```

**Smoke tests**:
```bash
# Run smoke tests locally
npm run test:e2e:smoke

# Against staging
SMOKE_TEST_URL=https://staging.unbuilt.one npm run test:e2e:smoke
```

### Understanding Test Results

**PR Comment Format**:
```
## E2E Test Results

✅ All E2E tests passed

### Test Summary
- Status: ✅ Passed
- Commit: abc1234
- Run: View Details

---
Last updated: 2024-01-15T10:30:00Z
```

**Status Checks**:
- ✅ Green checkmark = Tests passed
- ❌ Red X = Tests failed
- 🟡 Yellow dot = Tests running

---

## For DevOps

### Initial Setup

1. **Configure secrets** (Settings → Secrets and variables → Actions):
   ```
   TEST_DATABASE_URL
   TEST_JWT_SECRET
   TEST_SESSION_SECRET
   PRODUCTION_URL
   STAGING_URL (optional)
   SLACK_WEBHOOK_URL (optional)
   ```

2. **Enable branch protection** (Settings → Branches):
   - Add rule for `main`
   - Require status checks:
     - E2E Tests (chromium)
     - E2E Tests (firefox)
     - E2E Tests (webkit)
     - Mobile E2E Tests
     - PR E2E Test Status
   - Require branches to be up to date
   - Save changes

3. **Test workflows**:
   ```bash
   # Trigger E2E tests
   gh workflow run e2e-tests.yml
   
   # Trigger smoke tests
   gh workflow run smoke-tests.yml -f environment=production
   ```

### Monitoring

**Daily**:
- Check failed workflow runs
- Review smoke test results

**Weekly**:
- Review flaky test reports
- Check artifact storage usage
- Update dependencies if needed

**Monthly**:
- Review test execution times
- Optimize slow tests
- Update documentation

### Troubleshooting

**Workflow not running**:
```bash
# Check workflow status
gh workflow list

# View workflow runs
gh run list --workflow=e2e-tests.yml

# View specific run
gh run view <run-id>
```

**Tests failing in CI only**:
1. Download artifacts
2. Review screenshots/videos
3. Check environment variables
4. Compare with local results

**Artifacts not uploading**:
1. Check artifact paths in workflow
2. Verify workflow permissions
3. Check artifact size limits

---

## For QA

### Viewing Test Results

**Via GitHub UI**:
1. Go to Actions tab
2. Select workflow run
3. View job logs
4. Download artifacts

**Via PR**:
1. Check PR comment for summary
2. Click "View Details" for full results
3. Download artifacts if needed

### Reporting Issues

**Test failure**:
1. Note the test name
2. Download screenshots/videos
3. Create issue with:
   - Test name
   - Expected behavior
   - Actual behavior
   - Screenshots
   - Link to workflow run

**Flaky test**:
1. Note the test name
2. Track failure frequency
3. Create issue with `flaky-test` label
4. Include links to multiple failures

---

## Common Commands

### GitHub CLI

```bash
# List workflows
gh workflow list

# Run workflow
gh workflow run <workflow-name>

# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>

# Watch workflow run
gh run watch <run-id>
```

### npm Scripts

```bash
# E2E tests
npm run test:e2e                    # All tests
npm run test:e2e:chromium          # Chromium only
npm run test:e2e:firefox           # Firefox only
npm run test:e2e:webkit            # WebKit only
npm run test:e2e:mobile            # Mobile tests
npm run test:e2e:headed            # With browser UI
npm run test:e2e:debug             # Debug mode
npm run test:e2e:ui                # Interactive UI

# Smoke tests
npm run test:e2e:smoke             # Run smoke tests

# Reports
npm run test:e2e:report            # View HTML report
npm run test:e2e:reports           # Generate custom report

# Utilities
npm run test:e2e:install           # Install browsers
npm run test:e2e:codegen           # Generate test code
npm run test:e2e:artifacts         # Prepare artifacts
```

---

## Quick Reference

### Workflow Triggers

| Workflow | Trigger | Duration |
|----------|---------|----------|
| E2E Tests | PR, Push | ~15-20 min |
| PR Status Check | PR events | ~1-2 min |
| Smoke Tests | Post-deploy, Schedule | ~3-5 min |
| Artifact Cleanup | Daily 2 AM UTC | ~1-2 min |

### Artifact Retention

| Artifact Type | Retention |
|---------------|-----------|
| Test Results | 30 days |
| Screenshots | 7 days |
| Videos | 7 days |
| Traces | 7 days |

### Status Checks

| Check | Required | Browser |
|-------|----------|---------|
| E2E Tests (chromium) | ✅ | Chromium |
| E2E Tests (firefox) | ✅ | Firefox |
| E2E Tests (webkit) | ✅ | WebKit |
| Mobile E2E Tests | ✅ | Chrome, Safari |
| PR E2E Test Status | ✅ | N/A |

---

## Need Help?

- 📖 [Full Documentation](.github/README.md)
- 🔧 [Troubleshooting Guide](.github/README.md#troubleshooting)
- 🛡️ [Branch Protection Guide](.github/BRANCH_PROTECTION.md)
- 🧪 [E2E Testing Guide](../server/__tests__/e2e/README.md)
- 💨 [Smoke Tests Guide](../server/__tests__/e2e/smoke/README.md)

**Still stuck?**
- Check workflow logs
- Review test artifacts
- Create issue with `ci/cd` label
- Contact DevOps team
