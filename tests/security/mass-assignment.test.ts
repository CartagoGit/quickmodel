
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '../../src/index';

describe('Security: Mass Assignment & Method Shadowing', () => {
	class User extends QModel<any> {
		declare name: string;
		
		save() {
			return "saved";
		}
	}

	it('should allow mass assignment of unknown properties by default', () => {
		const payload = { name: 'John', isAdmin: true };
		const user = new User(payload);
		
		expect((user as any).isAdmin).toBe(true);
	});

	it('should prevent mass assignment in strict mode', () => {
		@Quick({}, { strict: true })
		class StrictUser extends QModel<any> {
			declare name: string;
		}

		const payload = { name: 'John', isAdmin: true };
		
		// Should throw or ignore?
		// Documentation says strict mode throws check 
		expect(() => new StrictUser(payload)).toThrow(/Strict Mode/);
	});

	it('should prevent shadowing of methods via payload (Logic Bomb)', () => {
		const payload = { 
			name: 'John',
			save: 'I am not a function' // Attempt to overwrite method
		};
		
		const user = new User(payload);
		
		// The property should be ignored, preserving the prototype method
		expect(typeof user.save).toBe('function');
		expect(user.name).toBe('John');
		
		// Calling it should work
		expect(() => (user as any).save()).not.toThrow();
	});

	it('should throw informative error when @Quick uses wrong syntax for strict mode', () => {
		expect(() => {
			// @ts-expect-error - Testing invalid usage
			@Quick({ strict: true })
			class BrokenUser extends QModel<any> {}
		}).toThrow(/Misconfiguration detected/);
	});
});
