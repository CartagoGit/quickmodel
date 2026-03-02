/**
 * Integration tests for cross-feature decorator combinations.
 * Covers: B-1 (four business decorators on same model), B-2 (multi-level inheritance),
 *         B-6 (@QDefault factory + @QRule + $qToInterface())
 *
 * Tests that @QAlias, @QDefault, @QSensitive, @QRule interact correctly when combined.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QAlias, QSensitive, QDefault, QRule, QReadonly } from '@/decorators';

// ─── B-1: Four business decorators on the same model ─────────────────────────

interface IStaff {
	firstName: string;
	tags: string[];
	apiKey: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class StaffModel extends QModel<IStaff> {
	@QAlias('first_name')
	@QDefault('Anonymous')
	@QRule(
		(val: string) => typeof val === 'string' && val.length >= 2,
		'Name too short'
	)
	declare firstName: string;

	@QDefault(() => [])
	declare tags: string[];

	@QSensitive()
	@QAlias('api_key')
	@QRule(
		(val: string) => typeof val === 'string' && val.length > 0,
		'API key required'
	)
	declare apiKey: string;
}

describe('Integration: cross-feature decorator combinations (cross-feature/B-1)', () => {
	describe('@QAlias + @QDefault on same field', () => {
		test('alias takes precedence for input resolution', () => {
			const model = new StaffModel({
				first_name: 'Alice',
				tags: [],
				api_key: 'sk-123',
			});
			expect(model.firstName).toBe('Alice');
		});

		test('@QDefault applies when alias key is absent', () => {
			const model = new StaffModel({ tags: [], api_key: 'sk-123' });
			expect(model.firstName).toBe('Anonymous');
		});

		test('@QDefault applies when camelCase key is also absent', () => {
			const model = new StaffModel({ tags: [], api_key: 'sk-123' });
			expect(model.firstName).toBe('Anonymous');
		});
	});

	describe('@QAlias + @QRule — rule receives resolved internal name value', () => {
		test('rule runs on value resolved by alias', () => {
			const valid = new StaffModel({
				first_name: 'Alice',
				tags: [],
				api_key: 'sk-key',
			});
			expect(valid.$qCheckRules().valid).toBe(true);
		});

		test('rule fails for a short name coming via alias', () => {
			const invalid = new StaffModel({
				first_name: 'A',
				tags: [],
				api_key: 'sk-key',
			});
			const { errors } = invalid.$qCheckRules();
			const nameErrors = errors.filter(
				(err) => err.field === 'firstName'
			);
			expect(nameErrors.length).toBeGreaterThan(0);
		});
	});

	describe('@QDefault + @QRule — rule runs on defaulted value', () => {
		test('name with default passes min-length rule', () => {
			// 'Anonymous' is >= 2 chars
			const model = new StaffModel({ tags: [], api_key: 'sk-key' });
			const { errors } = model.$qCheckRules();
			const nameErrors = errors.filter(
				(err) => err.field === 'firstName'
			);
			expect(nameErrors.length).toBe(0);
		});
	});

	describe('@QSensitive + @QAlias + @QRule — all three on apiKey', () => {
		test('serialize excludes sensitive apiKey', () => {
			const model = new StaffModel({
				first_name: 'Alice',
				tags: [],
				api_key: 'sk-secret',
			});
			const plain = model.$qSerialize();
			expect(plain['apiKey']).toBeUndefined();
			expect(plain['api_key']).toBeUndefined();
		});

		test('$qCheckRules() still validates apiKey even though sensitive', () => {
			const model = new StaffModel({
				first_name: 'Alice',
				tags: [],
				api_key: '',
			});
			const { errors } = model.$qCheckRules();
			const keyErrors = errors.filter((err) => err.field === 'apiKey');
			expect(keyErrors.length).toBeGreaterThan(0);
		});

		test('serialize with includeSensitive includes apiKey by alias', () => {
			const model = new StaffModel({
				first_name: 'Alice',
				tags: [],
				api_key: 'sk-secret',
			});
			const plain = model.$qSerialize({ includeSensitive: true });
			// serialized key should use alias 'api_key'
			expect(plain['api_key']).toBe('sk-secret');
		});
	});

	describe('@QDefault factory for array fields', () => {
		test('tags defaults to [] when absent', () => {
			const model = new StaffModel({ api_key: 'sk-key' });
			expect(Array.isArray(model.tags)).toBe(true);
			expect(model.tags.length).toBe(0);
		});

		test('each instance gets its own array instance (factory)', () => {
			const mod1 = new StaffModel({ api_key: 'sk-1' });
			const mod2 = new StaffModel({ api_key: 'sk-2' });
			expect(mod1.tags).not.toBe(mod2.tags);
		});
	});
});

// ─── B-2: Multi-level inheritance with @QSensitive + @QReadonly ───────────────

interface IBase {
	id: string;
	secret: string;
}
@Quick({}, { unknownPropertyPolicy: 'keep' })
class BaseModel extends QModel<IBase> {
	@QReadonly()
	declare id: string;

	@QSensitive()
	declare secret: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class MiddleModel extends BaseModel {
	declare category: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ChildModel extends MiddleModel {
	declare extra: string;
}

import { ImmutableFieldError } from '@/decorators';

describe('Integration: multi-level inheritance with decorators (cross-feature/B-2)', () => {
	const data = {
		id: 'abc',
		secret: 'mysecret',
		category: 'staff',
		extra: 'bonus',
	};

	test('ChildModel serializes excluding inherited @QSensitive field', () => {
		const child = new ChildModel(data);
		const plain = child.$qSerialize();
		expect(plain['secret']).toBeUndefined();
	});

	test('ChildModel $qCopy() with inherited @QReadonly field throws ImmutableFieldError', () => {
		const child = new ChildModel(data);
		expect(() => child.$qCopy({ id: 'new-id' })).toThrow(
			ImmutableFieldError
		);
	});

	test('ChildModel has access to fields from all levels', () => {
		const child = new ChildModel(data);
		expect(child.id).toBe('abc');
		expect(child.category).toBe('staff');
		expect(child.extra).toBe('bonus');
	});

	test('MiddleModel also inherits @QReadonly from BaseModel', () => {
		const mid = new MiddleModel({ id: 'q', secret: 's', category: 'team' });
		expect(() => mid.$qCopy({ id: 'new' })).toThrow(ImmutableFieldError);
	});
});

// ─── B-6: @QDefault (factory) + @QRule + $qToInterface() ─────────────────────

interface ICart {
	userId: string;
	items: string[];
	notes: string;
}

@Quick({ items: Array, notes: String }, { unknownPropertyPolicy: 'keep' })
class CartModel extends QModel<ICart> {
	declare userId: string;

	@QDefault(() => [])
	@QRule((val: string[]) => Array.isArray(val), 'Items must be an array')
	declare items: string[];

	@QDefault('(no notes)')
	declare notes: string;
}

describe('Integration: @QDefault + @QRule + $qSerialize() (cross-feature/B-6)', () => {
	test('items defaults to [] when absent — cart.items is an empty array', () => {
		const cart = new CartModel({ userId: 'u1' });
		expect(Array.isArray(cart.items)).toBe(true);
		expect(cart.items.length).toBe(0);
	});

	test('notes defaults to "(no notes)" when absent', () => {
		const cart = new CartModel({ userId: 'u1' });
		expect(cart.notes).toBe('(no notes)');
	});

	test('@QRule receives the defaulted value — empty array passes array check', () => {
		const cart = new CartModel({ userId: 'u1' });
		const { errors } = cart.$qCheckRules();
		const itemsErrors = errors.filter((err) => err.field === 'items');
		expect(itemsErrors.length).toBe(0);
	});

	test('notes with default — $qSerialize() includes the default value', () => {
		const cart = new CartModel({ userId: 'u1' });
		const serialized = cart.$qSerialize();
		expect(serialized.notes).toBe('(no notes)');
	});

	test('explicit items provided — not replaced by default', () => {
		const cart = new CartModel({
			userId: 'u1',
			items: ['apple', 'banana'],
		});
		expect(cart.items).toEqual(['apple', 'banana']);
	});
});
