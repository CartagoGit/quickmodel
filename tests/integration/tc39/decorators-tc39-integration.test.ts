/**
 * Integration tests: TC39 / TypeScript 5 decorator syntax.
 *
 * Note: This project uses experimentalDecorators:true (legacy decorator syntax).
 * However, the same decorator syntax (@Quick, @QAlias, etc.) applies in both modes.
 * These tests verify that models with combined decorators behave correctly end-to-end.
 *
 * Covers: integration/H
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QAlias, QDefault, QSensitive, QRule } from '@/decorators';

// ─── H-1: @QAlias + @QDefault + roundtrip ─────────────────────────────────────

interface IApiEvent {
	eventId: string;
	eventType: string;
	occurredAt: string;
	payload: string;
}

@Quick({ occurredAt: Date }, { unknownPropertyPolicy: 'keep' })
class ApiEventModel extends QModel<IApiEvent> {
	@QAlias('event_id')
	@QDefault('evt-000')
	declare eventId: string;

	@QAlias('event_type')
	@QDefault('unknown')
	declare eventType: string;

	declare occurredAt: Date;

	@QDefault('{}')
	declare payload: string;
}

// ─── H-2: @QSensitive — masking behavior ─────────────────────────────────────

interface ISensitiveRecord {
	recordId: string;
	secretToken: string;
	publicInfo: string;
	createdAt: string;
}

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class SensitiveEntityModel extends QModel<ISensitiveRecord> {
	@QDefault('default-id')
	declare recordId: string;

	@QSensitive()
	declare secretToken: string;

	declare publicInfo: string;

	declare createdAt: Date;
}

// ─── H-3: @QRule + $qCheckRules() + rules on decorated model ─────────────────

interface IValidatedItem {
	sku: string;
	quantity: number;
	price: number;
}

@Quick({ quantity: Number, price: Number }, { unknownPropertyPolicy: 'keep' })
class ValidatedItemModel extends QModel<IValidatedItem> {
	@QRule(
		(val: string) => typeof val === 'string' && val.trim().length > 0,
		'SKU is required'
	)
	declare sku: string;

	@QRule(
		(val: number) => Number.isInteger(val) && val > 0,
		'Quantity must be a positive integer'
	)
	declare quantity: number;

	@QRule(
		(val: number) => typeof val === 'number' && val >= 0,
		'Price cannot be negative'
	)
	declare price: number;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: TC39-style decorator combinations (tc39/H)', () => {
	describe('H-1: @QAlias + @QDefault + roundtrip', () => {
		test('builds from snake_case input via @QAlias', () => {
			const event = new ApiEventModel({
				event_id: 'evt-001',
				event_type: 'user.login',
				occurredAt: new Date('2024-01-01T00:00:00Z'),
				payload: '{"userId":"u1"}',
			} as unknown as IApiEvent);

			expect(event.eventId).toBe('evt-001');
			expect(event.eventType).toBe('user.login');
		});

		test('@QDefault applies when field is absent from input', () => {
			const event = new ApiEventModel({
				occurredAt: new Date('2024-01-01T00:00:00Z'),
			} as unknown as IApiEvent);

			expect(event.payload).toBe('{}');
		});

		test('roundtrip via $qSerialize() preserves data', () => {
			const input = {
				event_id: 'evt-002',
				event_type: 'page.view',
				occurredAt: new Date('2024-06-01T12:00:00Z'),
				payload: '{"page":"/home"}',
			};
			const event = new ApiEventModel(input as unknown as IApiEvent);
			const serialized = event.$qSerialize();

			const event2 = new ApiEventModel(
				serialized as unknown as IApiEvent
			);
			expect(event2.eventType).toBe('page.view');
			expect(event2.payload).toBe('{"page":"/home"}');
		});

		test('occurredAt is coerced to Date instance', () => {
			const event = new ApiEventModel({
				occurredAt: '2024-03-15T08:00:00Z',
			} as unknown as IApiEvent);

			expect(event.occurredAt).toBeInstanceOf(Date);
		});
	});

	describe('H-2: @QSensitive masking behavior', () => {
		test('model builds with all fields', () => {
			const entity = new SensitiveEntityModel({
				recordId: 'ent-1',
				createdAt: new Date('2024-01-01T00:00:00Z'),
				secretToken: 'tok-secret-xyz',
				publicInfo: 'Public data',
			} as unknown as ISensitiveRecord);

			expect(entity.recordId).toBe('ent-1');
			expect(entity.publicInfo).toBe('Public data');
		});

		test('@QSensitive field is excluded from $qSerialize() by default', () => {
			const entity = new SensitiveEntityModel({
				recordId: 'ent-2',
				createdAt: new Date('2024-01-01T00:00:00Z'),
				secretToken: 'my-secret-token',
				publicInfo: 'Visible',
			} as unknown as ISensitiveRecord);

			const serialized = entity.$qSerialize();
			expect(serialized['secretToken']).toBeUndefined();
			expect(serialized['publicInfo']).toBe('Visible');
		});

		test('$qSerialize({ includeSensitive: true }) includes all fields', () => {
			const entity = new SensitiveEntityModel({
				recordId: 'ent-3',
				createdAt: new Date('2024-01-01T00:00:00Z'),
				secretToken: 'secret-abc',
				publicInfo: 'Open',
			} as unknown as ISensitiveRecord);

			const serialized = entity.$qSerialize({ includeSensitive: true });
			expect(serialized['secretToken']).toBe('secret-abc');
		});
	});

	describe('H-3: @QRule + $qCheckRules() validation on decorated model', () => {
		test('valid item passes all rules', () => {
			const item = new ValidatedItemModel({
				sku: 'ABC-001',
				quantity: 5,
				price: 19.99,
			});
			const { valid, errors } = item.$qCheckRules();
			expect(valid).toBe(true);
			expect(errors.length).toBe(0);
		});

		test('empty SKU fails rule', () => {
			const item = new ValidatedItemModel({
				sku: '',
				quantity: 5,
				price: 19.99,
			});
			const { valid, errors } = item.$qCheckRules();
			expect(valid).toBe(false);
			const skuError = errors.find((err) => err.field === 'sku');
			expect(skuError).toBeDefined();
			expect(skuError?.message).toContain('SKU');
		});

		test('negative price fails rule', () => {
			const item = new ValidatedItemModel({
				sku: 'ABC-001',
				quantity: 5,
				price: -1,
			});
			const { valid, errors } = item.$qCheckRules();
			expect(valid).toBe(false);
			const priceError = errors.find((err) => err.field === 'price');
			expect(priceError).toBeDefined();
		});

		test('zero quantity fails rule', () => {
			const item = new ValidatedItemModel({
				sku: 'ABC-001',
				quantity: 0,
				price: 10,
			});
			const { valid, errors } = item.$qCheckRules();
			expect(valid).toBe(false);
			const qtyError = errors.find((err) => err.field === 'quantity');
			expect(qtyError).toBeDefined();
		});

		test('multiple simultaneous errors are all reported', () => {
			const item = new ValidatedItemModel({
				sku: '',
				quantity: -1,
				price: -5,
			});
			const { valid, errors } = item.$qCheckRules();
			expect(valid).toBe(false);
			expect(errors.length).toBeGreaterThanOrEqual(2);
		});
	});
});
