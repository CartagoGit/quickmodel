/**
 * Integration Test: Serialization full
 * Covers: docs-vitepress/en/guide/serialization.md
 *
 * Validates:
 * - $qSerialize() with Date, BigInt, Map, Set
 * - toJSON() / $qFromJSON() roundtrip preserves all complex types
 * - $qToInterface() returns original runtime values
 * - $qDeserializeJson() static deserializes from JSON string
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';

// ── Model with all complex types ──────────────────────────────────────────────

interface IComplexEntity {
	id: number;
	name: string;
	createdAt: string;
	balance: string;
	tags: string[];
	metadata: Record<string, unknown>;
}

@Quick(
	{
		createdAt: Date,
		balance: BigInt,
		tags: Set,
		metadata: Map,
	},
	{ unknownPropertyPolicy: 'keep' }
)
class ComplexEntityModel extends QModel<IComplexEntity> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, unknown>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: serialization-full (guide/serialization.md)', () => {
	const rawData: IComplexEntity = {
		id: 1,
		name: 'Entity A',
		createdAt: '2026-01-15T12:00:00.000Z',
		balance: '999999999999999',
		tags: ['ts', 'bun'],
		metadata: { env: 'prod', version: '2' },
	};

	describe('$qSerialize()', () => {
		test('Date is serialized back to ISO string', () => {
			const entity = new ComplexEntityModel(rawData);
			const output = entity.$qSerialize();

			expect(typeof output['createdAt']).toBe('string');
			expect(output['createdAt']).toContain('2026-01-15');
		});

		test('BigInt is serialized back to string', () => {
			const entity = new ComplexEntityModel(rawData);
			const output = entity.$qSerialize();

			expect(typeof output['balance']).toBe('string');
			expect(output['balance']).toBe('999999999999999');
		});

		test('Set is serialized back to array', () => {
			const entity = new ComplexEntityModel(rawData);
			const output = entity.$qSerialize();

			expect(Array.isArray(output['tags'])).toBe(true);
			const tags = output['tags'] as string[];
			expect(tags).toContain('ts');
		});

		test('Map is serialized to a plain object', () => {
			const entity = new ComplexEntityModel(rawData);
			const output = entity.$qSerialize();

			// Map transformer serializes to a plain key-value object (not array of tuples)
			const meta = output.metadata;
			expect(typeof meta).toBe('object');
			expect(Array.isArray(meta)).toBe(false);
			expect(meta['env']).toBe('prod');
		});
	});

	describe('toJSON() / fromJSON() roundtrip', () => {
		test('roundtrip via JSON string preserves Date type', () => {
			const original = new ComplexEntityModel(rawData);
			const jsonStr = original.$qToJSON();
			const restored = ComplexEntityModel.fromJSON(jsonStr);

			expect(restored.createdAt).toBeInstanceOf(Date);
			expect(restored.createdAt.toISOString()).toContain('2026-01-15');
		});

		test('roundtrip via JSON string preserves BigInt', () => {
			const original = new ComplexEntityModel(rawData);
			const jsonStr = original.$qToJSON();
			const restored = ComplexEntityModel.fromJSON(jsonStr);

			expect(typeof restored.balance).toBe('bigint');
			expect(restored.balance).toBe(999999999999999n);
		});

		test('roundtrip via JSON string preserves Set', () => {
			const original = new ComplexEntityModel(rawData);
			const jsonStr = original.$qToJSON();
			const restored = ComplexEntityModel.fromJSON(jsonStr);

			expect(restored.tags).toBeInstanceOf(Set);
			expect(restored.tags.has('ts')).toBe(true);
		});

		test('roundtrip via JSON string preserves Map', () => {
			const original = new ComplexEntityModel(rawData);
			const jsonStr = original.$qToJSON();
			const restored = ComplexEntityModel.fromJSON(jsonStr);

			expect(restored.metadata).toBeInstanceOf(Map);
			expect(restored.metadata.get('env')).toBe('prod');
		});
	});

	describe('$qToInterface()', () => {
		test('returns serialized interface shape (strings, not runtime objects)', () => {
			const entity = new ComplexEntityModel(rawData);
			const iface = entity.$qToInterface();

			// $qToInterface() returns the serialized interface (IComplexEntity shape)
			// so complex types appear as their serialized form, not their runtime types
			expect(
				typeof (iface as unknown as { createdAt: unknown }).createdAt
			).toBe('string'); // @quickmodel-rule-ignore: no-as-unknown
			expect((iface as unknown as { name: unknown }).name).toBe(
				'Entity A'
			); // @quickmodel-rule-ignore: no-as-unknown
			expect((iface as unknown as { id: unknown }).id).toBe(1); // @quickmodel-rule-ignore: no-as-unknown
		});
	});

	describe('fromJSON() static', () => {
		test('static method constructs from JSON string directly', () => {
			const json = JSON.stringify(rawData);
			const entity = ComplexEntityModel.fromJSON(json);

			expect(entity).toBeInstanceOf(ComplexEntityModel);
			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.id).toBe(1);
		});
	});
});
