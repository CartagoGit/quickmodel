/**
 * Integration tests for @QAlias + type transformer + full roundtrip.
 * Covers: cross-feature/B-5
 *
 * Tests that @QAlias works correctly when combined with type transformers,
 * including full serialize → reconstruct roundtrip.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QAlias, QSensitive } from '@/decorators';

// ─── Model from B-5 ──────────────────────────────────────────────────────────

interface IApiRecord {
	userId: string;
	createdAt: string;
	apiKey: string;
}

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class ApiRecordModel extends QModel<IApiRecord> {
	declare userId: string;

	@QAlias('created_at')
	declare createdAt: Date;

	@QAlias('api_key')
	@QSensitive()
	declare apiKey: string;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: @QAlias + type transformer + roundtrip (cross-feature/B-5)', () => {
	const snakeCaseInput = {
		userId: '1',
		created_at: '2026-01-01T00:00:00.000Z',
		api_key: 'sk-secret',
	};

	describe('@QAlias("created_at") + @Quick({ createdAt: Date })', () => {
		test('input with snake_case alias resolves to Date', () => {
			const record = new ApiRecordModel(snakeCaseInput);
			expect(record.createdAt).toBeInstanceOf(Date);
		});

		test('resolved Date has the correct year', () => {
			const record = new ApiRecordModel(snakeCaseInput);
			expect(record.createdAt.getFullYear()).toBe(2026);
		});
	});

	describe('$qSerialize() — alias + type serialization', () => {
		test('serializes createdAt as ISO string using alias key created_at', () => {
			const record = new ApiRecordModel(snakeCaseInput);
			const plain = record.$qSerialize({ includeSensitive: true });
			expect(plain['created_at']).toBe('2026-01-01T00:00:00.000Z');
		});

		test('serializes apiKey under alias api_key when includeSensitive: true', () => {
			const record = new ApiRecordModel(snakeCaseInput);
			const plain = record.$qSerialize({ includeSensitive: true });
			expect(plain['api_key']).toBe('sk-secret');
		});

		test('apiKey is excluded from default serialize (sensitive)', () => {
			const record = new ApiRecordModel(snakeCaseInput);
			const plain = record.$qSerialize();
			expect(plain['apiKey']).toBeUndefined();
			expect(plain['api_key']).toBeUndefined();
		});
	});

	describe('roundtrip: new Model → $qSerialize → new Model', () => {
		test('roundtrip preserves the Date value', () => {
			const original = new ApiRecordModel(snakeCaseInput);
			const serialized = original.$qSerialize({ includeSensitive: true });
			const reconstructed = new ApiRecordModel(serialized);
			expect(reconstructed.createdAt).toBeInstanceOf(Date);
			expect(reconstructed.createdAt.getTime()).toBe(
				original.createdAt.getTime()
			);
		});

		test('roundtrip preserves userId', () => {
			const original = new ApiRecordModel(snakeCaseInput);
			const serialized = original.$qSerialize({ includeSensitive: true });
			const reconstructed = new ApiRecordModel(serialized);
			expect(reconstructed.userId).toBe(original.userId);
		});
	});

	describe('fromJSON() roundtrip', () => {
		test('toJSON() + fromJSON() produces a valid model', () => {
			const record = new ApiRecordModel(snakeCaseInput);
			const jsonString = JSON.stringify(record.toJSON());
			const from = ApiRecordModel.fromJSON(jsonString);
			expect(from.createdAt).toBeInstanceOf(Date);
			expect(from.createdAt.getTime()).toBe(record.createdAt.getTime());
		});
	});
});
