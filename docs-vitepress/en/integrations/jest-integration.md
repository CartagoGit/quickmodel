# Jest Integration

QuickModel's custom matchers use the same `{ pass, message() }` contract as Jest's
`expect.extend()` API. **Zero additional adapters needed** — `quickmodelMatchers`
drops straight into any Jest project.

## Installation

```bash
npm install quickmodel
```

## Setup

Extend Jest's `expect` in your [setup file](https://jestjs.io/docs/configuration#setupfilesafterframework-array):

```typescript
// jest.setup.ts
import { expect } from '@jest/globals';
import { quickmodelMatchers } from 'quickmodel/matchers';

expect.extend(quickmodelMatchers);
```

```javascript
// jest.config.ts
export default {
	setupFilesAfterFramework: ['./jest.setup.ts'],
};
```

## TypeScript Augmentation

Add a declaration file so TypeScript recognises the new matchers:

```typescript
// types/jest-extended.d.ts
declare namespace jest {
	interface Matchers<R> {
		toBeValidQModel(): R;
		toHaveQRuleError(field: string, message?: string): R;
		toHaveQField(fieldName: string): R;
		toMatchQModel(expected: object): R;
		toBeIntact(): R;
		toHaveDirtyField(field: string): R;
	}
}
```

## Available Matchers

### `toBeValidQModel()`

Asserts that the value is a `QModel` instance and all `@QRule` validations pass.

```typescript
const dto = new UserDto({
	id: '1',
	username: 'alice',
	email: 'alice@example.com',
});
expect(dto).toBeValidQModel();
expect(invalidDto).not.toBeValidQModel();
```

### `toHaveQRuleError(field, message?)`

Asserts that `checkRules()` produces an error on the specified field.
Optionally checks the error message (partial or full match).

```typescript
const dto = new UserDto({ username: 'x', email: 'not-an-email' });
expect(dto).toHaveQRuleError('username'); // any error
expect(dto).toHaveQRuleError('email', 'Invalid email'); // matches message
expect(dto).not.toHaveQRuleError('id'); // no errors on id
```

### `toHaveQField(fieldName)`

Asserts that a property has a `@QField` decorator (walks the prototype chain).

```typescript
expect(dto).toHaveQField('email');
expect(dto).not.toHaveQField('internalSecret');
```

### `toMatchQModel(expected)`

Deep equality using `serialize()` — includes `@QComputed` values.

```typescript
const updated = original.$qCopy({ username: 'bob' });
expect(updated).not.toMatchQModel(original);
```

### `toBeIntact()`

Asserts `hasIntegrity()` returns `true`. A freshly created model is always intact.

```typescript
expect(new UserDto({ ... })).toBeIntact();
```

### `toHaveDirtyField(field)`

Asserts `isDirty(field)` returns `true` — i.e., the field was mutated since creation.

```typescript
dto.username = 'bob';
expect(dto).toHaveDirtyField('username');
expect(dto).not.toHaveDirtyField('email');
```

## Full Example

```typescript
// tests/order.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

@Quick(
	{
		orderId: 'string',
		amount: 'number',
		currency: 'string',
		createdAt: Date,
		tags: Set,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class OrderDto extends QModel<{
	orderId: string;
	amount: number;
	currency: string;
	createdAt: Date;
	tags: Set<string>;
}> {
	@QField({ label: 'Amount', required: true })
	@QRule((v: number) => v > 0, 'Amount must be positive')
	@QRule((v: number) => v <= 1_000_000, 'Amount exceeds limit')
	declare amount: number;

	@QField({ label: 'Currency', required: true })
	@QRule(
		(v: string) => /^[A-Z]{3}$/.test(v),
		'Currency must be 3-letter ISO code'
	)
	declare currency: string;

	@QField({ label: 'Order ID', required: true })
	@QRule((v: string) => v.length > 0, 'Order ID cannot be empty')
	declare orderId: string;

	declare createdAt: Date;
	declare tags: Set<string>;

	@QComputed()
	get summary() {
		return `${this.orderId}: ${this.amount} ${this.currency}`;
	}
}

describe('OrderDto', () => {
	let validOrder: OrderDto;

	beforeEach(() => {
		validOrder = new OrderDto({
			orderId: 'ORD-001',
			amount: 99.99,
			currency: 'USD',
			createdAt: '2025-01-15T10:00:00Z',
			tags: ['urgent'],
		});
	});

	test('valid order passes all rules', () => {
		expect(validOrder).toBeValidQModel();
	});

	test('invalid order fails', () => {
		const bad = new OrderDto({
			orderId: '',
			amount: -5,
			currency: 'us',
			createdAt: '',
			tags: [],
		});
		expect(bad).not.toBeValidQModel();
		expect(bad).toHaveQRuleError('amount', 'Amount must be positive');
		expect(bad).toHaveQRuleError(
			'currency',
			'Currency must be 3-letter ISO code'
		);
	});

	test('fresh order is intact', () => {
		expect(validOrder).toBeIntact();
	});

	test('mutation is tracked', () => {
		validOrder.currency = 'EUR';
		expect(validOrder).toHaveDirtyField('currency');
		expect(validOrder).not.toHaveDirtyField('amount');
	});

	test('Date coercion (string → Date)', () => {
		expect(validOrder.createdAt).toBeInstanceOf(Date);
	});

	test('Set coercion (array → Set)', () => {
		expect(validOrder.tags).toBeInstanceOf(Set);
	});
});
```

## Jasmine

Jasmine uses `jasmine.addMatchers()` with a factory pattern.
Wrap `quickmodelMatchers` with the following adapter:

```typescript
// test/setup/quickmodel-jasmine.ts
import { quickmodelMatchers } from 'quickmodel/matchers';

type IMatcherFn = (
	received: object,
	...args: unknown[]
) => { pass: boolean; message: () => string };

function toJasmineMatchers(matchers: Record<string, IMatcherFn>) {
	const result: jasmine.CustomMatcherFactories = {};
	for (const [name, fn] of Object.entries(matchers)) {
		result[name] = () => ({
			compare: (actual: object, ...args: unknown[]) => {
				const res = fn(actual, ...args);
				return { pass: res.pass, message: res.message() };
			},
		});
	}
	return result;
}

// In a beforeAll() or a Jasmine setup file:
jasmine.addMatchers(
	toJasmineMatchers(quickmodelMatchers as Record<string, IMatcherFn>)
);
```

Then write Jasmine tests naturally:

```typescript
describe('OrderDto — Jasmine', () => {
  it('should be valid', () => {
    expect(new OrderDto({ ... }) as any).toBeValidQModel();
  });

  it('should detect rule errors', () => {
    const bad = new OrderDto({ orderId: '', amount: -5, currency: 'us', ... });
    expect(bad as any).toHaveQRuleError('amount', 'Amount must be positive');
  });
});
```

## See Also

- [Vitest Custom Matchers](./vitest-matchers.md)
- [Other Test Runners](./test-runners-integration.md)
- [QRule Validation](../guide/validation.md)
