import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Robustness: Partial Updates (PATCH)', () => {
	interface IUser {
		id: number;
		name: string;
		email: string;
		age?: number;
	}

	@Quick({
		id: Number,
		name: String,
		email: String,
		age: Number,
	})
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare email: string;
		declare age?: number;
	}

	test('should update only provided fields', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@example.com',
			age: 30,
		});

		user.patch({ name: 'Jane' });

		expect(user.name).toBe('Jane');
		expect(user.email).toBe('john@example.com');
		expect(user.id).toBe(1);
		expect(user.age).toBe(30);
	});

	test('should handle undefined vs missing fields in patch', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@example.com',
			age: 30,
		});

		// Current patch implementation uses { ...current, ...patch }
		// So explicit undefined SHOULD overwrite with undefined (if allowed)
		user.patch({ age: undefined });

		expect(user.age).toBeUndefined();
		expect(user.name).toBe('John');
	});

	test('should validate the resulting merged state', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@example.com',
		});

		// Try to patch with invalid type
		expect(() => {
			user.patch({ age: 'invalid' as any });
		}).toThrow(/expected/i); // Expect validation error
	});

	test('should support patching nested properties?', () => {
		// Implementation relies on full deserialization, so nested models should work?
		// Let's test deep merge behavior vs replacement.

		interface IAddress {
			city: string;
			zip: string;
		}

		interface IProfile {
			address: IAddress;
		}

		@Quick()
		class Address extends QModel<IAddress> {
			declare city: string;
			declare zip: string;
		}

		@Quick({ address: Address })
		class Profile extends QModel<IProfile> {
			declare address: Address;
		}

		const profile = new Profile({
			address: { city: 'NYC', zip: '10001' },
		});

		// If I patch { address: { city: 'LA' } }, does it merge or replace?
		// Logic: { ...currentSerialized, ...patch }
		// currentSerialized.address is an Object (from toJSON/serialize)
		// patch.address is { city: 'LA' }
		// The spread { ...current } is SHALLOW merge on the root.
		// So current.address (object) will be REPLACED by patch.address (object).
		// Wait, serialize() returns serialized data.

		profile.patch({
			address: { city: 'LA' } as any, // Missing zip!
		});

		// Because it REPLACES 'address' object with { city: 'LA' }, 'zip' is lost!
		// This is a common pitfall of shallow patch.
		// Robustness check: Is this desired?

		expect(profile.address.city).toBe('LA');

		// If it was shallow replacement, zip is gone (undefined).
		// If recursive merge, zip remains.
		// Let's check current behavior.
		expect(profile.address.zip).toBeUndefined();
	});

	test('should NOT expose partial update pitfall if recursive merge is not implemented', () => {
		// Documenting behavior: QModel patch is Shallow on top level properties.
		// Deep properties are replaced.
	});
});
