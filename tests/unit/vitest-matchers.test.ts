// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * QuickModel Custom Matchers — Tests
 *
 * Tests for the quickmodelMatchers exported from src/matchers.ts.
 * This file both tests the matchers AND demonstrates their usage.
 *
 * Setup: extend bun:test's expect with quickmodelMatchers at the top.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed } from '@/decorators';
import { quickmodelMatchers } from '@/matchers';

// Extend bun:test's expect with custom matchers
expect.extend(
	quickmodelMatchers as unknown as Parameters<typeof expect.extend>[0] // @quickmodel-rule-ignore: no-as-unknown
);

// Augment bun:test Matchers interface for this file only
declare module 'bun:test' {
	// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
	interface Matchers<T = unknown> {
		toBeValidQModel(): void;
		toHaveQRuleError(field: string, message?: string): void;
		toHaveQField(fieldName: string): void;
		toMatchQModel(expected: Record<string, unknown>): void;
		toBeIntact(): void;
		toHaveDirtyField(field: string): void;
	}
}

// ---------------------------------------------------------------------------
// Test models
// ---------------------------------------------------------------------------

interface IProfile {
	id: string;
	username: string;
	email: string;
	score: number;
	display?: string;
}

@Quick(
	{ id: 'string', username: 'string', email: 'string', score: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class ProfileModel extends QModel<IProfile> {
	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule((val: string) => val.length >= 3, 'Username too short')
	@QRule((val: string) => /^[a-z0-9_]+$/.test(val), 'Invalid characters')
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	declare email: string;

	@QField({ widget: 'input', label: 'Score' })
	@QRule((val: number) => val >= 0, 'Score cannot be negative')
	@QRule((val: number) => val <= 100, 'Score exceeds maximum')
	declare score: number;

	declare id: string;

	@QComputed()
	get display(): string {
		return `${this.username} [${this.score}]`;
	}
}

// Plain class — also works with qCheckRules and matchers
class LoginForm {
	@QField({ widget: 'input', label: 'Email' })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email'
	)
	email = '';

	@QField({ widget: 'input', label: 'Password' })
	@QRule((val: string) => val.length >= 8, 'Password too short')
	password = '';
}

// ---------------------------------------------------------------------------
// Helper: create valid profile
// ---------------------------------------------------------------------------

function makeValidProfile(): ProfileModel {
	return new ProfileModel({
		id: 'p1',
		username: 'alice_01',
		email: 'alice@example.com',
		score: 95,
	});
}

// ---------------------------------------------------------------------------
// toBeValidQModel
// ---------------------------------------------------------------------------

describe('toBeValidQModel()', () => {
	test('passes for a model with all valid @QRule values', () => {
		const profile = makeValidProfile();
		expect(profile).toBeValidQModel();
	});

	test('fails for a model with invalid fields', () => {
		const profile = new ProfileModel({
			id: 'p2',
			username: 'ab',
			email: 'bad',
			score: -1,
		});
		expect(profile).not.toBeValidQModel();
	});

	test('works with plain class (non-QModel) decorated with @QRule', () => {
		const form = new LoginForm();
		form.email = 'valid@example.com';
		form.password = 'SecurePass1';
		expect(form).toBeValidQModel();
	});

	test('plain class fails with empty fields', () => {
		const form = new LoginForm();
		expect(form).not.toBeValidQModel();
	});
});

// ---------------------------------------------------------------------------
// toHaveQRuleError
// ---------------------------------------------------------------------------

describe('toHaveQRuleError(field, message?)', () => {
	let invalidProfile: ProfileModel;

	beforeEach(() => {
		invalidProfile = new ProfileModel({
			id: 'bad',
			username: 'ab', // too short
			email: 'not-email', // invalid format
			score: 200, // exceeds max
		});
	});

	test('detects error on username field', () => {
		expect(invalidProfile).toHaveQRuleError('username');
	});

	test('detects error on email field', () => {
		expect(invalidProfile).toHaveQRuleError('email');
	});

	test('matches exact error message', () => {
		expect(invalidProfile).toHaveQRuleError(
			'username',
			'Username too short'
		);
	});

	test('fails if no error on clean field', () => {
		const profile = makeValidProfile();
		expect(profile).not.toHaveQRuleError('email');
	});

	test('fails if message does not match', () => {
		expect(invalidProfile).not.toHaveQRuleError(
			'username',
			'Wrong message text'
		);
	});

	test('score field gets "exceeds maximum" error', () => {
		expect(invalidProfile).toHaveQRuleError(
			'score',
			'Score exceeds maximum'
		);
	});
});

// ---------------------------------------------------------------------------
// toHaveQField
// ---------------------------------------------------------------------------

describe('toHaveQField(fieldName)', () => {
	test('decorated field is detected', () => {
		const profile = makeValidProfile();
		expect(profile).toHaveQField('username');
	});

	test('all @QField fields are detected', () => {
		const profile = makeValidProfile();
		expect(profile).toHaveQField('email');
		expect(profile).toHaveQField('score');
	});

	test('id field (not decorated with @QField) is not detected', () => {
		const profile = makeValidProfile();
		expect(profile).not.toHaveQField('id');
	});

	test('non-existent field is not detected', () => {
		const profile = makeValidProfile();
		expect(profile).not.toHaveQField('nonExistentField');
	});

	test('works on plain class with @QField', () => {
		const form = new LoginForm();
		expect(form).toHaveQField('email');
		expect(form).toHaveQField('password');
	});
});

// ---------------------------------------------------------------------------
// toMatchQModel
// ---------------------------------------------------------------------------

describe('toMatchQModel(expected)', () => {
	test('two identical QModel instances match', () => {
		const profileA = makeValidProfile();
		const profileB = makeValidProfile();
		expect(profileA).toMatchQModel(profileB);
	});

	test('QModel vs plain serialized object matches', () => {
		const profile = makeValidProfile();
		const serialized = profile.$qSerialize() as object;
		expect(profile).toMatchQModel(serialized);
	});

	test('different values do not match', () => {
		const profileA = makeValidProfile();
		const profileB = profileA.$qCopy({ score: 50 });
		expect(profileA).not.toMatchQModel(profileB);
	});

	test('two plain objects with same data match', () => {
		const objA = { id: 'x', name: 'test' };
		const objB = { id: 'x', name: 'test' };
		expect(objA).toMatchQModel(objB);
	});

	test('copy() result matches updated data', () => {
		const original = makeValidProfile();
		const updated = original.$qCopy({ score: 80 });
		const expected = new ProfileModel({
			id: 'p1',
			username: 'alice_01',
			email: 'alice@example.com',
			score: 80,
		});
		expect(updated).toMatchQModel(expected);
	});
});

// ---------------------------------------------------------------------------
// toBeIntact
// ---------------------------------------------------------------------------

describe('toBeIntact()', () => {
	test('fresh model with valid data is intact', () => {
		const profile = makeValidProfile();
		expect(profile).toBeIntact();
	});

	test('non-QModel value fails the matcher', () => {
		const plain = { id: 'p1', name: 'test' };
		expect(plain).not.toBeIntact();
	});

	test('merged model is intact', () => {
		const profile = makeValidProfile();
		const updated = profile.$qCopy({ score: 50 });
		expect(updated).toBeIntact();
	});
});

// ---------------------------------------------------------------------------
// toHaveDirtyField
// ---------------------------------------------------------------------------

describe('toHaveDirtyField(field)', () => {
	test('fresh model has no dirty fields', () => {
		const profile = makeValidProfile();
		expect(profile).not.toHaveDirtyField('username');
		expect(profile).not.toHaveDirtyField('email');
		expect(profile).not.toHaveDirtyField('score');
	});

	test('mutated field is dirty', () => {
		const profile = makeValidProfile();
		profile.score = 50;
		expect(profile).toHaveDirtyField('score');
	});

	test('non-mutated fields remain clean', () => {
		const profile = makeValidProfile();
		profile.score = 50;
		expect(profile).not.toHaveDirtyField('username');
		expect(profile).not.toHaveDirtyField('email');
	});

	test('non-QModel fails the matcher', () => {
		const plain = { name: 'test' };
		expect(plain).not.toHaveDirtyField('name');
	});

	test('reset() clears dirty state', () => {
		const profile = makeValidProfile();
		profile.score = 0;
		expect(profile).toHaveDirtyField('score');
		profile.$qReset();
		expect(profile).not.toHaveDirtyField('score');
	});

	test('merge() result has no dirty fields', () => {
		const profile = makeValidProfile();
		const updated = profile.$qCopy({ score: 60 });
		expect(updated).not.toHaveDirtyField('score'); // new snapshot
	});
});
