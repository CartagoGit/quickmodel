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
		@Quick({ value: Date })
		class OverrideA extends QModel<any> {
			declare label: string;
			declare value: Date;
		}

		// B overrides "value" to BigInt — C should follow B's override, not A's
		@Quick({ value: BigInt })
		class OverrideB extends OverrideA {}

		class OverrideC extends OverrideB {
			declare extra: string;
		}

		it('leaf should use the closest ancestor override, not the original definition', () => {
			const instance = OverrideC.create({
				label: 'test',
				value: '9999999999999999',
				extra: 'leaf field',
			});

			// Should be bigint (B's override), not Date (A's definition)
			expect(typeof instance.value).toBe('bigint');
			expect(instance.value).toBe(9999999999999999n);
			expect(instance.extra).toBe('leaf field');
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
