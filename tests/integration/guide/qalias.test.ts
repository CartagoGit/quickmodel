/**
 * Integration Test: @QAlias decorator
 * Covers: docs-vitepress/en/guide/qalias.md
 *
 * Validates:
 * - Roundtrip snake_case input → camelCase property → snake_case serialize
 * - Fallback to camelCase when alias key is absent
 * - @QAlias takes precedence over camelCase when both present
 * - @QAlias + @QSensitive: alias resolved but field excluded from serialize
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QAlias, QSensitive } from '@/decorators';

// ── Direct doc example model ──────────────────────────────────────────────────

interface IApiUser {
	userId: number;
	firstName: string;
	lastName: string;
	apiKey: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ApiUserModel extends QModel<IApiUser, Record<never, never>, 'apiKey'> {
	@QAlias('user_id')
	declare userId: number;

	@QAlias('first_name')
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('api_key')
	@QSensitive()
	declare apiKey: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QAlias (guide/qalias.md)', () => {
	describe('snake_case roundtrip', () => {
		test('accepts snake_case input and maps to camelCase properties', () => {
			const user = new ApiUserModel({
				user_id: 42,
				first_name: 'Alice',
				last_name: 'Smith',
				api_key: 'sk_live_abc',
			} as unknown as IApiUser); // @quickmodel-rule-ignore: no-as-unknown

			expect(user.userId).toBe(42);
			expect(user.firstName).toBe('Alice');
			expect(user.lastName).toBe('Smith');
			expect(user.apiKey).toBe('sk_live_abc');
		});

		test('serialize() emits snake_case keys', () => {
			const user = new ApiUserModel({
				user_id: 42,
				first_name: 'Alice',
				last_name: 'Smith',
				api_key: 'sk_live_abc',
			} as unknown as IApiUser); // @quickmodel-rule-ignore: no-as-unknown

			const output = user.$qSerialize({ includeSensitive: true });

			expect(output).toHaveProperty('user_id', 42);
			expect(output).toHaveProperty('first_name', 'Alice');
			expect(output).toHaveProperty('last_name', 'Smith');
			expect(output).toHaveProperty('api_key', 'sk_live_abc');
			expect(output).not.toHaveProperty('firstName');
			expect(output).not.toHaveProperty('userId');
		});
	});

	describe('fallback to camelCase', () => {
		test('accepts camelCase keys when alias is absent', () => {
			const user = new ApiUserModel({
				userId: 10,
				firstName: 'Bob',
				lastName: 'Jones',
				apiKey: 'sk_test_xyz',
			});

			expect(user.userId).toBe(10);
			expect(user.firstName).toBe('Bob');
		});
	});

	describe('alias takes precedence', () => {
		test('alias key wins when both alias and camelCase are present', () => {
			const user = new ApiUserModel({
				user_id: 99,
				userId: 1,
				first_name: 'Charlie',
				firstName: 'Wrong',
				last_name: 'Brown',
				api_key: 'tok',
			} as unknown as IApiUser); // @quickmodel-rule-ignore: no-as-unknown

			// alias value wins
			expect(user.userId).toBe(99);
			expect(user.firstName).toBe('Charlie');
		});
	});

	describe('@QAlias + @QSensitive composition', () => {
		test('alias resolves correctly but field excluded from default serialize', () => {
			const user = new ApiUserModel({
				user_id: 5,
				first_name: 'Dana',
				last_name: 'Lee',
				api_key: 'secret_key',
			} as unknown as IApiUser); // @quickmodel-rule-ignore: no-as-unknown

			// property is accessible
			expect(user.apiKey).toBe('secret_key');

			// excluded from default serialize
			const output = user.$qSerialize();
			expect(output).not.toHaveProperty('api_key');
			expect(output).not.toHaveProperty('apiKey');

			// included with includeSensitive: true
			const full = user.$qSerialize({ includeSensitive: true });
			expect(full).toHaveProperty('api_key', 'secret_key');
		});
	});
});
