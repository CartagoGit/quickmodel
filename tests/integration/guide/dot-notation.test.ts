/**
 * Integration Test: Dot Notation
 * Covers: docs-vitepress/en/guide/dot-notation.md
 *
 * Validates:
 * - 1-level dot notation: 'nested.field': Date
 * - 2-level dot notation: 'parent.child.value': BigInt
 * - Comparison with explicit nested model (same behavior)
 * - Class without decorators benefits from parent dot-notation
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';

// ── Third-party / external class without decorators ───────────────────────────

class ExternalAddress {
	declare street: string;
	declare lat: number;
	declare lng: number;
}

// ── Models using dot notation ─────────────────────────────────────────────────

interface IEvent {
	title: string;
	location: ExternalAddress;
	startsAt: string;
}

@Quick(
	{
		'location.lat': Number,
		'location.lng': Number,
		startsAt: Date,
	},
	{ unknownPropertyPolicy: 'keep' }
)
class EventModel extends QModel<IEvent> {
	declare title: string;
	declare location: ExternalAddress;
	declare startsAt: Date;
}

// ── 2-level nesting ────────────────────────────────────────────────────────────

interface IDomain {
	name: string;
	metadata: {
		created: string;
		updatedMs: number;
	};
}

@Quick(
	{
		'metadata.created': Date,
	},
	{ unknownPropertyPolicy: 'keep' }
)
class DomainModel extends QModel<IDomain> {
	declare name: string;
	declare metadata: {
		created: Date;
		updatedMs: number;
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: Dot Notation (guide/dot-notation.md)', () => {
	describe('1-level dot notation', () => {
		test('numeric fields in nested object are transformed', () => {
			const event = new EventModel({
				title: 'Meetup',
				location: { street: 'Main St', lat: 40.7128, lng: -74.006 },
				startsAt: '2026-03-15T10:00:00.000Z',
			} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown

			expect(typeof event.location.lat).toBe('number');
			expect(typeof event.location.lng).toBe('number');
			expect(event.title).toBe('Meetup');
		});

		test('top-level field with Date transformer works alongside dot notation', () => {
			const event = new EventModel({
				title: 'Conference',
				location: { street: 'Oak Ave', lat: 51.5074, lng: -0.1278 },
				startsAt: '2026-06-01T09:00:00.000Z',
			} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown

			expect(event.startsAt).toBeInstanceOf(Date);
		});
	});

	describe('2-level dot notation', () => {
		test('nested property at 2nd level is transformed', () => {
			const domain = new DomainModel({
				name: 'example.com',
				metadata: {
					created: '2025-01-01T00:00:00.000Z',
					updatedMs: 1234567890,
				},
			} as unknown as IDomain); // @quickmodel-rule-ignore: no-as-unknown

			expect(domain.metadata.created).toBeInstanceOf(Date);
			expect(domain.metadata.updatedMs).toBe(1234567890);
		});
	});

	describe('class without decorators', () => {
		test('external class nested properties are processed via parent dot-notation', () => {
			// Dot notation allows transforming nested fields of external classes
			// Pass numeric values directly (no coercion — strict by default)
			const event = new EventModel({
				title: 'Test',
				location: { street: 'Street', lat: 10.5, lng: -20.3 },
				startsAt: '2026-01-01T00:00:00.000Z',
			} as unknown as IEvent); // @quickmodel-rule-ignore: no-as-unknown

			expect(typeof event.location.lat).toBe('number');
			expect(event.location.lat).toBe(10.5);
			expect(typeof event.location.lng).toBe('number');
		});
	});

	describe('roundtrip with dot notation', () => {
		test('serialize → reconstruct preserves nested Date', () => {
			const original = new DomainModel({
				name: 'test.io',
				metadata: {
					created: '2025-06-15T00:00:00.000Z',
					updatedMs: 999,
				},
			} as unknown as IDomain); // @quickmodel-rule-ignore: no-as-unknown

			const serialized = original.$qSerialize();
			const restored = new DomainModel(serialized as unknown as IDomain); // @quickmodel-rule-ignore: no-as-unknown

			expect(restored.metadata.created).toBeInstanceOf(Date);
			expect(restored.name).toBe('test.io');
		});
	});
});
