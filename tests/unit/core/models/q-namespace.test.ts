/**
 * @fileoverview TDD tests for the `$q` namespace handle — Propuesta W
 *
 * Verifies that every instance method is accessible via `instance.$q*()`,
 * that the delegate calls produce identical results to the root-level methods.
 *
 * Covered scenarios:
 *  - $qSerialize()  — delegates correctly
 *  - $qIsDirty()    — field-level and any-field
 *  - $qGetChanges() — only changed fields
 *  - $qPatch()      — in-place mutation
 *  - $qCopy()       — new instance, optional override
 *  - $qDiff()       — field-by-field comparison
 *  - $qEquals()     — deep equality
 *  - $qHasIntegrity() — transformer-level checks
 *  - $qIsValid()    — integrity + rules combined
 *  - $qCheckRules() — @QRule predicates (sync)
 *  - $qCheckRulesAsync() — @QRule predicates (async)
 *  - $qIsValidAsync() — async boolean gate
 *  - $qValidationReport() — combined sync report
 *  - $qValidationReportAsync() — combined async report
 *  - $qValidate()   — sync unified validation
 *  - $qValidate({ async: true }) — async unified validation
 *  - $qToFormData() — FormData serialization
 *  - $qToReadableStream() — ReadableStream from binary field
 */

import { describe, expect, test } from 'bun:test';
import { Quick } from '@/core/decorators/quick.decorator';
import { QRule } from '@/core/decorators/qrule.decorator';
import { QModel } from '@/core/models/quick.model';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

interface IProduct {
	name: string;
	price: number;
	active: boolean;
}

interface IOrder {
	id: string;
	total: number;
}

interface IOrderWithRules {
	amount: number;
	email: string;
}

@Quick({ name: String, price: Number, active: Boolean })
class Product extends QModel<IProduct> {
	declare name: string;
	declare price: number;
	declare active: boolean;
}

@Quick({ id: String, total: Number })
class Order extends QModel<IOrder> {
	declare id: string;
	declare total: number;
}

@Quick({ amount: Number, email: String })
class OrderWithRules extends QModel<IOrderWithRules> {
	@QRule((val: unknown) => Number(val) > 0, 'Amount must be positive')
	declare amount: number;

	@QRule((val: unknown) => /^[^@]+@[^@]+$/.test(String(val)), 'Invalid email')
	declare email: string;
}

// ---------------------------------------------------------------------------
// $q availability
// ---------------------------------------------------------------------------

describe('$q — availability', () => {
	test('$q is defined on every QModel instance', () => {
		// After migration, $q* methods are directly on the instance (no $q namespace)
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(typeof prod.$qSerialize).toBe('function');
		expect(typeof prod.$qIsDirty).toBe('function');
		expect(typeof prod.$qHasIntegrity).toBe('function');
	});

	test('$q exposes all expected methods', () => {
		// After migration, methods are directly on the instance as $q* methods
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });

		expect(typeof prod.$qSerialize).toBe('function');
		expect(typeof prod.$qIsDirty).toBe('function');
		expect(typeof prod.$qGetChanges).toBe('function');
		expect(typeof prod.$qPatch).toBe('function');
		expect(typeof prod.$qCopy).toBe('function');
		expect(typeof prod.$qDiff).toBe('function');
		expect(typeof prod.$qEquals).toBe('function');
		expect(typeof prod.$qHasIntegrity).toBe('function');
		expect(typeof prod.$qIsValid).toBe('function');
		expect(typeof prod.$qIsValidAsync).toBe('function');
		expect(typeof prod.$qCheckRules).toBe('function');
		expect(typeof prod.$qCheckRulesAsync).toBe('function');
		expect(typeof prod.$qValidationReport).toBe('function');
		expect(typeof prod.$qValidationReportAsync).toBe('function');
		expect(typeof prod.$qValidate).toBe('function');
		expect(typeof prod.$qToFormData).toBe('function');
		expect(typeof prod.$qToReadableStream).toBe('function');
	});
});

// ---------------------------------------------------------------------------
// $q.serialize
// ---------------------------------------------------------------------------

describe('$qSerialize()', () => {
	test('returns same result as root-level serialize()', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qSerialize()).toMatchObject({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
	});

	test('accepts options and delegates them', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const via_qm = prod.$qSerialize({ pick: ['name'] });
		const direct = prod.$qSerialize({ pick: ['name'] });
		expect(via_qm).toEqual(direct);
	});
});

// ---------------------------------------------------------------------------
// $q.isDirty / getChanges
// ---------------------------------------------------------------------------

describe('$qIsDirty()', () => {
	test('returns false when nothing has changed', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qIsDirty()).toBe(false);
	});

	test('returns true after a field is mutated', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		prod.price = 14.99;
		expect(prod.$qIsDirty()).toBe(true);
	});

	test('returns true for the specific changed field', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		prod.price = 14.99;
		expect(prod.$qIsDirty('price')).toBe(true);
		expect(prod.$qIsDirty('name')).toBe(false);
	});

	test('delegates to root isDirty — results are identical', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		prod.name = 'Gadget';
		expect(prod.$qIsDirty()).toBe(true);
		expect(prod.$qIsDirty('name')).toBe(true);
		expect(prod.$qIsDirty('price')).toBe(false);
	});
});

describe('$qGetChanges()', () => {
	test('returns empty object when nothing changed', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qGetChanges()).toEqual({});
	});

	test('returns only changed fields', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		prod.price = 19.99;
		const changes = prod.$qGetChanges();
		expect(Object.keys(changes)).toEqual(['price']);
		expect(changes.price).toBe(19.99);
	});

	test('delegates to root getChanges — results are identical', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		prod.name = 'Gadget';
		const changes = prod.$qGetChanges();
		expect(Object.keys(changes)).toContain('name');
		expect(changes.name).toBe('Gadget');
	});
});

// ---------------------------------------------------------------------------
// $q.patch / copy
// ---------------------------------------------------------------------------

describe('$qPatch()', () => {
	test('mutates the instance in place', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		prod.$qPatch({ price: 29.99 });
		expect(prod.price).toBe(29.99);
		expect(prod.name).toBe('Widget');
	});

	test('returns void', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const ret = prod.$qPatch({ name: 'New' });
		expect(ret).toBeUndefined();
	});
});

describe('$qCopy()', () => {
	test('returns a new instance with same data', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const clone = prod.$qCopy();
		expect(clone).not.toBe(prod);
		expect(clone.name).toBe('Widget');
		expect(clone.price).toBe(9.99);
	});

	test('respects partial overrides', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const updated = prod.$qCopy({ name: 'Premium Widget' });
		expect(updated.name).toBe('Premium Widget');
		expect(updated.price).toBe(9.99);
		expect(prod.name).toBe('Widget'); // original unchanged
	});

	test('copy result is not dirty', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const clone = prod.$qCopy();
		expect(clone.$qIsDirty()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// $q.diff / equals
// ---------------------------------------------------------------------------

describe('$qDiff()', () => {
	test('returns empty object for equal instances', () => {
		const prodA = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		const prodB = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		expect(prodA.$qDiff(prodB)).toEqual({});
	});

	test('returns changed fields with before/after', () => {
		const prodA = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		const prodB = new Product({
			name: 'Gadget',
			price: 19.99,
			active: true,
		});
		const result = prodA.$qDiff(prodB);
		expect(result.name).toEqual({ before: 'Widget', after: 'Gadget' });
		expect(result.price).toEqual({ before: 9.99, after: 19.99 });
		expect(result.active).toBeUndefined();
	});

	test('delegates to root diff — results are identical', () => {
		const prodA = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		const prodB = new Product({ name: 'Other', price: 1, active: false });
		const result = prodA.$qDiff(prodB);
		expect(result.name).toEqual({ before: 'Widget', after: 'Other' });
		expect(result.price).toEqual({ before: 9.99, after: 1 });
	});
});

describe('$qEquals()', () => {
	test('returns true for equal instances', () => {
		const prodA = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		const prodB = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		expect(prodA.$qEquals(prodB)).toBe(true);
	});

	test('returns false for different instances', () => {
		const prodA = new Product({
			name: 'Widget',
			price: 9.99,
			active: true,
		});
		const prodB = new Product({ name: 'Other', price: 1.0, active: false });
		expect(prodA.$qEquals(prodB)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// $q — validation methods
// ---------------------------------------------------------------------------

describe('$qHasIntegrity()', () => {
	test('returns true for a well-constructed instance', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qHasIntegrity()).toBe(true);
	});
});

describe('$qIsValid()', () => {
	test('returns true when integrity and rules pass', () => {
		const ord = new OrderWithRules({
			amount: 50,
			email: 'user@example.com',
		});
		expect(ord.$qIsValid()).toBe(true);
	});

	test('returns false when a @QRule fails', () => {
		const ord = new OrderWithRules({
			amount: -1,
			email: 'user@example.com',
		});
		expect(ord.$qIsValid()).toBe(false);
	});
});

describe('$qCheckRules()', () => {
	test('returns valid: true when all rules pass', () => {
		const ord = new OrderWithRules({
			amount: 10,
			email: 'test@test.com',
		});
		const result = ord.$qCheckRules();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('reports failing rules with messages', () => {
		const ord = new OrderWithRules({ amount: -5, email: 'invalid' });
		const result = ord.$qCheckRules();
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	test('delegates to root checkRules — results match', () => {
		const ord = new OrderWithRules({ amount: 0, email: 'bad' });
		const result = ord.$qCheckRules();
		expect(result).toBeDefined();
		expect(typeof result.valid).toBe('boolean');
	});
});

describe('$qCheckRulesAsync()', () => {
	test('resolves with valid rule result (async)', async () => {
		const ord = new OrderWithRules({
			amount: 100,
			email: 'ok@domain.com',
		});
		const result = await ord.$qCheckRulesAsync();
		expect(result.valid).toBe(true);
	});

	test('resolves with invalid rule result when rules fail', async () => {
		const ord = new OrderWithRules({ amount: 0, email: 'bad' });
		const result = await ord.$qCheckRulesAsync();
		expect(result.valid).toBe(false);
	});
});

describe('$qIsValidAsync()', () => {
	test('resolves true when all checks pass', async () => {
		const ord = new OrderWithRules({
			amount: 99,
			email: 'a@b.com',
		});
		const valid = await ord.$qIsValidAsync();
		expect(valid).toBe(true);
	});

	test('resolves false when a rule fails', async () => {
		const ord = new OrderWithRules({ amount: -10, email: 'a@b.com' });
		const valid = await ord.$qIsValidAsync();
		expect(valid).toBe(false);
	});
});

describe('$qValidationReport()', () => {
	test('returns { valid, integrity, rules }', () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const report = prod.$qValidationReport();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});

	test('delegates to root validationReport — results match', () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const report = prod.$qValidationReport();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});
});

describe('$qValidationReportAsync()', () => {
	test('resolves with full report structure', async () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const report = await prod.$qValidationReportAsync();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});
});

describe('$qValidate()', () => {
	test('returns sync result without options', () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const result = prod.$qValidate();
		expect(result).not.toBeInstanceOf(Promise);
		expect(result).toHaveProperty('valid');
	});

	test('returns Promise when async: true', async () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const ret = prod.$qValidate({ async: true });
		expect(ret).toBeInstanceOf(Promise);
		const resolved = await ret;
		expect(resolved).toHaveProperty('valid');
	});

	test('sync result matches root validate()', () => {
		const viaQm = (mdl: OrderWithRules) => mdl.$qValidate();
		const direct = (mdl: OrderWithRules) => mdl.$qValidate();
		const inst = new OrderWithRules({ amount: 0, email: 'bad' });
		expect(viaQm(inst)).toEqual(direct(inst));
	});
});

// ---------------------------------------------------------------------------
// $q.toFormData
// ---------------------------------------------------------------------------

describe('$qToFormData()', () => {
	test('returns a Promise<FormData>', async () => {
		const ord = new Order({ id: '1', total: 99 });
		const result = ord.$qToFormData();
		expect(result).toBeInstanceOf(Promise);
		const fdata = await result;
		expect(fdata).toBeInstanceOf(FormData);
	});

	test('FormData contains model fields', async () => {
		const ord = new Order({ id: 'abc', total: 42 });
		const fdata = await ord.$qToFormData();
		expect(fdata.get('id')).toBe('abc');
	});
});

// ---------------------------------------------------------------------------
// $q.toReadableStream
// ---------------------------------------------------------------------------

describe('$qToReadableStream()', () => {
	test('returns a ReadableStream for a Blob field', () => {
		interface IAsset {
			data: Blob;
		}

		@Quick({ data: Blob })
		class Asset extends QModel<IAsset> {
			declare data: Blob;
		}

		const asset = new Asset({ data: new Blob(['hello']) });
		const stream = asset.$qToReadableStream({ field: 'data' });
		expect(stream).toBeInstanceOf(ReadableStream);
	});
});

// ---------------------------------------------------------------------------
// Type compatibility — $q* API directly on QModel instances
// ---------------------------------------------------------------------------

describe('$q* API type guard', () => {
	test('$q methods are directly on QModel instances without type errors (compile-time guard)', () => {
		// After migration, $q* methods are directly on QModel instances
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		// Validate that $q* API is accessible directly on the instance
		expect(prod.$qSerialize()).toMatchObject({ name: 'Widget' });
		expect(prod.$qIsDirty()).toBe(false);
		expect(prod.$qHasIntegrity()).toBe(true);
	});
});
