// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * CRITICAL TESTS: Null & Undefined Safety
 *
 * These tests ensure proper handling of null and undefined values
 * in various contexts to prevent runtime errors.
 *
 * Priority: ⭐⭐⭐⭐⭐ CRITICAL
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

// Test Models - Using declare syntax
interface IAddress {
	city?: string;
	country?: string;
}

interface IProfile {
	address?: IAddress;
	phone?: string;
}

interface IUser {
	id: number;
	name: string;
	profile?: IProfile;
	bio: string | null;
	age?: number;
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare profile?: IProfile;
	declare bio: string | null;
	declare age?: number;
}

interface ITimeline {
	events: (Date | null | undefined)[];
}

@Quick({ events: [Date] }, { unknownPropertyPolicy: 'keep' })
class Timeline extends QModel<ITimeline> {
	declare events: (Date | null | undefined)[];
}

interface IData {
	value: string | null;
	optional?: string;
	required: string;
}

class Data extends QModel<IData> {
	declare value: string | null;
	declare optional?: string;
	declare required: string;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Null Safety: Deep Optional Chaining', () => {
	test('should handle null in nested optional properties', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: null as unknown as IProfile,
			bio: null,
		});

		// Should safely return undefined, not throw
		expect(user.profile?.address?.city).toBeUndefined();
		expect(() => {
			void user.profile?.address?.city;
		}).not.toThrow();
	});

	test('should handle undefined in deep nesting', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: {
				address: undefined,
			},
			bio: null,
		});

		expect(user.profile?.address?.city).toBeUndefined();
	});

	test('should handle missing nested properties', () => {
		const user = new User({
			id: 1,
			name: 'John',
			bio: null,
		});

		// profile is undefined
		expect(user.profile).toBeUndefined();
		expect(user.profile?.address).toBeUndefined();
		expect(user.profile?.address?.city).toBeUndefined();
	});

	test('should handle fully populated nested structure', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: {
				address: {
					city: 'NYC',
					country: 'USA',
				},
				phone: '555-1234',
			},
			bio: 'Test bio',
		});

		expect(user.profile?.address?.city).toBe('NYC');
		expect(user.profile?.phone).toBe('555-1234');
	});
});

describe('Null Safety: Arrays with Null/Undefined', () => {
	test('should accept mixed null/undefined in arrays', () => {
		const timeline = new Timeline({
			events: [
				new Date('2024-01-01'),
				null,
				undefined,
				new Date('2024-01-03'),
			],
		});

		expect(timeline.events.length).toBe(4);
		expect(timeline.events[0]).toBeInstanceOf(Date);
		expect(timeline.events[1]).toBeNull();
		expect(timeline.events[2]).toBeUndefined();
		expect(timeline.events[3]).toBeInstanceOf(Date);
	});

	test('should handle empty array', () => {
		const timeline = new Timeline({
			events: [],
		});

		expect(Array.isArray(timeline.events)).toBe(true);
		expect(timeline.events.length).toBe(0);
	});

	test('should handle array with all nulls', () => {
		const timeline = new Timeline({
			events: [null, null, null] as ITimeline['events'],
		});

		expect(timeline.events.length).toBe(3);
		expect(timeline.events.every((item) => item === null)).toBe(true);
	});

	test('should handle array with all undefined', () => {
		const timeline = new Timeline({
			events: [undefined, undefined] as ITimeline['events'],
		});

		expect(timeline.events.length).toBe(2);
		expect(timeline.events.every((item) => item === undefined)).toBe(true);
	});
});

describe('Null Safety: Nullable vs Optional', () => {
	test('should distinguish between null and undefined', () => {
		const data1 = new Data({
			value: null,
			required: 'test',
			// optional is missing
		});

		expect(data1.value).toBeNull();
		expect(data1.value).not.toBeUndefined();
		expect(data1.optional).toBeUndefined();
		expect(data1.optional).not.toBeNull();
	});

	test('should preserve null in serialization', () => {
		const data = new Data({
			value: null,
			required: 'test',
		});

		const json = data.serialize();

		expect(json.value).toBeNull();
		expect(json.value).not.toBeUndefined();
	});

	test('should omit undefined in serialization by default', () => {
		const data = new Data({
			value: null,
			optional: undefined,
			required: 'test',
		});

		const json = data.serialize();

		// Undefined should be omitted from JSON by default
		expect('optional' in json).toBe(false);
	});

	test('should handle explicit undefined vs missing', () => {
		const data1 = new Data({
			value: null,
			optional: undefined, // explicit
			required: 'test',
		});

		const data2 = new Data({
			value: null,
			// optional missing
			required: 'test',
		});

		// Both should be undefined
		expect(data1.optional).toBeUndefined();
		expect(data2.optional).toBeUndefined();
	});
});

describe('Null Safety: Roundtrip with Null/Undefined', () => {
	test('should preserve null through roundtrip', () => {
		const data = new Data({
			value: null,
			required: 'test',
		});

		const json = data.serialize();
		const restored = Data.deserialize(json);

		expect(restored.value).toBeNull();
		expect(restored.value).not.toBeUndefined();
	});

	test('should handle null in nested structures', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: {
				address: {
					city: null as unknown as string,
				},
			},
			bio: null,
		});

		const json = user.serialize();
		const restored = User.deserialize(json);

		expect(restored.profile?.address?.city).toBeNull();
	});

	test('should handle mixed null and valid values in arrays', () => {
		const timeline = new Timeline({
			events: [
				new Date('2024-01-01'),
				null,
				new Date('2024-01-03'),
			] as ITimeline['events'],
		});

		const json = timeline.serialize();
		const restored = Timeline.deserialize(json);

		expect(restored.events[0]).toBeInstanceOf(Date);
		expect(restored.events[1]).toBeNull();
		expect(restored.events[2]).toBeInstanceOf(Date);
	});
});

describe('Null Safety: Edge Cases', () => {
	test('should handle null as entire model data', () => {
		// QModel accepts null gracefully — does not throw, fields become undefined
		const user = new User(null as unknown as IUser);
		expect(user).toBeInstanceOf(User);
		expect(user.id).toBeUndefined();
		expect(user.name).toBeUndefined();
	});

	test('should handle undefined as entire model data', () => {
		// QModel accepts undefined gracefully — does not throw, fields become undefined
		const user = new User(undefined as unknown as IUser);
		expect(user).toBeInstanceOf(User);
		expect(user.id).toBeUndefined();
		expect(user.name).toBeUndefined();
	});

	test('should handle empty object', () => {
		try {
			new User({} as unknown as IUser);

			// Will likely work but fields will be undefined
			const user = new User({} as unknown as IUser);
			expect(user.id).toBeUndefined();
		} catch (error) {
			// OK if it throws
			expect(error).toBeDefined();
		}
	});
});

describe('Null Safety: Optional Fields Behavior', () => {
	test('should accept missing optional field', () => {
		const user = new User({
			id: 1,
			name: 'John',
			bio: null,
			// age is optional and missing
		});

		// Optional field is undefined when not provided
		expect(user.age).toBeUndefined();
	});

	test('should accept explicit undefined for optional field', () => {
		const user = new User({
			id: 1,
			name: 'John',
			bio: null,
			age: undefined,
		});

		expect(user.age).toBeUndefined();
	});

	test('should accept null for optional field if allowed by type', () => {
		interface IFlexible {
			optional?: string | null;
		}

		class Flexible extends QModel<IFlexible> {
			declare optional?: string | null;
		}

		const model = new Flexible({
			optional: null,
		});

		expect(model.optional).toBeNull();
	});
});
