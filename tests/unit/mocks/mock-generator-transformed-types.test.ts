/**
 * Unit Test: Mock Generator - Transformed Types
 * 
 * Tests mock generation for transformed types (Date, BigInt, RegExp, etc.)
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';
import { QType } from '@/core/decorators/qtype.decorator';

describe('Unit: Mock Generator - Transformed Types', () => {
	interface IEvent {
		id: string;
		title: string;
		createdAt: string;
		updatedAt: string | null;
		attendees: string; // BigInt
		pattern: string; // RegExp
	}

	interface IEventTransform {
		createdAt: Date;
		updatedAt: Date | null;
		attendees: bigint;
		pattern: RegExp;
	}

	@Quick({
		createdAt: Date,
		updatedAt: Date,
		attendees: BigInt,
		pattern: RegExp,
	})
	class Event extends QModel<IEvent> implements QInterface<IEvent, IEventTransform> {
		@QType() id!: string;
		@QType() title!: string;
		@QType(Date) createdAt!: Date;
		@QType(Date) updatedAt!: Date | null;
		@QType(BigInt) attendees!: bigint;
		@QType(RegExp) pattern!: RegExp;
	}

	test('should generate mocks with Date types', () => {
		const mock = Event.mock().random();

		expect(mock).toBeInstanceOf(Event);
		expect(mock.createdAt).toBeInstanceOf(Date);
		expect(mock.updatedAt === null || mock.updatedAt instanceof Date).toBe(true);
	});

	test('should generate mocks with BigInt types', () => {
		const mock = Event.mock().random();

		expect(typeof mock.attendees).toBe('bigint');
		expect(mock.attendees >= 0n).toBe(true);
	});

	test('should generate mocks with RegExp types', () => {
		const mock = Event.mock().random();

		expect(mock.pattern).toBeInstanceOf(RegExp);
		expect(typeof mock.pattern.source).toBe('string');
	});

	test('should allow overriding transformed types', () => {
		const customDate = new Date('2024-01-01');
		const mock = Event.mock().random({
			createdAt: customDate.toISOString(),
			attendees: '1000',
		});

		expect(mock.createdAt.getTime()).toBe(customDate.getTime());
		expect(mock.attendees).toBe(1000n);
	});

	test('should generate empty mocks with default transformed types', () => {
		const mock = Event.mock().empty();

		expect(mock.createdAt).toBeInstanceOf(Date);
		expect(mock.attendees).toBe(0n);
		expect(mock.pattern).toBeInstanceOf(RegExp);
	});

	test('should generate array of mocks with transformed types', () => {
		const mocks = Event.mock().array(3);

		expect(mocks).toHaveLength(3);
		mocks.forEach(mock => {
			expect(mock.createdAt).toBeInstanceOf(Date);
			expect(typeof mock.attendees).toBe('bigint');
			expect(mock.pattern).toBeInstanceOf(RegExp);
		});
	});
});
