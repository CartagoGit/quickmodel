# Reserved Words

## Why this page exists

In v1.0, QuickModel solved the field-name collision problem definitively. All library methods now carry a **`$q` prefix** — `$qSerialize()`, `$qCopy()`, `$qCheckRules()`, and so on — so they never clash with your domain fields.

There are **no reserved field names** in v1.0. Every plain name is available for your domain model.

---

## No reserved field names

Every name you can think of is safe to use as a field. Fields like `history`, `copy`, `serialize`, `validate`, or `checkRules` all work without any conflict:

```typescript
// ✅ All valid in v1.0
interface IOrder {
	history: IOrderEvent[]; // ✅ no conflict
	copy: string; // ✅ no conflict
	validate: boolean; // ✅ no conflict
	serialize: string; // ✅ no conflict
	checkRules: number; // ✅ no conflict
}

@Quick({
	history: 'array',
	copy: 'string',
	validate: 'boolean',
	serialize: 'string',
	checkRules: 'number',
})
class Order extends QModel<IOrder> {
	declare history: IOrderEvent[];
	declare copy: string;
	declare validate: boolean;
	declare serialize: string;
	declare checkRules: number;
}
```

This is the core design goal of the `$q*` prefix: library infrastructure and domain data live in completely separate namespaces.

---

## The `$q*` methods — quick reference

All instance methods exposed by QuickModel use the `$q` prefix:

| Method                     | Description                               |
| -------------------------- | ----------------------------------------- |
| `$qSerialize()`            | Converts instance to plain object         |
| `$qCopy(changes?)`         | Returns a new immutable copy with changes |
| `$qPatch(changes)`         | Mutates the instance in-place             |
| `$qPopulate(data)`         | Fills fields from plain data              |
| `$qDiff(other)`            | Returns field-by-field differences        |
| `$qEquals(other)`          | Compares two instances                    |
| `$qCheckRules()`           | Runs `@QRule` predicates (sync)           |
| `$qCheckRulesAsync()`      | Async version of `$qCheckRules`           |
| `$qIsValid()`              | Convenience shortcut — runs all checks    |
| `$qCheckIntegrity()`       | Integrity check                           |
| `$qIsDirty()`              | Whether instance has unsaved changes      |
| `$qGetChanges()`           | Returns changed fields                    |
| `$qToFormData()`           | Converts to FormData                      |
| `$qToReadableStream()`     | Converts to ReadableStream                |
| `$qFromStream()`           | Populates from a stream                   |
| `$qPipeStream()`           | Pipes to a writable stream                |
| `$qConfigure()`            | Per-instance config override              |
| `$qGetFormSchema()`        | Returns the QField form schema            |
| `$qGetFormSchemaGrouped()` | Returns the schema grouped by `@QGroup`   |

Static methods (called on the class, not an instance) do **not** use the `$q` prefix because there is no collision risk:

```typescript
User.getSchema('json');
User.getFormSchema();
User.getFormSchemaGrouped();
```

---

## Summary

| v1.0 behaviour                                      | Details                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| Reserved field names                                | **None**                                         |
| All plain names (`history`, `copy`, …)              | Freely available as field names                  |
| Library instance methods                            | All carry `$q` prefix — no collisions            |
| Static class methods (`getSchema`, `getFormSchema`) | No prefix — called on the class, not an instance |
