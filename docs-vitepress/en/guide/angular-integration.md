# Angular Integration

QuickModel integrates naturally with **Angular** applications. Use plain TypeScript classes for Reactive Forms and `QModel` subclasses for service/repository layers.

## Key Separation

| Use case                     | Approach                                    |
| ---------------------------- | ------------------------------------------- |
| Reactive Forms validation    | Plain TS class + `@QRule` + `qCheckRules()` |
| HTTP coercion / sanitization | `QModel` subclass + `@Quick()`              |
| State / repository           | `QModel` subclass + `merge()` / `patch()`   |

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
		// merge() is IMMUTABLE: returns a new instance
		const updated = record.merge(patch);
		this.store.set(id, updated);
		return updated.serialize();
	}
}
```

::: warning merge() is immutable
`merge()` returns a **new instance** — always capture the return value and update the store. The original instance is never modified.
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

const profile = signal(
	new ProfileModel({ name: 'Alice', bio: 'Dev', followers: 100 })
);

// Update via immutable merge
profile.update((prev) => prev.merge({ bio: 'Senior Dev' }));

// Computed from signal
const summary = computed(() => (profile().serialize() as any).summary);
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
