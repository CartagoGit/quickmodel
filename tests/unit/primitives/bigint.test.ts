/**
 * Unit Test: BigInt Transformation
 * 
 * Tests BigInt serialization and deserialization transformations
 */

import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '../../../src';

describe('Unit: BigInt Transformer', () => {
	interface IAccount {
		id: string;
		balance: string; // Serialized as string
	}

	@Quick({
		balance: BigInt,
	})
	class Account extends QModel<IAccount> {
		id!: string;
		balance!: bigint;
	}

	test('should serialize bigint to string', () => {
		const account = new Account({
			id: '1',
			balance: '999999999999999999',
		});

		const serialized = account.toInterface();

		expect(serialized.balance).toBe('999999999999999999');
		expect(typeof serialized.balance).toBe('string');
	});

	test('should deserialize string to bigint', () => {
		const account = new Account({
			id: '1',
			balance: '999999999999999999',
		});

		expect(account.balance).toBe(999999999999999999n);
		expect(typeof account.balance).toBe('bigint');
	});

	test('should handle very large bigint values', () => {
		const huge = '9007199254740992'; // > Number.MAX_SAFE_INTEGER
		const account = new Account({
			id: '1',
			balance: huge,
		});

		expect(account.balance).toBe(9007199254740992n);
		expect(account.toInterface().balance).toBe(huge);
	});

	test('should roundtrip bigint correctly', () => {
		const account1 = new Account({
			id: '1',
			balance: '123456789012345678901234567890',
		});

		const json = account1.toJSON();
		const account2 = Account.fromJSON(json);

		expect(account2.balance).toBe(account1.balance);
		expect(account2.balance).toBe(123456789012345678901234567890n);
	});

	test('should handle zero bigint', () => {
		const account = new Account({
			id: '1',
			balance: '0',
		});

		expect(account.balance).toBe(0n);
		expect(account.toInterface().balance).toBe('0');
	});

	test('should handle negative bigint', () => {
		const account = new Account({
			id: '1',
			balance: '-999999',
		});

		expect(account.balance).toBe(-999999n);
		expect(account.toInterface().balance).toBe('-999999');
	});
});
