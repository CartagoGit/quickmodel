# Other Test Runners

QuickModel's `quickmodelMatchers` exposes plain `{ pass, message() }` functions that
integrate with **any** JavaScript test runner regardless of its assertion API.

## Covered in this guide

| Runner                       | API style           | Adapter needed |
| ---------------------------- | ------------------- | -------------- |
| [Mocha + Chai](#mocha--chai) | `chai.use()` plugin | Light wrapper  |
| [Node:test](#nodetest)       | `assert.*`          | Assert helpers |
| [AVA](#ava)                  | `t.*` macros        | Macro helpers  |

## Mocha + Chai

Chai plugins extend `chai.Assertion` prototype via `chai.use()`.
Create a plugin and call it once in your test setup file:

### Plugin

```typescript
// test/setup/quickmodel-chai.ts
import type * as Chai from 'chai';
import { quickmodelMatchers } from 'quickmodel/matchers';

export function quickmodelChaiPlugin(chai: Chai.ChaiStatic): void {
	chai.Assertion.addMethod('validQModel', function () {
		const result = quickmodelMatchers.toBeValidQModel(this._obj);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod(
		'qRuleError',
		function (field: string, message?: string) {
			const result = quickmodelMatchers.toHaveQRuleError(
				this._obj,
				field,
				message
			);
			this.assert(result.pass, result.message(), result.message());
		}
	);

	chai.Assertion.addMethod('qField', function (fieldName: string) {
		const result = quickmodelMatchers.toHaveQField(this._obj, fieldName);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod('matchQModel', function (expected: object) {
		const result = quickmodelMatchers.toMatchQModel(this._obj, expected);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod('intact', function () {
		const result = quickmodelMatchers.toBeIntact(this._obj);
		this.assert(result.pass, result.message(), result.message());
	});

	chai.Assertion.addMethod('dirtyField', function (field: string) {
		const result = quickmodelMatchers.toHaveDirtyField(this._obj, field);
		this.assert(result.pass, result.message(), result.message());
	});
}
```

### Registration (`.mocharc.ts` / `--require`)

```typescript
// test/setup/setup.ts  (loaded via --require)
import * as chai from 'chai';
import { quickmodelChaiPlugin } from './quickmodel-chai';
chai.use(quickmodelChaiPlugin);
```

```bash
# .mocharc.cjs
module.exports = { require: ['test/setup/setup.ts'] };
```

### Usage

```typescript
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { SubscriptionDto } from '../src/dtos';

describe('SubscriptionDto', () => {
	it('should be valid', () => {
		const dto = new SubscriptionDto({
			planId: 'pro',
			seatsCount: 5,
			pricePerSeat: 9.99,
		});
		expect(dto).to.be.validQModel();
	});

	it('should report invalid plan', () => {
		const dto = new SubscriptionDto({
			planId: 'gold',
			seatsCount: 5,
			pricePerSeat: 9.99,
		});
		expect(dto).to.have.qRuleError(
			'planId',
			'Plan must be free, pro, or enterprise'
		);
	});

	it('should detect dirty field after mutation', () => {
		const dto = new SubscriptionDto({
			planId: 'pro',
			seatsCount: 5,
			pricePerSeat: 9.99,
		});
		dto.seatsCount = 10;
		expect(dto).to.have.dirtyField('seatsCount');
		expect(dto).to.not.have.dirtyField('planId');
	});
});
```

---

## Node:test

Node.js 18+ ships a built-in test runner (`node:test`) that uses `assert.*` style
assertions. Build a thin helper layer on top of `quickmodelMatchers`:

### Helpers

```typescript
// test/helpers/quickmodel-assert.ts
import { quickmodelMatchers } from 'quickmodel/matchers';

class AssertionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AssertionError';
	}
}

export const assertQModel = {
	isValid(instance: object): void {
		const res = quickmodelMatchers.toBeValidQModel(instance);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isInvalid(instance: object): void {
		const res = quickmodelMatchers.toBeValidQModel(instance);
		if (res.pass) throw new AssertionError(res.message());
	},
	hasRuleError(instance: object, field: string, message?: string): void {
		const res = quickmodelMatchers.toHaveQRuleError(
			instance,
			field,
			message
		);
		if (!res.pass) throw new AssertionError(res.message());
	},
	hasQField(instance: object, fieldName: string): void {
		const res = quickmodelMatchers.toHaveQField(instance, fieldName);
		if (!res.pass) throw new AssertionError(res.message());
	},
	matches(received: object, expected: object): void {
		const res = quickmodelMatchers.toMatchQModel(received, expected);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isIntact(instance: object): void {
		const res = quickmodelMatchers.toBeIntact(instance);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isDirty(instance: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (!res.pass) throw new AssertionError(res.message());
	},
	isClean(instance: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(instance, field);
		if (res.pass) throw new AssertionError(res.message());
	},
};
```

### Usage

```typescript
// test/invoice.test.ts
import { describe, it } from 'node:test';
import { assertQModel } from './helpers/quickmodel-assert';
import { InvoiceDto } from '../src/dtos';

describe('InvoiceDto', () => {
	it('valid invoice passes all rules', () => {
		const inv = new InvoiceDto({
			invoiceId: 'INV-000001',
			totalAmount: 1234.56,
			vatRate: 21,
		});
		assertQModel.$qIsValid(inv);
	});

	it('detects negative amount', () => {
		const inv = new InvoiceDto({
			invoiceId: 'INV-000001',
			totalAmount: -100,
			vatRate: 21,
		});
		assertQModel.hasRuleError(
			inv,
			'totalAmount',
			'Total amount cannot be negative'
		);
	});

	it('tracks dirty field after mutation', () => {
		const inv = new InvoiceDto({
			invoiceId: 'INV-000001',
			totalAmount: 500,
			vatRate: 21,
		});
		inv.totalAmount = 999;
		assertQModel.$qIsDirty(inv, 'totalAmount');
		assertQModel.isClean(inv, 'vatRate');
	});
});
```

---

## AVA

AVA is a concurrent test runner with a `t.*` assertion API.
The easiest pattern is **macro helpers** that receive AVA's execution context `t`:

### Macro helpers

```typescript
// test/helpers/quickmodel-ava.ts
import type { ExecutionContext } from 'ava';
import { quickmodelMatchers } from 'quickmodel/matchers';

export const qModelMacros = {
	assertValid(ctl: ExecutionContext, model: object): void {
		const res = quickmodelMatchers.toBeValidQModel(model);
		ctl.true(res.pass, res.message());
	},
	assertInvalid(ctl: ExecutionContext, model: object): void {
		const res = quickmodelMatchers.toBeValidQModel(model);
		ctl.false(res.pass, res.message());
	},
	assertRuleError(
		ctl: ExecutionContext,
		model: object,
		field: string,
		msg?: string
	): void {
		const res = quickmodelMatchers.toHaveQRuleError(model, field, msg);
		ctl.true(res.pass, res.message());
	},
	assertHasField(ctl: ExecutionContext, model: object, field: string): void {
		const res = quickmodelMatchers.toHaveQField(model, field);
		ctl.true(res.pass, res.message());
	},
	assertMatches(
		ctl: ExecutionContext,
		received: object,
		expected: object
	): void {
		const res = quickmodelMatchers.toMatchQModel(received, expected);
		ctl.true(res.pass, res.message());
	},
	assertIntact(ctl: ExecutionContext, model: object): void {
		const res = quickmodelMatchers.toBeIntact(model);
		ctl.true(res.pass, res.message());
	},
	assertDirty(ctl: ExecutionContext, model: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(model, field);
		ctl.true(res.pass, res.message());
	},
	assertClean(ctl: ExecutionContext, model: object, field: string): void {
		const res = quickmodelMatchers.toHaveDirtyField(model, field);
		ctl.false(res.pass, res.message());
	},
};
```

### Usage

```typescript
// test/report.test.ts
import test from 'ava';
import { qModelMacros as qm } from './helpers/quickmodel-ava';
import { ReportDto } from '../src/dtos';

test('valid report passes', (t) => {
	const report = new ReportDto({
		reportId: 'RPT-AB1234',
		title: 'Q4',
		score: 87,
	});
	qm.assertValid(t, report);
	qm.assertIntact(t, report);
	qm.assertHasField(t, report, 'title');
});

test('invalid report fails', (t) => {
	const report = new ReportDto({ reportId: 'bad', title: 'X', score: 150 });
	qm.assertInvalid(t, report);
	qm.assertRuleError(t, report, 'reportId', 'Invalid report ID');
	qm.assertRuleError(t, report, 'title', 'Title too short');
	qm.assertRuleError(t, report, 'score', 'Score must be 0-100');
});

test('dirty field tracking', (t) => {
	const report = new ReportDto({
		reportId: 'RPT-AB1234',
		title: 'Q4',
		score: 87,
	});
	report.score = 100;
	qm.assertDirty(t, report, 'score');
	qm.assertClean(t, report, 'title');
});
```

---

## Choosing an Integration Style

| Your runner      | Recommended approach                                 |
| ---------------- | ---------------------------------------------------- |
| Vitest           | `expect.extend(quickmodelMatchers)` — native support |
| Bun              | `expect.extend(quickmodelMatchers)` — native support |
| **Jest**         | `expect.extend(quickmodelMatchers)` — identical API  |
| **Jasmine**      | `toJasmineMatchers()` adapter                        |
| **Mocha + Chai** | `quickmodelChaiPlugin`                               |
| **Node:test**    | `assertQModel.*` helpers                             |
| **AVA**          | `qModelMacros.*` helpers                             |

## See Also

- [Vitest Custom Matchers](./vitest-matchers.md)
- [Jest Integration](./jest-integration.md)
- [QRule Validation](../guide/validation.md)
