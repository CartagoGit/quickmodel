/**
 * Unit Test: Mock Generator - Nested Models
 *
 * Tests mock generation for models with nested objects and other models
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick, QInterface } from '@/index';
import { QType } from '@/core/decorators/qtype.decorator';

describe('Unit: Mock Generator - Nested Models', () => {
	// Nested models
	interface IAddress {
		street: string;
		city: string;
		zipCode: string;
		country: string;
	}

	class Address extends QModel<IAddress> {
		@QType() street!: string;
		@QType() city!: string;
		@QType() zipCode!: string;
		@QType() country!: string;
	}

	interface IProfile {
		bio: string;
		avatar: string;
		website: string | null;
	}

	class Profile extends QModel<IProfile> {
		@QType() bio!: string;
		@QType() avatar!: string;
		@QType() website!: string | null;
	}

	interface IUser {
		id: string;
		name: string;
		address: IAddress;
		profile: IProfile;
		metadata: {
			tags: string[];
			score: number;
		};
	}

	interface IUserTransform {
		address: Address;
		profile: Profile;
	}

	@Quick({
		address: Address,
		profile: Profile,
	})
	class User
		extends QModel<IUser>
		implements QInterface<IUser, IUserTransform>
	{
		@QType() id!: string;
		@QType() name!: string;
		@QType(Address) address!: Address;
		@QType(Profile) profile!: Profile;
		@QType() metadata!: {
			tags: string[];
			score: number;
		};
	}

	test('should generate mocks with nested model instances', () => {
		const mock = User.mock().random();

		expect(mock).toBeInstanceOf(User);
		expect(mock.address).toBeInstanceOf(Address);
		expect(mock.profile).toBeInstanceOf(Profile);
	});

	test('should generate nested models with proper types', () => {
		const mock = User.mock().random();

		expect(typeof mock.address.street).toBe('string');
		expect(typeof mock.address.city).toBe('string');
		expect(typeof mock.profile.bio).toBe('string');
		expect(typeof mock.profile.avatar).toBe('string');
	});

	test('should generate nested plain objects', () => {
		const mock = User.mock().random();

		expect(typeof mock.metadata).toBe('object');
		expect(Array.isArray(mock.metadata.tags)).toBe(true);
		expect(typeof mock.metadata.score).toBe('number');
	});

	test('should allow overriding nested models', () => {
		const customAddress = Address.mock().random({
			city: 'New York',
			country: 'USA',
		});

		const mock = User.mock().random({
			address: customAddress.serialize(),
		});

		expect(mock.address.city).toBe('New York');
		expect(mock.address.country).toBe('USA');
	});

	test('should allow overriding nested plain objects', () => {
		const mock = User.mock().random({
			metadata: {
				tags: ['test', 'mock'],
				score: 100,
			},
		});

		expect(mock.metadata.tags).toEqual(['test', 'mock']);
		expect(mock.metadata.score).toBe(100);
	});

	test('should generate empty mocks with nested empty models', () => {
		const mock = User.mock().empty();

		expect(mock.address).toBeInstanceOf(Address);
		expect(mock.address.street).toBe('');
		expect(mock.profile).toBeInstanceOf(Profile);
		expect(mock.profile.bio).toBe('');
	});

	test('should generate array of mocks with nested models', () => {
		const mocks = User.mock().array(3);

		expect(mocks).toHaveLength(3);
		mocks.forEach((mock) => {
			expect(mock.address).toBeInstanceOf(Address);
			expect(mock.profile).toBeInstanceOf(Profile);
		});
	});

	test('should handle deep nesting correctly', () => {
		interface ICompany {
			name: string;
			owner: IUser;
		}

		interface ICompanyTransform {
			owner: User;
		}

		@Quick({
			owner: User,
		})
		class Company
			extends QModel<ICompany>
			implements QInterface<ICompany, ICompanyTransform>
		{
			name!: string;
			owner!: User;
		}

		const mock = Company.mock().random();

		expect(mock).toBeInstanceOf(Company);
		expect(mock.owner).toBeInstanceOf(User);
		expect(mock.owner.address).toBeInstanceOf(Address);
		expect(mock.owner.profile).toBeInstanceOf(Profile);
	});
});
