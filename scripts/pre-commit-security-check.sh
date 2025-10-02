#!/bin/bash

# Pre-commit security check script
# This script runs credential detection before commits to prevent
# hardcoded credentials from being committed to the repository

echo "🔍 Running security checks before commit..."

# Run credential detection
npm run security:scan-strict

if [ $? -ne 0 ]; then
    echo "❌ Security check failed! Hardcoded credentials detected."
    echo "Please remove any hardcoded credentials before committing."
    echo "Run 'npm run security:scan' for detailed information."
    exit 1
fi

echo "✅ Security checks passed!"
exit 0