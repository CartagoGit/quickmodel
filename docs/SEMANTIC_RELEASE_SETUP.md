# Semantic-release Configuration

## Setup Instructions

### 1. Create NPM Token
1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Create new token (Automation type)
3. Copy the token

### 2. Add Secrets to GitHub
1. Go to your repo: https://github.com/CartagoGit/quickmodel/settings/secrets/actions
2. Add new secret:
   - Name: `NPM_TOKEN`
   - Value: (paste the token from npm)

### 3. Create Initial Tag (IMPORTANT - Do this FIRST)

Before your first release, create a baseline tag to prevent semantic-release from analyzing all historical commits:

```bash
# Create initial tag
git tag v1.0.0
git push origin v1.0.0
```

This tells semantic-release: "Start counting from here". All previous commits will be ignored.

### 4. Release Workflow

**Before merging to main, ALWAYS run:**

```bash
bun run release:check
```

This script will:
- ✅ Show commits since last tag
- ✅ Analyze commit types (feat, fix, breaking)
- ✅ Calculate expected new version
- ✅ Remind you to review before releasing

**Then merge and push to main:**

```bash
git checkout main
git merge develop
git push origin main
```

GitHub Actions will automatically:
1. Run tests
2. Build the project
3. Semantic-release analyzes commits since last tag
4. Creates new version based on commit types
5. Updates `package.json` and `CHANGELOG.md`
6. Creates git tag
7. Publishes to npm
8. Creates GitHub release

### 5. Commit Format

```bash
feat: add new transformer       # → MINOR version (1.0.0 → 1.1.0)
fix: correct serialization bug  # → PATCH version (1.1.0 → 1.1.1)
BREAKING CHANGE: remove API     # → MAJOR version (1.1.1 → 2.0.0)
docs: update README             # → No version change
chore: update dependencies      # → No version change
```

### 6. Skip CI

If you want to push without triggering release:
```bash
git commit -m "docs: update [skip ci]"
```

## Quick Reference

```bash
# Check what will be released
bun run release:check

# Run tests with coverage
bun run test:coverage

# Build for production
bun run build

# Merge to main (triggers release)
git checkout main && git merge develop && git push
```

## Configuration Files

- `.releaserc.json` - Semantic-release config
- `.github/workflows/release.yml` - GitHub Actions workflow
- `scripts/pre-release.sh` - Pre-release validation script
