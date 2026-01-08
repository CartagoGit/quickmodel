/**
 * Unit Test: Date Transformer
 * 
 * Tests Date serialization and deserialization transformations
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../../src';

describe('Unit: Date Transformer', () => {
	interface IEvent {
		id: string;
		createdAt: string; // Serialized as ISO string
		updatedAt: string | null;
	}

	@Quick({
		createdAt: Date,
		updatedAt: Date,
	})
	class Event extends QModel<IEvent> {
		id!: string;
		createdAt!: Date;
		updatedAt!: Date | null;
	}

	test('should serialize Date to ISO string', () => {
		const date = new Date('2024-01-01T00:00:00.000Z');
		const event = new Event({
			id: '1',
			createdAt: date.toISOString(),
			updatedAt: null,
		});

		const serialized = event.toInterface();

		expect(serialized.createdAt).toBe('2024-01-01T00:00:00.000Z');
		expect(typeof serialized.createdAt).toBe('string');
	});

	test('should deserialize ISO string to Date', () => {
		const event = new Event({
			id: '1',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: null,
		});

		expect(event.createdAt).toBeInstanceOf(Date);
		expect(event.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
	});

	test('should deserialize Date object as-is', () => {
		const date = new Date('2024-01-01T00:00:00.000Z');
		const event = new Event({
			id: '1',
			createdAt: date as any,
			updatedAt: null,
		});

		expect(event.createdAt).toBeInstanceOf(Date);
		expect(event.createdAt.getTime()).toBe(date.getTime());
	});

	test('should handle null dates', () => {
		const event = new Event({
			id: '1',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: null,
		});

		expect(event.updatedAt).toBeNull();
	});

	test('should roundtrip dates correctly', () => {
		const event1 = new Event({
			id: '1',
			createdAt: '2024-01-01T12:30:45.123Z',
			updatedAt: null,
		});

		const json = event1.toJSON();
		const event2 = Event.fromJSON(json);

		expect(event2.createdAt.getTime()).toBe(event1.createdAt.getTime());
		expect(event2.createdAt.toISOString()).toBe('2024-01-01T12:30:45.123Z');
	});

	test('should preserve milliseconds', () => {
		const event = new Event({
			id: '1',
			createdAt: '2024-01-01T00:00:00.999Z',
			updatedAt: null,
		});

		expect(event.createdAt.getMilliseconds()).toBe(999);
		expect(event.toInterface().createdAt).toContain('.999Z');
	});

	test('should handle timezone information', () => {
		const event = new Event({
			id: '1',
			createdAt: '2024-06-15T14:30:00.000Z',
			updatedAt: null,
		});

		// Date is always in UTC internally
		expect(event.createdAt.getUTCHours()).toBe(14);
		expect(event.toInterface().createdAt).toContain('14:30:00');
	});

	test('should handle various date formats', () => {
		const formats = [
			'2024-01-01T00:00:00.000Z',
			'2024-12-31T23:59:59.999Z',
			'2000-06-15T12:30:45.123Z',
		];

		formats.forEach((dateStr) => {
			const event = new Event({
				id: '1',
				createdAt: dateStr,
				updatedAt: null,
			});

			expect(event.createdAt).toBeInstanceOf(Date);
			expect(event.createdAt.toISOString()).toBe(dateStr);
		});
	});
});
