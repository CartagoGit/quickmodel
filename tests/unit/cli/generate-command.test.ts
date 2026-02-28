import { describe, test, expect } from 'bun:test';
import {
	parseFields,
	generateModel,
	generateTransformer,
	generateIntegration,
	runGenerateCommand,
} from '@/cli/generate.command';

// ─── parseFields ─────────────────────────────────────────────────────────────

describe('parseFields', () => {
	test('returns empty array for empty string', () => {
		expect(parseFields('')).toEqual([]);
	});

	test('parses single field', () => {
		expect(parseFields('id:number')).toEqual([
			{ name: 'id', type: 'number' },
		]);
	});

	test('parses multiple fields', () => {
		expect(parseFields('id:number,name:string')).toEqual([
			{ name: 'id', type: 'number' },
			{ name: 'name', type: 'string' },
		]);
	});

	test('trims whitespace around field entries', () => {
		expect(parseFields(' id : number , name : string ')).toEqual([
			{ name: 'id', type: 'number' },
			{ name: 'name', type: 'string' },
		]);
	});
});

// ─── generateModel ───────────────────────────────────────────────────────────

describe('generateModel', () => {
	test('generates interface named I{ClassName}', () => {
		const out = generateModel('User', []);
		expect(out).toContain('export interface IUser');
	});

	test('generates class extending QModel<I{ClassName}>', () => {
		const out = generateModel('User', []);
		expect(out).toContain('export class User extends QModel<IUser>');
	});

	test('includes @Quick decorator', () => {
		const out = generateModel('User', []);
		expect(out).toContain('@Quick(');
	});

	test('imports Quick and QModel from quickmodel', () => {
		const out = generateModel('User', []);
		expect(out).toContain("from 'quickmodel'");
		expect(out).toContain('Quick');
		expect(out).toContain('QModel');
	});

	test('generates declare fields in class body', () => {
		const out = generateModel('User', [
			{ name: 'id', type: 'number' },
			{ name: 'name', type: 'string' },
		]);
		expect(out).toContain('declare id: number');
		expect(out).toContain('declare name: string');
	});

	test('generates all fields in interface', () => {
		const out = generateModel('User', [
			{ name: 'id', type: 'number' },
			{ name: 'name', type: 'string' },
		]);
		expect(out).toContain('id: number');
		expect(out).toContain('name: string');
	});

	test('uses @Quick({}) for all-primitive fields', () => {
		const out = generateModel('User', [
			{ name: 'id', type: 'number' },
			{ name: 'active', type: 'boolean' },
		]);
		expect(out).toContain('@Quick({})');
	});

	test('adds Date to @Quick config for Date fields', () => {
		const out = generateModel('Order', [
			{ name: 'createdAt', type: 'Date' },
		]);
		expect(out).toMatch(/@Quick\(\s*\{[^}]*createdAt:\s*Date/s);
	});

	test('does not add primitive types to @Quick config', () => {
		const out = generateModel('User', [{ name: 'age', type: 'number' }]);
		expect(out).not.toMatch(/@Quick\(\s*\{[^}]*age/s);
	});

	test('adds BigInt to @Quick config for BigInt fields', () => {
		const out = generateModel('Account', [
			{ name: 'balance', type: 'BigInt' },
		]);
		expect(out).toMatch(/@Quick\(\s*\{[^}]*balance:\s*BigInt/s);
	});

	test('adds Set to @Quick config for Set fields', () => {
		const out = generateModel('User', [{ name: 'tags', type: 'Set' }]);
		expect(out).toMatch(/@Quick\(\s*\{[^}]*tags:\s*Set/s);
	});

	test('adds Map to @Quick config for Map fields', () => {
		const out = generateModel('User', [{ name: 'meta', type: 'Map' }]);
		expect(out).toMatch(/@Quick\(\s*\{[^}]*meta:\s*Map/s);
	});

	test('every field has a declare in class body', () => {
		const fields = [
			{ name: 'id', type: 'number' },
			{ name: 'email', type: 'string' },
			{ name: 'createdAt', type: 'Date' },
		];
		const out = generateModel('Order', fields);
		for (const field of fields) {
			expect(out).toContain(`declare ${field.name}`);
		}
	});
});

// ─── generateTransformer ─────────────────────────────────────────────────────

describe('generateTransformer', () => {
	test('imports IQTransformer from quickmodel/advanced', () => {
		const out = generateTransformer('Decimal');
		expect(out).toContain('IQTransformer');
		expect(out).toContain("from 'quickmodel/advanced'");
	});

	test('uses camelCase variable name ending in Transformer', () => {
		const out = generateTransformer('Decimal');
		expect(out).toContain('decimalTransformer');
	});

	test('camelCases multi-word names', () => {
		const out = generateTransformer('MyCustomType');
		expect(out).toContain('myCustomTypeTransformer');
	});

	test('contains serialize and deserialize stubs', () => {
		const out = generateTransformer('Decimal');
		expect(out).toContain('serialize');
		expect(out).toContain('deserialize');
	});
});

// ─── generateIntegration ─────────────────────────────────────────────────────

describe('generateIntegration', () => {
	test('generates prisma boilerplate mentioning @prisma/client', () => {
		const out = generateIntegration('prisma');
		expect(out).toContain('@prisma/client');
		expect(out).toContain('QModel');
	});

	test('generates drizzle boilerplate', () => {
		const out = generateIntegration('drizzle');
		expect(out.toLowerCase()).toContain('drizzle');
		expect(out).toContain('QModel');
	});

	test('generates zod boilerplate', () => {
		const out = generateIntegration('zod');
		expect(out).toContain('zod');
		expect(out).toContain('QModel');
	});

	test('throws RangeError for unsupported integration target', () => {
		expect(() => generateIntegration('unknown')).toThrow(RangeError);
	});
});

// ─── runGenerateCommand ──────────────────────────────────────────────────────

describe('runGenerateCommand', () => {
	describe('model subcommand', () => {
		test('generates model without fields', () => {
			const out = runGenerateCommand(['model', 'User']);
			expect(out).toContain('class User extends QModel');
		});

		test('generates model with --fields', () => {
			const out = runGenerateCommand([
				'model',
				'User',
				'--fields',
				'id:number,name:string',
			]);
			expect(out).toContain('declare id: number');
			expect(out).toContain('declare name: string');
		});

		test('returns usage when class name is missing', () => {
			const out = runGenerateCommand(['model']);
			expect(out).toContain('Usage');
		});
	});

	describe('transformer subcommand', () => {
		test('generates transformer skeleton', () => {
			const out = runGenerateCommand(['transformer', 'Decimal']);
			expect(out).toContain('decimalTransformer');
		});

		test('returns usage when name is missing', () => {
			const out = runGenerateCommand(['transformer']);
			expect(out).toContain('Usage');
		});
	});

	describe('integration subcommand', () => {
		test('generates integration for known target', () => {
			const out = runGenerateCommand(['integration', 'prisma']);
			expect(out).toContain('@prisma/client');
		});

		test('returns usage when target is missing', () => {
			const out = runGenerateCommand(['integration']);
			expect(out).toContain('Usage');
		});

		test('returns error message for unknown integration target', () => {
			const out = runGenerateCommand(['integration', 'xyz']);
			expect(out).toContain('Unknown integration');
		});
	});

	describe('no subcommand or unknown subcommand', () => {
		test('returns usage when no args', () => {
			expect(runGenerateCommand([])).toContain('Usage');
		});

		test('returns usage for unknown subcommand', () => {
			expect(runGenerateCommand(['foo'])).toContain('Usage');
		});
	});
});
