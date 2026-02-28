import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';
import type { IQSchemaType } from '../../../core/types/schema-types';

const VALID_FORMATS = [
	'json',
	'openapi',
	'zod',
	'mongo',
	'typescript',
	'graphql',
	'ajv',
] as const;

/**
 * Tool to generate a model schema in any supported format using the real QModel.getSchema() API.
 * Supports all 7 formats: json, openapi, zod, mongo, typescript, graphql, ajv.
 */
export class QGetModelSchemaTool extends QAbstractTool<z.ZodObject<any>> {
	name = 'get_model_schema';
	description =
		'Generate a model schema in any supported format from a QuickModel class definition. ' +
		'Supported formats: json, openapi, zod, mongo, typescript, graphql, ajv. ' +
		'Uses the real QModel.getSchema() API for accurate output.';

	schema = z.object({
		code: z
			.string()
			.describe(
				'The QuickModel class code (must include @Quick({...}) decorator)'
			),
		format: z
			.enum(VALID_FORMATS)
			.describe(
				'Schema format to generate: json | openapi | zod | mongo | typescript | graphql | ajv'
			),
	});

	/**
	 * Exports the schema of a QuickModel class in the requested format.
	 *
	 * @param args - Tool arguments.
	 * @param args.code - TypeScript source code of the QuickModel class.
	 * @param args.format - Target schema format (`"json"`, `"openapi"`, `"zod"`, `"mongo"`,
	 *   `"typescript"`, `"graphql"`, `"ajv"`).
	 * @returns `{ schema, format }` — the generated schema object and the format used.
	 * @throws {Error} When `format` is not one of the supported values.
	 */
	async execute(args: {
		code: string;
		format:
			| 'json'
			| 'openapi'
			| 'zod'
			| 'mongo'
			| 'typescript'
			| 'graphql'
			| 'ajv';
	}): Promise<{ schema: unknown; format: string }> {
		await Promise.resolve();

		const { code, format } = args;

		if (!VALID_FORMATS.includes(format as IQSchemaType)) {
			throw new Error(
				`Unsupported format: "${format}". Valid formats: ${VALID_FORMATS.join(', ')}`
			);
		}

		const hydratedConfig = this.parseAndHydrateQuickConfig(code);

		@Quick(hydratedConfig)
		/** @internal Ephemeral model built from parsed config to extract the requested schema. */
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const schema = DynamicModel.getSchema(format as IQSchemaType);

		return { schema, format };
	}

	/**
	 * Parses the @Quick({...}) decorator from the code and converts string type names
	 * to their corresponding constructor references.
	 */
	private parseAndHydrateQuickConfig(code: string): any {
		// Extract content of @Quick({ ... }) — handles multi-line and nested
		const quickMatch = code.match(/@Quick\s*\(\s*\{([\s\S]*?)\}\s*\)/);

		if (!quickMatch || !quickMatch[1]) {
			return {};
		}

		const configStr = quickMatch[1];
		const result: Record<string, unknown> = {};

		// Match patterns: key: Value or key: [Value]
		const entryPattern = /(\w+)\s*:\s*(\[?\w+\]?)/g;
		let match = entryPattern.exec(configStr);

		while (match !== null) {
			const key = match[1];
			const rawVal = match[2];

			if (key && rawVal) {
				const isArray = rawVal.startsWith('[') && rawVal.endsWith(']');
				const typeName = isArray ? rawVal.slice(1, -1) : rawVal;
				const ctor = this.resolveConstructor(typeName);

				if (ctor !== null) {
					result[key] = isArray ? [ctor] : ctor;
				}
			}

			match = entryPattern.exec(configStr);
		}

		return result;
	}

	/**
	 * Resolves a type-name string to the corresponding global constructor.
	 *
	 * @param name - Constructor name (e.g. `'Date'`, `'Map'`)
	 * @returns The matching global constructor, or `undefined` if unknown
	 */
	private resolveConstructor(name: string): unknown {
		switch (name) {
			case 'Date':
				return Date;
			case 'BigInt':
				return BigInt;
			case 'RegExp':
				return RegExp;
			case 'Set':
				return Set;
			case 'Map':
				return Map;
			case 'ArrayBuffer':
				return ArrayBuffer;
			case 'Int8Array':
				return Int8Array;
			case 'Uint8Array':
				return Uint8Array;
			case 'Uint8ClampedArray':
				return Uint8ClampedArray;
			case 'Int16Array':
				return Int16Array;
			case 'Uint16Array':
				return Uint16Array;
			case 'Int32Array':
				return Int32Array;
			case 'Uint32Array':
				return Uint32Array;
			case 'Float32Array':
				return Float32Array;
			case 'Float64Array':
				return Float64Array;
			case 'BigInt64Array':
				return BigInt64Array;
			case 'BigUint64Array':
				return BigUint64Array;
			case 'Symbol':
				return Symbol;
			case 'URL':
				return URL;
			case 'String':
			case 'string':
				return String;
			case 'Number':
			case 'number':
				return Number;
			case 'Boolean':
			case 'boolean':
				return Boolean;
			default:
				return null;
		}
	}
}
