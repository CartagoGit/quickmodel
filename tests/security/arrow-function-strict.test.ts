import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../src';

interface IUser {
	id: number;
	save?: any;
}

@Quick()
class StrictUserArrow extends QModel<IUser> {
	declare id: number;

	constructor(data?: IUser) {
		if (!data) {
			throw new Error('Data required!');
		}
		super(data);
	}

	// Instance method (Arrow function)
	save = () => {
		return 'saved safely';
	};
}

describe('Arrow Function Shadowing Bypass via Strict Constructor', () => {
	test('should prevent overwriting arrow function methods even if constructor throws on empty init', () => {
		const maliciousPayload = {
			id: 1,
			save: 'I have overwritten the save method!',
		};

		const user = new StrictUserArrow(maliciousPayload);

		console.log('User save type:', typeof user.save);

		// If the vulnerability exists, user.save will be the string payload
		expect(user.save).not.toBe(maliciousPayload.save);

		if (typeof user.save === 'function') {
			expect(user.save()).toBe('saved safely');
		}
	});
});
