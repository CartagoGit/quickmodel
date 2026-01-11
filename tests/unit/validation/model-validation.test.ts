import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QTransformerRegistry } from '@/core/registry/transformer.registry';

describe('Model Validation', () => {
	interface IUser {
		id: number;
		name: string;
		email: string;
		age: number;
		birthDate: string;
	}

	// Define a model
	@Quick({
		birthDate: Date,
	})
	class User extends QModel<IUser> {
		declare id: number;
		declare name: string;
		declare email: string;
		declare age: number;
		declare birthDate: Date;
	}

	test('should return empty array for valid model', () => {
		const user = User.create({
			id: 1,
			name: 'John',
			email: 'john@example.com',
			age: 30,
			birthDate: '2000-01-01T00:00:00.000Z',
		});

		const errors = user.validate();
		expect(errors).toBeArray();
		expect(errors).toHaveLength(0);
	});

	test('should validate Date (strict deserialization check)', () => {
		// Validation happens at deserialization time for Primitives/Dates
		expect(() => {
			User.create({
				id: 1,
				name: 'John',
				email: 'john@example.com',
				age: 30,
				birthDate: 'invalid-date',
			});
		}).toThrow();
	});

	test('should support custom validation via Custom Transformer', () => {
		// 1. Create custom transformer with validation
		class EmailTransformer {
			serialize(val: string) {
				return val;
			}
			deserialize(val: string) {
				return val;
			}

			validate(val: any, _context: any) {
				// Strict check
				if (typeof val !== 'string' || !val.includes('@')) {
					return { isValid: false, error: 'Invalid email' };
				}
				return { isValid: true };
			}
		}

		// 2. Register it
		QTransformerRegistry.register('Email', new EmailTransformer());

		// 3. Use it
		interface IContact {
			email: string;
		}

		@Quick({ email: 'Email' })
		class Contact extends QModel<IContact> {
			declare email: string;
		}

		const validContact = Contact.create({ email: 'test@test.com' });
		expect(validContact.validate()).toHaveLength(0);

		const invalidContact = Contact.create({ email: 'invalid' });
		const errors = invalidContact.validate();

		expect(errors).toHaveLength(1);
		expect(errors[0]!.error).toBe('Invalid email');
	});
});
