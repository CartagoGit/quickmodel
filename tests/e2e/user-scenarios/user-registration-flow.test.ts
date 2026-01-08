/**
 * E2E Test: Complete User Registration Flow
 * 
 * Simulates a complete user registration workflow from form data
 * through validation, model creation, serialization, and storage
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, type QInterface } from '../../../src';

describe('E2E: User Registration Flow', () => {
	// Step 1: Define interfaces for the complete system
	interface IAddress {
		street: string;
		city: string;
		country: string;
		zipCode: string;
	}

	interface IUser {
		id: string;
		email: string;
		username: string;
		password: string;
		profile: {
			firstName: string;
			lastName: string;
			birthDate: string;
			address: IAddress;
		};
		preferences: {
			newsletter: boolean;
			theme: 'light' | 'dark';
			language: string;
		};
		metadata: {
			registeredAt: string;
			lastLogin: string | null;
			emailVerified: boolean;
			loginCount: string; // BigInt as string
		};
	}

	interface IUserTransform {
		profile: {
			firstName: string;
			lastName: string;
			birthDate: Date;
			address: Address;
		};
		metadata: {
			registeredAt: Date;
			lastLogin: Date | null;
			emailVerified: boolean;
			loginCount: bigint;
		};
	}

	// Step 2: Create models
	@Quick({})
	class Address extends QModel<IAddress> {
		street!: string;
		city!: string;
		country!: string;
		zipCode!: string;
	}

	@Quick({
		'profile.birthDate': Date,
		'profile.address': Address,
		'metadata.registeredAt': Date,
		'metadata.lastLogin': Date,
		'metadata.loginCount': BigInt,
	})
	class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
		id!: string;
		email!: string;
		username!: string;
		password!: string;
		profile!: {
			firstName: string;
			lastName: string;
			birthDate: Date;
			address: Address;
		};
		preferences!: {
			newsletter: boolean;
			theme: 'light' | 'dark';
			language: string;
		};
		metadata!: {
			registeredAt: Date;
			lastLogin: Date | null;
			emailVerified: boolean;
			loginCount: bigint;
		};

		// Custom methods
		getFullName(): string {
			return `${this.profile.firstName} ${this.profile.lastName}`;
		}

		isAdult(): boolean {
			const age =
				(Date.now() - this.profile.birthDate.getTime()) /
				(1000 * 60 * 60 * 24 * 365);
			return age >= 18;
		}
	}

	test('Complete registration flow: form → model → storage → retrieval', () => {
		// STEP 1: Simulate form submission data
		const formData: IUser = {
			id: crypto.randomUUID(),
			email: 'alice@example.com',
			username: 'alice_wonder',
			password: 'hashed_password_here',
			profile: {
				firstName: 'Alice',
				lastName: 'Wonderland',
				birthDate: '1995-03-15T00:00:00.000Z',
				address: {
					street: '123 Main St',
					city: 'New York',
					country: 'USA',
					zipCode: '10001',
				},
			},
			preferences: {
				newsletter: true,
				theme: 'dark',
				language: 'en-US',
			},
			metadata: {
				registeredAt: new Date().toISOString(),
				lastLogin: null,
				emailVerified: false,
				loginCount: '0',
			},
		};

		// STEP 2: Create User model instance
		const user = new User(formData);

		// STEP 3: Validate transformations
		expect(user.email).toBe('alice@example.com');
		expect(user.profile.birthDate).toBeInstanceOf(Date);
		expect(user.profile.address).toBeInstanceOf(Address);
		expect(user.metadata.registeredAt).toBeInstanceOf(Date);
		expect(user.metadata.loginCount).toBe(0n);
		expect(typeof user.metadata.loginCount).toBe('bigint');

		// STEP 4: Test custom methods
		expect(user.getFullName()).toBe('Alice Wonderland');
		expect(user.isAdult()).toBe(true);

		// STEP 5: Serialize for storage (e.g., database)
		const jsonForStorage = user.toJSON();
		expect(typeof jsonForStorage).toBe('string');

		// STEP 6: Parse back (simulate database retrieval)
		const storedData = JSON.parse(jsonForStorage);
		expect(storedData.profile.birthDate).toBe('1995-03-15T00:00:00.000Z');
		expect(storedData.metadata.loginCount).toBe('0');

		// STEP 7: Recreate model from stored data
		const retrievedUser = User.fromJSON(jsonForStorage);

		// STEP 8: Verify all data is intact
		expect(retrievedUser.email).toBe(user.email);
		expect(retrievedUser.profile.firstName).toBe(user.profile.firstName);
		expect(retrievedUser.profile.birthDate.getTime()).toBe(
			user.profile.birthDate.getTime()
		);
		expect(retrievedUser.profile.address.city).toBe('New York');
		expect(retrievedUser.metadata.loginCount).toBe(0n);

		// STEP 9: Verify custom methods still work
		expect(retrievedUser.getFullName()).toBe('Alice Wonderland');
		expect(retrievedUser.isAdult()).toBe(true);

		// STEP 10: Test clone functionality
		const clonedUser = retrievedUser.clone();
		expect(clonedUser).not.toBe(retrievedUser);
		expect(clonedUser.email).toBe(retrievedUser.email);
		expect(clonedUser.profile.address).not.toBe(retrievedUser.profile.address);

		// STEP 11: Simulate login (update metadata)
		retrievedUser.metadata.lastLogin = new Date();
		retrievedUser.metadata.loginCount = 1n;
		retrievedUser.metadata.emailVerified = true;

		const updatedJson = retrievedUser.toJSON();
		const finalUser = User.fromJSON(updatedJson);

		expect(finalUser.metadata.loginCount).toBe(1n);
		expect(finalUser.metadata.emailVerified).toBe(true);
		expect(finalUser.metadata.lastLogin).toBeInstanceOf(Date);
	});

	test('Should handle validation errors gracefully', () => {
		const invalidData: IUser = {
			id: '',
			email: 'invalid-email',
			username: '',
			password: '',
			profile: {
				firstName: '',
				lastName: '',
				birthDate: 'invalid-date',
				address: {
					street: '',
					city: '',
					country: '',
					zipCode: '',
				},
			},
			preferences: {
				newsletter: false,
				theme: 'light',
				language: 'en',
			},
			metadata: {
				registeredAt: new Date().toISOString(),
				lastLogin: null,
				emailVerified: false,
				loginCount: '0',
			},
		};

		// Model should still create but with invalid date
		const user = new User(invalidData);

		expect(user.email).toBe('invalid-email');
		expect(user.profile.birthDate).toBeInstanceOf(Date);
		expect(isNaN(user.profile.birthDate.getTime())).toBe(true); // Invalid date
	});

	test('Should handle partial updates correctly', () => {
		const initialData: IUser = {
			id: '1',
			email: 'user@example.com',
			username: 'user',
			password: 'pass',
			profile: {
				firstName: 'John',
				lastName: 'Doe',
				birthDate: '1990-01-01T00:00:00.000Z',
				address: {
					street: '123 St',
					city: 'City',
					country: 'Country',
					zipCode: '12345',
				},
			},
			preferences: {
				newsletter: false,
				theme: 'light',
				language: 'en',
			},
			metadata: {
				registeredAt: '2024-01-01T00:00:00.000Z',
				lastLogin: null,
				emailVerified: false,
				loginCount: '0',
			},
		};

		const user = new User(initialData);

		// Update only email
		const updatedData = {
			...JSON.parse(user.toJSON()),
			email: 'newemail@example.com',
		};

		const updatedUser = new User(updatedData);

		expect(updatedUser.email).toBe('newemail@example.com');
		expect(updatedUser.username).toBe('user');
		expect(updatedUser.profile.firstName).toBe('John');
	});
});
