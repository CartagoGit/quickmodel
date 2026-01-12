import { describe, it, expect } from 'bun:test';
import { QModelError } from '../../../../src/core/errors/quickmodel.error';

describe('QModelError', () => {
	it('should create an error with a message', () => {
		const error = new QModelError('Test error');
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(QModelError);
		expect(error.message).toBe('Test error');
		expect(error.name).toBe('QModelError');
	});

	it('should store context', () => {
		const context = {
			className: 'User',
			propertyKey: 'age',
			value: 'invalid',
			expectedType: 'number',
		};
		const error = new QModelError('Invalid age', context);
		expect(error.context).toEqual(context);
	});

	describe('static invalidType', () => {
		it('should create a formatted error for invalid types', () => {
			const error = QModelError.invalidType(
				'User',
				'age',
				'number',
				'string-value'
			);

			expect(error.message).toBe('User.age: Expected number, got string');
			expect(error.context).toEqual({
				className: 'User',
				propertyKey: 'age',
				value: 'string-value',
				expectedType: 'number',
			});
		});

		it('should handle null values in message', () => {
			const error = QModelError.invalidType(
				'User',
				'age',
				'number',
				null
			);

			expect(error.message).toBe('User.age: Expected number, got null');
		});
	});

	describe('static invalidValue', () => {
		it('should create a formatted error for invalid values', () => {
			const error = QModelError.invalidValue(
				'User',
				'email',
				'not-an-email',
				'Must contains @'
			);

			expect(error.message).toBe(
				'User.email: Invalid value "not-an-email": Must contains @'
			);
			expect(error.context).toEqual({
				className: 'User',
				propertyKey: 'email',
				value: 'not-an-email',
			});
		});
	});
});
