import { describe, it, expect } from 'bun:test';
import { QExportJsonSchemaTool } from '../../../../src/mcp/tools/public/export-schema.tool';

describe('QExportJsonSchemaTool', () => {
    it('should be defined', () => {
        const tool = new QExportJsonSchemaTool();
        expect(tool).toBeDefined();
        expect(tool.name).toBe('export_json_schema');
    });

    it('should extract class name as title', async () => {
        const tool = new QExportJsonSchemaTool();
        const code = `
            export class PendingUser extends QModel {
                @Quick({})
                prop: any;
            }
        `;
        const result = await tool.execute({ code });
        // The mock QInspectModelTool behavior inside might depend on real implementation.
        // Since we are running integration/unit tests on the real code, it should work if QInspectModelTool works.
        // QInspectModel tool likely regexes "class Name"
        
        expect((result.schema as any).title).toBe('PendingUser');
    });

    it('should map primitives to json schema types', async () => {
        const tool = new QExportJsonSchemaTool();
        const code = `
            @Quick({
                name: 'string',
                age: 'number',
                isActive: 'boolean'
            })
            export class User extends QModel {}
        `;
        const result = await tool.execute({ code });
        const schema = result.schema as any;

        expect(schema.type).toBe('object');
        expect(schema.properties.name).toEqual({ type: 'string' });
        expect(schema.properties.age).toEqual({ type: 'number' });
        expect(schema.properties.isActive).toEqual({ type: 'boolean' });
    });

    it('should map date to string with format date-time', async () => {
        const tool = new QExportJsonSchemaTool();
        const code = `
            @Quick({
                createdAt: 'date'
            })
            export class Log extends QModel {}
        `;
        const result = await tool.execute({ code });
        const schema = result.schema as any;

        expect(schema.properties.createdAt).toEqual({ type: 'string', format: 'date-time' });
    });

    it('should handle unquoted keys if regex supports it (or quoted values)', async () => {
        // The implementation uses /([\w]+):\s*['"](\w+)['"]/g
        // So keys must be words, values must be quoted.
        const tool = new QExportJsonSchemaTool();
        const code = `
            @Quick({
                field1: "string",
                field2: 'number'
            })
            class Test {}
        `;
        const result = await tool.execute({ code });
        const schema = result.schema as any;
        expect(schema.properties.field1).toEqual({ type: 'string' });
        expect(schema.properties.field2).toEqual({ type: 'number' });
    });
});
