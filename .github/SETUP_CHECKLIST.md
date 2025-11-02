# CI/CD Setup Checklist

Use this checklist to verify that CI/CD integration is properly configured.

## Prerequisites

- [ ] GitHub repository is set up
- [ ] GitHub Actions is enabled for the repository
- [ ] You have admin access to the repository
- [ ] Test database is available
- [ ] Production/staging environments are deployed

---

## 1. Secrets Configuration

Go to **Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

- [ ] `TEST_DATABASE_URL`
  - Description: Test database connection string
  - Example: `postgresql://user:pass@host:5432/test_db`
  - Test: Run E2E tests locally with this URL

- [ ] `TEST_JWT_SECRET`
  - Description: JWT secret for test environment
  - Example: Generate with `openssl rand -base64 32`
  - Test: Verify authentication works in tests

- [ ] `TEST_SESSION_SECRET`
  - Description: Session secret for test environment
  - Example: Generate with `openssl rand -base64 32`
  - Test: Verify sessions work in tests

- [ ] `PRODUCTION_URL`
  - Description: Production application URL
  - Example: `https://unbuilt.one`
  - Test: Verify URL is accessible

### Optional Secrets

- [ ] `STAGING_URL`
  - Description: Staging application URL
  - Example: `https://staging.unbuilt.one`
  - Test: Verify URL is accessible

- [ ] `SLACK_WEBHOOK_URL`
  - Description: Slack webhook for notifications
  - Example: `https://hooks.slack.com/services/...`
  - Test: Send test message to webhook

---

## 2. Workflow Files

Verify all workflow files exist in `.github/workflows/`:

- [ ] `e2e-tests.yml` - Main E2E test workflow
- [ ] `pr-status-check.yml` - PR status check workflow
- [ ] `smoke-tests.yml` - Production smoke tests
- [ ] `artifact-cleanup.yml` - Artifact cleanup workflow

### Verify Workflow Syntax

```bash
# Install GitHub CLI if not already installed
# brew install gh (macOS)
# choco install gh (Windows)

# Verify each workflow
gh workflow view e2e-tests.yml
gh workflow view pr-status-check.yml
gh workflow view smoke-tests.yml
gh workflow view artifact-cleanup.yml
```

---

## 3. Branch Protection

Go to **Settings → Branches → Add rule**

### Main Branch Protection

- [ ] Branch name pattern: `main`
- [ ] Require a pull request before merging
  - [ ] Require approvals: 1
  - [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require status checks to pass before merging
  - [ ] Require branches to be up to date before merging
  - [ ] Status checks that are required:
    - [ ] `E2E Tests (chromium)`
    - [ ] `E2E Tests (firefox)`
    - [ ] `E2E Tests (webkit)`
    - [ ] `Mobile E2E Tests`
    - [ ] `PR E2E Test Status`
- [ ] Require conversation resolution before merging
- [ ] Require linear history
- [ ] Include administrators (enforce rules for admins)

### Develop Branch Protection (Optional)

- [ ] Branch name pattern: `develop`
- [ ] Same rules as main, or relaxed version
- [ ] At minimum, require `E2E Tests (chromium)` and `PR E2E Test Status`

---

## 4. Test Workflows

### Test E2E Workflow

- [ ] Create test branch: `git checkout -b test/ci-setup`
- [ ] Make a small change (e.g., update README)
- [ ] Commit and push: `git push origin test/ci-setup`
- [ ] Open PR to `main`
- [ ] Verify E2E tests start automatically
- [ ] Wait for tests to complete (~15-20 minutes)
- [ ] Verify PR comment is posted with results
- [ ] Verify commit status is updated
- [ ] Download and review test artifacts
- [ ] Close test PR

### Test Smoke Tests

- [ ] Go to **Actions → Production Smoke Tests**
- [ ] Click **Run workflow**
- [ ] Select environment: `production`
- [ ] Click **Run workflow**
- [ ] Wait for tests to complete (~3-5 minutes)
- [ ] Verify tests pass
- [ ] Review test results
- [ ] Download and review artifacts

### Test Manual Trigger

```bash
# Trigger E2E tests manually
gh workflow run e2e-tests.yml

# Trigger smoke tests manually
gh workflow run smoke-tests.yml -f environment=production

# Watch the run
gh run watch
```

---

## 5. Artifact Management

### Verify Artifact Upload

- [ ] Run E2E tests (via PR or manual trigger)
- [ ] Wait for completion
- [ ] Go to workflow run
- [ ] Scroll to **Artifacts** section
- [ ] Verify artifacts are present:
  - [ ] `test-results-chromium`
  - [ ] `test-results-firefox`
  - [ ] `test-results-webkit`
  - [ ] `test-results-mobile`
- [ ] Download an artifact
- [ ] Verify contents (reports, screenshots, etc.)

### Verify Artifact Cleanup

- [ ] Go to **Actions → Artifact Cleanup**
- [ ] Click **Run workflow**
- [ ] Wait for completion
- [ ] Verify old artifacts are cleaned up
- [ ] Check artifact storage usage

---

## 6. PR Status Checks

### Verify PR Comment

- [ ] Create test PR
- [ ] Wait for E2E tests to complete
- [ ] Verify PR comment is posted
- [ ] Comment should include:
  - [ ] Test status (✅ or ❌)
  - [ ] Commit SHA
  - [ ] Link to workflow run
  - [ ] Debugging instructions (if failed)
  - [ ] Timestamp

### Verify Commit Status

- [ ] Check PR status checks section
- [ ] Verify status checks are present:
  - [ ] E2E Tests (chromium)
  - [ ] E2E Tests (firefox)
  - [ ] E2E Tests (webkit)
  - [ ] Mobile E2E Tests
  - [ ] PR E2E Test Status
- [ ] Verify status matches test results

### Verify Merge Blocking

- [ ] Create PR with failing test
- [ ] Verify merge button is disabled
- [ ] Verify message: "Merging is blocked"
- [ ] Fix test and push
- [ ] Verify merge button is enabled

---

## 7. Notifications

### GitHub Issues (Smoke Test Failures)

- [ ] Trigger smoke tests with failing test
- [ ] Verify GitHub issue is created
- [ ] Issue should include:
  - [ ] Title: "🚨 Smoke Tests Failed - [timestamp]"
  - [ ] Environment URL
  - [ ] Link to workflow run
  - [ ] Debugging instructions
  - [ ] Labels: `bug`, `production`, `smoke-test-failure`, `urgent`

### Slack Notifications (Optional)

If `SLACK_WEBHOOK_URL` is configured:

- [ ] Trigger smoke tests with failing test
- [ ] Verify Slack message is sent
- [ ] Message should include:
  - [ ] Alert header
  - [ ] Environment URL
  - [ ] Timestamp
  - [ ] Link to workflow run

---

## 8. Local Testing

### Install Dependencies

```bash
# Install npm dependencies
npm ci

# Install Playwright browsers
npm run test:e2e:install
```

### Run Tests Locally

```bash
# Run all E2E tests
npm run test:e2e

# Run specific browser
npm run test:e2e:chromium

# Run smoke tests
npm run test:e2e:smoke

# Run with UI
npm run test:e2e:ui
```

### Verify Test Results

- [ ] Tests run successfully
- [ ] Reports are generated
- [ ] Screenshots captured on failure
- [ ] Videos recorded on failure

---

## 9. Documentation

Verify all documentation is in place:

- [ ] `.github/README.md` - Main CI/CD documentation
- [ ] `.github/BRANCH_PROTECTION.md` - Branch protection guide
- [ ] `.github/QUICK_START.md` - Quick start guide
- [ ] `.github/SETUP_CHECKLIST.md` - This checklist
- [ ] `server/__tests__/e2e/smoke/README.md` - Smoke tests guide
- [ ] `server/__tests__/e2e/CI_CD_INTEGRATION_SUMMARY.md` - Implementation summary

---

## 10. Monitoring Setup

### Set Up Monitoring

- [ ] Add workflow status badges to README (optional)
- [ ] Set up alerts for workflow failures
- [ ] Configure notification channels
- [ ] Document on-call procedures

### Regular Maintenance

Schedule these tasks:

- [ ] **Daily**: Review failed workflow runs
- [ ] **Weekly**: Review flaky test reports
- [ ] **Monthly**: Review test execution times
- [ ] **Quarterly**: Update dependencies

---

## 11. Team Training

### Developer Training

- [ ] Share quick start guide with team
- [ ] Demonstrate PR workflow
- [ ] Show how to view test results
- [ ] Explain how to debug failures

### DevOps Training

- [ ] Review workflow configurations
- [ ] Explain secret management
- [ ] Demonstrate manual triggers
- [ ] Show monitoring dashboards

---

## 12. Final Verification

### End-to-End Test

- [ ] Create feature branch
- [ ] Make code change
- [ ] Run tests locally
- [ ] Push to GitHub
- [ ] Open PR
- [ ] Wait for E2E tests
- [ ] Review PR comment
- [ ] Check artifacts
- [ ] Request review
- [ ] Merge PR
- [ ] Verify smoke tests run post-merge

### Production Deployment Test

- [ ] Deploy to production
- [ ] Verify smoke tests run automatically
- [ ] Check smoke test results
- [ ] Verify application is healthy
- [ ] Monitor for alerts

---

## Troubleshooting

### Workflows Not Running

**Check**:
- [ ] Workflows are enabled (Actions tab)
- [ ] Workflow files have correct syntax
- [ ] Triggers are configured correctly
- [ ] Repository has Actions enabled

**Fix**:
```bash
# Verify workflow syntax
gh workflow view <workflow-name>

# Check workflow status
gh workflow list

# Enable workflow if disabled
gh workflow enable <workflow-name>
```

### Tests Failing

**Check**:
- [ ] Secrets are configured correctly
- [ ] Test database is accessible
- [ ] Environment variables are set
- [ ] Dependencies are installed

**Debug**:
```bash
# Run tests locally
npm run test:e2e

# Check test logs
gh run view <run-id> --log

# Download artifacts
gh run download <run-id>
```

### Artifacts Not Uploading

**Check**:
- [ ] Artifact paths exist
- [ ] Workflow has write permissions
- [ ] Artifact size is within limits

**Fix**:
- Verify paths in workflow file
- Check workflow permissions
- Reduce artifact size if needed

---

## Sign-Off

Once all items are checked:

- [ ] All secrets configured
- [ ] All workflows tested
- [ ] Branch protection enabled
- [ ] Artifacts uploading correctly
- [ ] Notifications working
- [ ] Documentation complete
- [ ] Team trained

**Signed off by**: ___________________  
**Date**: ___________________  
**Notes**: ___________________

---

## Next Steps

After completing this checklist:

1. Monitor workflows for first week
2. Address any issues that arise
3. Gather feedback from team
4. Optimize slow tests
5. Update documentation as needed

---

## Support

Need help?
- Review [CI/CD Documentation](.github/README.md)
- Check [Troubleshooting Guide](.github/README.md#troubleshooting)
- Contact DevOps team
- Create issue with `ci/cd` label
