// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
/**
 * @fileoverview Integration tests for TC39 dual-mode support of @QType and @Quick.
 *
 * This file lives in the `tc39/` subfolder which has its own tsconfig.json
 * with `experimentalDecorators: false`, so all decorators here are compiled
 * using the TC39 Stage-3 spec rather than the legacy TypeScript API.
 *
 * ## What is verified
 *
 * - `@QType(Date)` registers `fieldType: 'date'` on the prototype via
 *   `addInitializer` (TC39 path). The metadata is NOT available until the
 *   first instance of the class is created.
 * - `@QType([String])` registers array metadata correctly in TC39 mode.
 * - `@Quick({ ... })` still works as a class decorator in TC39 mode because
 *   class decorators receive `(target, context)` where `target` is the class.
 * - `@QRule((val) => ...)` type inference works when combined with `@QType`.
 * - Full deserialization round-trip: a plain object with a date string is
 *   correctly hydrated into a `Date` instance.
 */

import 'reflect-metadata';
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QType, QRule } from '@/decorators';
import { QTYPES_METADATA_KEY } from '@/core/decorators/qtype.decorator';
import { QRULE_FIELDS_KEY } from '@/core/decorators/qrule.decorator';

// ---------------------------------------------------------------------------
// Helper interfaces
// ---------------------------------------------------------------------------

interface IUser {
	name: string;
	createdAt: Date;
	score: number;
}

interface IPost {
	title: string;
	tags: string[];
	publishedAt: Date;
}

// ---------------------------------------------------------------------------
// Test models — TC39 decorator syntax
// ---------------------------------------------------------------------------

/**
 * Simple model using only @QType (no @Quick).
 * Prototype metadata is registered via addInitializer on first construction.
 */
class MetadataModel extends QModel<{ name: string; createdAt: Date }> {
	@QType(Date)
	createdAt!: Date;

	@QType(String)
	name!: string;
}

/**
 * Model combining @Quick (class) + @QType (field) + @QRule (field).
 * Full deserialization should work end-to-end in TC39 mode.
 */
@Quick({ name: 'string', createdAt: Date, score: 'number' })
class UserModel extends QModel<IUser> {
	@QRule((val) => val.length >= 2, 'Name too short')
	@QType(String)
	name!: string;

	@QRule((val) => val > new Date('2000-01-01'), 'Must be after year 2000')
	@QType(Date)
	createdAt!: Date;

	declare score: number;
}

/**
 * Model with array fields.
 */
@Quick({ title: 'string', tags: [String], publishedAt: Date })
class PostModel extends QModel<IPost> {
	@QType([String])
	tags!: string[];

	@QType(Date)
	publishedAt!: Date;

	declare title: string;
}

// ---------------------------------------------------------------------------
// Tests: @QType TC39 addInitializer timing
// ---------------------------------------------------------------------------

describe('@QType — TC39 addInitializer — metadata registration', () => {
	test('fieldType "date" is set on prototype after first instance creation', () => {
		// Before any instance: metadata may not be set yet (addInitializer hasn't run)
		// After construction: prototype should have the metadata
		new MetadataModel({ createdAt: new Date(), name: 'Alice' });
		const proto = MetadataModel.prototype;
		expect(Reflect.getMetadata('fieldType', proto, 'createdAt')).toBe(
			'date'
		);
	});

	test('fieldType "string" is set on prototype for @QType(String)', () => {
		new MetadataModel({ createdAt: new Date(), name: 'Bob' });
		const proto = MetadataModel.prototype;
		expect(Reflect.getMetadata('fieldType', proto, 'name')).toBe('string');
	});

	test('QTYPES_METADATA_KEY tracks both decorated fields', () => {
		new MetadataModel({ createdAt: new Date(), name: 'Carol' });
		const proto = MetadataModel.prototype;
		const fields = Reflect.getMetadata(
			QTYPES_METADATA_KEY,
			proto
		) as string[];
		expect(fields).toContain('createdAt');
		expect(fields).toContain('name');
	});

	test('getter/setter is installed on prototype (not the instance)', () => {
		const instance = new MetadataModel({
			createdAt: new Date(),
			name: 'Dave',
		});
		const proto = Object.getPrototypeOf(instance);
		const descriptor = Object.getOwnPropertyDescriptor(proto, 'createdAt');
		// The TC39 path installs a get/set pair on the prototype
		expect(descriptor).toBeDefined();
		expect(typeof descriptor?.get).toBe('function');
		expect(typeof descriptor?.set).toBe('function');
	});

	test('guard deduplicates: multiple instances do not duplicate QTYPES list', () => {
		for (let idx = 0; idx < 10; idx++) {
			new MetadataModel({ createdAt: new Date(), name: `User${idx}` });
		}
		const proto = MetadataModel.prototype;
		const fields = Reflect.getMetadata(
			QTYPES_METADATA_KEY,
			proto
		) as string[];
		// Each field should appear exactly once despite 10 constructions
		expect(fields.filter((field) => field === 'createdAt').length).toBe(1);
		expect(fields.filter((field) => field === 'name').length).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Tests: @QType array syntax in TC39 mode
// ---------------------------------------------------------------------------

describe('@QType — TC39 — array type metadata', () => {
	test('design:type is Array for @QType([String])', () => {
		new PostModel({ title: 'Hello', tags: [], publishedAt: new Date() });
		const proto = PostModel.prototype;
		expect(Reflect.getMetadata('design:type', proto, 'tags')).toBe(Array);
	});

	test('arrayElementClass is String for @QType([String])', () => {
		const proto = PostModel.prototype;
		expect(Reflect.getMetadata('arrayElementClass', proto, 'tags')).toBe(
			String
		);
	});

	test('arrayNestingDepth is 1 for @QType([String])', () => {
		const proto = PostModel.prototype;
		expect(Reflect.getMetadata('arrayNestingDepth', proto, 'tags')).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Tests: @Quick + @QType TC39 — deserialization round-trip
// ---------------------------------------------------------------------------

describe('@Quick + @QType — TC39 — full deserialization', () => {
	test('date string is deserialized to Date instance', () => {
		const user = UserModel.create({
			name: 'Alice',
			createdAt: '2023-06-15T00:00:00.000Z' as unknown as Date,
			score: 42,
		});
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.createdAt.getFullYear()).toBe(2023);
	});

	test('string field is correctly assigned', () => {
		const user = UserModel.create({
			name: 'Bob',
			createdAt: '2021-01-01T00:00:00.000Z' as unknown as Date,
			score: 10,
		});
		expect(typeof user.name).toBe('string');
		expect(user.name).toBe('Bob');
	});

	test('@QRule predicate runs: valid name passes', () => {
		const user = UserModel.create({
			name: 'Alice',
			createdAt: '2023-06-15T00:00:00.000Z' as unknown as Date,
			score: 5,
		});
		const result = user.checkRules();
		expect(result.valid).toBe(true);
	});

	test('@QRule predicate runs: too-short name fails', () => {
		const user = UserModel.create({
			name: 'A',
			createdAt: '2023-06-15T00:00:00.000Z' as unknown as Date,
			score: 5,
		});
		const result = user.checkRules();
		expect(result.valid).toBe(false);
		expect(
			result.errors.some((err) => err.message === 'Name too short')
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tests: @QRule type inference with @QType — compile-time check
// ---------------------------------------------------------------------------

describe('@QRule — TC39 — type inference with @QType', () => {
	test('@QRule predicate receives Date when @QType(Date) is used', () => {
		// Compile-time: the rule predicate `(val) => val > new Date(...)` must compile
		// without error, which means TypeScript inferred `val` as `Date` (not `unknown`).
		// The test below confirms runtime behaviour: date rule rejects old dates.
		const user = UserModel.create({
			name: 'Alice',
			createdAt: '1990-06-15T00:00:00.000Z' as unknown as Date,
			score: 5,
		});
		const result = user.checkRules();
		expect(result.valid).toBe(false);
		expect(
			result.errors.some(
				(err) => err.message === 'Must be after year 2000'
			)
		).toBe(true);
	});

	test('QRULE_FIELDS_KEY includes fields decorated with @QRule', () => {
		new UserModel({
			name: 'test',
			createdAt: new Date('2023-01-01'),
			score: 1,
		});
		const proto = UserModel.prototype;
		const ruleFields = Reflect.getMetadata(
			QRULE_FIELDS_KEY,
			proto
		) as string[];
		expect(ruleFields).toContain('name');
		expect(ruleFields).toContain('createdAt');
	});
});
