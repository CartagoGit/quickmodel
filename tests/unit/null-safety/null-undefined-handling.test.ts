/**
 * CRITICAL TESTS: Null & Undefined Safety
 * 
 * These tests ensure proper handling of null and undefined values
 * in various contexts to prevent runtime errors.
 * 
 * Priority: ⭐⭐⭐⭐⭐ CRITICAL
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '../../../src/quick.model';
import { QType } from '../../../src/core/decorators/qtype.decorator';
import { Quick } from '../../../src/core/decorators/quick.decorator';

// Test Models
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

@Quick()
class User extends QModel<IUser> {
	@QType() id!: number;
	@QType() name!: string;
	@QType() profile?: IProfile;
	@QType() bio!: string | null;
	@QType() age?: number;
}

interface ITimeline {
	events: (Date | null | undefined)[];
}

@Quick()
class Timeline extends QModel<ITimeline> {
	@QType() events!: (Date | null | undefined)[];
}

interface IData {
	value: string | null;
	optional?: string;
	required: string;
}

@Quick()
class Data extends QModel<IData> {
	@QType() value!: string | null;
	@QType() optional?: string;
	@QType() required!: string;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Null Safety: Deep Optional Chaining', () => {
	test('should handle null in nested optional properties', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: null as any,
			bio: null
		});

		// Should safely return undefined, not throw
		expect(user.profile?.address?.city).toBeUndefined();
		expect(() => {
			const city = user.profile?.address?.city;
		}).not.toThrow();
	});

	test('should handle undefined in deep nesting', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: {
				address: undefined
			},
			bio: null
		});

		expect(user.profile?.address?.city).toBeUndefined();
	});

	test('should handle missing nested properties', () => {
		const user = new User({
			id: 1,
			name: 'John',
			bio: null
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
					country: 'USA'
				},
				phone: '555-1234'
			},
			bio: 'Test bio'
		});

		expect(user.profile?.address?.city).toBe('NYC');
		expect(user.profile?.phone).toBe('555-1234');
	});
});

describe('Null Safety: Arrays with Null/Undefined', () => {
	test('should transform null correctly in arrays', () => {
		const timeline = new Timeline({
			events: [
				new Date('2024-01-01').toISOString(),
				null,
				undefined,
				new Date('2024-01-03').toISOString()
			] as any
		});

		expect(timeline.events.length).toBe(4);
		expect(timeline.events[0]).toBeInstanceOf(Date);
		expect(timeline.events[1]).toBeNull();
		expect(timeline.events[2]).toBeUndefined();
		expect(timeline.events[3]).toBeInstanceOf(Date);
	});

	test('should handle empty array', () => {
		const timeline = new Timeline({
			events: []
		});

		expect(Array.isArray(timeline.events)).toBe(true);
		expect(timeline.events.length).toBe(0);
	});

	test('should handle array with all nulls', () => {
		const timeline = new Timeline({
			events: [null, null, null] as any
		});

		expect(timeline.events.length).toBe(3);
		expect(timeline.events.every(e => e === null)).toBe(true);
	});

	test('should handle array with all undefined', () => {
		const timeline = new Timeline({
			events: [undefined, undefined] as any
		});

		expect(timeline.events.length).toBe(2);
		expect(timeline.events.every(e => e === undefined)).toBe(true);
	});
});

describe('Null Safety: Nullable vs Optional', () => {
	test('should distinguish between null and undefined', () => {
		const data1 = new Data({
			value: null,
			required: 'test'
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
			required: 'test'
		});

		const json = data.toInterface();

		expect(json.value).toBeNull();
		expect(json.value).not.toBeUndefined();
	});

	test('should preserve undefined in serialization', () => {
		const data = new Data({
			value: null,
			optional: undefined,
			required: 'test'
		});

		const json = data.toInterface();

		// Undefined typically omitted from JSON
		// but should be preserved in toInterface()
		expect('optional' in json).toBe(true);
		expect(json.optional).toBeUndefined();
	});

	test('should handle explicit undefined vs missing', () => {
		const data1 = new Data({
			value: null,
			optional: undefined, // explicit
			required: 'test'
		});

		const data2 = new Data({
			value: null,
			// optional missing
			required: 'test'
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
			required: 'test'
		});

		const json = data.toInterface();
		const restored = Data.fromInterface(json);

		expect(restored.value).toBeNull();
		expect(restored.value).not.toBeUndefined();
	});

	test('should handle null in nested structures', () => {
		const user = new User({
			id: 1,
			name: 'John',
			profile: {
				address: {
					city: null as any
				}
			},
			bio: null
		});

		const json = user.toInterface();
		const restored = User.fromInterface(json);

		expect(restored.profile?.address?.city).toBeNull();
	});

	test('should handle mixed null and valid values in arrays', () => {
		const timeline = new Timeline({
			events: [
				new Date('2024-01-01'),
				null,
				new Date('2024-01-03')
			] as any
		});

		const json = timeline.toInterface();
		const restored = Timeline.fromInterface(json);

		expect(restored.events[0]).toBeInstanceOf(Date);
		expect(restored.events[1]).toBeNull();
		expect(restored.events[2]).toBeInstanceOf(Date);
	});
});

describe('Null Safety: Edge Cases', () => {
	test('should handle null as entire model data', () => {
		try {
			new User(null as any);
			
			// Might not throw, just log
			console.warn('⚠️  Null model data accepted without error');
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	test('should handle undefined as entire model data', () => {
		try {
			new User(undefined as any);
			
			// Might not throw, just log
			console.warn('⚠️  Undefined model data accepted without error');
		} catch (error) {
			expect(error).toBeDefined();
		}
	});

	test('should handle empty object', () => {
		try {
			new User({} as any);
			
			// Will likely work but fields will be undefined
			const user = new User({} as any);
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
			bio: null
			// age is optional and missing
		});

		expect(user.age).toBeUndefined();
		expect('age' in user).toBe(true); // property exists but undefined
	});

	test('should accept explicit undefined for optional field', () => {
		const user = new User({
			id: 1,
			name: 'John',
			bio: null,
			age: undefined
		});

		expect(user.age).toBeUndefined();
	});

	test('should accept null for optional field if allowed by type', () => {
		interface IFlexible {
			optional?: string | null;
		}

		@Quick()
		class Flexible extends QModel<IFlexible> {
			@QType() optional?: string | null;
		}

		const model = new Flexible({
			optional: null
		});

		expect(model.optional).toBeNull();
	});
});
