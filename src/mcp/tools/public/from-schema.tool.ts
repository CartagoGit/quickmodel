import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { SchemaToModelService } from '@/core/services/schema-to-model.service';
import type { IFromSchemaFormat } from '@/core/types/schema-types';

const SUPPORTED_FORMATS = {
	json: 'json',
	openapi: 'openapi',
	ajv: 'ajv',
	typescript: 'typescript',
	graphql: 'graphql',
	prisma: 'prisma',
	valibot: 'valibot',
	yup: 'yup',
	typebox: 'typebox',
	'effect-schema': 'effect-schema',
	drizzle: 'drizzle',
	mongo: 'mongo',
} as const;

/**
 * MCP tool that converts a formal schema back into a QuickModel class definition.
 *
 * This is the **inverse** of `QGetModelSchemaTool`:
 * - `get_model_schema`: QModel class → schema in a given format
 * - `from_schema`: schema → QModel class definition
 *
 * @remarks
 * Supported formats:
 * - `'json'` — JSON Schema Draft-07 object (serialized as JSON string)
 * - `'openapi'` — OpenAPI 3.0 component schema or document (serialized as JSON string)
 * - `'ajv'` — AJV-compatible JSON Schema (same structure as `'json'`)
 * - `'typescript'` — TypeScript interface source string
 *
 * For `json`, `openapi`, and `ajv`, the `schema` param must be a valid JSON string that
 * will be parsed into an object before processing.
 * For `typescript`, the `schema` param is a raw TypeScript interface source string.
 *
 * @returns `{ code: string }` — a fully-formed TypeScript class extending `QModel`.
 *
 * @throws {Error} If the schema string is invalid JSON (for object formats).
 * @throws {Error} If the TypeScript interface cannot be parsed (for `typescript` format).
 * @throws {Error} If the requested OpenAPI schema key is not found in `components.schemas`.
 *
 * @see {@link SchemaToModelService} — underlying service powering this tool
 * @see {@link QGetModelSchemaTool} — generates a schema from an existing QModel class
 * @see {@link QJsonToModelTool} — convert a plain JSON object (not a formal schema)
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QFromSchemaTool extends QAbstractTool<z.ZodObject<any>> {
	name = 'from_schema';
	description =
		'Convert a formal schema back into a QuickModel class definition. ' +
		'This is the inverse of get_model_schema: given a JSON Schema, OpenAPI schema, AJV schema, ' +
		'TypeScript interface, GraphQL SDL type, Prisma model block, Valibot schema, Yup schema, ' +
		'TypeBox schema, Effect Schema, Drizzle pgTable, or Mongoose schema object, ' +
		'generate a ready-to-use QModel class with @Quick decorators. ' +
		'Supported formats: json, openapi, ajv, typescript, graphql, prisma, valibot, yup, typebox, effect-schema, drizzle, mongo. ' +
		'For json/openapi/ajv/mongo: provide the schema as a JSON string. ' +
		'For typescript/graphql/prisma/valibot/yup/typebox/effect-schema/drizzle: provide the source string directly. ' +
		'Returns { code } — TypeScript source for a class extending QModel.';

	schema = z.object({
		schema: z
			.string()
			.describe(
				'The schema to convert. For json/openapi/ajv/mongo: a valid JSON string. ' +
					'For typescript/graphql/prisma/valibot/yup/typebox/effect-schema/drizzle: a source string.'
			),
		format: z
			.enum(SUPPORTED_FORMATS)
			.describe(
				'Schema format: json | openapi | ajv | typescript | graphql | prisma | ' +
					'valibot | yup | typebox | effect-schema | drizzle | mongo'
			),
		className: z
			.string()
			.optional()
			.describe(
				'Optional class name for the generated model. ' +
					'Falls back to schema.title, the OpenAPI key, or "GeneratedModel".'
			),
	});

	/**
	 * Converts a schema into a QuickModel class definition.
	 *
	 * @param args - Tool arguments.
	 * @param args.schema - The schema source (JSON string for object formats, TS source for typescript).
	 * @param args.format - Schema format: `json`, `openapi`, `ajv`, or `typescript`.
	 * @param args.className - Optional class name override.
	 * @returns `{ code }` — generated TypeScript source code for the QuickModel class.
	 * @throws {Error} If the JSON schema string is malformed (object formats).
	 * @throws {Error} If no TypeScript interface is found in the source (typescript format).
	 * @see {@link SchemaToModelService.fromSchema} — underlying implementation
	 */
	async execute(args: {
		schema: string;
		format: IFromSchemaFormat;
		className?: string;
	}): Promise<{ code: string }> {
		await Promise.resolve();

		const { schema, format, className } = args;

		if (
			format === 'typescript' ||
			format === 'graphql' ||
			format === 'prisma' ||
			format === 'valibot' ||
			format === 'yup' ||
			format === 'typebox' ||
			format === 'effect-schema' ||
			format === 'drizzle'
		) {
			const code = SchemaToModelService.fromSchema(
				format,
				schema,
				className
			);
			return { code };
		}

		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(schema) as Record<string, unknown>;
		} catch (_err) {
			throw new Error(
				`[QFromSchemaTool] Invalid JSON string for format "${format}". ` +
					'Provide a valid JSON-serialized schema object.'
			);
		}

		const code = SchemaToModelService.fromSchema(format, parsed, className);
		return { code };
	}
}
