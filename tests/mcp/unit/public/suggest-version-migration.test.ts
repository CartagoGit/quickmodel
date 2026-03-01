import { describe, it, expect } from 'bun:test';
import { QSuggestVersionMigrationTool } from '../../../../src/mcp/tools/public/suggest-version-migration.tool';

const MODEL_V1 = `
@Quick({ createdAt: Date })
class UserModel extends QModel<IUserModel> {
  declare firstName: string;
  declare lastName: string;
  declare createdAt: Date;
}
`;

const MODEL_V2_ADDED = `
@Quick({ createdAt: Date })
class UserModel extends QModel<IUserModel> {
  declare fullName: string;
  declare firstName: string;
  declare lastName: string;
  declare createdAt: Date;
  declare email: string;
}
`;

const MODEL_V2_REMOVED = `
@Quick({ createdAt: Date })
class UserModel extends QModel<IUserModel> {
  declare firstName: string;
  declare createdAt: Date;
}
`;

const MODEL_V2_TYPE_CHANGE = `
@Quick({ createdAt: Date })
class UserModel extends QModel<IUserModel> {
  declare firstName: string;
  declare lastName: string;
  declare createdAt: Date;
  declare age: number;
}
`;

describe('QSuggestVersionMigrationTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QSuggestVersionMigrationTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('suggest_version_migration');
		expect(tool.description).toBeDefined();
	});

	it('should bump version from 1 to 2 by default', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		expect(result.target_version).toBe(2);
	});

	it('should detect added fields and include them in migration_steps', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		const step = result.migration_steps[0];
		expect(step).toBeDefined();
		expect(step?.manual_defaults).toContain('fullName');
		expect(step?.manual_defaults).toContain('email');
	});

	it('should detect removed fields in migration_steps', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_REMOVED,
			from_version: 1,
		});

		const step = result.migration_steps[0];
		expect(step?.removed).toContain('lastName');
	});

	it('should emit manual_items for added fields', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		expect(result.manual_items.length).toBeGreaterThan(0);
		const hasFullNameItem = result.manual_items.some((itm) =>
			itm.includes('fullName')
		);
		expect(hasFullNameItem).toBe(true);
	});

	it('should emit a qversion_decorator containing the target version', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		expect(result.qversion_decorator).toContain('@QVersion(2');
		expect(result.qversion_decorator).toContain('migrations');
	});

	it('should inject @QVersion into suggested_code before @Quick', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		const qversionIdx = result.suggested_code.indexOf('@QVersion');
		const quickIdx = result.suggested_code.indexOf('@Quick(');
		expect(qversionIdx).toBeGreaterThanOrEqual(0);
		expect(quickIdx).toBeGreaterThan(qversionIdx);
	});

	it('should auto-detect version from existing @QVersion decorator', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const modelWithVersion = `
@Quick({ createdAt: Date })
@QVersion(2, {
  migrations: {
    1: (data) => data,
  },
})
class UserModel extends QModel<IUserModel> {
  declare firstName: string;
  declare createdAt: Date;
}
`;
		const result = await tool.execute({
			current_model: modelWithVersion,
			next_model: MODEL_V2_TYPE_CHANGE,
			from_version: 1, // ignored — @QVersion(2) auto-detected
		});

		expect(result.target_version).toBe(3);
	});

	it('should handle identical models with no changes gracefully', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V1,
			from_version: 1,
		});

		expect(result.target_version).toBe(2);
		expect(result.manual_items).toHaveLength(0);
		const step = result.migration_steps[0];
		expect(step?.manual_defaults).toHaveLength(0);
		expect(step?.removed).toHaveLength(0);
	});

	it('should produce a non-empty summary', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		expect(result.summary).toBeTruthy();
		expect(result.summary).toContain('UserModel');
	});

	it('should bump from_version 3 to 4 when explicitly set', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 3,
		});

		expect(result.target_version).toBe(4);
		expect(result.qversion_decorator).toContain('@QVersion(4');
	});

	it('should embed migration_description as a field in the decorator', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
			migration_description: 'Merged firstName+lastName into fullName',
		});

		expect(result.qversion_decorator).toContain(
			`description: 'Merged firstName+lastName into fullName'`
		);
		// description field must appear before migrations
		const descIdx = result.qversion_decorator.indexOf('description:');
		const migrIdx = result.qversion_decorator.indexOf('migrations:');
		expect(descIdx).toBeGreaterThanOrEqual(0);
		expect(descIdx).toBeLessThan(migrIdx);
		expect(result.migration_steps[0]?.description).toBe(
			'Merged firstName+lastName into fullName'
		);
	});

	it('should not emit description field when migration_description is omitted', async () => {
		const tool = new QSuggestVersionMigrationTool();
		const result = await tool.execute({
			current_model: MODEL_V1,
			next_model: MODEL_V2_ADDED,
			from_version: 1,
		});

		expect(result.qversion_decorator).not.toContain('description:');
		expect(result.migration_steps[0]?.description).toBeUndefined();
	});
});
