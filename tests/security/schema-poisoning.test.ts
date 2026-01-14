import { describe, it, expect } from 'bun:test';
import { QModel } from '../../src/core/models/quick.model';
import { Quick } from '../../src/core/decorators/quick.decorator';

describe('Security: Schema Poisoning', () => {
	it('should NOT permanently register extra properties from the first payload', () => {
		// Define a fresh class for this test to avoid pollution from other tests
		@Quick()
		class VictimModel extends QModel<any> {
			declare name: string;
		}

		// 1. First instantiation with "poisoned" data
		// An attacker sends extra fields
		const poisonPayload = {
			name: 'Alice',
			isAdmin: true, // Extra field
			systemKey: 'xyz', // Extra field
		};

		const _instance1 = new VictimModel(poisonPayload);

		// 2. Second instantiation with "clean" data
		// A legitimate user sends normal data
		const cleanPayload = {
			name: 'Bob',
		};

		const instance2 = new VictimModel(cleanPayload);

		// Check if the schema was altered
		// We can inspect metadata or behavior

		// If the schema was poisoned, 'isAdmin' might be registered as a managed property on the prototype
		const isAdminMetadata = Reflect.getMetadata(
			'fieldType',
			VictimModel.prototype,
			'isAdmin'
		);

		// Similarly, if we access instance2.isAdmin, does it exist? (It shouldn't if strict)
		// But Typescript won't let us access it easily, cast to any
		const _val = (instance2 as any).isAdmin;

		console.log('Is Admin Metadata present?:', !!isAdminMetadata);
		console.log('Instance 2 has isAdmin?', 'isAdmin' in instance2);

		// Expectation: The schema must NOT depend on the first runtime payload.
		// If it does, we have a vulnerability where the first requester dictates the object shape for everyone.
		expect(isAdminMetadata).toBeUndefined();
	});

	it('should NOT allow adding new properties via payload if explicit fields are defined', () => {
		// Even with explicit fields, does it auto-learn others?
		@Quick({ name: String })
		class TargetedModel extends QModel<any> {
			declare name: string;
		}

		const poisonPayload = {
			name: 'Alice',
			injectedLevel: 999,
		};

		const _instance1 = new TargetedModel(poisonPayload);

		const injectedMetadata = Reflect.getMetadata(
			'fieldType',
			TargetedModel.prototype,
			'injectedLevel'
		);
		expect(injectedMetadata).toBeUndefined();
	});
});
