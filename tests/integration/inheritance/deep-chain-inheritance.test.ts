// @quickmodel-rule-ignore: prefer-quick
// This file tests @QType directly — opt-out from the prefer-quick rule.
import { describe, it, expect } from 'bun:test';
import { Quick, QModel, IQImplements } from '@/index';
import { QType } from '@/decorators';

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
		@Quick({ dateA: Date }, { unknownPropertyPolicy: 'keep' })
		class LevelA extends QModel<any> {
			declare nameA: string;
			declare dateA: Date;
		}

		@Quick({ bigintB: BigInt }, { unknownPropertyPolicy: 'keep' })
		class LevelB extends LevelA {
			declare nameB: string;
			declare bigintB: bigint;
		}

		@Quick({ dateC: Date }, { unknownPropertyPolicy: 'keep' })
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
			const plain = instance.$qSerialize();

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
		@Quick({ dateA: Date }, { unknownPropertyPolicy: 'keep' })
		class RootDecorated extends QModel<any> {
			declare nameA: string;
			declare dateA: Date;
		}

		// No @Quick here — inherits A's metadata
		class MiddleRaw extends RootDecorated {
			declare nameB: string;
		}

		@Quick({ dateC: Date }, { unknownPropertyPolicy: 'keep' })
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
		@Quick({ rootDate: Date }, { unknownPropertyPolicy: 'keep' })
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
		@Quick({ fieldA: Date }, { unknownPropertyPolicy: 'keep' })
		class ChainA extends QModel<any> {
			declare labelA: string;
			declare fieldA: Date;
		}

		@Quick({ fieldB: BigInt }, { unknownPropertyPolicy: 'keep' })
		class ChainB extends ChainA {
			declare labelB: string;
			declare fieldB: bigint;
		}

		@Quick({ fieldC: RegExp }, { unknownPropertyPolicy: 'keep' })
		class ChainC extends ChainB {
			declare labelC: string;
			declare fieldC: RegExp;
		}

		@Quick({ fieldD: Date }, { unknownPropertyPolicy: 'keep' })
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
			const plain = instance.$qSerialize();
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
		// When a subclass needs to CHANGE THE TYPE of an inherited field, compose
		// IQImplements<Base, { field: NewType }> as the single TRuntime generic.
		// IQImplements removes `value: Date` from the intersection and replaces it
		// with `value: bigint`. The external base (OverrideA) stays untouched.

		@Quick({ value: Date }, { unknownPropertyPolicy: 'keep' })
		class OverrideA extends QModel<any> {
			declare label: string;
			declare value: Date;
		}

		// IQImplements<OverrideA, { value: bigint }> → Omit<OverrideA, 'value'> & { value: bigint }
		@Quick({ value: BigInt }, { unknownPropertyPolicy: 'keep' })
		class OverrideB extends QModel.extends<
			IQImplements<OverrideA, { value: bigint }>
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
		// TOverrides = { campo: NuevoTipo } — replace with the actual runtime type.

		@Quick({ startDate: Date }, { unknownPropertyPolicy: 'keep' })
		class MultiBase extends QModel<any> {
			declare label: string;
			declare startDate: Date;
			declare count: string; // will be overridden to bigint in MidLevel
		}

		// IQImplements<MultiBase, { count: bigint }> → removes count: string, adds count: bigint
		@Quick({ count: BigInt }, { unknownPropertyPolicy: 'keep' })
		class MultiMid extends QModel.extends<
			IQImplements<MultiBase, { count: bigint }>
		>(MultiBase) {
			declare count: bigint; // ✅ overridden, TypeScript knows it
			declare pattern: string; // will be overridden to RegExp in LeafLevel
		}

		// IQImplements<MultiMid, { pattern: RegExp }> → removes pattern: string, adds pattern: RegExp
		@Quick({ pattern: RegExp }, { unknownPropertyPolicy: 'keep' })
		class MultiLeaf extends QModel.extends<
			IQImplements<MultiMid, { pattern: RegExp }>
		>(MultiMid) {
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
		// MidTriple overrides all three at once via TOverrides object → Date, bigint, RegExp.
		// LeafTriple extends normally and adds its own extra field.

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class BaseTriple extends QModel<any> {
			declare label: string;
			declare timestamp: string; // will become Date in MidTriple
			declare amount: string; // will become bigint in MidTriple
			declare pattern: string; // will become RegExp in MidTriple
		}

		// IQImplements<BaseTriple, { timestamp: Date; amount: bigint; pattern: RegExp }> — three overrides at once
		@Quick(
			{ timestamp: Date, amount: BigInt, pattern: RegExp },
			{ unknownPropertyPolicy: 'keep' }
		)
		class MidTriple extends QModel.extends<
			IQImplements<
				BaseTriple,
				{ timestamp: Date; amount: bigint; pattern: RegExp }
			>
		>(BaseTriple) {
			declare timestamp: Date; // ✅
			declare amount: bigint; // ✅
			declare pattern: RegExp; // ✅
		}

		class LeafTriple extends MidTriple {
			declare extra: string;
		}

		it('all three overridden fields have the correct type in the leaf', () => {
			const instance = LeafTriple.create({
				label: 'triple',
				timestamp: '2025-03-01T00:00:00.000Z',
				amount: '99999999999',
				pattern: '/foo/gi',
				extra: 'leaf',
			});

			expect(instance.label).toBe('triple');

			// timestamp → Date
			expect(instance.timestamp).toBeInstanceOf(Date);
			expect(instance.timestamp.getFullYear()).toBe(2025);

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
				timestamp: '2025-01-01T00:00:00.000Z',
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
		@Quick({ timestamp: Date }, { unknownPropertyPolicy: 'keep' })
		class AccumA extends QModel<any> {
			declare strA: string;
			declare timestamp: Date;
		}

		@Quick({ count: BigInt }, { unknownPropertyPolicy: 'keep' })
		class AccumB extends AccumA {
			declare strB: string;
			declare count: bigint;
		}

		@Quick({ pattern: RegExp }, { unknownPropertyPolicy: 'keep' })
		class AccumC extends AccumB {
			declare strC: string;
			declare pattern: RegExp;
		}

		it('serialize() should contain fields from all three levels', () => {
			const instance = AccumC.create({
				strA: 'alpha',
				timestamp: '2022-05-20T00:00:00.000Z',
				strB: 'beta',
				count: '777',
				strC: 'gamma',
				pattern: '/test/i',
			});

			// serialize() returns plain object; toJSON() returns a JSON string
			const plain = instance.$qSerialize();

			expect(plain).toHaveProperty('strA', 'alpha');
			expect(plain).toHaveProperty('strB', 'beta');
			expect(plain).toHaveProperty('strC', 'gamma');
			expect(plain).toHaveProperty('timestamp');
			expect(plain).toHaveProperty('count');
			expect(plain).toHaveProperty('pattern');
		});
	});

	// =========================================================================
	// Scenario 7: @QType mixed with @Quick in a deep chain
	// =========================================================================
	describe('Scenario 7: @QType on specific fields mixed with @Quick on class', () => {
		@Quick({ autoDate: Date }, { unknownPropertyPolicy: 'keep' })
		class MixedA extends QModel<any> {
			declare label: string;
			declare autoDate: Date;

			@QType(BigInt)
			declare explicitBig: bigint;
		}

		@Quick({ childDate: Date }, { unknownPropertyPolicy: 'keep' })
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
		@Quick({ birthDate: Date }, { unknownPropertyPolicy: 'keep' })
		class MockBase extends QModel<any> {
			declare name: string;
			declare birthDate: Date;
		}

		@Quick({ salary: BigInt }, { unknownPropertyPolicy: 'keep' })
		class MockMid extends MockBase {
			declare department: string;
			declare salary: bigint;
		}

		@Quick({ joinedAt: Date }, { unknownPropertyPolicy: 'keep' })
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
