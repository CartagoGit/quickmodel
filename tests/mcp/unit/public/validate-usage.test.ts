import { describe, it, expect } from 'bun:test';
import { QValidateUsageTool } from '../../../../src/mcp/tools/public/validate-usage.tool';

describe('QValidateUsageTool', () => {
	it('should be defined', () => {
		const tool = new QValidateUsageTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('validate_usage');
	});

	it('should return valid for correct usage', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            @Quick({ name: 'string' })
            export class User extends QModel<IUser> {
                declare name: string;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(true);
		expect(result.issues).toBeEmpty();
	});

	it('should detect missing QModel inheritance', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            @Quick({})
            export class User { // Missing extends
                declare name: string;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(false);
		expect(result.issues).toContain(
			'Class should extend QModel<Interface>'
		);
	});

	it('should detect missing declare keyword', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            @Quick({})
            export class User extends QModel {
                name: string; // Missing declare
            }
        `;
		const result = await tool.execute({ code });
		// The simplistic check looks for "declare " presence anywhere in file
		expect(result.valid).toBe(false);
		expect(result.issues).toContain(
			'Properties in QModel classes should be defined with "declare"'
		);
	});

	it('should detect missing @Quick decorator', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            export class User extends QModel {
                declare name: string;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(false);
		// Updated message that reflects the full API
		expect(result.issues.some((iss) => iss.includes('@Quick'))).toBe(true);
	});

	// ── Full API decorator awareness ──────────────────────────────────────────

	it('should accept a model using only @QRule (no @Quick needed)', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            export class User extends QModel<IUser> {
                declare name: string;
                @QRule((self) => self.name.length > 0, 'Name is required')
                declare age: number;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(true);
		expect(result.issues).toBeEmpty();
	});

	it('should accept a model using only @QField (no @Quick needed)', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            @QField({ label: 'User' })
            export class User extends QModel<IUser> {
                declare name: string;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(true);
	});

	it('should accept a model using @QComputed or @QAlias', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            export class User extends QModel<IUser> {
                declare name: string;
                @QComputed(() => 'hello')
                declare greeting: string;
                @QAlias('user_name')
                declare userName: string;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(true);
	});

	it('should warn when @QField is used without any @QRule', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            export class User extends QModel<IUser> {
                @QField({ label: 'Name', required: true })
                declare name: string;
            }
        `;
		const result = await tool.execute({ code });
		// Valid (no errors) but should warn about QField without QRule
		expect(result.valid).toBe(true);
		expect(
			result.issues.some(
				(iss) => iss.includes('@QRule') && iss.includes('@QField')
			)
		).toBe(true);
	});

	it('should report which decorators are present', async () => {
		const tool = new QValidateUsageTool();
		const code = `
            @Quick({ name: 'string' })
            export class User extends QModel<IUser> {
                declare name: string;
                @QRule((s) => s.name.length > 0, 'required')
                declare age: number;
                @QField({ label: 'Age' })
                declare city: string;
            }
        `;
		const result = await tool.execute({ code });
		expect(result.valid).toBe(true);
		expect(result.detectedDecorators).toBeDefined();
		expect(result.detectedDecorators).toContain('@Quick');
		expect(result.detectedDecorators).toContain('@QRule');
		expect(result.detectedDecorators).toContain('@QField');
	});
});
