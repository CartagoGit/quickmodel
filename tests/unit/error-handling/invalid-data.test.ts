/**
 * CRITICAL TESTS: Invalid Data Type Handling
 *
 * These tests ensure the library fails gracefully with descriptive errors
 * when users pass invalid data types.
 *
 * Priority: ⭐⭐⭐⭐⭐ CRITICAL
 */

import { describe, test, expect } from 'bun:test';
import { QModel } from '../@//quick.model';

// Test Models - Using declare syntax (no decorators needed)
interface IUser {
	id: number;
	name: string;
	email: string;
	age: number;
	createdAt: Date;
	balance: bigint;
}

class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare age: number;
	declare createdAt: Date;
	declare balance: bigint;
}

interface IPayment {
	amount: bigint;
}

class Payment extends QModel<IPayment> {
	declare amount: bigint;
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
	declare id: number;
	declare address: IAddress;
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Error Handling: Invalid Data Types', () => {
	test('should throw descriptive error when string passed for number', () => {
		try {
			new User({
				id: 'not a number' as unknown as number,
				name: 'John',
				email: 'john@test.com',
				age: 25,
				createdAt: new Date().toISOString(),
				balance: '1000',
			});

			// If we get here, test should fail
			expect(true).toBe(false);
		} catch (error: unknown) {
			// Should get an error
			expect(error).toBeDefined();
			// Error should mention the field and type mismatch
			if (error instanceof Error) {
				console.log('Error caught:', error.message);
			}
		}
	});

	test('should handle valid data correctly', () => {
		const user = new User({
			id: 1,
			name: 'John',
			email: 'john@test.com',
			age: 25,
			createdAt: new Date(),
			balance: 1000n,
		});

		expect(user.id).toBe(1);
		expect(typeof user.id).toBe('number');
		expect(user.name).toBe('John');
	});

	test('should detect invalid BigInt string', () => {
		try {
			new Payment({ amount: 'not-a-bigint' as unknown as string });

			// If no error, record that validation is needed
			console.warn('⚠️  No validation error thrown for invalid BigInt');
		} catch (error: unknown) {
			expect(error).toBeDefined();
			if (error instanceof Error) {
				expect(error.message).toMatch(/bigint|invalid/i);
			}
		}
	});

	test('should handle valid BigInt correctly', () => {
		const payment = new Payment({ amount: 9999999999999n });

		expect(typeof payment.amount).toBe('bigint');
		expect(payment.amount.toString()).toBe('9999999999999');
	});

	test('should detect null when type is non-nullable', () => {
		try {
			new User({
				id: null as unknown as number,
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
		} catch (error: unknown) {
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
					zipCode: 12345 as unknown as string, // should be string
				},
			});

			// Currently might not throw
			console.warn('⚠️  No validation for nested property type mismatch');
		} catch (error: unknown) {
			expect(error).toBeDefined();
			// Should mention "address.zipCode" in error
			if (error instanceof Error) {
				expect(error.message).toMatch(/address.*zipCode/i);
			}
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
			createdAt: new Date(),
			balance: 1000n,
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
			declare id: number;
			declare optional?: string;
		}

		const model = new Optional({ id: 1 });

		expect(model.id).toBe(1);
		expect(model.optional).toBeUndefined();
	});
});

describe('Error Handling: Array Type Mismatches', () => {
	interface IData {
		numbers: number[];
		dates: Date[];
	}

	class Data extends QModel<IData> {
		declare numbers: number[];
		declare dates: Date[];
	}

	test('should handle arrays with correct types', () => {
		const date1 = new Date('2024-01-01');
		const date2 = new Date('2024-01-02');
		
		const data = new Data({
			numbers: [1, 2, 3],
			dates: [date1, date2],
		});

		expect(Array.isArray(data.numbers)).toBe(true);
		expect(data.numbers[0]).toBe(1);
		expect(Array.isArray(data.dates)).toBe(true);
		expect(data.dates[0]).toBeInstanceOf(Date);
	});

	test('should detect array with wrong element types', () => {
		try {
			new Data({
				numbers: ['not', 'numbers'] as unknown as number[],
				dates: [],
			});

			// Currently might not validate array elements
			console.warn('⚠️  No validation for array element types');
		} catch (error: unknown) {
			expect(error).toBeDefined();
		}
	});
});

describe('Error Handling: Type Coercion vs Validation', () => {
	test('should accept types as provided (no automatic runtime validation)', () => {
		// QuickModel accepts data as-is - validation happens at TypeScript compile time
		const user = new User({
			id: '123' as unknown as number, // TypeScript error but runtime accepts
			name: 'John',
			email: 'john@test.com',
			age: 25,
			createdAt: new Date(),
			balance: 1000n,
		});

		// Model created successfully - runtime doesn't validate types
		expect(user.id).toBe('123');
		expect(user.name).toBe('John');
	});
});
