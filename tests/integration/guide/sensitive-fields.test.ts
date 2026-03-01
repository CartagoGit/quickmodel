/**
 * Integration Test: @QSensitive decorator
 * Covers: docs-vitepress/en/guide/sensitive-fields.md
 *
 * Validates:
 * - @QSensitive fields excluded from serialize() by default
 * - @QSensitive fields accessible via direct property access
 * - includeSensitive:true includes them in serialize()
 * - toJSON() excludes by default, includes with includeSensitive:true
 * - toInterface() always returns full data (not affected)
 * - Inheritance: parent's @QSensitive propagates to child
 * - Composition: @QSensitive + @QReadonly + @QDefault
 * - Multiple sensitive fields behave independently
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QSensitive, QReadonly, QDefault } from '@/decorators';

// ── Direct doc example model ──────────────────────────────────────────────────

interface IUser {
	id: number;
	email: string;
	password: string;
	apiToken: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	declare id: number;
	declare email: string;

	@QSensitive()
	declare password: string;

	@QSensitive()
	declare apiToken: string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: @QSensitive (guide/sensitive-fields.md)', () => {
	describe('serialize() excludes sensitive fields by default', () => {
		test('password and apiToken absent from serialize()', () => {
			const user = new UserModel({
				id: 1,
				email: 'alice@example.com',
				password: 'supersecret',
				apiToken: 'tok_abc123',
			});

			const output = user.$qSerialize();

			expect(output).toHaveProperty('id', 1);
			expect(output).toHaveProperty('email', 'alice@example.com');
			expect(output).not.toHaveProperty('password');
			expect(output).not.toHaveProperty('apiToken');
		});
	});

	describe('Direct property access is always available', () => {
		test('sensitive fields are fully accessible as properties', () => {
			const user = new UserModel({
				id: 1,
				email: 'alice@example.com',
				password: 'supersecret',
				apiToken: 'tok_abc123',
			});

			expect(user.password).toBe('supersecret');
			expect(user.apiToken).toBe('tok_abc123');
		});
	});

	describe('includeSensitive:true', () => {
		test('serialize({ includeSensitive: true }) includes all fields', () => {
			const user = new UserModel({
				id: 1,
				email: 'alice@example.com',
				password: 'supersecret',
				apiToken: 'tok_abc123',
			});

			const output = user.$qSerialize({ includeSensitive: true });

			expect(output).toHaveProperty('password', 'supersecret');
			expect(output).toHaveProperty('apiToken', 'tok_abc123');
		});
	});

	describe('toJSON()', () => {
		test('toJSON() excludes sensitive fields by default', () => {
			const user = new UserModel({
				id: 1,
				email: 'alice@example.com',
				password: 'supersecret',
				apiToken: 'tok_abc123',
			});

			const parsed = JSON.parse(user.toJSON()) as Record<string, unknown>;

			expect(parsed).not.toHaveProperty('password');
			expect(parsed).not.toHaveProperty('apiToken');
		});

		test('toJSON({ includeSensitive: true }) includes them', () => {
			const user = new UserModel({
				id: 1,
				email: 'alice@example.com',
				password: 'secret',
				apiToken: 'tok',
			});

			const parsed = JSON.parse(
				user.toJSON({ includeSensitive: true })
			) as Record<string, unknown>;

			expect(parsed['password']).toBe('secret');
			expect(parsed['apiToken']).toBe('tok');
		});
	});

	describe('toInterface() always returns full data', () => {
		test('toInterface() includes sensitive fields regardless', () => {
			const user = new UserModel({
				id: 1,
				email: 'alice@example.com',
				password: 'supersecret',
				apiToken: 'tok_abc123',
			});

			const iface = user.$qToInterface();

			expect(iface.password).toBe('supersecret');
			expect(iface.apiToken).toBe('tok_abc123');
		});
	});

	describe('Inheritance', () => {
		interface IBaseUser {
			id: string;
			password: string;
		}

		@Quick()
		class BaseUser extends QModel<IBaseUser> {
			declare id: string;

			@QSensitive()
			declare password: string;
		}

		@Quick()
		class AdminUser extends BaseUser {
			declare role: string;
		}

		test('child class inherits @QSensitive from parent', () => {
			const admin = new AdminUser({
				id: 'u1',
				password: 'admin-pass',
				role: 'superadmin',
			});

			const output = admin.$qSerialize();

			expect(output).toHaveProperty('id');
			expect(output).toHaveProperty('role');
			expect(output).not.toHaveProperty('password');
		});

		test('includeSensitive:true on child exposes parent sensitive field', () => {
			const admin = new AdminUser({
				id: 'u1',
				password: 'admin-pass',
				role: 'superadmin',
			});

			const output = admin.$qSerialize({ includeSensitive: true });
			expect(output['password']).toBe('admin-pass');
		});
	});

	describe('Composition: @QSensitive + @QReadonly + @QDefault', () => {
		interface IToken {
			id: string;
			secret: string;
			createdAt: Date;
		}

		@Quick({ createdAt: Date })
		class TokenModel extends QModel<IToken> {
			declare id: string;

			@QReadonly()
			@QSensitive()
			declare secret: string;

			@QDefault(() => new Date())
			declare createdAt: Date;
		}

		test('secret is immutable and excluded from serialize()', () => {
			const token = new TokenModel({ id: 't1', secret: 'abc123' });

			const output = token.$qSerialize();
			expect(output).not.toHaveProperty('secret');
			expect(() => token.$qCopy({ secret: 'hacked' })).toThrow();
		});

		test('default createdAt is present in serialize()', () => {
			const token = new TokenModel({ id: 't2', secret: 'abc' });
			const output = token.$qSerialize();
			expect(output).toHaveProperty('createdAt');
		});
	});
});
