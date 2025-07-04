#!/bin/bash

# EcoScan GitHub Repository Setup Script
# Configures GitHub repository with branches, protection rules, and CI/CD

echo "🚀 Setting up EcoScan GitHub Repository"
echo "======================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run from project root."
    exit 1
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub CLI:"
    gh auth login
fi

# Repository configuration
REPO_NAME="ecoscan"
REPO_DESCRIPTION="🌱 AI-powered waste classification using computer vision and voice recognition for better recycling"
REPO_TOPICS="ai,machine-learning,computer-vision,waste-sorting,recycling,sustainability,pwa,svelte,typescript,onnx"

echo "📝 Configuring repository settings..."

# Create repository if it doesn't exist
if ! gh repo view &> /dev/null; then
    echo "Creating new repository..."
    gh repo create $REPO_NAME \
        --description "$REPO_DESCRIPTION" \
        --public \
        --add-readme=false \
        --clone=false
fi

# Set repository topics
echo "Setting repository topics..."
gh api repos/:owner/$REPO_NAME --method PATCH \
    --field topics="$REPO_TOPICS" \
    --field has_wiki=false \
    --field has_projects=true \
    --field has_discussions=true

# Create branch protection rules
echo "🛡️ Setting up branch protection..."

# Main branch protection
gh api repos/:owner/$REPO_NAME/branches/main/protection \
    --method PUT \
    --field required_status_checks='{"strict":true,"contexts":["build","test","lint"]}' \
    --field enforce_admins=false \
    --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
    --field restrictions=null \
    --field allow_force_pushes=false \
    --field allow_deletions=false

echo "📊 Setting up GitHub Actions workflows..."

# Create .github directory structure
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p .github/PULL_REQUEST_TEMPLATE

# Create CI/CD workflow
cat > .github/workflows/ci.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Type check
      run: npm run type-check
    
    - name: Lint
      run: npm run lint
    
    - name: Unit tests
      run: npm run test:coverage
    
    - name: Build
      run: npm run build
    
    - name: E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run security audit
      run: npm audit --audit-level=moderate
    
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
EOF

# Create issue templates
cat > .github/ISSUE_TEMPLATE/bug_report.yml << 'EOF'
name: 🐛 Bug Report
description: Report a bug to help us improve EcoScan
title: "[Bug]: "
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  
  - type: input
    id: contact
    attributes:
      label: Contact Details
      description: How can we get in touch with you if we need more info?
      placeholder: ex. email@example.com
    validations:
      required: false
  
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
      placeholder: Tell us what you see!
    validations:
      required: true
  
  - type: dropdown
    id: browsers
    attributes:
      label: What browsers are you seeing the problem on?
      multiple: true
      options:
        - Firefox
        - Chrome
        - Safari
        - Microsoft Edge
  
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code, so no need for backticks.
      render: shell
EOF

cat > .github/ISSUE_TEMPLATE/feature_request.yml << 'EOF'
name: 🚀 Feature Request
description: Suggest an idea for EcoScan
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature for EcoScan!
  
  - type: textarea
    id: feature-description
    attributes:
      label: Feature Description
      description: A clear and concise description of what you want to happen.
      placeholder: I would like to see...
    validations:
      required: true
  
  - type: textarea
    id: motivation
    attributes:
      label: Motivation
      description: Why is this feature important? What problem does it solve?
      placeholder: This feature would help...
    validations:
      required: true
  
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: A clear and concise description of any alternative solutions you've considered.
    validations:
      required: false
EOF

# Create pull request template
cat > .github/PULL_REQUEST_TEMPLATE.md << 'EOF'
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactor

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] Accessibility testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
EOF

# Create repository labels
echo "🏷️ Setting up repository labels..."

# Remove default labels and create custom ones
gh label create "priority:high" --color "d73a4a" --description "High priority issue" || true
gh label create "priority:medium" --color "fbca04" --description "Medium priority issue" || true
gh label create "priority:low" --color "0e8a16" --description "Low priority issue" || true

gh label create "type:bug" --color "d73a4a" --description "Something isn't working" || true
gh label create "type:feature" --color "a2eeef" --description "New feature or request" || true
gh label create "type:docs" --color "0075ca" --description "Documentation" || true
gh label create "type:security" --color "b60205" --description "Security related" || true

gh label create "area:ml" --color "1d76db" --description "Machine learning related" || true
gh label create "area:ui" --color "c5def5" --description "User interface related" || true
gh label create "area:performance" --color "ffcc00" --description "Performance related" || true
gh label create "area:accessibility" --color "7057ff" --description "Accessibility related" || true

# Set up repository secrets (user needs to add these manually)
echo "🔐 Repository secrets needed:"
echo "  - VERCEL_TOKEN: Vercel deployment token"
echo "  - VERCEL_ORG_ID: Vercel organization ID"
echo "  - VERCEL_PROJECT_ID: Vercel project ID"
echo "  - SNYK_TOKEN: Snyk security scanning token"
echo ""
echo "Add these at: https://github.com/:owner/$REPO_NAME/settings/secrets/actions"

# Create development branch
echo "🌿 Creating development branch..."
git checkout -b develop 2>/dev/null || git checkout develop
git push origin develop 2>/dev/null || echo "Develop branch already exists on remote"
git checkout main

echo ""
echo "✅ GitHub repository setup complete!"
echo ""
echo "🔗 Repository: https://github.com/:owner/$REPO_NAME"
echo "📊 Actions: https://github.com/:owner/$REPO_NAME/actions"
echo "🛡️ Security: https://github.com/:owner/$REPO_NAME/security"
echo ""
echo "Next steps:"
echo "1. Add repository secrets in GitHub settings"
echo "2. Configure branch protection rules if needed"
echo "3. Set up Vercel/Netlify deployment"
echo "4. Enable security scanning and code coverage"
echo ""
echo "Happy coding! 🚀" 