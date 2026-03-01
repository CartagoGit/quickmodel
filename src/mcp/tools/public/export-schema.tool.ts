import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { QInspectModelTool } from './inspect-model.tool';

/**
 * MCP tool that converts a QuickModel class definition into a standard
 * JSON Schema (draft-07) object.
 *
 * @remarks
 * Delegates structural inspection to {@link QInspectModelTool} and then maps
 * each QuickModel transformer type to its closest JSON Schema equivalent:
 * - `date` → `{ type: "string", format: "date-time" }`
 * - `number` / `integer` → `{ type: "number" }`
 * - `boolean` → `{ type: "boolean" }`
 * - everything else → `{ type: "string" }` (safe default)
 *
 * All detected properties are marked as required by default.
 *
 * @returns `{ schema: object }` — a JSON Schema object with `type`, `title`,
 * `properties`, and `required` keys.
 *
 * @see {@link QGetModelSchemaTool} — multi-format schema generation (openapi, zod, graphql, etc.)
 * @see {@link QGetFormSchemaTool} — form-oriented schema for UI frameworks
 * @see {@link QInspectModelTool} — structural model inspection
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QExportJsonSchemaTool extends QAbstractTool<
	z.ZodObject<{
		code: z.ZodString;
	}>
> {
	name = 'export_json_schema';
	description =
		'Generate a JSON Schema Definition (Draft-07) from a QuickModel class source string. ' +
		'Statically parses the @Quick({ }) decorator to extract field type mappings, ' +
		'then produces a standards-compliant { $schema, type, properties, required[] } object. ' +
		'Returns { schema } — a JSON Schema object ready for validation or documentation use.';
	schema = z.object({
		code: z.string().describe('The QuickModel class code'),
	});

	/**
	 * Generates a JSON Schema Definition from a QuickModel class.
	 *
	 * @param args - Tool arguments.
	 * @param args.code - TypeScript source code of the QuickModel class.
	 * @returns `{ schema }` — a JSON Schema Draft-07 object derived from the class.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QGetModelSchemaTool} — for multi-format schema generation (openapi, zod, graphql)
	 */
	async execute(args: { code: string }): Promise<{ schema: object }> {
		// Use inspect logic to get structure, then map to standard JSON Schema
		const tool = new QInspectModelTool();
		const inspectResult = await tool.execute({ code: args.code });
		// const _decorators = inspectResult.transformers; // e.g. ['string', 'date']
		// We need the keys too. QInspectModelTool currently only returns values in some regex way,
		// let's parse the structure property which was the config object string.
		// Actually, let's just re-parse here better for schema.

		const schema: {
			type: 'object';
			properties: Record<string, { type: string; format?: string }>;
			required: string[];
			title: string;
		} = {
			type: 'object',
			properties: {},
			required: [],
			title: inspectResult.name,
		};

		// Parse @Quick({ func: 'type' })
		// Flexible regex for keys and values
		const matches = args.code.matchAll(/(\w+):\s*['"](\w+)['"]/g);
		for (const matchResult of matches) {
			const key = matchResult[1]; // prop name
			const type = matchResult[2]; // transformer name

			let jsonType: { type: string; format?: string } = {
				type: 'string',
			};
			if (type === 'number' || type === 'integer')
				jsonType = { type: 'number' };
			else if (type === 'boolean') jsonType = { type: 'boolean' };
			else if (type === 'date')
				jsonType = { type: 'string', format: 'date-time' };

			if (key) {
				schema.properties[key] = jsonType;
				// Assume required for now unless we parse '?'
				schema.required.push(key);
			}
		}

		return { schema };
	}
}
