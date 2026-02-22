import { describe, test, expect } from 'bun:test';
import { QModel, IQImplements } from '@/index';
import { QType } from '@/utils';

interface IUser {
	id: string;
	name: string;
	age: number;
	createdAt: string;
}

type IUserTransforms = {
	createdAt: Date;
};

class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	@QType() id!: string;
	@QType() name!: string;
	@QType() age!: number;
	@QType() createdAt!: Date;
}

const userData: IUser = {
	id: '123',
	name: 'John Doe',
	age: 30,
	createdAt: '2024-01-01T00:00:00.000Z',
};

describe('QModel Core Functionality - Roundtrip', () => {
	test('should create user from interface data with correct types', () => {
		const user = new User(userData);
		expect(user.id).toBe('123');
		expect(user.name).toBe('John Doe');
		expect(user.age).toBe(30);
		expect(user.createdAt).toBeInstanceOf(Date);
	});

	test('should serialize to interface-compatible object', () => {
		const user = new User(userData);
		const serialized = user.serialize();
		expect(serialized.id).toBe('123');
		expect(serialized.name).toBe('John Doe');
		expect(serialized.age).toBe(30);
		expect(typeof serialized.createdAt).toBe('string');
	});

	test('should survive a full round-trip (construct → serialize → construct)', () => {
		const user = new User(userData);
		const serialized = user.serialize();
		const user2 = new User(serialized);
		expect(user2.id).toBe(user.id);
		expect(user2.name).toBe(user.name);
		expect(user2.age).toBe(user.age);
		expect(user2.createdAt.getTime()).toBe(user.createdAt.getTime());
	});

	test('should deserialize via static method', () => {
		const user = User.deserialize(userData);
		expect(user).toBeInstanceOf(User);
		expect(user.id).toBe('123');
		expect(user.createdAt).toBeInstanceOf(Date);
	});

	test('should survive a JSON round-trip (toJSON → fromJSON)', () => {
		const user = new User(userData);
		const json = user.toJSON();
		const user2 = User.fromJSON(json);
		expect(user2).toBeInstanceOf(User);
		expect(user2.createdAt).toBeInstanceOf(Date);
		expect(user2.createdAt.getTime()).toBe(user.createdAt.getTime());
	});
});
