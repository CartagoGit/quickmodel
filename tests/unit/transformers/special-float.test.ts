// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * TDD: NaN / Infinity / -Infinity round-trip preservation
 *
 * These tests intentionally fail until `special-float.transformer.ts` is implemented
 * and the Serializer / Deserializer are updated to auto-encode/decode these tokens.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { QModel } from '@/core/models/quick.model';
import { Quick } from '@/core/decorators/quick.decorator';

// ────────────────────────────────────────────────────────────────────────────
// Lazy imports: resolved after transformer module is created
// ────────────────────────────────────────────────────────────────────────────

let NanTransformer: any;
let InfinityTransformer: any;
let SpecialFloatTransformer: any;
let isQMSpecialToken: (v: unknown) => boolean;
let decodeQMSpecialToken: (v: any) => number | undefined;

beforeAll(async () => {
	const mod = await import('@/transformers/special-float.transformer');
	NanTransformer = mod.NanTransformer;
	InfinityTransformer = mod.InfinityTransformer;
	SpecialFloatTransformer = mod.SpecialFloatTransformer;
	isQMSpecialToken = mod.isQMSpecialToken;
	decodeQMSpecialToken = mod.decodeQMSpecialToken;
});

// ────────────────────────────────────────────────────────────────────────────
// Unit: token helpers
// ────────────────────────────────────────────────────────────────────────────

describe('isQMSpecialToken()', () => {
	test('returns true for { __qm: "nan" }', () => {
		expect(isQMSpecialToken({ __qm: 'nan' })).toBe(true);
	});
	test('returns true for { __qm: "inf" }', () => {
		expect(isQMSpecialToken({ __qm: 'inf' })).toBe(true);
	});
	test('returns true for { __qm: "-inf" }', () => {
		expect(isQMSpecialToken({ __qm: '-inf' })).toBe(true);
	});
	test('returns false for a plain number', () => {
		expect(isQMSpecialToken(42)).toBe(false);
	});
	test('returns false for null', () => {
		expect(isQMSpecialToken(null)).toBe(false);
	});
	test('returns false for a plain object without __qm', () => {
		expect(isQMSpecialToken({ foo: 'bar' })).toBe(false);
	});
	test('returns false for arrays', () => {
		expect(isQMSpecialToken([{ __qm: 'nan' }])).toBe(false);
	});
});

describe('decodeQMSpecialToken()', () => {
	test('"nan" → NaN', () => {
		expect(decodeQMSpecialToken({ __qm: 'nan' })).toBeNaN();
	});
	test('"inf" → Infinity', () => {
		expect(decodeQMSpecialToken({ __qm: 'inf' })).toBe(Infinity);
	});
	test('"-inf" → -Infinity', () => {
		expect(decodeQMSpecialToken({ __qm: '-inf' })).toBe(-Infinity);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Unit: SpecialFloatTransformer
// ────────────────────────────────────────────────────────────────────────────

describe('SpecialFloatTransformer', () => {
	describe('serialize()', () => {
		test('NaN → { __qm: "nan" }', () => {
			const trx = new SpecialFloatTransformer();
			const serialized = trx.serialize(NaN);
			expect(serialized).toEqual({ __qm: 'nan' });
		});
		test('Infinity → { __qm: "inf" }', () => {
			const trx = new SpecialFloatTransformer();
			expect(trx.serialize(Infinity)).toEqual({ __qm: 'inf' });
		});
		test('-Infinity → { __qm: "-inf" }', () => {
			const trx = new SpecialFloatTransformer();
			expect(trx.serialize(-Infinity)).toEqual({ __qm: '-inf' });
		});
	});

	describe('deserialize()', () => {
		test('token { __qm: "nan" } → NaN', () => {
			const trx = new SpecialFloatTransformer();
			const result = trx.deserialize(
				{ __qm: 'nan' },
				'score',
				'TestClass'
			);
			expect(result).toBeNaN();
		});
		test('token { __qm: "inf" } → Infinity', () => {
			const trx = new SpecialFloatTransformer();
			expect(trx.deserialize({ __qm: 'inf' }, 'val', 'TestClass')).toBe(
				Infinity
			);
		});
		test('token { __qm: "-inf" } → -Infinity', () => {
			const trx = new SpecialFloatTransformer();
			expect(trx.deserialize({ __qm: '-inf' }, 'val', 'TestClass')).toBe(
				-Infinity
			);
		});
		test('passthrough: plain number returns unchanged', () => {
			const trx = new SpecialFloatTransformer();
			expect(trx.deserialize(42, 'val', 'TestClass')).toBe(42);
		});
		test('null → null', () => {
			const trx = new SpecialFloatTransformer();
			expect(trx.deserialize(null, 'val', 'TestClass')).toBeNull();
		});
	});

	describe('checkIntegrity()', () => {
		test('number → valid', () => {
			const trx = new SpecialFloatTransformer();
			expect(
				trx.checkIntegrity(42, {
					propertyKey: 'val',
					className: 'TestClass',
				}).isValid
			).toBe(true);
		});
		test('NaN → valid', () => {
			const trx = new SpecialFloatTransformer();
			expect(
				trx.checkIntegrity(NaN, {
					propertyKey: 'val',
					className: 'TestClass',
				}).isValid
			).toBe(true);
		});
		test('token → valid', () => {
			const trx = new SpecialFloatTransformer();
			expect(
				trx.checkIntegrity(
					{ __qm: 'nan' },
					{ propertyKey: 'val', className: 'TestClass' }
				).isValid
			).toBe(true);
		});
		test('string → invalid', () => {
			const trx = new SpecialFloatTransformer();
			expect(
				trx.checkIntegrity('hello', {
					propertyKey: 'val',
					className: 'TestClass',
				}).isValid
			).toBe(false);
		});
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Exported singleton aliases
// ────────────────────────────────────────────────────────────────────────────

describe('Exported singleton instances', () => {
	test('NanTransformer is defined', () => {
		expect(NanTransformer).toBeDefined();
	});
	test('InfinityTransformer is defined', () => {
		expect(InfinityTransformer).toBeDefined();
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Integration: QModel auto-encoding NaN/Infinity on serialize()
// ────────────────────────────────────────────────────────────────────────────

interface IStats {
	hits: number;
	ratio: number;
	boost: number;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class Stats extends QModel<IStats> {
	declare hits: number;
	declare ratio: number;
	declare boost: number;
}

describe('Serializer auto-encoding', () => {
	test('NaN serializes to { __qm: "nan" } automatically', () => {
		const stats = new Stats({ hits: NaN, ratio: 0.5, boost: 1 });
		const serialized = stats.$qSerialize();
		expect(serialized.hits as unknown).toEqual({ __qm: 'nan' }); // @quickmodel-rule-ignore: no-as-unknown
	});

	test('Infinity serializes to { __qm: "inf" } automatically', () => {
		const stats = new Stats({ hits: 10, ratio: Infinity, boost: 1 });
		const serialized = stats.$qSerialize();
		expect(serialized.ratio as unknown).toEqual({ __qm: 'inf' }); // @quickmodel-rule-ignore: no-as-unknown
	});

	test('-Infinity serializes to { __qm: "-inf" } automatically', () => {
		const stats = new Stats({ hits: 10, ratio: -Infinity, boost: 1 });
		const serialized = stats.$qSerialize();
		expect(serialized.ratio as unknown).toEqual({ __qm: '-inf' }); // @quickmodel-rule-ignore: no-as-unknown
	});

	test('finite numbers pass through unchanged', () => {
		const stats = new Stats({ hits: 42, ratio: 0.9, boost: 2 });
		const serialized = stats.$qSerialize();
		expect(serialized.hits).toBe(42);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Integration: QModel auto-decoding QM tokens on new Model(data)
// ────────────────────────────────────────────────────────────────────────────

describe('Deserializer auto-decoding', () => {
	test('{ __qm: "nan" } in data deserializes to NaN', () => {
		const stats = new Stats({
			hits: { __qm: 'nan' } as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
			ratio: 0.5,
			boost: 1,
		});
		expect(stats.hits).toBeNaN();
	});

	test('{ __qm: "inf" } in data deserializes to Infinity', () => {
		const stats = new Stats({
			hits: 10,
			ratio: { __qm: 'inf' } as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
			boost: 1,
		});
		expect(stats.ratio).toBe(Infinity);
	});

	test('{ __qm: "-inf" } in data deserializes to -Infinity', () => {
		const stats = new Stats({
			hits: 10,
			ratio: { __qm: '-inf' } as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
			boost: 1,
		});
		expect(stats.ratio).toBe(-Infinity);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Integration: full lossless roundtrip
// ────────────────────────────────────────────────────────────────────────────

describe('Lossless roundtrip (NaN / Infinity)', () => {
	test('NaN survives serialize → JSON.parse → new Model()', () => {
		const original = new Stats({ hits: NaN, ratio: 0.5, boost: 1 });
		const jsonString = JSON.stringify(original.$qSerialize());
		const parsed = JSON.parse(jsonString) as IStats;
		const restored = new Stats(parsed);
		expect(restored.hits).toBeNaN();
	});

	test('Infinity survives serialize → JSON.parse → new Model()', () => {
		const original = new Stats({ hits: 10, ratio: Infinity, boost: 1 });
		const jsonString = JSON.stringify(original.$qSerialize());
		const parsed = JSON.parse(jsonString) as IStats;
		const restored = new Stats(parsed);
		expect(restored.ratio).toBe(Infinity);
	});

	test('-Infinity survives serialize → JSON.parse → new Model()', () => {
		const original = new Stats({ hits: 10, ratio: -Infinity, boost: 1 });
		const jsonString = JSON.stringify(original.$qSerialize());
		const parsed = JSON.parse(jsonString) as IStats;
		const restored = new Stats(parsed);
		expect(restored.ratio).toBe(-Infinity);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Integration: explicit transformer key ('nan' / 'infinity')
// ────────────────────────────────────────────────────────────────────────────

interface IScore {
	val: number;
}

@Quick({ val: 'nan' }, { unknownPropertyPolicy: 'keep' })
class ScoreNan extends QModel<IScore> {
	declare val: number;
}

@Quick({ val: 'infinity' }, { unknownPropertyPolicy: 'keep' })
class ScoreInf extends QModel<IScore> {
	declare val: number;
}

describe('Explicit transformer key', () => {
	test("@Quick({ val: 'nan' }) — NaN round-trips", () => {
		const model = new ScoreNan({
			val: { __qm: 'nan' } as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
		});
		expect(model.val).toBeNaN();
		expect(model.$qSerialize().val as unknown).toEqual({ __qm: 'nan' }); // @quickmodel-rule-ignore: no-as-unknown
	});

	test("@Quick({ val: 'infinity' }) — Infinity round-trips", () => {
		const model = new ScoreInf({
			val: { __qm: 'inf' } as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
		});
		expect(model.val).toBe(Infinity);
		expect(model.$qSerialize().val as unknown).toEqual({ __qm: 'inf' }); // @quickmodel-rule-ignore: no-as-unknown
	});
});
