# Naming Conventions — `IQ`, `Q` and `$q`

QuickModel uses a three-layer naming system across its entire public API. Every symbol — whether a type, a class, a decorator, or an instance method — belongs to exactly one of these three layers. Understanding the system makes the code instantly readable and predictable.

## The Three Layers at a Glance

| Prefix | Layer                                      | Examples                                         |
| ------ | ------------------------------------------ | ------------------------------------------------ |
| `IQ`   | Types and interfaces (compile-time only)   | `IQImplements`, `IQConfig`, `IQValidationReport` |
| `Q`    | Classes and decorators (runtime entities)  | `QModel`, `QField`, `QAlias`, `QDefault`         |
| `$q`   | Instance methods injected by the framework | `$qSerialize()`, `$qCopy()`, `$qValidate()`      |

---

## Layer 1 — `IQ`: Types and Interfaces

The `IQ` prefix marks TypeScript types and interfaces that belong to QuickModel. They exist **only at compile time** and are completely erased at runtime.

The prefix combines two conventions:

- `I` — the standard TypeScript prefix for interfaces (used throughout this project)
- `Q` — the QuickModel namespace

This double prefix clearly separates framework types from your own domain types. When you see `IUser` in a codebase, that is your type. When you see `IQValidationReport`, that belongs to the library.

```typescript
import {
	IQImplements, // ensures class ↔ interface contract
	IQConfig, // global config shape
	IQValidationReport, // result of $qValidate()
	IQCreateManyResult, // result of QModel.createMany()
	IQFormSchemaEntry, // shape of a @QField schema entry
} from 'quickmodel';

interface IUser {
	// ← your domain type — plain "I" prefix
	id: number;
	name: string;
	createdAt: string;
}

interface IUserTransforms {
	// ← also yours
	createdAt: Date;
}

@Quick({ createdAt: Date }) // ← library type
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;
	declare name: string;
	declare createdAt: Date;
}
```

> [!TIP] Spotting the difference instantly
> `IUser` → your type. `IQUser` → would belong to QuickModel (though the library has no such type). The `Q` in the middle is the namespace signal.

---

## Layer 2 — `Q`: Classes and Decorators

The `Q` prefix marks **runtime entities** that are part of the public API: base classes and decorators.

```typescript
// Base class — all models extend this
class User extends QModel<IUser> { ... }
class UserCollection extends QModelCollection<User> { ... }

// Decorators — applied to the class or its properties
@Quick({ createdAt: Date })          // transformation map
@QField({ label: 'Full name' })      // field metadata
@QAlias('first_name')                // key remapping
@QDefault('active')                  // default value
@QReadonly()                         // immutable field
@QTransform(v => v.trim())           // custom transform
@QRule(v => v.id > 0, 'id > 0')     // business rule
```

### Why `Q` and not the full word?

Consider what happens if the prefix were `QuickModel`:

```typescript
// ❌ Verbose — hard to read, noisy in diffs
class User
	extends QuickModelBase<IUser>
	implements QuickModelImplements<IUser, IUserTransforms>
{
	@QuickModelField({ label: 'Name' })
	@QuickModelAlias('full_name')
	declare name: string;
}

// ✅ Concise — the Q already signals the namespace unambiguously
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	@QField({ label: 'Name' })
	@QAlias('full_name')
	declare name: string;
}
```

`Q` is short enough to write dozens of times a day without friction, yet distinctive enough that there is no realistic collision with user-defined class names (`Queue`, `Query`, etc. are common but `QModel` is not).

This follows the same pattern as other popular libraries: React exports `Component`, not `ReactComponent`; RxJS exports `Observable`, not `RxJSObservable`.

---

## Layer 3 — `$q`: Instance Methods

The `$q` prefix marks methods that QuickModel **injects into every model instance**. This is the most important layer to understand, because it solves a concrete technical problem.

### The collision problem

A QuickModel instance carries both your domain data _and_ framework methods on the same object. If the framework used plain method names, any field you define could silently shadow a framework method:

```typescript
// Imagine the framework used plain names:
class Order extends QModel<IOrder> {
	declare id: number;
	declare serialize: string; // ← field from your API
}

const order = new Order({ id: 1, serialize: 'json' });
order.$qSerialize(); // ← 💥 TypeError: order.serialize is not a function
//    the field shadowed the framework method
```

The `$` character is valid in JavaScript identifiers but **never appears in real-world API field names**. No JSON payload ever comes with a key like `$qSerialize`. This makes `$q` a collision-free namespace:

```typescript
class Order extends QModel<IOrder> {
	declare id: number;
	declare serialize: string; // ← your field, untouched
}

const order = new Order({ id: 1, serialize: 'json' });
order.serialize; // ← 'json'      — your field
order.$qSerialize(); // ← { id: 1, serialize: 'json' } — framework method
```

### The `$` convention comes from the framework world

Angular introduced `$scope.$watch()` and `$http.get()` for this exact reason. Vue uses `vm.$emit()`, `vm.$refs`, `vm.$router`. The `$` prefix signals _"this belongs to the framework, not to your data"_. QuickModel narrows it further with `q` to avoid clashing with other libraries that also use `$`.

### All `$q` methods

Every `QModel` instance exposes the full set of framework methods under the `$q` prefix. The categories below group them by concern:

```typescript
const user = new User({ id: 1, name: 'Alice', createdAt: '2026-01-01' });

// Serialization
user.$qSerialize(); // → plain object (JSON-safe)
user.$qToJSON(); // → JSON string
user.$qToFormData(); // → FormData (for multipart forms)
user.$qToReadableStream(); // → ReadableStream (for server-sent events)

// Validation / integrity
user.$qCheckIntegrity(); // → IQIntegrityResult (type checks)
user.$qHasIntegrity(); // → boolean
user.$qCheckRules(); // → IQRulesResult (business rules, sync)
user.$qIsValid(); // → boolean
user.$qValidate(); // → IQValidationReport
user.$qValidationReport(); // → same as $qValidate() but returns the report only
await user.$qCheckRulesAsync(); // → IQRulesResult (async rules)
await user.$qIsValidAsync(); // → boolean
await user.$qValidationReportAsync(); // → IQValidationReport

// State tracking
user.$qToInterface(); // → IUser (typed plain object)
user.$qGetInitInterface(); // → initial state when the instance was created
user.$qHasChanges(); // → boolean
user.$qGetChangedFields(); // → array of changed field keys
user.$qGetDirtyFields(); // → alias of $qGetChangedFields()
user.$qIsDirty(); // → boolean
user.$qGetChanges(); // → map of old → new values

// Mutation helpers
user.$qReset(); // → restores the instance to its initial state
user.$qPatch(data); // → applies a partial update
user.$qCopy(); // → deep copy of the instance
user.$qDiff(other); // → field-level diff against another instance
user.$qEquals(other); // → boolean deep equality
user.$qFrom(data); // → creates a new instance from plain data
user.$qFromJSON(json); // → creates a new instance from a JSON string

// Schema and metadata
user.$qToPlain(); // → plain object without framework metadata
user.$qGetFormSchema(); // → flat form schema from @QField decorators
user.$qGetFormSchemaGrouped(); // → form schema grouped by @QGroup
user.$qGetMetadata(); // → complete field metadata map
user.$qGetSchema('json'); // → JSON Schema for this model
user.$qGetSchema('zod'); // → Zod schema for this model
```

> [!NOTE] `$q` only on `QModel` and `QModelCollection`
> The `$q` prefix exists specifically to avoid collisions between framework methods and **user-defined field names**. It is therefore only needed on classes that users extend with their own properties — `QModel` and `QModelCollection`.
>
> Framework utility classes that users instantiate but **do not extend** — `QMockBuilder`, `QSerializer`, `QDeserializer`, `QJsonSchemaGenerator`, `QModelConfigService`, and the rest — use plain method names (`empty()`, `random()`, `generate()`) because there is no field-naming conflict possible on those classes.

### IDE autocompletion benefit

Because all framework methods share the `$q` prefix, you get a focused autocomplete list the moment you type `.$q`:

```
user.$q|
        ├── $qCheckIntegrity()
        ├── $qCheckRules()
        ├── $qCopy()
        ├── $qDiff()
        ├── $qEquals()
        ├── $qFrom()
        ├── $qFromJSON()
        ├── $qGetChangedFields()
        ├── $qGetChanges()
        ├── $qGetDirtyFields()
        ├── $qGetFormSchema()
        ├── $qGetFormSchemaGrouped()
        ├── $qGetInitInterface()
        ├── $qGetMetadata()
        ├── $qGetSchema()
        ├── $qHasChanges()
        ├── $qHasIntegrity()
        ├── $qIsDirty()
        ├── $qIsValid()
        ├── $qIsValidAsync()
        ├── $qPatch()
        ├── $qReset()
        ├── $qSerialize()
        ├── $qToFormData()
        ├── $qToInterface()
        ├── $qToJSON()
        ├── $qToPlain()
        ├── $qToReadableStream()
        ├── $qValidate()
        ├── $qValidationReport()
        └── $qValidationReportAsync()
```

Your domain properties (`id`, `name`, `createdAt`) appear separately and are never mixed with framework methods.

---

## Putting It All Together

A complete model that uses all three layers:

```typescript
import {
	QModel, // Q  — base class
	IQImplements, // IQ — compile-time contract type
	IQValidationReport, // IQ — type for validate result
	Quick, // Q  — decorator
	QField, // Q  — decorator
	QAlias, // Q  — decorator
	QRule, // Q  — decorator
} from 'quickmodel';

// Your domain types (plain "I" prefix — not part of QuickModel)
interface IUser {
	id: number;
	full_name: string;
	created_at: string;
}
interface IUserTransforms {
	created_at: Date;
}

// The model class
@Quick({ created_at: Date }) // Q
// IQ
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;

	@QField({ label: 'Full name' }) // Q
	@QAlias('full_name') // Q
	declare name: string;

	@QRule((u) => u.id > 0, 'ID must be positive') // Q
	declare created_at: Date;
}

// Usage — $q methods are always available
const user = new User({ id: 1, full_name: 'Alice', created_at: '2026-01-01' });

const json = user.$qSerialize(); // $q — framework method
const copy = user.$qCopy(); // $q — framework method
const report: IQValidationReport = await user.$qValidate(); // IQ — type // $q — framework method
```

---

## Why Not `quickmodel_` ?

For completeness, here is why the obvious alternative was discarded:

| Criterion                       | `quickmodel_serialize()` | `$qSerialize()`      |
| ------------------------------- | ------------------------ | -------------------- |
| Characters to type              | 24                       | 13                   |
| Autocomplete trigger            | must type `quickmodel_`  | type `.$q`           |
| Readability in a 100-char line  | noisy                    | clean                |
| Collision risk with user fields | near zero (same as `$q`) | near zero            |
| Convention precedent            | none                     | Angular, Vue, jQuery |

Short prefixes win on ergonomics without sacrificing clarity, which is the guiding principle of the entire QuickModel naming system.
