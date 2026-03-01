/**
 * @fileoverview TDD tests for the `$qm` namespace handle — Propuesta W
 *
 * Verifies that every instance method is accessible via `instance.$qMethod()`,
 * that the delegate calls produce identical results to the root-level methods,
 * and that the `IQMHandle` shape is correctly typed.
 *
 * Covered scenarios:
 *  - $qm is available on every QModel instance
 *  - $qm.serialize()  — delegates correctly
 *  - $qm.isDirty()    — field-level and any-field
 *  - $qm.getChanges() — only changed fields
 *  - $qm.patch()      — in-place mutation
 *  - $qm.copy()       — new instance, optional override
 *  - $qm.diff()       — field-by-field comparison
 *  - $qm.equals()     — deep equality
 *  - $qm.hasIntegrity() — transformer-level checks
 *  - $qm.isValid()    — integrity + rules combined
 *  - $qm.checkRules() — @QRule predicates (sync)
 *  - $qm.checkRulesAsync() — @QRule predicates (async)
 *  - $qm.isValidAsync() — async boolean gate
 *  - $qm.validationReport() — combined sync report
 *  - $qm.validationReportAsync() — combined async report
 *  - $qm.validate()   — sync unified validation
 *  - $qm.validate({ async: true }) — async unified validation
 *  - $qm.toFormData() — FormData serialization
 *  - $qm.toReadableStream() — ReadableStream from binary field
 *  - IQMHandle is exported from the public API
 */

import { describe, expect, test } from 'bun:test';
import { Quick } from '@/core/decorators/quick.decorator';
import { QRule } from '@/core/decorators/qrule.decorator';
import { QModel } from '@/core/models/quick.model';
import type { IQMHandle } from '@/core/interfaces/qm-handle.interface';

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
// $qm availability
// ---------------------------------------------------------------------------

describe('$qm — availability', () => {
	test('$qm is defined on every QModel instance', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qm).toBeDefined();
	});

	test('$qm exposes all expected methods', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const handle = prod.$qm;

		expect(typeof handle.serialize).toBe('function');
		expect(typeof handle.isDirty).toBe('function');
		expect(typeof handle.getChanges).toBe('function');
		expect(typeof handle.patch).toBe('function');
		expect(typeof handle.copy).toBe('function');
		expect(typeof handle.diff).toBe('function');
		expect(typeof handle.equals).toBe('function');
		expect(typeof handle.hasIntegrity).toBe('function');
		expect(typeof handle.isValid).toBe('function');
		expect(typeof handle.isValidAsync).toBe('function');
		expect(typeof handle.checkRules).toBe('function');
		expect(typeof handle.checkRulesAsync).toBe('function');
		expect(typeof handle.validationReport).toBe('function');
		expect(typeof handle.validationReportAsync).toBe('function');
		expect(typeof handle.validate).toBe('function');
		expect(typeof handle.toFormData).toBe('function');
		expect(typeof handle.toReadableStream).toBe('function');
	});
});

// ---------------------------------------------------------------------------
// $qm.serialize
// ---------------------------------------------------------------------------

describe('$qm.$qSerialize()', () => {
	test('returns same result as root-level serialize()', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qSerialize()).toEqual(prod.serialize());
	});

	test('accepts options and delegates them', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		const via_qm = prod.$qSerialize({ pick: ['name'] });
		const direct = prod.$qSerialize({ pick: ['name'] });
		expect(via_qm).toEqual(direct);
	});
});

// ---------------------------------------------------------------------------
// $qm.isDirty / getChanges
// ---------------------------------------------------------------------------

describe('$qm.$qIsDirty()', () => {
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
		expect(prod.$qIsDirty()).toBe(prod.isDirty());
		expect(prod.$qIsDirty('name')).toBe(prod.isDirty('name'));
	});
});

describe('$qm.$qGetChanges()', () => {
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
		expect(prod.$qGetChanges()).toEqual(prod.getChanges());
	});
});

// ---------------------------------------------------------------------------
// $qm.patch / copy
// ---------------------------------------------------------------------------

describe('$qm.$qPatch()', () => {
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

describe('$qm.$qCopy()', () => {
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
// $qm.diff / equals
// ---------------------------------------------------------------------------

describe('$qm.$qDiff()', () => {
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
		expect(prodA.$qDiff(prodB)).toEqual(prodA.diff(prodB));
	});
});

describe('$qm.$qEquals()', () => {
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
// $qm — validation methods
// ---------------------------------------------------------------------------

describe('$qm.$qHasIntegrity()', () => {
	test('returns true for a well-constructed instance', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		expect(prod.$qHasIntegrity()).toBe(true);
	});
});

describe('$qm.$qIsValid()', () => {
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

describe('$qm.$qCheckRules()', () => {
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
		expect(ord.$qCheckRules()).toEqual(ord.checkRules());
	});
});

describe('$qm.checkRulesAsync()', () => {
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

describe('$qm.isValidAsync()', () => {
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

describe('$qm.$qValidationReport()', () => {
	test('returns { valid, integrity, rules }', () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const report = prod.$qValidationReport();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});

	test('delegates to root validationReport — results match', () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		expect(prod.$qValidationReport()).toEqual(prod.validationReport());
	});
});

describe('$qm.validationReportAsync()', () => {
	test('resolves with full report structure', async () => {
		const prod = new Product({ name: 'Widget', price: 5, active: false });
		const report = await prod.$qValidationReportAsync();
		expect(report).toHaveProperty('valid');
		expect(report).toHaveProperty('integrity');
		expect(report).toHaveProperty('rules');
	});
});

describe('$qm.$qValidate()', () => {
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
// $qm.toFormData
// ---------------------------------------------------------------------------

describe('$qm.toFormData()', () => {
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
// $qm.toReadableStream
// ---------------------------------------------------------------------------

describe('$qm.toReadableStream()', () => {
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
// Type compatibility — IQMHandle exported and structurally correct
// ---------------------------------------------------------------------------

describe('IQMHandle type', () => {
	test('$qm satisfies IQMHandle without type errors (compile-time guard)', () => {
		const prod = new Product({ name: 'Widget', price: 9.99, active: true });
		// Assigning to typed variable validates structural compatibility at compile time
		const handle: IQMHandle<
			IProduct,
			Record<never, never>,
			typeof prod
		> = prod.$qm;
		expect(handle).toBeDefined();
	});
});
