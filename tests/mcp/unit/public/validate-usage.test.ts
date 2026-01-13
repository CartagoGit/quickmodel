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
		expect(result.issues).toContain(
			'Class should be decorated with @Quick (or properties with @QType)'
		);
	});
});
