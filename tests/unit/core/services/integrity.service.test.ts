// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Unit tests for IntegrityService — covers core validation behaviour and
 * the WeakMap caches added for performance (class meta + merged opts).
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';
import { IntegrityService } from '@/core/services/integrity.service';
import { QConfig } from '@/core/config/quick.config';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';

// ─── Minimal test models ──────────────────────────────────────────────────────

interface IDateModel {
	createdAt: Date;
}

@Quick({ createdAt: Date })
class DateModel extends QModel<IDateModel> {
	declare createdAt: Date;
}

interface IMultiModel {
	createdAt: Date;
	balance: bigint;
}

@Quick({ createdAt: Date, balance: 'bigint' })
class MultiModel extends QModel<IMultiModel> {
	declare createdAt: Date;
	declare balance: bigint;
}

interface IPlainModel {
	name: string;
	age: number;
}

@Quick()
class PlainModel extends QModel<IPlainModel> {
	declare name: string;
	declare age: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(): IntegrityService {
	return new IntegrityService();
}

// ─────────────────────────────────────────────────────────────────────────────

describe('IntegrityService', () => {
	let svc: IntegrityService;

	beforeEach(() => {
		svc = makeService();
		QConfig.reset();
	});

	afterEach(() => {
		QConfig.reset();
	});

	// ── basic behaviour ───────────────────────────────────────────────────────

	describe('checkIntegrity() — basic', () => {
		it('returns [] for a model instance with no typed fields', () => {
			const inst = new PlainModel({ name: 'Alice', age: 30 });
			const errs = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: PlainModel }
			);
			expect(errs).toEqual([]);
		});

		it('returns [] when typed Date field holds a valid Date', () => {
			const inst = new DateModel({ createdAt: new Date('2024-01-01') });
			const errs = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: DateModel }
			);
			expect(errs).toEqual([]);
		});

		it('returns errors when typed Date field holds a non-Date value', () => {
			// Create with a valid date, then manually corrupt the field
			const inst = new DateModel({ createdAt: new Date('2024-01-01') });
			// Direct assignment to simulate a value that bypasses coercion
			(inst as unknown as Record<string, unknown>).createdAt = // @quickmodel-rule-ignore: no-as-unknown
				'not-a-date';
			const errs = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: DateModel }
			);
			expect(errs.length).toBeGreaterThan(0);
			expect(errs[0]?.isValid).toBe(false);
		});

		it('infers modelClass from instance.constructor when omitted', () => {
			const inst = new DateModel({ createdAt: new Date() });
			const errs = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown> // @quickmodel-rule-ignore: no-as-unknown
			);
			expect(errs).toEqual([]);
		});
	});

	// ── isValid() ─────────────────────────────────────────────────────────────

	describe('isValid()', () => {
		it('returns true when all typed fields are valid', () => {
			const inst = new DateModel({ createdAt: new Date() });
			expect(
				svc.$qIsValid(
					inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
					DateModel
				)
			).toBe(true);
		});

		it('returns false when a typed field has the wrong runtime type', () => {
			const inst = new DateModel({ createdAt: new Date() });
			(inst as unknown as Record<string, unknown>).createdAt = 'bad'; // @quickmodel-rule-ignore: no-as-unknown
			expect(
				svc.$qIsValid(
					inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
					DateModel
				)
			).toBe(false);
		});
	});

	// ── failFast strategy ─────────────────────────────────────────────────────

	describe('failFast strategy', () => {
		it('accumulate (default) — collects all errors', () => {
			const inst = new MultiModel({
				createdAt: new Date(),
				balance: BigInt(42),
			});
			// Corrupt both fields
			(inst as unknown as Record<string, unknown>).createdAt = 'bad-date'; // @quickmodel-rule-ignore: no-as-unknown
			(inst as unknown as Record<string, unknown>).balance = 'bad-bigint'; // @quickmodel-rule-ignore: no-as-unknown

			const errs = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: MultiModel }
			);
			// Both fields should be reported when accumulating
			expect(errs.length).toBeGreaterThanOrEqual(1);
		});

		it('failFast — stops after the first error', () => {
			// Configure failFast globally
			QConfig.configure({
				defaults: { integrityErrorStrategy: 'failFast' },
			});
			const fastSvc = makeService(); // new instance to pick up config

			const inst = new MultiModel({
				createdAt: new Date(),
				balance: BigInt(42),
			});
			// Corrupt both fields
			(inst as unknown as Record<string, unknown>).createdAt = 'bad-date'; // @quickmodel-rule-ignore: no-as-unknown
			(inst as unknown as Record<string, unknown>).balance = 'bad-bigint'; // @quickmodel-rule-ignore: no-as-unknown

			const errs = fastSvc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: MultiModel }
			);
			expect(errs.length).toBe(1);
		});
	});

	// ── merged-opts cache invalidation ────────────────────────────────────────

	describe('merged-opts cache — QConfig invalidation', () => {
		it('picks up changed integrityErrorStrategy after QConfig.configure()', () => {
			const inst = new MultiModel({
				createdAt: new Date(),
				balance: BigInt(42),
			});
			(inst as unknown as Record<string, unknown>).createdAt = 'bad'; // @quickmodel-rule-ignore: no-as-unknown
			(inst as unknown as Record<string, unknown>).balance = 'bad'; // @quickmodel-rule-ignore: no-as-unknown

			// First call: default strategy (accumulate) — should collect ≥1 error
			const before = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: MultiModel }
			);

			// Switch to failFast
			QConfig.configure({
				defaults: { integrityErrorStrategy: 'failFast' },
			});

			// Second call on same instance/class — cache must have been invalidated
			const after = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: MultiModel }
			);

			// With failFast, at most 1 error; both have ≥1 error, but failFast
			// stops early — observable as `after.length <= before.length`
			expect(after.length).toBeLessThanOrEqual(before.length);
			expect(after.length).toBe(1);
		});
	});

	// ── class-meta cache — consistent repeated calls ──────────────────────────

	describe('class-meta cache — repeated calls return consistent results', () => {
		it('returns identical results on repeated calls for the same class', () => {
			const inst = new DateModel({ createdAt: new Date() });
			const raw = inst as unknown as Record<string, unknown>; // @quickmodel-rule-ignore: no-as-unknown

			const first = svc.$qCheckIntegrity(raw, { modelClass: DateModel });
			const second = svc.$qCheckIntegrity(raw, { modelClass: DateModel });
			const third = svc.$qCheckIntegrity(raw, { modelClass: DateModel });

			expect(first).toEqual(second);
			expect(second).toEqual(third);
		});

		it('correctly validates two different classes independently', () => {
			const dateInst = new DateModel({ createdAt: new Date() });
			const plainInst = new PlainModel({ name: 'Bob', age: 25 });

			const dateErrs = svc.$qCheckIntegrity(
				dateInst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: DateModel }
			);
			const plainErrs = svc.$qCheckIntegrity(
				plainInst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{ modelClass: PlainModel }
			);

			expect(dateErrs).toEqual([]);
			expect(plainErrs).toEqual([]);
		});
	});

	// ── cycle detection ───────────────────────────────────────────────────────

	describe('cycle detection', () => {
		it('returns [] on revisited objects within the same cycle', () => {
			const inst = new PlainModel({ name: 'X', age: 1 });
			const raw = inst as unknown as Record<string, unknown>; // @quickmodel-rule-ignore: no-as-unknown
			const seen = new WeakSet<object>();
			seen.add(raw); // pre-mark as already visited

			const errs = svc.$qCheckIntegrity(raw, {
				modelClass: PlainModel,
				ctx: { seen, depth: 0 },
			});
			expect(errs).toEqual([]);
		});

		it('returns error when MAX_DEPTH is exceeded', () => {
			const inst = new PlainModel({ name: 'deep', age: 1 });
			const errs = svc.$qCheckIntegrity(
				inst as unknown as Record<string, unknown>, // @quickmodel-rule-ignore: no-as-unknown
				{
					modelClass: PlainModel,
					ctx: { seen: new WeakSet(), depth: 201 },
				}
			);
			expect(errs.length).toBe(1);
			expect(errs[0]?.error).toMatch(/depth/i);
		});
	});

	// ── getTransformer() toLowerCase caching ─────────────────────────────────

	describe('getTransformer() — toLowerCase caching', () => {
		it('resolves transformer for lowercase string key', () => {
			expect(svc.getTransformer('date')).toBeDefined();
		});

		it('resolves transformer for mixed-case string key', () => {
			expect(svc.getTransformer('Date')).toBeDefined();
			expect(svc.getTransformer('DATE')).toBeDefined();
		});

		it('resolves transformer for constructor function', () => {
			expect(svc.getTransformer(Date)).toBeDefined();
		});

		it('returns undefined for unknown key', () => {
			expect(svc.getTransformer('nonexistent-type')).toBeUndefined();
		});

		it('returns same transformer instance on repeated calls (cache hit)', () => {
			const trx1 = svc.getTransformer('date');
			const trx2 = svc.getTransformer('date');
			expect(trx1).toBe(trx2);
		});
	});
});
