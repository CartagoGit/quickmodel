import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Model Serialization (toJSON)', () => {
	interface IUser {
		id: number;
		name: string;
		birthDate: string; // ISO date
		balance: string; // BigInt as string
		tags: string[]; // Set as array
		metadata: Record<string, any>; // Map as object
	}

	@Quick(
		{
			birthDate: Date,
			balance: BigInt,
			tags: Set,
			metadata: Map,
		},
		{ unknownPropertyPolicy: 'keep' }
	)
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare birthDate: Date;
		declare balance: bigint;
		declare tags: Set<string>;
		declare metadata: Map<string, any>;
	}

	test('should serialize simple primitives correctly', () => {
		const user = new User({
			id: 1,
			name: 'John',
			birthDate: '2024-01-01T00:00:00.000Z',
			balance: '100',
			tags: [],
			metadata: {},
		});

		const json = JSON.parse(user.toJSON());
		expect(json.id).toBe(1);
		expect(json.name).toBe('John');
	});

	test('should serialize transformed types correctly', () => {
		const user = new User({
			id: 1,
			name: 'John',
			birthDate: '2024-01-01T00:00:00.000Z',
			balance: '9007199254740992', // MAX_SAFE_INTEGER + 1
			tags: ['a', 'b'],
			metadata: { key: 'value' },
		});

		const json = JSON.parse(user.toJSON());

		// Date -> ISO String
		expect(json.birthDate).toBe('2024-01-01T00:00:00.000Z');

		// BigInt -> String
		expect(json.balance).toBe('9007199254740992');

		// Set -> Array
		expect(json.tags).toEqual(['a', 'b']);

		// Map -> Object
		expect(json.metadata).toEqual({ key: 'value' });
	});

	test('should handle nested models recursively', () => {
		interface IAddress {
			city: string;
			location: {
				lat: number;
				lon: number;
			};
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Address extends QModel<IAddress> {
			declare city: string;
			declare location: { lat: number; lon: number };
		}

		interface IProfile {
			address: IAddress;
		}

		@Quick({ address: Address }, { unknownPropertyPolicy: 'keep' })
		class Profile extends QModel<IProfile> {
			declare address: Address;
		}

		const profile = new Profile({
			address: {
				city: 'New York',
				location: { lat: 40, lon: -74 },
			},
		});

		const json = JSON.parse(profile.toJSON());
		expect(json.address.city).toBe('New York');
		expect(json.address.location).toEqual({ lat: 40, lon: -74 });
	});

	test('should handle arrays of models', () => {
		interface IItem {
			name: string;
		}

		@Quick({}, { unknownPropertyPolicy: 'keep' })
		class Item extends QModel<IItem> {
			declare name: string;
		}

		interface ICart {
			items: IItem[];
		}

		@Quick({ items: [Item] }, { unknownPropertyPolicy: 'keep' })
		class Cart extends QModel<ICart> {
			declare items: Item[];
		}

		const cart = new Cart({
			items: [{ name: 'Item 1' }, { name: 'Item 2' }],
		});

		const json = JSON.parse(cart.toJSON());
		expect(json.items).toBeArray();
		expect(json.items).toHaveLength(2);
		expect(json.items[0].name).toBe('Item 1');
	});

	test('should exclude internal properties starting with __', () => {
		const user = new User({
			id: 1,
			name: 'Internal',
			birthDate: new Date().toISOString(),
			balance: '0',
			tags: [],
			metadata: {},
		});

		// Manually add internal prop
		(user as any).__internal = 'secret';

		const jsonString = user.toJSON();
		expect(jsonString).not.toContain('__internal');
	});
});
