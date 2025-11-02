# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated testing, deployment, and maintenance of the Unbuilt application.

## Workflows

### E2E Tests (`e2e-tests.yml`)

**Purpose**: Run comprehensive end-to-end tests on every pull request and push to main/develop branches.

**Triggers**:
- Pull requests to main/develop
- Pushes to main/develop
- Manual workflow dispatch

**Jobs**:
- `e2e-tests`: Run E2E tests across Chromium, Firefox, and WebKit
- `mobile-tests`: Run E2E tests on mobile viewports
- `test-summary`: Generate test summary and report

**Artifacts**:
- Test results (30 days retention)
- Screenshots on failure (7 days retention)
- Videos on failure (7 days retention)
- Trace files on failure (7 days retention)

**Duration**: ~15-20 minutes

---

### PR Status Check (`pr-status-check.yml`)

**Purpose**: Update pull request status based on E2E test results and block merge on failures.

**Triggers**:
- Pull request opened, synchronized, or reopened

**Jobs**:
- `pr-check`: Wait for E2E tests and update PR status
- `test-coverage-report`: Generate and post coverage report

**Features**:
- PR comments with test results
- Commit status updates
- Merge blocking on failure
- Test coverage statistics

**Duration**: ~1-2 minutes (after E2E tests complete)

---

### Smoke Tests (`smoke-tests.yml`)

**Purpose**: Run minimal smoke tests to validate critical functionality after deployment.

**Triggers**:
- After successful production deployment
- Manual workflow dispatch
- Scheduled (every 6 hours)

**Jobs**:
- `smoke-tests`: Run critical smoke tests
- `health-check`: Validate application health

**Features**:
- Fast execution (< 5 minutes)
- Failure notifications (GitHub issues, Slack)
- Health endpoint validation
- Environment selection (production/staging)

**Duration**: ~3-5 minutes

---

### Artifact Cleanup (`artifact-cleanup.yml`)

**Purpose**: Automatically clean up old test artifacts to manage storage.

**Triggers**:
- Scheduled (daily at 2 AM UTC)
- Manual workflow dispatch

**Retention Policies**:
- Test results: 30 days
- Screenshots: 7 days
- Videos: 7 days
- Traces: 7 days

**Duration**: ~1-2 minutes

---

## Setup Instructions

### 1. Configure Secrets

Add the following secrets in repository settings (Settings → Secrets and variables → Actions):

**Required**:
- `TEST_DATABASE_URL` - Test database connection string
- `TEST_JWT_SECRET` - JWT secret for tests
- `TEST_SESSION_SECRET` - Session secret for tests
- `PRODUCTION_URL` - Production application URL (e.g., https://unbuilt.one)

**Optional**:
- `STAGING_URL` - Staging application URL
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications

### 2. Enable Workflows

Workflows are enabled by default. To disable a workflow:
1. Go to Actions tab
2. Select the workflow
3. Click "..." menu
4. Select "Disable workflow"

### 3. Configure Branch Protection

Follow the guide in [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) to set up branch protection rules.

**Quick setup**:
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select required checks:
   - E2E Tests (chromium)
   - E2E Tests (firefox)
   - E2E Tests (webkit)
   - Mobile E2E Tests
   - PR E2E Test Status
5. Enable "Require branches to be up to date before merging"
6. Save changes

### 4. Test Workflows

**Test E2E workflow**:
1. Create a test branch
2. Make a small change
3. Open PR to main
4. Verify E2E tests run automatically
5. Check PR comment for results

**Test smoke tests**:
1. Go to Actions → Production Smoke Tests
2. Click "Run workflow"
3. Select environment
4. Click "Run workflow"
5. Verify tests complete successfully

---

## Usage

### Running Tests Manually

**Via GitHub UI**:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Configure options (if available)
5. Click "Run workflow"

**Via GitHub CLI**:
```bash
# Run E2E tests
gh workflow run e2e-tests.yml

# Run smoke tests on production
gh workflow run smoke-tests.yml -f environment=production

# Run smoke tests on custom URL
gh workflow run smoke-tests.yml -f url=https://staging.unbuilt.one
```

### Viewing Results

**Test Results**:
1. Go to Actions tab
2. Select workflow run
3. View job logs
4. Download artifacts for detailed reports

**PR Comments**:
- Automatically posted on PR
- Shows test summary
- Links to artifacts
- Debugging instructions on failure

**Artifacts**:
1. Go to workflow run
2. Scroll to "Artifacts" section
3. Download desired artifact
4. Extract and view reports

---

## Monitoring

### Success Metrics

Track these metrics to ensure workflow health:

- **Pass Rate**: > 95% for E2E tests, > 99% for smoke tests
- **Execution Time**: < 15 minutes for E2E, < 5 minutes for smoke
- **False Positive Rate**: < 5%
- **Artifact Storage**: Monitor usage, clean up regularly

### Alerts

**Automatic Alerts**:
- Smoke test failures create GitHub issues
- Slack notifications on critical failures (if configured)

**Manual Monitoring**:
- Review failed workflow runs weekly
- Check artifact storage usage monthly
- Review flaky test reports

---

## Troubleshooting

### Workflows Not Running

**Check**:
- Workflow files are in `.github/workflows/`
- Workflows are enabled (Actions tab)
- Triggers are configured correctly
- Branch protection doesn't block workflow runs

**Fix**:
- Verify workflow syntax with `gh workflow view`
- Check workflow logs for errors
- Ensure repository has Actions enabled

### Tests Failing in CI

**Common Causes**:
- Environment variable mismatch
- Missing secrets
- Timing issues
- Database connection problems

**Debug Steps**:
1. Check workflow logs
2. Download test artifacts
3. Review screenshots/videos
4. Compare with local test results
5. Check environment variables

### Artifacts Not Uploading

**Check**:
- Artifact paths exist
- Workflow has write permissions
- Artifact size is within limits (500MB per artifact)

**Fix**:
- Verify paths in workflow file
- Check workflow permissions
- Reduce artifact size if needed

### PR Status Not Updating

**Check**:
- Status check names match exactly
- Workflow has write permissions for pull requests
- Branch protection is configured correctly

**Fix**:
- Verify status check names in branch protection
- Check workflow permissions
- Review pr-status-check.yml logs

---

## Best Practices

### Workflow Development

1. **Test locally first**: Use `act` to test workflows locally
2. **Use matrix strategy**: Run tests in parallel across browsers
3. **Set appropriate timeouts**: Prevent hanging workflows
4. **Cache dependencies**: Speed up workflow execution
5. **Use secrets**: Never hardcode sensitive data

### Test Maintenance

1. **Keep tests fast**: Target < 15 minutes for E2E
2. **Fix flaky tests**: Don't ignore intermittent failures
3. **Update selectors**: Keep pace with UI changes
4. **Monitor execution time**: Optimize slow tests
5. **Review artifacts**: Clean up regularly

### Security

1. **Use secrets**: For all sensitive data
2. **Limit permissions**: Grant minimum required permissions
3. **Review logs**: Don't expose secrets in logs
4. **Rotate secrets**: Regularly update secrets
5. **Monitor access**: Track who triggers workflows

---

## Related Documentation

- [E2E Testing Guide](../server/__tests__/e2e/README.md)
- [Smoke Tests Documentation](../server/__tests__/e2e/smoke/README.md)
- [Branch Protection Guide](./BRANCH_PROTECTION.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

## Support

For issues with workflows:
1. Check this README
2. Review workflow logs
3. Check [GitHub Actions documentation](https://docs.github.com/en/actions)
4. Contact DevOps team
5. Create an issue with `ci/cd` label
