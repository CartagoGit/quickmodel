import { describe, it, expect } from 'bun:test';
import { QCreateModelTool } from '../../../../src/mcp/tools/public/create-model.tool';

describe('QCreateModelTool', () => {
	it('should be defined', () => {
		const tool = new QCreateModelTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('create_model');
	});

	it('should generate a basic model class with primitive types', async () => {
		const tool = new QCreateModelTool();
		const args = {
			className: 'User',
			properties: {
				name: 'string',
				age: 'number',
				isActive: 'boolean',
			},
		};

		const result = await tool.execute(args);

		expect(result.code).toContain(
			"import { Quick, QModel } from '@cartago-git/quickmodel';"
		);
		expect(result.code).toContain('interface IUser {');
		expect(result.code).toContain('name: string;');
		expect(result.code).toContain('age: number;');
		expect(result.code).toContain('isActive: boolean;');
		expect(result.code).toContain('@Quick({');
		expect(result.code).toContain('name: string');
		expect(result.code).toContain('age: number');
		expect(result.code).toContain(
			'export class User extends QModel<IUser> {'
		);
		expect(result.code).toContain('declare name: string;');
		expect(result.code).toContain('declare age: number;');
	});

	it('should correctly map special types like Date, RegExp, BigInt', async () => {
		const tool = new QCreateModelTool();
		const args = {
			className: 'SpecialModel',
			properties: {
				createdAt: 'Date',
				pattern: 'RegExp',
				amount: 'BigInt',
			},
		};

		const result = await tool.execute(args);

		// Interface check
		expect(result.code).toContain('createdAt: Date;');
		expect(result.code).toContain('pattern: RegExp;');
		expect(result.code).toContain('amount: BigInt;');

		// Decorator check
		expect(result.code).toContain('createdAt: Date');
		expect(result.code).toContain('pattern: RegExp');
		expect(result.code).toContain('amount: BigInt');

		// Class declaration check
		expect(result.code).toContain('declare createdAt: Date;');
		expect(result.code).toContain('declare pattern: RegExp;');
		expect(result.code).toContain('declare amount: BigInt;');
	});

	it('should fallback to any for unknown types', async () => {
		const tool = new QCreateModelTool();
		const args = {
			className: 'WeirdModel',
			properties: {
				stuff: 'custom_type',
				other: 'unknown',
			},
		};

		const result = await tool.execute(args);

		// Interface check (should be any because mapTypeToTs falls back to any for unknown strings)
		// Wait, the implementation of mapTypeToTs checks exact strings.
		// If it's not Date, RegExp, BigInt, string, number, boolean, it returns 'any'.
		// BUT the @Quick decorator uses the raw string passed in properties for the value.
		// e.g. stuff: custom_type

		expect(result.code).toContain('stuff: any;'); // Type in interface
		expect(result.code).toContain('stuff: custom_type'); // Value in decorator
		expect(result.code).toContain('declare stuff: any;'); // Type in class
	});
});
