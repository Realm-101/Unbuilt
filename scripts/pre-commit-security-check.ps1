# Pre-commit security check script for Windows PowerShell
# This script runs credential detection before commits to prevent
# hardcoded credentials from being committed to the repository

Write-Host "🔍 Running security checks before commit..." -ForegroundColor Blue

# Run credential detection
npm run security:scan-strict

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Security check failed! Hardcoded credentials detected." -ForegroundColor Red
    Write-Host "Please remove any hardcoded credentials before committing." -ForegroundColor Yellow
    Write-Host "Run 'npm run security:scan' for detailed information." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Security checks passed!" -ForegroundColor Green
exit 0