import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QAlias } from '@/core/decorators/qalias.decorator';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUserModel {
	firstName: string;
	lastName: string;
	emailAddress: string;
}
type IUserAliasMap = {
	firstName: 'first_name';
	lastName: 'last_name';
	emailAddress: 'email_address';
};

@Quick()
class UserModel extends QModel<IUserModel, IUserAliasMap> {
	@QAlias('first_name')
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;
}

interface IProfileModel {
	fullName: string | undefined;
	birthDate: string | Date;
}
type IProfileAliasMap = { fullName: 'full_name' };

@Quick({ birthDate: Date })
class ProfileModel extends QModel<IProfileModel, IProfileAliasMap> {
	@QAlias('full_name')
	declare fullName: string;

	declare birthDate: Date; // no alias
}

interface IChildModel {
	firstName: string;
	lastName: string;
	emailAddress: string;
	phoneNumber: string;
}
type IChildAliasMap = {
	firstName: 'first_name';
	lastName: 'last_name';
	emailAddress: 'email_address';
	phoneNumber: 'phone_number';
};

@Quick()
class ChildModel extends QModel<IChildModel, IChildAliasMap> {
	@QAlias('first_name')
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;

	@QAlias('phone_number')
	declare phoneNumber: string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@QAlias — input remapping (create)', () => {
	test('create() accepts aliased snake_case keys', () => {
		const user = UserModel.create({
			first_name: 'Alice',
			last_name: 'Smith',
			email_address: 'alice@example.com',
		});

		expect(user.firstName).toBe('Alice');
		expect(user.lastName).toBe('Smith');
		expect(user.emailAddress).toBe('alice@example.com');
	});

	test('create() also accepts original camelCase keys (fallback)', () => {
		const user = UserModel.create({
			firstName: 'Bob',
			lastName: 'Jones',
			emailAddress: 'bob@example.com',
		});

		expect(user.firstName).toBe('Bob');
		expect(user.lastName).toBe('Jones');
		expect(user.emailAddress).toBe('bob@example.com');
	});

	test('aliased key takes precedence over camelCase key when both present', () => {
		const user = UserModel.create({
			first_name: 'Alice',
			firstName: 'Wrong',
			last_name: 'Smith',
			email_address: 'alice@example.com',
		});

		expect(user.firstName).toBe('Alice');
	});

	test('works with mixed fields: some aliased, some not', () => {
		const profile = ProfileModel.create({
			full_name: 'Jane Doe',
			birthDate: '1990-01-01T00:00:00.000Z',
		});

		expect(profile.fullName).toBe('Jane Doe');
		expect(profile.birthDate).toBeInstanceOf(Date);
	});

	test('constructor (new) also works with aliased keys', () => {
		const user = new UserModel({
			first_name: 'Carol',
			last_name: 'White',
			email_address: 'carol@example.com',
		});

		expect(user.firstName).toBe('Carol');
		expect(user.lastName).toBe('White');
	});
});

describe('@QAlias — output remapping (serialize)', () => {
	test('serialize() uses alias keys in output', () => {
		const user = UserModel.create({
			firstName: 'Alice',
			lastName: 'Smith',
			emailAddress: 'alice@example.com',
		});

		const output = user.serialize();

		expect(output).toHaveProperty('first_name', 'Alice');
		expect(output).toHaveProperty('last_name', 'Smith');
		expect(output).toHaveProperty('email_address', 'alice@example.com');
		expect(output).not.toHaveProperty('firstName');
		expect(output).not.toHaveProperty('lastName');
		expect(output).not.toHaveProperty('emailAddress');
	});

	test('toJSON() also uses alias keys', () => {
		const user = UserModel.create({
			firstName: 'Alice',
			lastName: 'Smith',
			emailAddress: 'alice@example.com',
		});

		const json = JSON.parse(user.toJSON());

		expect(json).toHaveProperty('first_name', 'Alice');
		expect(json).not.toHaveProperty('firstName');
	});

	test('fields without @QAlias keep original key in serialize()', () => {
		const profile = ProfileModel.create({
			fullName: 'Jane Doe',
			birthDate: '1990-01-01T00:00:00.000Z',
		});

		const output = profile.serialize();

		expect(output).toHaveProperty('full_name', 'Jane Doe');
		expect(output).toHaveProperty('birthDate'); // no alias → original key
	});
});

describe('@QAlias — full roundtrip', () => {
	test('serialize() output can be fed back into create()', () => {
		const original = UserModel.create({
			firstName: 'Alice',
			lastName: 'Smith',
			emailAddress: 'alice@example.com',
		});

		const serialized = original.serialize();
		const restored = UserModel.create(serialized);

		expect(restored.firstName).toBe('Alice');
		expect(restored.lastName).toBe('Smith');
		expect(restored.emailAddress).toBe('alice@example.com');
	});

	test('fromJSON() roundtrip works with aliases', () => {
		const original = UserModel.create({
			firstName: 'Bob',
			lastName: 'Jones',
			emailAddress: 'bob@example.com',
		});

		const json = original.toJSON();
		const restored = UserModel.fromJSON(json);

		expect(restored.firstName).toBe('Bob');
		expect(restored.emailAddress).toBe('bob@example.com');
	});
});

describe('@QAlias — inheritance', () => {
	test('subclass inherits parent @QAlias entries', () => {
		const child = ChildModel.create({
			first_name: 'Dan',
			last_name: 'Lee',
			email_address: 'dan@example.com',
			phone_number: '555-1234',
		});

		expect(child.firstName).toBe('Dan');
		expect(child.phoneNumber).toBe('555-1234');
	});

	test('subclass serialize() includes all aliased keys', () => {
		const data = {
			firstName: 'Dan',
			lastName: 'Lee',
			emailAddress: 'dan@example.com',
			phoneNumber: '555-1234',
		};
		const child = ChildModel.create(data);

		const output = child.serialize();

		expect(output).toHaveProperty('first_name', 'Dan');
		expect(output).toHaveProperty('phone_number', '555-1234');
	});
});
