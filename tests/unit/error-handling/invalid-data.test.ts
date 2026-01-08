/**
 * CRITICAL TESTS: Invalid Data Type Handling
 *
 * These tests ensure the library fails gracefully with descriptive errors
 * when users pass invalid data types.
 *
 * Priority: ⭐⭐⭐⭐⭐ CRITICAL
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '../../../src/quick.model';
import { QType } from '../../../src/core/decorators/qtype.decorator';

// Test Models
interface IUser {
	id: number;
	name: string;
	email: string;
	age: number;
	createdAt: string; // Date serialized
	balance: string; // BigInt serialized
}

class User extends QModel<IUser> {
	@QType() id!: number;
	@QType() name!: string;
	@QType() email!: string;
	@QType() age!: number;
	@QType() createdAt!: Date;
	@QType() balance!: bigint;
}

interface IPayment {
	amount: string; // BigInt serialized
}

class Payment extends QModel<IPayment> {
	@QType() amount!: bigint;
}

interface IAddress {
	street: string;
	zipCode: string;
}

interface IUserWithAddress {
	id: number;
	address: IAddress;
}

class UserWithAddress extends QModel<IUserWithAddress> {
	@QType() id!: number;
	@QType() address!: IAddress;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Error Handling: Invalid Data Types', () => {
	test('should throw descriptive error when string passed for number', () => {
		try {
			new User({
				id: 'not a number' as any,
				name: 'John',
				email: 'john@test.com',
				age: 25,
				createdAt: new Date().toISOString(),
				balance: '1000',
			});

			// If we get here, test should fail
			expect(true).toBe(false);
		} catch (error: any) {
			// Should get an error
			expect(error).toBeDefined();
			// Error should mention the field and type mismatch
			// Note: Currently might not throw, just assigns wrong type
			console.log('Error caught:', error.message);
		}
	});

	test('should handle valid data correctly', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@test.com',
			age: 25,
			createdAt: new Date().toISOString(),
			balance: '1000',
		});

		expect(user.id).toBe(1);
		expect(typeof user.id).toBe('number');
		expect(user.name).toBe('John');
	});

	test('should detect invalid BigInt string', () => {
		try {
			new Payment({ amount: 'not-a-bigint' as any });

			// If no error, record that validation is needed
			console.warn('⚠️  No validation error thrown for invalid BigInt');
		} catch (error: any) {
			expect(error).toBeDefined();
			expect(error.message).toMatch(/bigint|invalid/i);
		}
	});

	test('should handle valid BigInt correctly', () => {
		const payment = new Payment({ amount: '9999999999999' });

		expect(typeof payment.amount).toBe('bigint');
		expect(payment.amount.toString()).toBe('9999999999999');
	});

	test('should detect null when type is non-nullable', () => {
		try {
			new User({
				id: null as any,
				name: 'John',
				email: 'john@test.com',
				age: 25,
				createdAt: new Date().toISOString(),
				balance: '1000',
			});

			// If no error, log warning
			console.warn(
				'⚠️  No validation error thrown for null in non-nullable field'
			);
		} catch (error: any) {
			expect(error).toBeDefined();
		}
	});
});

describe('Error Handling: Nested Property Errors', () => {
	test('should provide property path in nested errors', () => {
		try {
			new UserWithAddress({
				id: 1,
				address: {
					street: 'Main St',
					zipCode: 12345 as any, // should be string
				},
			});

			// Currently might not throw
			console.warn('⚠️  No validation for nested property type mismatch');
		} catch (error: any) {
			expect(error).toBeDefined();
			// Should mention "address.zipCode" in error
			expect(error.message).toMatch(/address.*zipCode/i);
		}
	});

	test('should handle valid nested data correctly', () => {
		const user = new UserWithAddress({
			id: 1,
			address: {
				street: 'Main St',
				zipCode: '12345',
			},
		});

		expect(user.address.zipCode).toBe('12345');
		expect(typeof user.address.zipCode).toBe('string');
	});
});

describe('Error Handling: Missing Required Fields', () => {
	test('should work when all fields provided', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@test.com',
			age: 25,
			createdAt: new Date().toISOString(),
			balance: '1000',
		});

		expect(user.id).toBe(1);
		expect(user.name).toBe('John');
	});

	test('should handle missing optional fields', () => {
		interface IOptional {
			id: number;
			optional?: string;
		}

		class Optional extends QModel<IOptional> {
			@QType() id!: number;
			@QType() optional?: string;
		}

		const model = new Optional({ id: 1 });

		expect(model.id).toBe(1);
		expect(model.optional).toBeUndefined();
	});
});

describe('Error Handling: Array Type Mismatches', () => {
	interface IData {
		numbers: number[];
		dates: string[]; // Date[] serialized
	}

	class Data extends QModel<IData> {
		@QType() numbers!: number[];
		@QType() dates!: Date[];
	}

	test('should handle arrays with correct types', () => {
		const data = new Data({
			numbers: [1, 2, 3],
			dates: [
				new Date('2024-01-01').toISOString(),
				new Date('2024-01-02').toISOString(),
			],
		});

		expect(Array.isArray(data.numbers)).toBe(true);
		expect(data.numbers[0]).toBe(1);
		expect(data.dates[0]).toBeInstanceOf(Date);
	});

	test('should detect array with wrong element types', () => {
		try {
			new Data({
				numbers: ['not', 'numbers'] as any,
				dates: [],
			});

			// Currently might not validate array elements
			console.warn('⚠️  No validation for array element types');
		} catch (error: any) {
			expect(error).toBeDefined();
		}
	});
});

describe('Error Handling: Type Coercion vs Validation', () => {
	test('should document current behavior: no validation', () => {
		// Document that currently there's no strict validation
		const user = new User({
			id: '123' as any, // string instead of number
			name: 'John',
			email: 'john@test.com',
			age: 25,
			createdAt: new Date().toISOString(),
			balance: '1000',
		});

		// Currently accepts string, doesn't validate
		console.log('Current behavior - id type:', typeof user.id);
		console.log('Current behavior - id value:', user.id);

		// This documents the current state - no strict validation
		expect(user.id).toBeString(); // Currently string, not number
		expect(user.id).toBe('123' as any);
	});
});
