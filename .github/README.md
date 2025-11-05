# CI/CD Pipeline Documentation

This directory contains GitHub Actions workflows for the Kure-Cal project.

## 🚀 Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)
Runs on every push and pull request to main/develop branches.

**Jobs:**
- **Lint & Type Check**: ESLint and TypeScript validation
- **Unit Tests**: Vitest test suite execution
- **Build Verification**: Ensures the app builds successfully
- **E2E Tests**: Playwright end-to-end tests
- **Security Audit**: npm audit and vulnerability scanning
- **Bundle Analysis**: Bundle size analysis for PRs

### 2. Deploy Pipeline (`.github/workflows/deploy.yml`)
Runs on pushes to main branch and manual triggers.

**Jobs:**
- **Deploy to Staging**: Automatic deployment to staging environment
- **Deploy to Production**: Production deployment after staging tests pass
- **Rollback**: Automatic rollback on deployment failure

### 3. Dependency Updates (`.github/workflows/dependabot.yml`)
Runs weekly to update dependencies.

**Features:**
- Updates npm dependencies
- Runs tests after updates
- Creates PR with changes
- Fixes security vulnerabilities

## 🔧 Configuration Files

### `audit-ci.json`
Security audit configuration for CI pipeline.

### `playwright.staging.config.ts`
Playwright configuration for staging environment tests.

### `.github/dependabot.yml`
Dependabot configuration for automated dependency updates.

## 📋 Required Secrets

Add these secrets to your GitHub repository:

### Vercel Deployment
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Notifications (Optional)
- `SLACK_WEBHOOK`: Slack webhook for deployment notifications

## 🛠️ Available Scripts

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Run E2E tests with UI
npm run test:e2e:staging   # Run E2E tests on staging

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run type-check         # Run TypeScript type check

# Security
npm run audit              # Run security audit
npm run audit:fix          # Fix security issues

# Analysis
npm run build:analyze      # Build with bundle analysis
```

## 🚦 Pipeline Status

The CI pipeline will:
1. ✅ Run on every PR and push
2. ✅ Block merges if any step fails
3. ✅ Provide detailed feedback on failures
4. ✅ Generate test coverage reports
5. ✅ Analyze bundle sizes
6. ✅ Check for security vulnerabilities

## 🔄 Deployment Process

1. **Push to main** → Triggers CI pipeline
2. **CI passes** → Deploys to staging
3. **Staging tests pass** → Deploys to production
4. **Failure** → Automatic rollback and notification

## 📊 Monitoring

- **Test Coverage**: Available in CI reports
- **Bundle Analysis**: Generated for each PR
- **Security Audit**: Runs on every build
- **Deployment Status**: Notifications via Slack (if configured)

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails**: Check TypeScript errors and linting issues
2. **Tests Fail**: Review test output and fix failing tests
3. **E2E Tests Fail**: Check if application starts correctly
4. **Deployment Fails**: Verify Vercel configuration and secrets

### Getting Help

- Check the Actions tab in GitHub for detailed logs
- Review the specific job that failed
- Check the test reports and coverage
- Verify all required secrets are configured
