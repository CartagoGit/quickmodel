/**
 * Integration Test: migrations (@QVersion)
 * Covers: docs-vitepress/en/guide/migrations.md
 *
 * Validates:
 * - @QVersion auto-migrates v1 data to v2 format
 * - Migration function receives old payload and returns new one
 * - Multi-step (v1 → v2 → v3) migrations run in sequence
 * - Data at current version passes through unchanged
 * - Data without _v is treated as current version
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QVersion } from '@/decorators';

// ── Single-step migration (v1 → v2) ──────────────────────────────────────────

interface IUser {
	fullName: string;
	_v?: number;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
@QVersion(2, {
	migrations: {
		1: (data) => ({
			...data,
			fullName:
				`${String(data['firstName'] ?? '')} ${String(data['lastName'] ?? '')}`.trim(),
		}),
	},
})
class UserModel extends QModel<IUser> {
	declare fullName: string;
}

// ── Multi-step migration (v1 → v2 → v3) ──────────────────────────────────────

interface IPost {
	body: string;
	tags: string[];
	_v?: number;
}

@Quick({ tags: [String] }, { unknownPropertyPolicy: 'keep' })
@QVersion(3, {
	migrations: {
		1: (data) => ({ ...data, body: data['content'] }), // v1 → v2
		2: (data) => ({ ...data, tags: [data['label']] }), // v2 → v3
	},
})
class PostModel extends QModel<IPost> {
	declare body: string;
	declare tags: string[];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: migrations (guide/migrations.md)', () => {
	describe('single-step migration (v1 → v2)', () => {
		test('v1 payload with firstName + lastName merges into fullName', () => {
			const user = new UserModel({
				firstName: 'Alice',
				lastName: 'Smith',
				_v: 1,
			} as never);

			expect(user.fullName).toBe('Alice Smith');
		});

		test('v2 payload (current) passes through unchanged', () => {
			const user = new UserModel({ fullName: 'Bob Jones', _v: 2 });

			expect(user.fullName).toBe('Bob Jones');
		});

		test('payload without _v is treated as current version (no migration)', () => {
			const user = new UserModel({ fullName: 'Carol Lee' });

			expect(user.fullName).toBe('Carol Lee');
		});
	});

	describe('multi-step migration (v1 → v2 → v3)', () => {
		test('v1 data runs through both migrations (content→body, label→tags[])', () => {
			const post = new PostModel({
				content: 'Hello world',
				label: 'news',
				_v: 1,
			} as never);

			expect(post.body).toBe('Hello world');
			expect(Array.isArray(post.tags)).toBe(true);
			expect(post.tags).toContain('news');
		});

		test('v2 data runs only the second migration (label→tags[])', () => {
			const post = new PostModel({
				body: 'Already v2',
				label: 'tech',
				_v: 2,
			} as never);

			expect(post.body).toBe('Already v2');
			expect(post.tags).toContain('tech');
		});

		test('v3 data (current) passes through unchanged', () => {
			const post = new PostModel({
				body: 'Current',
				tags: ['already'],
				_v: 3,
			});

			expect(post.body).toBe('Current');
			expect(post.tags).toContain('already');
		});
	});

	describe('migration result is a proper QModel', () => {
		test('migrated instance has all $q* methods', () => {
			const user = new UserModel({
				firstName: 'Dave',
				lastName: 'White',
				_v: 1,
			} as never);

			expect(user).toBeInstanceOf(UserModel);
			expect(typeof user.$qSerialize).toBe('function');
			expect(typeof user.$qCheckRules).toBe('function');
		});

		test('migrated value is accessible via $qSerialize()', () => {
			const user = new UserModel({
				firstName: 'Eve',
				lastName: 'Brown',
				_v: 1,
			} as never);

			const output = user.$qSerialize();
			expect(output['fullName']).toBe('Eve Brown');
		});
	});
});
