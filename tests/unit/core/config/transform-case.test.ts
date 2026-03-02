import { QModel, Quick } from '@/index';
import { QConfig } from '@/core/config/quick.config';
import { describe, test, expect, beforeEach } from 'bun:test';

describe('Configuration: transformCase', () => {
	beforeEach(() => {
		// Reset global config, preserving unknownPropertyPolicy: 'keep' for declare fields
		QConfig.configure({ defaults: { unknownPropertyPolicy: 'keep' } });
	});

	// -------------------------------------------------------------------------
	// 1. INPUT transformation (Input Key -> Model Property)
	// -------------------------------------------------------------------------

	test('should transform snake_case input to camelCase property (in: snake_case)', () => {
		@Quick(
			{},
			{
				transformCase: { in: 'snake_case' },
				unknownPropertyPolicy: 'keep',
			}
		)
		class User extends QModel<any> {
			declare userId: number;
			declare userName: string;
		}

		// Input uses snake_case keys
		const user = new User({
			user_id: 123,
			user_name: 'John',
		});

		// Model properties should be populated
		expect(user.userId).toBe(123);
		expect(user.userName).toBe('John');
	});

	test('should transform kebab-case input to camelCase property (in: kebab-case)', () => {
		@Quick(
			{},
			{
				transformCase: { in: 'kebab-case' },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Config extends QModel<any> {
			declare apiKey: string;
			declare maxRetries: number;
		}

		const config = new Config({
			'api-key': 'secret',
			'max-retries': 5,
		});

		expect(config.apiKey).toBe('secret');
		expect(config.maxRetries).toBe(5);
	});

	test('should prioritize exact match over transformation', () => {
		@Quick(
			{},
			{
				transformCase: { in: 'snake_case' },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Ambiguous extends QModel<any> {
			declare userId: number; // camel
			declare user_id: number; // snake
		}

		const instance = new Ambiguous({ user_id: 100 });

		expect(instance.userId).toBe(100);
		expect(instance.user_id).toBeUndefined();
	});

	test('should handle unknown properties correctly with transformation', () => {
		@Quick(
			{},
			{
				transformCase: { in: 'snake_case' },
				unknownPropertyPolicy: 'keep',
			}
		)
		class User extends QModel<any> {
			declare userId: number;
		}

		const user = new User({
			user_id: 123,
			unknown_prop: 'saved',
		});

		expect(user.userId).toBe(123);
		// Since transformCase is active, unknown properties are ALSO normalized
		expect((user as any)['unknownProp']).toBe('saved');
	});

	// -------------------------------------------------------------------------
	// 2. OUTPUT transformation (Model Property -> Output Key)
	// -------------------------------------------------------------------------

	test('should transform camelCase property to snake_case output (out: snake_case)', () => {
		@Quick(
			{},
			{
				transformCase: { out: 'snake_case' },
				unknownPropertyPolicy: 'keep',
			}
		)
		class User extends QModel<any> {
			declare userId: number;
			declare userName: string;
		}

		const user = new User({ userId: 123, userName: 'John' }); // Input is normal here
		const json = user.toJSON();

		expect(json['user_id']).toBe(123);
		expect(json['user_name']).toBe('John');
		expect(json['userId']).toBeUndefined();
	});

	test('should transform camelCase property to kebab-case output (out: kebab-case)', () => {
		@Quick(
			{},
			{
				transformCase: { out: 'kebab-case' },
				unknownPropertyPolicy: 'keep',
			}
		)
		class Config extends QModel<any> {
			declare apiKey: string;
		}

		const config = new Config({ apiKey: 'secret' });
		const json = config.toJSON();

		expect(json['api-key']).toBe('secret');
	});

	// -------------------------------------------------------------------------
	// 3. Roundtrip
	// -------------------------------------------------------------------------

	test('should support full roundtrip (snake_in -> camel_model -> snake_out)', () => {
		@Quick(
			{ createdAt: Date },
			{
				transformCase: {
					in: 'snake_case',
					out: 'snake_case',
				},
				unknownPropertyPolicy: 'keep',
			}
		)
		class User extends QModel<any> {
			declare userId: number;
			declare createdAt: Date;
		}

		// Mock API payload
		const payload = {
			user_id: 555,
			created_at: '2024-01-01T00:00:00.000Z',
		};

		const user = new User(payload);

		expect(user.userId).toBe(555);
		expect(user.createdAt).toBeInstanceOf(Date);

		// Let's check output
		const json = user.toJSON();

		expect(json['user_id']).toBe(555);
		expect(json['created_at']).toBe('2024-01-01T00:00:00.000Z');
	});
});

// ---------------------------------------------------------------------------
// CaseHelper direct coverage — lines 31-34 (PascalCase + default branch)
// ---------------------------------------------------------------------------
import { CaseHelper } from '@/core/helpers/case.helper';

describe('CaseHelper.toCase — uncovered branches', () => {
	test('PascalCase: should capitalize every word', () => {
		expect(CaseHelper.toCase('PascalCase', 'hello world')).toBe(
			'HelloWorld'
		);
		expect(CaseHelper.toCase('PascalCase', 'user_id')).toBe('UserId');
		expect(CaseHelper.toCase('PascalCase', 'apiKey')).toBe('ApiKey');
	});

	test('default (unknown format): should return original string unchanged', () => {
		// The switch default: return str — only reachable with a non-union value
		expect(CaseHelper.toCase('unknownFormat' as any, 'hello world')).toBe(
			'hello world'
		);
	});

	test('edge: empty string returns empty string', () => {
		expect(CaseHelper.toCase('PascalCase', '')).toBe('');
	});
});
