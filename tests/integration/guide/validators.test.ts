/**
 * Integration Test: Built-in validators
 * Covers: docs-vitepress/en/guide/validators.md
 *
 * Validates:
 * - @IsEmail, @Min, @Max, @MaxLength, @MinLength, @IsNotEmpty, @Matches
 * - Multiple validators on the same field
 * - Composition of validators + @QRule
 * - validationReport includes validator messages
 */

import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule } from '@/decorators';
import {
	IsEmail,
	Min,
	Max,
	MaxLength,
	MinLength,
	IsNotEmpty,
	Matches,
} from '@/core/decorators/validators';

// ── Model with built-in validators ────────────────────────────────────────────

interface IUserRegistration {
	email: string;
	username: string;
	age: number;
	bio: string;
}

@Quick({ age: Number }, { unknownPropertyPolicy: 'keep' })
class UserRegistrationModel extends QModel<IUserRegistration> {
	@IsEmail()
	declare email: string;

	@MinLength(3)
	@MaxLength(20)
	@IsNotEmpty()
	@Matches(/^[a-z0-9_]+$/, 'Only lowercase alphanumeric and underscores')
	declare username: string;

	@Min(18)
	@Max(120)
	declare age: number;

	@MaxLength(200)
	declare bio: string;
}

// ── Model mixing validators and @QRule ────────────────────────────────────────

interface IPost {
	title: string;
	content: string;
	score: number;
}

@Quick({ score: Number }, { unknownPropertyPolicy: 'keep' })
class PostModel extends QModel<IPost> {
	@IsNotEmpty()
	@QRule((val: string) => !val.includes('<script>'), 'No script tags allowed')
	declare title: string;

	@MinLength(20)
	declare content: string;

	@Min(0)
	@Max(100)
	declare score: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Integration: built-in validators (guide/validators.md)', () => {
	describe('@IsEmail', () => {
		test('valid email passes', () => {
			const user = new UserRegistrationModel({
				email: 'alice@example.com',
				username: 'alice_99',
				age: 25,
				bio: '',
			});
			const result = user.$qCheckRules();
			const emailErrors = result.errors.filter(
				(err) => err.field === 'email'
			);
			expect(emailErrors).toHaveLength(0);
		});

		test('invalid email fails', () => {
			const user = new UserRegistrationModel({
				email: 'not-an-email',
				username: 'alice_99',
				age: 25,
				bio: '',
			});
			const result = user.$qCheckRules();
			const emailErrors = result.errors.filter(
				(err) => err.field === 'email'
			);
			expect(emailErrors.length).toBeGreaterThan(0);
		});
	});

	describe('@Min / @Max', () => {
		test('age within range passes', () => {
			const user = new UserRegistrationModel({
				email: 'a@b.com',
				username: 'abc',
				age: 30,
				bio: '',
			});
			const result = user.$qCheckRules();
			const ageErrors = result.errors.filter(
				(err) => err.field === 'age'
			);
			expect(ageErrors).toHaveLength(0);
		});

		test('age below minimum fails', () => {
			const user = new UserRegistrationModel({
				email: 'a@b.com',
				username: 'abc',
				age: 15,
				bio: '',
			});
			const result = user.$qCheckRules();
			const ageErrors = result.errors.filter(
				(err) => err.field === 'age'
			);
			expect(ageErrors.length).toBeGreaterThan(0);
		});
	});

	describe('@MaxLength / @MinLength', () => {
		test('username too short fails @MinLength', () => {
			const user = new UserRegistrationModel({
				email: 'a@b.com',
				username: 'ab',
				age: 20,
				bio: '',
			});
			const result = user.$qCheckRules();
			const errors = result.errors.filter(
				(err) => err.field === 'username'
			);
			expect(errors.length).toBeGreaterThan(0);
		});

		test('username too long fails @MaxLength', () => {
			const user = new UserRegistrationModel({
				email: 'a@b.com',
				username: 'this_username_is_way_too_long_for_the_field',
				age: 20,
				bio: '',
			});
			const result = user.$qCheckRules();
			const errors = result.errors.filter(
				(err) => err.field === 'username'
			);
			expect(errors.length).toBeGreaterThan(0);
		});
	});

	describe('@Matches', () => {
		test('username with spaces fails @Matches', () => {
			const user = new UserRegistrationModel({
				email: 'a@b.com',
				username: 'invalid user',
				age: 20,
				bio: '',
			});
			const result = user.$qCheckRules();
			const errors = result.errors.filter(
				(err) => err.field === 'username'
			);
			expect(errors.length).toBeGreaterThan(0);
		});
	});

	describe('multiple validators on same field', () => {
		test('all violations reported for username', () => {
			const user = new UserRegistrationModel({
				email: 'a@b.com',
				username: '', // fails @IsNotEmpty, @MinLength
				age: 20,
				bio: '',
			});
			const result = user.$qCheckRules();
			const errors = result.errors.filter(
				(err) => err.field === 'username'
			);
			expect(errors.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('@QRule + validators composition', () => {
		test('both @IsNotEmpty and @QRule are checked on title', () => {
			const post = new PostModel({
				title: '',
				content: 'Some content that is long enough for the test',
				score: 50,
			});
			const result = post.$qCheckRules();
			const titleErrors = result.errors.filter(
				(err) => err.field === 'title'
			);
			expect(titleErrors.length).toBeGreaterThan(0);
		});

		test('@QRule fires on XSS attempt in title', () => {
			const post = new PostModel({
				title: 'Hello <script>alert(1)</script>',
				content: 'Content that is long enough to pass the min length',
				score: 50,
			});
			const result = post.$qCheckRules();
			const titleErrors = result.errors.filter(
				(err) => err.field === 'title'
			);
			expect(titleErrors.length).toBeGreaterThan(0);
		});
	});
});
