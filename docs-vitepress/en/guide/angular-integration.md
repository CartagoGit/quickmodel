# Angular Integration

QuickModel integrates naturally with **Angular** applications. Use plain TypeScript classes for Reactive Forms and `QModel` subclasses for service/repository layers.

## Key Separation

| Use case                     | Approach                                    |
| ---------------------------- | ------------------------------------------- |
| Reactive Forms validation    | Plain TS class + `@QRule` + `qCheckRules()` |
| HTTP coercion / sanitization | `QModel` subclass + `@Quick()`              |
| State / repository           | `QModel` subclass + `copy()` / `patch()`    |

## Installation

```bash
npm install @cartago-git/quickmodel
```

Enable decorators in `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Reactive Forms — Plain Class Pattern

Angular's `AbstractControl` validators receive a value and return `null` (valid) or an error object (invalid). QuickModel's `qCheckRules()` maps cleanly to this contract.

```typescript
import { QRule, QField, QGroup } from '@cartago-git/quickmodel';
import { qGroups } from '@cartago-git/quickmodel/core/helpers/q-groups';
import { qCheckRules } from '@cartago-git/quickmodel/core/helpers/q-check-rules';

const FormGroups = qGroups('identity', 'contact');

export class UserForm {
	@QField({ label: 'First Name', required: true })
	@QGroup(FormGroups.identity)
	@QRule(
		(v: string) => v.trim().length >= 2,
		'First name must be at least 2 chars'
	)
	firstName = '';

	@QField({ label: 'Email', widget: 'email' })
	@QGroup(FormGroups.contact)
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Must be a valid email'
	)
	email = '';
}

// Angular AbstractControl adapter
export function toAngularValidator(instance: UserForm, field: keyof UserForm) {
	return (): Record<string, boolean> | null => {
		const result = qCheckRules(instance);
		const errors = result.errors.filter((e) => e.field === String(field));
		if (!errors.length) return null;
		return errors.reduce<Record<string, boolean>>((acc, e) => {
			acc[e.message.replace(/\s+/g, '_').toLowerCase()] = true;
			return acc;
		}, {});
	};
}
```

::: tip Plain class, not QModel
Form classes use initialized properties (`firstName = ''`) — **not** `declare firstName: string`. This lets `qCheckRules()` read values directly.
:::

### Step-by-step form validation

```typescript
import { qCheckRulesByGroup } from '@cartago-git/quickmodel/core/helpers/q-check-rules-by-group';

// Stepper: validate one group at a time
const groups = qCheckRulesByGroup(form);
if (!groups['identity']?.valid) {
	// show identity step errors
}
```

::: tip Two patterns available

- **Plain class** (above): `@QRule` + `@QField` only — no `QModel` inheritance. Ideal for Reactive Forms with pure validation.
- **`QModel` + `@Quick`** (below): adds type coercion, immutable `copy()`, `serialize()`, and `@QComputed`. Ideal for services, repositories, and HTTP interceptors.
  :::

## Service / Repository Pattern

Use `QModel` for data stored in Angular services. The `unknownPropertyPolicy: 'strip'` option prevents injection of unexpected fields.

```typescript
import { QModel, Quick, QComputed } from '@cartago-git/quickmodel';

interface IUserRecord {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	score: number;
}

@Quick(
	{
		id: 'string',
		firstName: 'string',
		lastName: 'string',
		email: 'string',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class UserRecord extends QModel<IUserRecord> {
	declare id: string;
	declare firstName: string;
	declare lastName: string;
	declare email: string;
	declare score: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get tier(): 'gold' | 'silver' | 'bronze' {
		if (this.score >= 90) return 'gold';
		if (this.score >= 60) return 'silver';
		return 'bronze';
	}
}
```

```typescript
// users.service.ts
@Injectable({ providedIn: 'root' })
export class UsersService {
	private store = new Map<string, UserRecord>();

	save(data: object): object {
		const record = new UserRecord(data);
		this.store.set(record.id, record);
		return record.serialize();
	}

	update(id: string, patch: Partial<IUserRecord>): object | null {
		const record = this.store.get(id);
		if (!record) return null;
		// copy() is IMMUTABLE: returns a new instance
		const updated = record.copy(patch);
		this.store.set(id, updated);
		return updated.serialize();
	}
}
```

::: warning copy() is immutable
`copy()` returns a **new instance** — always capture the return value and update the store. The original instance is never modified.
:::

## HttpClient HTTP Interceptor Coercion

Strip unknown server properties and coerce types automatically:

```typescript
// http-coercion.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ApiItemDto } from './api-item.dto';

export const coercionInterceptor: HttpInterceptorFn = (req, next) =>
	next(req).pipe(
		map((event) => {
			if (
				event.type === HttpEventType.Response &&
				Array.isArray(event.body)
			) {
				const { instances } = ApiItemDto.createMany(event.body);
				return event.clone({
					body: instances.map((i) => i.serialize()),
				});
			}
			return event;
		})
	);
```

```typescript
// api-item.dto.ts
@Quick(
	{
		id: 'number',
		name: 'string',
		createdAt: Date,
		updatedAt: Date,
		active: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip' }
)
export class ApiItemDto extends QModel<IApiItem> {
	declare id: number;
	declare name: string;
	declare createdAt: Date; // coerced from ISO string
	declare updatedAt: Date; // coerced from ISO string
	declare active: boolean;
}
```

## Angular Signals (v17+)

Wrap `QModel` in a signal for reactive state:

```typescript
import { signal, computed } from '@angular/core';

// Uses UserRecord — defined above, with @QComputed fullName and tier
const profile = signal(
	new UserRecord({
		id: 'u1',
		firstName: 'Alice',
		lastName: 'Smith',
		email: 'alice@example.com',
		score: 95,
	})
);

// Update via immutable merge
profile.update((prev) => prev.copy({ score: 98 }));

// @QComputed getters are TypeScript class properties — access them directly on the instance
const fullName = computed(() => profile().fullName); // Signal<string>
const tier = computed(() => profile().tier); // Signal<'gold' | 'silver' | 'bronze'>
```

### `copy()` vs `patch()` — critical distinction for signals

| Method           | Returns                   | Triggers Angular CD    | Use with signals |
| ---------------- | ------------------------- | ---------------------- | ---------------- |
| `copy(partial)`  | New instance              | ✅ Yes — new reference | ✅ Always        |
| `patch(partial)` | `void` (mutates in place) | ❌ No                  | ❌ Never         |

```typescript
// ❌ Anti-pattern: patch() mutates in place, signal version does NOT increment
//    Angular template will NOT re-render
signal.update((model) => {
	model.patch({ score: 98 }); // void — original instance mutated
	return model; // same reference → no change detection
});

// ✅ Correct: copy() returns a new instance → signal version increments → re-render
signal.update((model) => model.copy({ score: 98 }));
```

::: warning Direct mutation is invisible to Angular signals
Even without `.update()`, mutating a model's property directly (`model.score = 98`) does NOT notify the signal. Angular's change detection only fires when `.set()` or `.update()` are called:

```typescript
const cartSignal = signal(new Cart({ userId: 'u1', total: 50 }));

// ❌ Silent mutation — template will NOT update
cartSignal().total = 100;

// ✅ Signal-aware update — template updates correctly
cartSignal.update((cart) => cart.copy({ total: 100 }));
```

:::

### `reactiveModel()` — make direct mutation reactive

You can turn direct mutation into a signal notification by wrapping the model in a `Proxy` that intercepts every `set` trap and internally calls `sig.update(m => m.copy({...}))`. This creates a new instance on every assignment, which Angular detects as a reference change.

Copy this utility into your Angular project (Angular is not a QuickModel dependency, so it cannot ship here directly):

```typescript
// utils/reactive-model.ts
import { signal, type WritableSignal } from '@angular/core';
import { QModel } from '@cartago-git/quickmodel';

type IReactiveModel<T extends QModel<any>> = T & {
	/** The underlying WritableSignal. Use for computed() / effect(). */
	readonly $signal: WritableSignal<T>;
};

export function reactiveModel<T extends QModel<any>>(
	instance: T
): IReactiveModel<T> {
	const sig = signal(instance);

	return new Proxy(instance, {
		get(_, key) {
			if (key === '$signal') return sig;
			const current = sig();
			const val = (current as Record<string, unknown>)[key as string];
			if (typeof val === 'function')
				return (val as Function).bind(current);
			return val;
		},
		set(_, key, value) {
			if (typeof key !== 'string') return false;
			// copy() → new instance → new reference → Angular detects the change
			sig.update((mdl) => mdl.copy({ [key]: value } as Partial<T>));
			return true;
		},
	}) as IReactiveModel<T>;
}
```

Usage in a component:

```typescript
@Component({ ... })
export class CartComponent {
	readonly cart = reactiveModel(
		new Cart({ userId: 'u1', total: 0, updatedAt: new Date() })
	);

	// ✅ Direct assignment — Angular re-renders automatically
	addItem(price: number): void {
		this.cart.total += price; // internally: sig.update(m => m.copy({ total: ... }))
	}

	// Computed derived from the underlying signal
	readonly totalWithTax = computed(() => this.cart.$signal().total * 1.21);

	// For bulk updates, use $signal directly
	replaceCart(data: ICart): void {
		this.cart.$signal.set(new Cart(data));
	}
}
```

::: details How it works

1. Every `this.cart.total = x` hits the Proxy `set` trap.
2. The trap calls `sig.update(m => m.copy({ total: x }))`, which produces a **new instance**.
3. Angular detects the new reference and schedules a re-render.
4. Every `this.cart.total` read hits the Proxy `get` trap, which reads from `sig()` — always the latest value.

**Tradeoff:** each assignment creates a new model instance via `copy()`. For high-frequency updates (e.g. pointer events, audio processing) prefer batching into a single `$signal.update(m => m.copy({...}))` call.
:::

### `computed()` — derived state from a model signal

```typescript
import { signal, computed } from '@angular/core';

const cart = signal(
	new Cart({ userId: 'u1', total: 60, updatedAt: '2025-01-01' })
);

// Derived values update automatically when the cart signal updates
const totalWithTax = computed(() => cart().total * 1.21);
const label = computed(() => `Cart for ${cart().userId}: $${cart().total}`);

// Serialize for API calls
const payload = computed(() => cart().serialize());

cart.update((c) => c.copy({ total: 80 }));
console.log(totalWithTax()); // 96.8
console.log(payload().updatedAt); // ISO string — serialized Date
```

### Complex types (Date, Set, BigInt) survive signal updates

`copy()` runs the full QuickModel deserialization pipeline. Passing a `Date` or `Set` directly in the partial preserves the type:

```typescript
const product = signal(
	new Product({
		sku: 'X1',
		price: 50,
		releasedAt: '2024-01-01',
		tags: ['sale'],
	})
);

// Passing a Date → stays a Date in the new instance ✅
product.update((p) => p.copy({ releasedAt: new Date('2025-06-01') }));
console.log(product().releasedAt instanceof Date); // true

// Passing a Set → stays a Set ✅
product.update((p) => p.copy({ tags: new Set(['sale', 'featured']) }));
console.log(product().tags instanceof Set); // true
```

### Multiple signals — composition

```typescript
const cart = signal(new Cart({ userId: 'u1', total: 200 }));
const discount = signal(0.1); // 10%

// Composed computed — reacts to changes in either signal
const finalPrice = computed(() => cart().total * (1 - discount()));

discount.set(0.2);
console.log(finalPrice()); // 160
```

## Async Validators

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel/core/helpers/q-check-rules-async';
import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { from } from 'rxjs';

export function qAsyncValidator(
	instance: object,
	field: string
): AsyncValidatorFn {
	return (control: AbstractControl) => {
		return from(qCheckRulesAsync(instance)).pipe(
			map((result) => {
				const errors = result.errors.filter((e) => e.field === field);
				return errors.length ? { [field]: errors[0].message } : null;
			})
		);
	};
}
```

## change Detection with isDirty()

Track edits in forms or detail pages:

```typescript
const record = new UserRecord({ id: 'u1', firstName: 'Alice', ..., score: 70 });
record.score = 85;

if (record.isDirty()) {
  // PUT /api/users/u1 with record.serialize()
}

// Reset to last saved state
record.reset();
```

## createMany() — Angular Resolver

```typescript
// users.resolver.ts
@Injectable({ providedIn: 'root' })
export class UsersResolver implements ResolveFn<object[]> {
	constructor(private http: HttpClient) {}

	resolve(): Observable<object[]> {
		return this.http.get<object[]>('/api/users').pipe(
			map((raw) => {
				const { instances } = UserRecord.createMany(raw);
				return instances.map((u) => u.serialize());
			})
		);
	}
}
```

## Schema Validation

```typescript
const schema = new UserRecord({ ... }).getSchema('json');
// Use with AJV or json-schema-form for dynamic form generation
```
