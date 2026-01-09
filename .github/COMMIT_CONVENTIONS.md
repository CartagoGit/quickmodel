# Commit Message Conventions

## Format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types (REQUIRED)

| Type | Description | Version Bump | Example |
|------|-------------|--------------|---------|
| **feat** | New feature | MINOR | `feat(transformers): add URL transformer` |
| **fix** | Bug fix | PATCH | `fix(serializer): correct BigInt bug` |
| **docs** | Documentation only | None | `docs(readme): update installation` |
| **style** | Formatting, no code change | None | `style: fix indentation` |
| **refactor** | Code refactoring | None | `refactor(decorators): simplify logic` |
| **perf** | Performance improvement | PATCH | `perf(serializer): optimize speed` |
| **test** | Adding/modifying tests | None | `test(transformers): add Date tests` |
| **chore** | Maintenance tasks | None | `chore(deps): update typescript` |
| **ci** | CI/CD changes | None | `ci: update GitHub Actions` |
| **build** | Build system changes | None | `build: update tsup config` |

## Scopes (OPTIONAL but recommended)

- **transformers** - Changes to transformer classes
- **decorators** - Changes to @Quick or @QType decorators
- **services** - Changes to serializer/deserializer/mock services
- **core** - Changes to core QModel class
- **tests** - Changes to test files
- **docs** - Changes to documentation
- **build** - Changes to build configuration
- **deps** - Dependency updates

## Rules

1. ✅ **Subject MUST be lowercase** (except proper nouns)
2. ✅ **No period at the end** of subject
3. ✅ **Maximum 72 characters** for subject line
4. ✅ **Use imperative mood**: "add" not "added" or "adds"
5. ✅ **Body is optional** but recommended for non-trivial changes
6. ✅ **Blank line** between subject and body

## Breaking Changes

When code breaks backward compatibility:

**Option 1: Use `!` after type:**
```
feat!: remove deprecated API

Removed old serialize() method. Users must use toInterface() instead.
```

**Option 2: Use BREAKING CHANGE in footer:**
```
feat: redesign transformer API

BREAKING CHANGE: Transformers now require explicit type registration.
All custom transformers must be updated.
```

## Examples

### ✅ Good Commits

```bash
feat(transformers): add URL transformer support

fix(serializer): correct BigInt serialization in nested objects

docs(readme): update installation instructions

chore(deps): update typescript to 5.7.2

test(transformers): add comprehensive tests for Date transformer

refactor(decorators): simplify type detection logic

perf(serializer): optimize circular reference detection

feat!: remove deprecated serialize() method
```

### ❌ Bad Commits

```bash
❌ "update code"              # No type, too vague
❌ "fix bug"                  # Too vague
❌ "changes"                  # Meaningless
❌ "wip"                      # Work in progress, not descriptive
❌ "Updated transformers."    # Period at end, capitalized verb
❌ "adds new feature"         # Not imperative mood
❌ "feat: Add URL support."   # Period at end
❌ "Feat: add support"        # Type should be lowercase
```

## Multiple Changes

If you have multiple unrelated changes, make separate commits:

```bash
# ❌ Bad: Multiple unrelated changes in one commit
git commit -m "feat: add URL transformer and fix BigInt bug and update docs"

# ✅ Good: Separate commits
git commit -m "feat(transformers): add URL transformer"
git commit -m "fix(serializer): correct BigInt bug"
git commit -m "docs(readme): update transformer examples"
```

## Semantic Versioning Impact

Commits determine the next version number:

```bash
# 1.2.3 → 1.2.4 (PATCH)
fix: correct serialization bug

# 1.2.3 → 1.3.0 (MINOR)
feat: add new transformer

# 1.2.3 → 2.0.0 (MAJOR)
feat!: remove deprecated API
BREAKING CHANGE: API redesigned
```

## Tools

- **Pre-release check**: `bun run release:check` - Shows commits since last tag
- **Semantic-release**: Analyzes commits and creates releases automatically

See [SEMANTIC_RELEASE_SETUP.md](SEMANTIC_RELEASE_SETUP.md) for release workflow.
