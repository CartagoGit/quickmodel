// tests/integration/external/zod-validation.test.ts
import { describe, it, expect } from 'bun:test';
import { Quick, QModel } from '@/index';
import { z } from 'zod';

/**
 * Integration Test: QuickModel + Zod
 *
 * Demonstrates the power combo:
 * 1. QuickModel transforms raw, typeless JSON into rich runtime objects (Dates, Sets, BigInts)
 * 2. Zod validates those rich objects with stricter rules than TS interfaces
 */

// 1. Define the Zod Schema (validating Runtime Types)
const UserSchema = z.object({
	id: z.string().uuid().or(z.string().min(1)), // Accepts UUID or non-empty string
	username: z.string().min(3).max(20),
	// Note: Zod validates the Date object, not the string!
	// This is possible because QuickModel converts it first.
	birthDate: z.date().min(new Date('1900-01-01')),
	// Validates Set size and content
	skills: z.set(z.string()).min(1),
	// Validates BigInt (e.g. for strict financial checks)
	balance: z.bigint().positive(),
});

// 2. Define the QuickModel (for Transformation)
@Quick(
	{
		birthDate: Date,
		skills: Set,
		balance: BigInt,
	},
	{ unknownPropertyPolicy: 'keep' }
)
class User extends QModel<any> {
	declare id: string;
	declare username: string;
	declare birthDate: Date;
	declare skills: Set<string>;
	declare balance: bigint;

	// Helper method to validate self
	validateWithZod() {
		return UserSchema.safeParse(this);
	}
}

describe('Integration: External Libraries (Zod)', () => {
	it('should pass Zod validation after valid transformation', () => {
		const rawValidData = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			username: 'supercoder',
			birthDate: '1995-12-17T03:24:00', // String in JSON
			skills: ['typescript', 'rust'], // Array in JSON
			balance: '1000000000000', // String in JSON
		};

		// 1. Transform (JSON -> Rich Object)
		const user = User.create(rawValidData);

		// 2. Validate (Rich Object check)
		const result = user.validateWithZod();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.birthDate).toBeInstanceOf(Date);
			expect(result.data.balance).toBe(1000000000000n);
		}
	});

	it('should fail Zod validation if business rules are violated (even if types are correct)', () => {
		const rawInvalidData = {
			id: '1',
			username: 'no', // Too short
			birthDate: '1800-01-01', // Too old
			skills: [], // Empty (min 1 required)
			balance: '-50', // Negative (positive required) - QuickModel handles BigInt conversion, Zod handles value check
		};

		const user = User.create(rawInvalidData);

		// QuickModel created the object successfully with types transformed
		expect(user.balance).toBe(-50n);
		expect(user.birthDate.getFullYear()).toBe(1800);

		// But Zod rejects the values
		const result = user.validateWithZod();

		expect(result.success).toBe(false);
		if (!result.success) {
			const errors = result.error.flatten().fieldErrors;
			expect(errors.username).toBeDefined();
			expect(errors.birthDate).toBeDefined();
			expect(errors.skills).toBeDefined();
			expect(errors.balance).toBeDefined();
		}
	});

	it('should fail Zod validation if QuickModel transformation failed silently (e.g. Invalid Date)', () => {
		// If QuickModel is configured to be permissive (default), an invalid date might result in an Invalid Date object
		// Zod date() schema rejects Invalid Date objects by default.
		const invalidDateData = {
			id: '1',
			username: 'valid',
			skills: ['a'],
			balance: '10',
			birthDate: 'not-a-date',
		};

		// QuickModel now throws strict errors for invalid dates instead of returning "Invalid Date"
		// So we expect this to throw
		expect(() => User.create(invalidDateData)).toThrow();
	});
});
