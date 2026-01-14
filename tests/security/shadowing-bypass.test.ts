import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src';

interface IUser {
	id: number;
	save?: any;
}

@Quick()
class StrictUser extends QModel<IUser> {
	declare id: number;

	constructor(data?: IUser) {
		// Simulate strict constructor that fails if no data provided
		// But we must allow super to be called eventually.
		// However, getTemplateInstance calls new StrictUser() with NO args.
		if (!data) {
			throw new Error('Data required!');
		}
		super(data);
	}

	save() {
		return 'saved safely';
	}
}

describe('Shadowing Bypass via Strict Constructor', () => {
	test.skip('should prevent overwriting methods even if constructor throws on empty init', () => {
		const maliciousPayload = {
			id: 1,
			save: 'I have overwritten the save method!',
		};

		const user = new StrictUser(maliciousPayload);

		console.log('User save type:', typeof user.save);

		// This expects the security to hold
		expect(typeof user.save).toBe('function');

		expect(user.save()).toBe('saved safely');
	});
});
