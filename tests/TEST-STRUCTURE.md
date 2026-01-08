# Test Structure - Testing Pyramid

```
         E2E (1-5 tests)
       /                \
    System (5-10 tests)
   /                      \
Integration (20-30 tests)
/                          \
Unit (100+ tests)
```

## 📁 Test Organization

### 1. 🔵 Unit Tests (`tests/unit/`)
**Goal**: Test individual functions/classes in isolation
**Speed**: Fast (< 1ms each)
**Coverage**: 80%+ of codebase

#### `unit/primitives/`
- `string-number-boolean.test.ts` - Basic primitive types
- `null-undefined.test.ts` - Nullish values handling
- `bigint.test.ts` - BigInt transformations
- `symbol.test.ts` - Symbol handling

#### `unit/collections/`
- `arrays.test.ts` - Array transformations
- `sets.test.ts` - Set transformations
- `maps.test.ts` - Map transformations
- `typed-arrays.test.ts` - TypedArray support

#### `unit/transformers/`
- `date-transformer.test.ts` - Date serialization/deserialization
- `regexp-transformer.test.ts` - RegExp transformations
- `error-transformer.test.ts` - Error object handling
- `buffer-transformer.test.ts` - Buffer transformations
- `url-transformer.test.ts` - URL and URLSearchParams
- `custom-transformers.test.ts` - Custom transformer registration

#### `unit/serialization/`
- `serialize-primitives.test.ts` - Primitive serialization
- `serialize-complex.test.ts` - Complex type serialization
- `deserialize-primitives.test.ts` - Primitive deserialization
- `deserialize-complex.test.ts` - Complex deserialization
- `type-markers.test.ts` - __type marker handling

#### `unit/performance/`
- `serialization-benchmark.test.ts` - Serialization speed
- `deserialization-benchmark.test.ts` - Deserialization speed
- `large-objects.test.ts` - Performance with large data
- `memory-usage.test.ts` - Memory footprint

---

### 2. 🟡 Integration Tests (`tests/integration/`)
**Goal**: Test multiple components working together
**Speed**: Medium (1-10ms each)
**Coverage**: Component interactions

#### `integration/decorators/`
- `quick-decorator-basics.test.ts` - @Quick() basic usage
- `quick-decorator-typemap.test.ts` - typeMap functionality
- `quick-decorator-arrays.test.ts` - Array handling with @Quick()
- `quick-decorator-nested.test.ts` - Nested models

#### `integration/models/`
- `model-creation.test.ts` - Creating model instances
- `model-cloning.test.ts` - clone() functionality
- `model-inheritance.test.ts` - Model inheritance chains
- `model-methods.test.ts` - Custom methods preservation

#### `integration/roundtrip/`
- `roundtrip-primitives.test.ts` - Primitive roundtrip (model → JSON → model)
- `roundtrip-complex.test.ts` - Complex type roundtrip
- `roundtrip-nested.test.ts` - Nested model roundtrip
- `roundtrip-arrays.test.ts` - Array roundtrip

---

### 3. 🔶 System Tests (`tests/system/`)
**Goal**: Test complete workflows end-to-end within the system
**Speed**: Slower (10-100ms each)
**Coverage**: Complete feature flows

#### `system/full-workflow/`
- `api-response-workflow.test.ts` - Simulate API response → model → storage → retrieval
- `form-data-workflow.test.ts` - Form data → validation → model → submit
- `data-migration-workflow.test.ts` - Old format → transform → new model

#### `system/real-world/`
- `user-management-system.test.ts` - Complete user CRUD with models
- `e-commerce-cart-system.test.ts` - Shopping cart with nested products
- `blog-post-system.test.ts` - Blog posts with comments and tags

---

### 4. 🔺 E2E Tests (`tests/e2e/`)
**Goal**: Test from user perspective, full application scenarios
**Speed**: Slowest (100ms+ each)
**Coverage**: Critical user paths

#### `e2e/user-scenarios/`
- `user-registration-flow.test.ts` - Complete registration with validation
- `data-import-export.test.ts` - Import CSV → models → export JSON
- `real-time-sync.test.ts` - Simulate real-time data synchronization
- `complex-dashboard.test.ts` - Dashboard with multiple model types
- `backwards-compatibility.test.ts` - Old data formats still work

---

## 🎯 Test Coverage Goals

| Level | Tests | Lines Covered | Execution Time |
|-------|-------|---------------|----------------|
| Unit | 100+ | 80%+ | < 1s |
| Integration | 30+ | 60%+ | < 3s |
| System | 10+ | 40%+ | < 5s |
| E2E | 5+ | 30%+ | < 10s |

**Total**: ~150 tests in < 20s

---

## 🧪 Test Naming Convention

```
[feature]-[scenario]-[expected-result].test.ts
```

**Examples**:
- ✅ `date-serialization-iso-string.test.ts`
- ✅ `quick-decorator-arrays-transform-correctly.test.ts`
- ✅ `model-clone-deep-copy-independence.test.ts`
- ❌ `test1.test.ts`
- ❌ `stuff.test.ts`

---

## 🔄 Migration Plan

### Phase 1: Organize Existing Tests
1. Move unit tests to appropriate subdirectories
2. Rename files to be descriptive
3. Remove duplicate/obsolete tests

### Phase 2: Fill Gaps
1. Create missing unit tests (transformers, edge cases)
2. Add integration tests for all decorator combinations
3. Build system tests for workflows

### Phase 3: E2E Coverage
1. Create user scenario tests
2. Add performance regression tests
3. Add compatibility tests

---

## ⚡ Quick Reference

Run specific test levels:
```bash
# Unit only (fast feedback)
bun test tests/unit

# Integration (feature validation)
bun test tests/integration

# System (workflow validation)
bun test tests/system

# E2E (user scenarios)
bun test tests/e2e

# All tests
bun test
```
