# Reserved Words & the `$qm` Namespace

## Why this page exists

QuickModel adds a set of methods to every model instance: `serialize`, `copy`, `patch`, `diff`, `validate`, and others. These are the library's infrastructure — but they sit **directly on the instance**, which means your model cannot have fields with those names.

This is a real limitation. A perfectly valid domain model like this will conflict:

```typescript
interface IOrder {
	history: IOrderEvent[]; // ❌ conflicts with future history API
	copy: string; // ❌ conflicts with copy()
	validate: boolean; // ❌ conflicts with validate()
}
```

---

## Current reserved words (v1.x)

The following names **cannot be used as field names** in any model:

| Method             | Description                               |
| ------------------ | ----------------------------------------- |
| `serialize`        | Converts instance to plain object         |
| `populate`         | Fills fields from plain data              |
| `copy`             | Returns a new immutable copy with changes |
| `patch`            | Mutates the instance in-place             |
| `diff`             | Returns field-by-field differences        |
| `equals`           | Compares two instances                    |
| `validate`         | Unified sync/async validation             |
| `checkRules`       | Runs `@QRule` predicates                  |
| `checkRulesAsync`  | Async version of `checkRules`             |
| `isValid`          | Convenience shortcut                      |
| `hasIntegrity`     | Integrity check                           |
| `isDirty`          | Whether instance has unsaved changes      |
| `getChanges`       | Returns changed fields                    |
| `toFormData`       | Converts to FormData                      |
| `toReadableStream` | Converts to ReadableStream                |
| `fromStream`       | Populates from a stream                   |
| `pipeStream`       | Pipes to a writable stream                |
| `configure`        | Per-instance config override              |

If you use any of these as a field name, it will be shadowed by the library method and behave unexpectedly.

---

## The solution: `$qm` namespace (coming in v2.0)

In v2.0, all library methods will move under a single `$qm` property. This means your model only needs to avoid **one name** instead of 20+.

```typescript
// v1.x
user.serialize();
user.patch({ name: 'Alice' });
user.diff(other);

// v2.0
user.$qm.serialize();
user.$qm.patch({ name: 'Alice' });
user.$qm.diff(other);
```

With `$qm`, your model fields are completely free:

```typescript
interface IOrder {
	history: IOrderEvent[]; // ✅ no conflict
	copy: string; // ✅ no conflict
	validate: boolean; // ✅ no conflict
	serialize: string; // ✅ no conflict
}
```

The `$` prefix is a well-established convention — Vue, Angular and other frameworks use it to signal "framework-internal, not domain data".

---

## Migration path

The transition from v1 to v2 will be gradual:

**Phase 1 — v1.x (dual API)**

- All methods remain available directly on the instance (backward compatible).
- The `$qm` namespace is **also available** with the full API.
- Methods on the instance root emit a TypeScript `@deprecated` warning and a `console.warn` in development.

```typescript
user.serialize();
// ⚠️ [QuickModel] user.serialize() is deprecated.
//    Use user.$qm.serialize() instead. Will be removed in v2.0.0.

user.$qm.serialize(); // ✅ no warning
```

**Phase 2 — v2.0.0 (breaking release)**

- Methods on the instance root are removed.
- Only `$qm` remains.
- A migration guide will be published in `CHANGELOG.md`.

---

## The `$qm.history` handle (Audit Trail)

One of the reasons for this change is to cleanly introduce `$qm.history`, an optional audit trail for tracking field mutations over time. Since `history` is a common domain field name, putting it under `$qm` avoids the conflict entirely.

```typescript
// Only active when explicitly enabled:
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> {
	declare name: string;
}

contract.$qm.patch({ name: 'v2' });

contract.$qm.history.value;
// → [{ field: 'name', from: 'v1', to: 'v2', at: Date, method: 'patch' }]

contract.$qm.history.isActive; // boolean
contract.$qm.history.stop(); // pause recording
contract.$qm.history.start(); // resume
contract.$qm.history.clear(); // empty entries (keep config)
contract.$qm.history.configure({ maxEntries: 20 });
```

**Zero overhead when disabled:** when `audit.enabled` is false (the default), the history array is never instantiated and `patch()` / `copy()` run no extra code.

### Audit configuration levels

From lowest to highest priority:

```typescript
// 1. Global
QConfig.configure({ audit: { enabled: false, maxEntries: 100 } });

// 2. Per class (second parameter of @Quick)
@Quick({ name: 'string' }, { audit: { enabled: true, maxEntries: 50 } })
class Contract extends QModel<IContract> { ... }

// 3. Per instance (runtime, highest priority)
contract.$qm.history.configure({ maxEntries: 20 });
```

---

## Timeline

| Version      | Status                                                       |
| ------------ | ------------------------------------------------------------ |
| v1.x current | Methods on instance root. `$qm` not yet available.           |
| v1.x next    | `$qm` available. Instance root methods marked `@deprecated`. |
| v2.0.0       | Instance root methods removed. Only `$qm`.                   |

::: info Detailed plan
The full technical specification for this refactoring is documented in
[`proposals/QM-NAMESPACE-REFACTOR.md`](https://github.com/your-org/quickmodel/blob/develop/docs-vitepress/proposals/QM-NAMESPACE-REFACTOR.md).
:::
