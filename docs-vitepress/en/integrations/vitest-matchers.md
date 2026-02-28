# Vitest Custom Matchers

QuickModel ships a set of custom matchers for Vitest (and Bun's test runner) that make
assertions on `QModel` instances expressive and readable.

## Installation

```bash
npm install quickmodel
```

The matchers are available as a sub-entry point:

```typescript
import { quickmodelMatchers } from 'quickmodel/matchers';
```

## Setup

Extend Vitest's `expect` in your setup file:

```typescript
// vitest.setup.ts
import { expect } from 'vitest';
import { quickmodelMatchers } from 'quickmodel/matchers';

expect.extend(quickmodelMatchers);
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: ['./vitest.setup.ts'],
	},
});
```

### Bun Test

```typescript
// tests/setup.ts
import { expect } from 'bun:test';
import { quickmodelMatchers } from 'quickmodel/matchers';

expect.extend(quickmodelMatchers);
```

## TypeScript Augmentation

The `matchers` entry point automatically augments Vitest's `Assertion` interface. No extra
type imports are needed in test files.

```typescript
// Fully typed — no manual imports required
expect(dto).toBeValidQModel();
expect(dto).toHaveQRuleError('email');
```

## Available Matchers

### `toBeValidQModel()`

Asserts that the value is a `QModel` instance.

```typescript
const dto = new UserDto({ id: '1', name: 'Alice' });
expect(dto).toBeValidQModel();
```

### `toHaveQRuleError(field, message?)`

Asserts that `checkRules()` produces an error on the specified field. Optionally checks
the error message.

```typescript
const dto = new UserSignupDto({
	username: 'x',
	email: 'not-an-email',
	age: 15,
	role: 'user',
});

expect(dto).toHaveQRuleError('username'); // any error on 'username'
expect(dto).toHaveQRuleError('username', 'too short'); // partial message match
expect(dto).toHaveQRuleError('email', 'Invalid email'); // exact or partial
expect(dto).toHaveQRuleError('age', 'Must be 18 or older'); // full message
```

### `toHaveQField(fieldName)`

Asserts that the class has a `@QField` decorator on the specified property.

```typescript
expect(dto).toHaveQField('email');
expect(dto).toHaveQField('username');
expect(dto).not.toHaveQField('internalSecret'); // not decorated
```

### `toMatchQModel(expected)`

Deep-asserts that the `QModel` instance matches all properties of `expected`. Uses
`serialize()` for the comparison, so `@QComputed` values are included.

```typescript
const dto = new UserDto({ id: '1', name: 'Alice', role: 'admin' });
expect(dto).toMatchQModel({ id: '1', name: 'Alice' }); // partial match
```

### `toBeIntact()`

Asserts that the model has no dirty fields — `isDirty()` returns `false`. Useful to verify
freshly created instances haven't been accidentally mutated.

```typescript
const dto = new UserDto({ id: '1', name: 'Alice' });
expect(dto).toBeIntact();

dto.name = 'Bob';
expect(dto).not.toBeIntact();
```

### `toHaveDirtyField(fieldName)`

Asserts that a specific field is dirty (has been mutated since the last snapshot).

```typescript
const dto = new UserDto({ id: '1', name: 'Alice' });
dto.name = 'Bob'; // direct mutation tracks the field

expect(dto).toHaveDirtyField('name');
expect(dto).not.toHaveDirtyField('id');
```

> **Note**: `toHaveDirtyField` uses `isDirty(fieldName)` which only tracks fields mutated
> directly (`dto.field = value`). Use `toBeIntact()` / `not.toBeIntact()` to check if the
> model has any pending changes (including changes via `copy()`).

## Full Example

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { QModel, Quick, QRule, QField } from 'quickmodel';

@Quick(
	{ id: 'string', username: 'string', email: 'string', age: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class UserDto extends QModel<{
	id: string;
	username: string;
	email: string;
	age: number;
}> {
	@QField({ label: 'Username', required: true })
	@QRule((v: string) => v.length >= 3, 'Username too short')
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule((v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email')
	declare email: string;

	@QField({ label: 'Age' })
	@QRule((v: number) => v >= 18, 'Must be 18 or older')
	declare age: number;

	declare id: string;
}

describe('UserDto matchers', () => {
	test('is a valid QModel', () => {
		const dto = new UserDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toBeValidQModel();
	});

	test('fresh instance is intact', () => {
		const dto = new UserDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toBeIntact();
	});

	test('detects dirty field after mutation', () => {
		const dto = new UserDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		dto.username = 'bob';
		expect(dto).toHaveDirtyField('username');
		expect(dto).not.toHaveDirtyField('email');
	});

	test('validates rule errors', () => {
		const dto = new UserDto({
			id: '1',
			username: 'x',
			email: 'bad',
			age: 15,
		});
		expect(dto).toHaveQRuleError('username', 'too short');
		expect(dto).toHaveQRuleError('email', 'Invalid email');
		expect(dto).toHaveQRuleError('age', 'Must be 18 or older');
	});

	test('field annotations', () => {
		const dto = new UserDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toHaveQField('username');
		expect(dto).toHaveQField('email');
		expect(dto).not.toHaveQField('id'); // not decorated with @QField
	});

	test('partial model match', () => {
		const dto = new UserDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toMatchQModel({
			username: 'alice',
			email: 'alice@example.com',
		});
	});
});
```

## See Also

- [QModel API Reference](./qmodel.md)
- [QField](./qfield.md)
- [Forms](./forms.md)
