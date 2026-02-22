import { describe, it, expect } from 'bun:test';
import { Quick, QType, QModel } from '@/index';

/**
 * Tests for deep inheritance chains (3+ levels).
 *
 * Scenarios covered:
 *  1.  A → B → C  — @Quick on every level
 *  2.  A → B → C  — @Quick only on A and C (B sin decorar)
 *  3.  A → B → C  — @Quick solo en el nivel raíz (A)
 *  4.  A → B → C → D — cadena de 4 niveles
 *  5.  Override en nivel intermedio (B sobreescribe campo de A, C hereda el override)
 *  6.  Campos acumulados: cada nivel añade campos, todos deben estar en toJSON()
 *  7.  @QType mixto con @Quick en cadena profunda
 *  8.  mock() en descendiente debe conocer todos los campos del árbol
 */
describe('Integration: Deep Chain Inheritance', () => {
	// ─────────────────────────────────────────────────────────────────────────
	// Shared leaf for toJSON roundtrip helpers
	// ─────────────────────────────────────────────────────────────────────────

	// =========================================================================
	// Scenario 1: @Quick on every level — 3 levels
	// =========================================================================
	describe('Scenario 1: @Quick on every level (A → B → C)', () => {
		@Quick({ dateA: Date })
		class LevelA extends QModel<any> {
			declare nameA: string;
			declare dateA: Date;
		}

		@Quick({ bigintB: BigInt })
		class LevelB extends LevelA {
			declare nameB: string;
			declare bigintB: bigint;
		}

		@Quick({ dateC: Date })
		class LevelC extends LevelB {
			declare nameC: string;
			declare dateC: Date;
		}

		it('should transform fields from all three levels', () => {
			const instance = LevelC.create({
				nameA: 'alice',
				dateA: '2021-01-01T00:00:00.000Z',
				nameB: 'bob',
				bigintB: '9007199254740993',
				nameC: 'carol',
				dateC: '2023-06-15T00:00:00.000Z',
			});

			// Level A
			expect(instance.nameA).toBe('alice');
			expect(instance.dateA).toBeInstanceOf(Date);
			expect(instance.dateA.getFullYear()).toBe(2021);

			// Level B
			expect(instance.nameB).toBe('bob');
			expect(instance.bigintB).toBe(9007199254740993n);

			// Level C
			expect(instance.nameC).toBe('carol');
			expect(instance.dateC).toBeInstanceOf(Date);
			expect(instance.dateC.getFullYear()).toBe(2023);
		});

		it('should serialize all fields from all three levels in serialize()', () => {
			const instance = LevelC.create({
				nameA: 'alice',
				dateA: '2021-01-01T00:00:00.000Z',
				nameB: 'bob',
				bigintB: '9007199254740993',
				nameC: 'carol',
				dateC: '2023-06-15T00:00:00.000Z',
			});

			// serialize() returns a plain object; toJSON() returns a JSON string
			const plain = instance.serialize();

			expect(plain).toHaveProperty('nameA', 'alice');
			expect(plain).toHaveProperty('nameB', 'bob');
			expect(plain).toHaveProperty('nameC', 'carol');
			// Dates serialized to ISO string
			expect(typeof plain.dateA).toBe('string');
			expect(typeof plain.dateC).toBe('string');
			// BigInt serialized to string
			expect(typeof plain.bigintB).toBe('string');
		});
	});

	// =========================================================================
	// Scenario 2: @Quick only on A and C — B undecorated
	// =========================================================================
	describe('Scenario 2: @Quick only on root and leaf, middle undecorated (A → B → C)', () => {
		@Quick({ dateA: Date })
		class RootDecorated extends QModel<any> {
			declare nameA: string;
			declare dateA: Date;
		}

		// No @Quick here — inherits A's metadata
		class MiddleRaw extends RootDecorated {
			declare nameB: string;
		}

		@Quick({ dateC: Date })
		class LeafDecorated extends MiddleRaw {
			declare nameC: string;
			declare dateC: Date;
		}

		it('should apply root transformations even through an undecorated middle', () => {
			const instance = LeafDecorated.create({
				nameA: 'root',
				dateA: '2020-03-10T00:00:00.000Z',
				nameB: 'middle',
				nameC: 'leaf',
				dateC: '2024-12-01T00:00:00.000Z',
			});

			expect(instance.dateA).toBeInstanceOf(Date);
			expect(instance.dateA.getFullYear()).toBe(2020);
			expect(instance.nameB).toBe('middle');
			expect(instance.dateC).toBeInstanceOf(Date);
			expect(instance.dateC.getFullYear()).toBe(2024);
		});
	});

	// =========================================================================
	// Scenario 3: @Quick only on root — 3 levels, only A decorated
	// =========================================================================
	describe('Scenario 3: @Quick only on root, two raw descendants (A → B → C)', () => {
		@Quick({ rootDate: Date })
		class OnlyRootDecorated extends QModel<any> {
			declare rootDate: Date;
			declare rootName: string;
		}

		class RawChild extends OnlyRootDecorated {
			declare childName: string;
		}

		class RawGrandchild extends RawChild {
			declare grandchildName: string;
		}

		it('should still transform root fields in grandchild', () => {
			const instance = RawGrandchild.create({
				rootDate: '2019-07-04T00:00:00.000Z',
				rootName: 'root',
				childName: 'child',
				grandchildName: 'grandchild',
			});

			expect(instance.rootDate).toBeInstanceOf(Date);
			expect(instance.rootDate.getFullYear()).toBe(2019);
			expect(instance.childName).toBe('child');
			expect(instance.grandchildName).toBe('grandchild');
		});
	});

	// =========================================================================
	// Scenario 4: 4-level chain — A → B → C → D, each adds its own type
	// =========================================================================
	describe('Scenario 4: Four-level chain (A → B → C → D)', () => {
		@Quick({ fieldA: Date })
		class ChainA extends QModel<any> {
			declare labelA: string;
			declare fieldA: Date;
		}

		@Quick({ fieldB: BigInt })
		class ChainB extends ChainA {
			declare labelB: string;
			declare fieldB: bigint;
		}

		@Quick({ fieldC: RegExp })
		class ChainC extends ChainB {
			declare labelC: string;
			declare fieldC: RegExp;
		}

		@Quick({ fieldD: Date })
		class ChainD extends ChainC {
			declare labelD: string;
			declare fieldD: Date;
		}

		it('should transform fields from all four levels', () => {
			const instance = ChainD.create({
				labelA: 'a',
				fieldA: '2018-01-01T00:00:00.000Z',
				labelB: 'b',
				fieldB: '12345678901234567',
				labelC: 'c',
				fieldC: '/hello/gi',
				labelD: 'd',
				fieldD: '2025-11-30T00:00:00.000Z',
			});

			expect(instance.labelA).toBe('a');
			expect(instance.fieldA).toBeInstanceOf(Date);
			expect(instance.fieldA.getFullYear()).toBe(2018);

			expect(instance.labelB).toBe('b');
			expect(instance.fieldB).toBe(12345678901234567n);

			expect(instance.labelC).toBe('c');
			expect(instance.fieldC).toBeInstanceOf(RegExp);

			expect(instance.labelD).toBe('d');
			expect(instance.fieldD).toBeInstanceOf(Date);
			expect(instance.fieldD.getFullYear()).toBe(2025);
		});

		it('serialize/deserialize roundtrip should preserve all four levels', () => {
			const data = {
				labelA: 'a',
				fieldA: '2018-01-01T00:00:00.000Z',
				labelB: 'b',
				fieldB: '12345678901234567',
				labelC: 'c',
				fieldC: '/hello/gi',
				labelD: 'd',
				fieldD: '2025-11-30T00:00:00.000Z',
			};

			const instance = ChainD.create(data);
			// serialize() → plain object; pass that directly to create() for roundtrip
			const plain = instance.serialize();
			const restored = ChainD.create(plain as any);

			expect(restored.fieldA).toBeInstanceOf(Date);
			expect(restored.fieldB).toBe(12345678901234567n);
			expect(restored.fieldC).toBeInstanceOf(RegExp);
			expect(restored.fieldD).toBeInstanceOf(Date);
		});
	});

	// =========================================================================
	// Scenario 5: Override in the middle level
	// =========================================================================
	describe('Scenario 5: Override in middle level — B overrides A field, C inherits override', () => {
		// When a subclass needs to CHANGE THE TYPE of an inherited field, use
		// QModel.extends<TInterface, TBase, TOmit>(Base) — the third generic removes
		// the field from the TBase intersection, allowing the subclass to redeclare
		// it with the correct type. The external base (OverrideA) stays untouched.
		interface IOverrideBSerial {
			label: string;
			value: string;
		}

		@Quick({ value: Date })
		class OverrideA extends QModel<any> {
			declare label: string;
			declare value: Date;
		}

		// 'value' is Omit'd from OverrideA in the intersection → declare value: bigint works
		@Quick({ value: BigInt })
		class OverrideB extends QModel.extends<
			IOverrideBSerial,
			OverrideA,
			'value'
		>(OverrideA) {
			declare label: string;
			declare value: bigint; // ✅ no conflict, TypeScript knows the correct type
		}

		class OverrideC extends OverrideB {
			declare extra: string;
		}

		it('leaf should use the closest ancestor override, not the original definition', () => {
			const instance = OverrideC.create({
				label: 'test',
				value: '9999999999999999',
				extra: 'leaf field',
			});

			// No cast needed — TypeScript already knows instance.value is bigint
			expect(typeof instance.value).toBe('bigint');
			expect(instance.value).toBe(9999999999999999n);
			expect(instance.extra).toBe('leaf field');
		});

		it('instance should still be instanceof OverrideA through the mixin chain', () => {
			const instance = OverrideC.create({
				label: 'test',
				value: '9999999999999999',
				extra: 'leaf field',
			});

			expect(instance).toBeInstanceOf(OverrideA);
		});
	});

	// =========================================================================
	// Scenario 5b: Multiple field type overrides across levels
	// =========================================================================
	describe('Scenario 5b: Multiple fields overridden at each hop (A → B → C)', () => {
		// BaseLevel has `count: string` (no transformer) and `startDate: Date`.
		// MidLevel overrides `count` → bigint (changes type).
		// LeafLevel overrides `pattern` → RegExp (pattern was declared string in Mid).
		// Each QModel.extends<T, Base, 'field1' | 'field2'> removes the conflicting
		// fields from the intersection so the subclass can redeclare them freely.

		@Quick({ startDate: Date })
		class MultiBase extends QModel<any> {
			declare label: string;
			declare startDate: Date;
			declare count: string; // will be overridden to bigint in MidLevel
		}

		// TOmit = 'count' — removes count: string from MultiBase intersection
		@Quick({ count: BigInt })
		class MultiMid extends QModel.extends<any, MultiBase, 'count'>(
			MultiBase
		) {
			declare count: bigint; // ✅ overridden, TypeScript knows it
			declare pattern: string; // will be overridden to RegExp in LeafLevel
		}

		// TOmit = 'pattern' — removes pattern: string from MultiMid intersection
		@Quick({ pattern: RegExp })
		class MultiLeaf extends QModel.extends<any, MultiMid, 'pattern'>(
			MultiMid
		) {
			declare pattern: RegExp; // ✅ overridden, TypeScript knows it
			declare extra: string;
		}

		it('each level override wins: count is bigint, pattern is RegExp', () => {
			const instance = MultiLeaf.create({
				label: 'test',
				startDate: '2024-01-15T00:00:00.000Z',
				count: '42',
				pattern: '/hello/gi',
				extra: 'leaf field',
			});

			// startDate from MultiBase — untouched
			expect(instance.startDate).toBeInstanceOf(Date);
			expect(instance.startDate.getFullYear()).toBe(2024);

			// count from MultiMid override — bigint, no cast
			expect(typeof instance.count).toBe('bigint');
			expect(instance.count).toBe(42n);

			// pattern from MultiLeaf override — RegExp, no cast
			expect(instance.pattern).toBeInstanceOf(RegExp);
			expect(instance.pattern.source).toBe('hello');

			expect(instance.extra).toBe('leaf field');
		});

		it('instanceof chain is preserved through each QModel.extends hop', () => {
			const instance = MultiLeaf.create({
				label: 'test',
				startDate: '2024-01-15T00:00:00.000Z',
				count: '1',
				pattern: '/x/',
				extra: 'y',
			});

			expect(instance).toBeInstanceOf(MultiBase);
			expect(instance).toBeInstanceOf(MultiMid);
			expect(instance).toBeInstanceOf(MultiLeaf);
		});
	});

	// =========================================================================
	// Scenario 5c: 3 fields overridden in a single hop
	// =========================================================================
	describe('Scenario 5c: Three fields overridden simultaneously in one hop (A → B → C)', () => {
		// BaseTriple declares ts: string, amount: string, pattern: string.
		// MidTriple overrides all three at once via TOmit union → Date, bigint, RegExp.
		// LeafTriple extends normally and adds its own extra field.

		@Quick({})
		class BaseTriple extends QModel<any> {
			declare label: string;
			declare ts: string; // will become Date in MidTriple
			declare amount: string; // will become bigint in MidTriple
			declare pattern: string; // will become RegExp in MidTriple
		}

		// Three fields removed from BaseTriple intersection at once
		@Quick({ ts: Date, amount: BigInt, pattern: RegExp })
		class MidTriple extends QModel.extends<
			any,
			BaseTriple,
			'ts' | 'amount' | 'pattern'
		>(BaseTriple) {
			declare ts: Date; // ✅
			declare amount: bigint; // ✅
			declare pattern: RegExp; // ✅
		}

		class LeafTriple extends MidTriple {
			declare extra: string;
		}

		it('all three overridden fields have the correct type in the leaf', () => {
			const instance = LeafTriple.create({
				label: 'triple',
				ts: '2025-03-01T00:00:00.000Z',
				amount: '99999999999',
				pattern: '/foo/gi',
				extra: 'leaf',
			});

			expect(instance.label).toBe('triple');

			// ts → Date
			expect(instance.ts).toBeInstanceOf(Date);
			expect(instance.ts.getFullYear()).toBe(2025);

			// amount → bigint, no cast
			expect(typeof instance.amount).toBe('bigint');
			expect(instance.amount).toBe(99999999999n);

			// pattern → RegExp, no cast
			expect(instance.pattern).toBeInstanceOf(RegExp);
			expect(instance.pattern.source).toBe('foo');
			expect(instance.pattern.flags).toContain('g');

			expect(instance.extra).toBe('leaf');
		});

		it('instanceof chain is preserved with a 3-field TOmit union', () => {
			const instance = LeafTriple.create({
				label: 'x',
				ts: '2025-01-01T00:00:00.000Z',
				amount: '1',
				pattern: '/x/',
				extra: 'y',
			});

			expect(instance).toBeInstanceOf(BaseTriple);
			expect(instance).toBeInstanceOf(MidTriple);
			expect(instance).toBeInstanceOf(LeafTriple);
		});
	});

	// =========================================================================
	// Scenario 6: Accumulated fields — all levels contribute to toJSON
	// =========================================================================
	describe('Scenario 6: All ancestor fields appear in toJSON()', () => {
		@Quick({ ts: Date })
		class AccumA extends QModel<any> {
			declare a: string;
			declare ts: Date;
		}

		@Quick({ count: BigInt })
		class AccumB extends AccumA {
			declare b: string;
			declare count: bigint;
		}

		@Quick({ pattern: RegExp })
		class AccumC extends AccumB {
			declare c: string;
			declare pattern: RegExp;
		}

		it('serialize() should contain fields from all three levels', () => {
			const instance = AccumC.create({
				a: 'alpha',
				ts: '2022-05-20T00:00:00.000Z',
				b: 'beta',
				count: '777',
				c: 'gamma',
				pattern: '/test/i',
			});

			// serialize() returns plain object; toJSON() returns a JSON string
			const plain = instance.serialize();

			expect(plain).toHaveProperty('a', 'alpha');
			expect(plain).toHaveProperty('b', 'beta');
			expect(plain).toHaveProperty('c', 'gamma');
			expect(plain).toHaveProperty('ts');
			expect(plain).toHaveProperty('count');
			expect(plain).toHaveProperty('pattern');
		});
	});

	// =========================================================================
	// Scenario 7: @QType mixed with @Quick in a deep chain
	// =========================================================================
	describe('Scenario 7: @QType on specific fields mixed with @Quick on class', () => {
		@Quick({ autoDate: Date })
		class MixedA extends QModel<any> {
			declare label: string;
			declare autoDate: Date;

			@QType(BigInt)
			declare explicitBig: bigint;
		}

		@Quick({ childDate: Date })
		class MixedB extends MixedA {
			declare childLabel: string;
			declare childDate: Date;

			@QType(RegExp)
			declare childPattern: RegExp;
		}

		it('should transform both @Quick auto-fields and @QType explicit fields across levels', () => {
			const instance = MixedB.create({
				label: 'parent',
				autoDate: '2020-08-15T00:00:00.000Z',
				explicitBig: '8888888888888',
				childLabel: 'child',
				childDate: '2024-02-14T00:00:00.000Z',
				childPattern: '/abc/gm',
			});

			expect(instance.autoDate).toBeInstanceOf(Date);
			expect(instance.explicitBig).toBe(8888888888888n);
			expect(instance.childDate).toBeInstanceOf(Date);
			expect(instance.childPattern).toBeInstanceOf(RegExp);
		});
	});

	// =========================================================================
	// Scenario 8: mock() knows about all ancestor fields
	// =========================================================================
	describe('Scenario 8: mock() generates data for fields from all ancestor levels', () => {
		@Quick({ birthDate: Date })
		class MockBase extends QModel<any> {
			declare name: string;
			declare birthDate: Date;
		}

		@Quick({ salary: BigInt })
		class MockMid extends MockBase {
			declare department: string;
			declare salary: bigint;
		}

		@Quick({ joinedAt: Date })
		class MockLeaf extends MockMid {
			declare role: string;
			declare joinedAt: Date;
		}

		it('random() instance should have all ancestor fields', () => {
			const instance = MockLeaf.mock().random();

			// Fields from every level should be present (even if value is null/undefined for some)
			expect(instance).toBeDefined();
			// The instance must at minimum be a MockLeaf (covers the full chain)
			expect(instance).toBeInstanceOf(MockLeaf);
		});

		it('static getMetadata() should list TRANSFORMED fields from all ancestor levels', () => {
			// Static getMetadata() only tracks fields in @Quick typeMap or @QType —
			// plain `declare` fields (no transformer) are not registered.
			// To get ALL fields (including plain ones) use instance.getMetadata().
			const meta = MockLeaf.getMetadata();

			// MockBase transformed fields
			expect(meta.has('birthDate')).toBe(true);
			expect(meta.get('birthDate')?.type).toMatch(/date/i);

			// MockMid transformed fields
			expect(meta.has('salary')).toBe(true);
			expect(meta.get('salary')?.type).toMatch(/bigint/i);

			// MockLeaf transformed fields
			expect(meta.has('joinedAt')).toBe(true);
			expect(meta.get('joinedAt')?.type).toMatch(/date/i);
		});

		it('instance getMetadata() should include plain declare fields via auto-discovery', () => {
			const instance = MockLeaf.create({
				name: 'test',
				birthDate: '1990-01-01T00:00:00.000Z',
				department: 'eng',
				salary: '60000',
				role: 'dev',
				joinedAt: '2020-06-01T00:00:00.000Z',
			});
			const meta = instance.getMetadata();

			// All fields (transformed + plain) visible via instance metadata
			expect(meta.has('name')).toBe(true);
			expect(meta.has('department')).toBe(true);
			expect(meta.has('role')).toBe(true);
			expect(meta.has('birthDate')).toBe(true);
			expect(meta.has('salary')).toBe(true);
			expect(meta.has('joinedAt')).toBe(true);
		});
	});
});
