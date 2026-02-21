#!/bin/bash

# Pre-Release Checklist Script
# Run this before merging to main

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           PRE-RELEASE CHECKLIST                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if we're on main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  WARNING: You are on branch '$CURRENT_BRANCH', not 'main'"
  echo "   Switch to main before releasing"
  echo ""
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "❌ ERROR: You have uncommitted changes"
  echo "   Commit or stash them first"
  exit 1
fi

# Get latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)

if [ -z "$LATEST_TAG" ]; then
  echo "⚠️  WARNING: No tags found in repository"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🏷️  CREATE YOUR FIRST TAG:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  For initial release (recommended):"
  echo "    git tag v1.0.0"
  echo "    git push origin v1.0.0"
  echo ""
  echo "  This will be your baseline. Semantic-release will only"
  echo "  analyze commits AFTER this tag."
  echo ""
  exit 1
fi

# Count commits since last tag
COMMITS_SINCE_TAG=$(git rev-list ${LATEST_TAG}..HEAD --count)

echo "✅ Latest tag: $LATEST_TAG"
echo "📊 Commits since tag: $COMMITS_SINCE_TAG"
echo ""

if [ "$COMMITS_SINCE_TAG" -eq 0 ]; then
  echo "⚠️  No new commits since last tag"
  echo "   Nothing to release"
  exit 0
fi

# Show commits since last tag
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 COMMITS THAT WILL BE RELEASED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
git log ${LATEST_TAG}..HEAD --oneline --decorate
echo ""

# Analyze commit types
FEAT_COUNT=$(git log ${LATEST_TAG}..HEAD --oneline | grep -c "^[a-f0-9]* feat" || true)
FIX_COUNT=$(git log ${LATEST_TAG}..HEAD --oneline | grep -cE "^[a-f0-9]* (fix|perf)" || true)
BREAKING_COUNT=$(git log ${LATEST_TAG}..HEAD --grep="BREAKING CHANGE" --count || true)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 COMMIT ANALYSIS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🎯 Features (feat:):        $FEAT_COUNT"
  echo "  🐛 Fixes (fix:, perf:):     $FIX_COUNT"
echo "  💥 Breaking Changes:        $BREAKING_COUNT"
echo ""

# Determine version bump
CURRENT_VERSION=${LATEST_TAG#v}
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

if [ "$BREAKING_COUNT" -gt 0 ]; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
  PATCH=0
  BUMP_TYPE="MAJOR"
elif [ "$FEAT_COUNT" -gt 0 ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
  BUMP_TYPE="MINOR"
elif [ "$FIX_COUNT" -gt 0 ]; then
  PATCH=$((PATCH + 1))
  BUMP_TYPE="PATCH"
else
  BUMP_TYPE="NONE"
fi

NEXT_VERSION="$MAJOR.$MINOR.$PATCH"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 EXPECTED RELEASE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Current:  $LATEST_TAG"
echo "  Next:     v$NEXT_VERSION ($BUMP_TYPE)"
echo ""

if [ "$BUMP_TYPE" = "NONE" ]; then
  echo "  ⚠️  No conventional commits found"
  echo "     Semantic-release may not create a new version"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ READY TO RELEASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Next steps:"
echo "    1. Review commits above"
echo "    2. Run tests: bun test"
echo "    3. Build: bun run build"
echo "    4. Merge to main: git checkout main && git merge develop"
echo "    5. Push: git push origin main"
echo "    6. Semantic-release will automatically:"
echo "       - Create tag v$NEXT_VERSION"
echo "       - Generate CHANGELOG"
echo "       - Publish to npm"
echo "       - Create GitHub release"
echo ""
