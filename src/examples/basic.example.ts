/**
 * Basic QuickModel usage examples — nested models, collections, inheritance.
 *
 * Demonstrates how to define and work with `QModel` subclasses, including
 * nested objects, arrays of nested models, and plain class nesting.
 *
 * @see {@link QModel} — base class used by all example models here
 * @see {@link Quick} — class decorator applied to models that contain `Date` fields
 */
import { IQImplements, QModel, Quick } from '@/index';

// ============================================
// NESTED CLASSES FOR TESTING
// ============================================

// Simple class without QModel
class Address {
	public street: string;
	public city: string;
	public zip: string;

	constructor(
		streetOrObj: string | { street: string; city: string; zip: string },
		city?: string,
		zip?: string
	) {
		if (typeof streetOrObj === 'object') {
			this.street = streetOrObj.street;
			this.city = streetOrObj.city;
			this.zip = streetOrObj.zip;
		} else {
			this.street = streetOrObj;
			this.city = city!;
			this.zip = zip!;
		}
	}
}

// Class extending QModel (nested model)
interface IProfile {
	bio: string;
	website?: string;
	joinedAt: string;
}

@Quick({ createdAt: Date }) // Needs @Quick() to auto-detect Date
class Profile extends QModel<IProfile> {
	declare bio: string;
	declare website?: string;
	declare joinedAt: Date;
}

// ============================================
// INTERFACES AND TYPES
// ============================================

interface IUser {
	id: number;
	name: string;
	surname?: string;
	createdAt: string;
	updatedAt?: string;
	bignumber: string;
	tags: string[]; // Array from backend
	metadata: [string, unknown][]; // Array of pairs from backend
	symbolic: string;
	dates?: (string | undefined | null)[]; // Array of date strings
	pattern?: string; // RegExp as string from backend
	config?: Record<string, unknown>; // Plain object (no class)
	address?: {
		// Nested plain object
		street: string;
		city: string;
		zip: string;
	};
	profile?: IProfile; // Nested QModel
	addresses?: Array<{
		// Array of plain objects
		street: string;
		city: string;
		zip: string;
	}>;
}

type IUserTransform = {
	createdAt: Date;
	updatedAt?: Date;
	bignumber: bigint;
	tags: Set<string>;
	metadata: Map<string, unknown>;
	symbolic: symbol;
	dates?: (Date | undefined | null)[];
	pattern?: RegExp; // Transformed to RegExp
	config?: Record<string, unknown>; // Plain object remains the same
	address?: Address; // Transformed to Address class
	profile?: Profile; // Transformed to QModel Profile
	addresses?: Address[]; // Array transformed to Address classes
};

/**
 * REGLA SIMPLE de QuickModel:
 *
 * - Without transform → property is COPIED AS-IS from backend
 * - With transform → property is TRANSFORMED to specified type
 */

// ✅ OPTION WITH @Quick() - Automatically protects ALL properties
@Quick({
	createdAt: Date,
	updatedAt: Date,
	bignumber: BigInt,
	tags: Set,
	metadata: Map,
	symbolic: Symbol,
	dates: ((arr: (string | undefined | null)[]): (Date | undefined | null)[] =>
		arr?.map((date) =>
			typeof date === 'string' ? new Date(date) : date
		)) as unknown as any,
	pattern: RegExp, // RegExp from string
	address: Address as unknown as any, // Plain object → Address class
	profile: Profile as unknown as any, // Plain object → Profile QModel
	addresses: [Address] as unknown as any, // Array of plain objects → Array of Address classes
})
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransform>
{
	// All properties are automatically protected by @Quick()
	// Works with declare, !, and ?
	declare id: number;
	declare name: string;
	declare surname: string;

	// @Quick() detects Date, BigInt explicitly from decorator config
	declare createdAt: Date;
	declare updatedAt?: Date;
	declare bignumber: bigint;

	// Specified in the map above
	declare tags: Set<string>;
	declare metadata: Map<string, unknown>;
	declare symbolic: symbol;
	declare dates?: (Date | undefined | null)[];

	// New transformation types
	declare pattern?: RegExp;
	declare config?: Record<string, unknown>; // Plain object without transformation
	declare address?: Address;
	declare profile?: Profile;
	declare addresses?: Address[];

	algo = 'test' as const; // Normal property unrelated to QuickModel
}

const baseObj: IUser = {
	id: 1,
	name: 'Test Algo',
	surname: 'Doe',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-02T00:00:00.000Z',
	bignumber: '9007199254741991',
	tags: ['typescript', 'node', 'backend'], // Plain array
	metadata: [
		['version', '1.0'],
		['author', 'dev'],
	], // Array of pairs
	symbolic: 'my-symbol',
	dates: [
		'2024-01-10T00:00:00.000Z',
		'2024-02-15T00:00:00.000Z',
		undefined,
		null,
	],
	pattern: '^test.*$', // RegExp as string
	config: { theme: 'dark', lang: 'es' }, // Plain object
	address: {
		// Nested plain object
		street: '123 Main St',
		city: 'Madrid',
		zip: '28001',
	},
	profile: {
		// Nested QModel data
		bio: 'Developer',
		website: 'https://example.com',
		joinedAt: '2023-01-15T00:00:00.000Z',
	},
	addresses: [
		// Array of plain objects
		{ street: '456 Elm St', city: 'Barcelona', zip: '08001' },
		{ street: '789 Oak Ave', city: 'Valencia', zip: '46001' },
	],
};

const logTests = (obj: User) => {
	console.log('\n=== TEST RESULTS ===');
	console.log({ obj }, '\n');
	console.log('\n=== Properties WITHOUT transform (copied as-is) ===');
	console.log('id:', obj.id, '→', typeof obj.id, obj.id === 1 ? '✅' : '❌');
	console.log(
		'name:',
		obj.name,
		'→',
		typeof obj.name,
		obj.name === 'Test Algo' ? '✅' : '❌'
	);
	console.log(
		'surname:',
		obj.surname,
		'→',
		typeof obj.surname,
		obj.surname === 'Doe' ? '✅' : '❌'
	);

	console.log('\n=== Properties WITH transform (via @Quick) ===');
	console.log(
		'createdAt:',
		obj.createdAt,
		'→ CreatedAt',
		obj.createdAt instanceof Date ? '✅' : '❌'
	);
	console.log(
		'updatedAt:',
		obj.updatedAt,
		'→ UpdatedAt',
		obj.updatedAt instanceof Date ? '✅' : '❌'
	);
	console.log(
		'bignumber:',
		obj.bignumber,
		'→ BigInt',
		typeof obj.bignumber === 'bigint' ? '✅' : '❌'
	);
	console.log(
		'tags:',
		obj.tags,
		'→ Set',
		obj.tags instanceof Set ? '✅' : '❌'
	);
	console.log(
		'metadata:',
		obj.metadata,
		'→ Map',
		obj.metadata instanceof Map ? '✅' : '❌'
	);
	console.log(
		'symbolic:',
		obj.symbolic,
		'→ Symbol',
		typeof obj.symbolic === 'symbol' ? '✅' : '❌'
	);
	console.log(
		'dates:',
		obj.dates,
		'→ (Date | undefined | null)[]',
		Array.isArray(obj.dates) &&
			obj.dates.every(
				(date) =>
					date instanceof Date || date === undefined || date === null
			)
			? '✅'
			: '❌'
	);
	console.log('algo (normal):', obj.algo, obj.algo === 'test' ? '✅' : '❌');

	console.log('\n=== New transformation types ===');
	console.log(
		'pattern:',
		obj.pattern,
		'→ RegExp',
		obj.pattern instanceof RegExp ? '✅' : '❌'
	);
	console.log(
		'config:',
		obj.config,
		'→ Plain Object',
		obj.config &&
			typeof obj.config === 'object' &&
			obj.config.theme === 'dark'
			? '✅'
			: '❌'
	);
	console.log(
		'address:',
		obj.address,
		'→ Address class',
		obj.address instanceof Address && obj.address.city === 'Madrid'
			? '✅'
			: '❌'
	);
	console.log(
		'profile:',
		obj.profile,
		'→ Profile QModel',
		obj.profile instanceof Profile && obj.profile.joinedAt instanceof Date
			? '✅'
			: '❌'
	);
	console.log(
		'addresses:',
		obj.addresses,
		'→ Address[]',
		Array.isArray(obj.addresses) &&
			obj.addresses.length === 2 &&
			obj.addresses.every((address) => address instanceof Address)
			? '✅'
			: '❌'
	);
};

console.log('\n====================================');

const user = new User(baseObj);
logTests(user);

console.log('\n====================================');
const allCorrect =
	user.id === 1 &&
	user.name === 'Test Algo' &&
	user.surname === 'Doe' &&
	user.createdAt instanceof Date &&
	typeof user.bignumber === 'bigint' &&
	user.tags instanceof Set &&
	user.metadata instanceof Map &&
	typeof user.symbolic === 'symbol' &&
	Array.isArray(user.dates) &&
	user.dates.every(
		(date) => date instanceof Date || date === undefined || date === null
	) &&
	user.pattern instanceof RegExp &&
	user.config?.theme === 'dark' &&
	user.address instanceof Address &&
	user.profile instanceof Profile &&
	Array.isArray(user.addresses) &&
	user.addresses.length === 2 &&
	user.addresses.every((address) => address instanceof Address);

console.log(
	allCorrect ? '✅ ALL CORRECT - Both options work' : '❌ ERRORS FOUND'
);
console.log('====================================\n');
