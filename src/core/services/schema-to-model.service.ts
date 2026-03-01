/**
 * SchemaToModelService — inverse of `QModel.getSchema()`.
 *
 * Converts a formal schema back into a complete QuickModel class definition
 * (TypeScript source string). The API mirrors `getSchema()` exactly:
 *
 * ```typescript
 * // Forward: model → schema
 * const json = User.getSchema('json');         // Record<string, unknown>
 * const ts   = User.getSchema('typescript');   // string (TS interface)
 *
 * // Reverse: schema → model class
 * const code = QModel.fromSchema('json', json, 'User');
 * const code2 = QModel.fromSchema('typescript', ts, 'User');
 * ```
 *
 * **Supported formats** (the ones whose output can be parsed back):
 *
 * | Format         | Input type              | Parser                              |
 * |----------------|-------------------------|-------------------------------------|
 * | `'json'`       | `Record<string,unknown>`| JSON Schema Draft-07 properties map |
 * | `'openapi'`    | `Record<string,unknown>`| OpenAPI 3.0 component schema / doc  |
 * | `'ajv'`        | `Record<string,unknown>`| AJV-compatible JSON Schema (= json) |
 * | `'typescript'` | `string`                | TypeScript `interface` source       |
 *
 * JSON Schema → QuickModel type-mapping:
 *
 * | JSON Schema type + format           | @Quick transformer | TypeScript type           |
 * |-------------------------------------|--------------------|---------------------------|
 * | `string`                            | _(none)_           | `string`                  |
 * | `string` + `format: date-time/date` | `Date`             | `Date`                    |
 * | `string` + `format: bigint`         | `BigInt`           | `bigint`                  |
 * | `number`                            | `Number`           | `number`                  |
 * | `integer`                           | `Number`           | `number`                  |
 * | `integer` + `format: int64`         | `BigInt`           | `bigint`                  |
 * | `boolean`                           | `Boolean`          | `boolean`                 |
 * | `array` + `items: string`           | `[String]`         | `string[]`                |
 * | `array` + `items: number`           | `[Number]`         | `number[]`                |
 * | `array` + `items: boolean`          | `[Boolean]`        | `boolean[]`               |
 * | `array` + `items: date-time`        | `[Date]`           | `Date[]`                  |
 * | `array` (no items)                  | _(none)_           | `unknown[]`               |
 * | `object`                            | _(none)_           | `Record<string, unknown>` |
 * | _(unknown)_                         | _(none)_           | `unknown`                 |
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * @see {@link QModel.fromSchema} — static entry point on QModel
 * @see {@link QFromSchemaTool} — MCP tool wrapping this service
 * @module core/services/schema-to-model
 */

import type {
	IFromSchemaFormat,
	IFromSchemaInput,
} from '@/core/types/schema-types';

// ── Internal types ───────────────────────────────────────────────────────────

/** @internal Minimal JSON Schema property descriptor. */
interface IJsonSchemaProp {
	type?: string;
	format?: string;
	items?: IJsonSchemaProp;
}

/** @internal Root JSON Schema object (object type with properties). */
interface IJsonSchemaObject {
	type?: string;
	title?: string;
	properties?: Record<string, IJsonSchemaProp>;
	required?: string[];
}

/** @internal OpenAPI document shape (minimal). */
interface IOpenApiDoc extends IJsonSchemaObject {
	components?: {
		schemas?: Record<string, IJsonSchemaObject>;
	};
}

/** @internal Result of mapping a single JSON Schema property. */
interface IFieldMapping {
	/** Transformer token for @Quick or `undefined` if not needed (default = string). */
	transformer: string | undefined;
	/** TypeScript type string. */
	tsType: string;
}

// ── JSON Schema property mapper ──────────────────────────────────────────────

/**
 * @internal Maps a single JSON Schema property descriptor to QModel tokens.
 * @param forArrayItem - When true, plain `string` items return `'String'`
 *   so the caller can build `[String]` notation.
 */
function mapJsonSchemaProp(
	prop: IJsonSchemaProp,
	forArrayItem = false
): IFieldMapping {
	const typ = (prop.type ?? '').toLowerCase();
	const fmt = (prop.format ?? '').toLowerCase();

	if (typ === 'array') {
		if (!prop.items) return { transformer: undefined, tsType: 'unknown[]' };
		const inner = mapJsonSchemaProp(prop.items, true);
		const arr = inner.transformer ? `[${inner.transformer}]` : undefined;
		const arrTs =
			inner.tsType === 'unknown' ? 'unknown[]' : `${inner.tsType}[]`;
		return { transformer: arr, tsType: arrTs };
	}

	if (typ === 'boolean') return { transformer: 'Boolean', tsType: 'boolean' };

	if (typ === 'integer' && fmt === 'int64')
		return { transformer: 'BigInt', tsType: 'bigint' };
	if (typ === 'integer') return { transformer: 'Number', tsType: 'number' };

	if (typ === 'number') return { transformer: 'Number', tsType: 'number' };

	if (typ === 'string') {
		if (fmt === 'date-time' || fmt === 'date')
			return { transformer: 'Date', tsType: 'Date' };
		if (fmt === 'bigint')
			return { transformer: 'BigInt', tsType: 'bigint' };
		return {
			transformer: forArrayItem ? 'String' : undefined,
			tsType: 'string',
		};
	}

	if (typ === 'object')
		return { transformer: undefined, tsType: 'Record<string, unknown>' };

	return { transformer: undefined, tsType: 'unknown' };
}

// ── Code generator helpers ───────────────────────────────────────────────────

interface IRenderQModelClassArgs {
	className: string;
	interfaceLines: string[];
	decoratorLines: string[];
	declareLines: string[];
}

/** @internal Renders the import + interface + @Quick + class source. */
function renderQModelClass({
	className,
	interfaceLines,
	decoratorLines,
	declareLines,
}: IRenderQModelClassArgs): string {
	const iName = `I${className}`;
	const quickConfig =
		decoratorLines.length > 0
			? `@Quick({\n${decoratorLines.join(',\n')}\n})`
			: '@Quick({})';

	return [
		`import { QModel, Quick } from 'quickmodel';`,
		'',
		`interface ${iName} {`,
		...interfaceLines,
		`}`,
		'',
		quickConfig,
		`export class ${className} extends QModel<${iName}> {`,
		...declareLines,
		`}`,
		'',
	].join('\n');
}

// ── JSON / OpenAPI / AJV → QModel ────────────────────────────────────────────

/** @internal Parses a plain JSON Schema object (properties + required) into QModel code. */
function fromJsonSchemaObject(
	schema: IJsonSchemaObject,
	className: string
): string {
	const props = schema.properties ?? {};
	const required = new Set(schema.required ?? []);

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const [key, prop] of Object.entries(props)) {
		const { transformer, tsType } = mapJsonSchemaProp(prop);
		const optional = required.has(key) ? '' : '?';

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}${optional}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

// ── TypeScript interface → QModel ────────────────────────────────────────────

/** @internal Infers a @Quick transformer token from a TypeScript type string. */
function inferTransformerFromTsType(tsType: string): string | undefined {
	if (tsType.includes('Date')) return 'Date';
	if (tsType.includes('BigInt') || tsType === 'bigint') return 'BigInt';
	if (tsType.includes('RegExp')) return 'RegExp';
	if (tsType.startsWith('Set')) return 'Set';
	if (tsType.startsWith('Map')) return 'Map';
	if (tsType.startsWith('URL')) return 'URL';
	if (tsType === 'number') return 'Number';
	if (tsType === 'boolean') return 'Boolean';
	if (tsType.endsWith('[]')) {
		const elem = tsType.slice(0, -2).trim();
		const inner = inferTransformerFromTsType(elem);
		return inner ? `[${inner}]` : undefined;
	}
	return undefined;
}

/** @internal Parses a TypeScript interface string into QModel code. */
function fromTypeScriptInterface(src: string, className?: string): string {
	const interfaceMatch = src.match(/interface\s+(\w+)\s*{([\s\S]*?)}/);
	if (!interfaceMatch) {
		throw new Error(
			'[QuickModel] fromSchema("typescript"): no interface declaration found in input. ' +
				'Provide a TypeScript interface string (e.g. the output of getSchema("typescript")).'
		);
	}

	const ifaceName = interfaceMatch[1] ?? 'IGeneratedModel';
	const body = interfaceMatch[2] ?? '';

	const baseName =
		className ??
		(ifaceName.startsWith('I') &&
		ifaceName.length > 1 &&
		ifaceName[1] === (ifaceName[1] ?? '').toUpperCase()
			? ifaceName.slice(1)
			: ifaceName);

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('//')) continue;

		const propMatch = trim.match(/(\w+)(\??):\s*([^;]+);?/);
		if (!propMatch) continue;

		const key = propMatch[1];
		const optional = propMatch[2] === '?' ? '?' : '';
		const tsType = (propMatch[3] ?? 'string').trim();
		const transformer = inferTransformerFromTsType(tsType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}${optional}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	const iName = `I${baseName}`;
	const quickConfig =
		decoratorLines.length > 0
			? `@Quick({\n${decoratorLines.join(',\n')}\n})`
			: '@Quick({})';

	return [
		`import { QModel, Quick } from 'quickmodel';`,
		'',
		`interface ${iName} {`,
		...interfaceLines,
		`}`,
		'',
		quickConfig,
		`export class ${baseName} extends QModel<${iName}> {`,
		...declareLines,
		`}`,
		'',
	].join('\n');
}

// ── Public service ───────────────────────────────────────────────────────────

/**
 * Converts a formal schema (produced by `getSchema`) back into a QuickModel
 * TypeScript class definition.
 *
 * This is the **inverse** of `QModel.getSchema()`:
 * - `getSchema(format)` exports model structure → schema
 * - `SchemaToModelService.fromSchema(format, schema)` imports schema → model class
 *
 * @example
 * ```typescript
 * // Round-trip: model → JSON Schema → model class
 * const jsonSchema = User.getSchema('json');
 * const code = SchemaToModelService.fromSchema('json', jsonSchema, 'User');
 *
 * // From a TypeScript interface string
 * const tsInterface = User.getSchema('typescript');
 * const code2 = SchemaToModelService.fromSchema('typescript', tsInterface, 'User');
 * ```
 *
 * @see {@link QModel.fromSchema} — static method on QModel
 * @see {@link QFromSchemaTool} — MCP tool
 */
export class SchemaToModelService {
	/**
	 * Converts a schema (produced by `getSchema`) back into a QuickModel class.
	 *
	 * Supported formats:
	 * - `'json'` — JSON Schema Draft-07 object (`Record<string, unknown>`)
	 * - `'openapi'` — OpenAPI 3.0 component schema or full document (`Record<string, unknown>`)
	 * - `'ajv'` — AJV JSON Schema object, same structure as `'json'`
	 * - `'typescript'` — TypeScript interface source string
	 *
	 * @param format - Schema format (must match a supported `IFromSchemaFormat` value)
	 * @param schema - The schema to convert (type depends on `format`)
	 * @param className - Optional class name override. Falls back to `schema.title` or `'GeneratedModel'`.
	 * @returns TypeScript source code string for a class extending `QModel`.
	 * @throws {Error} For `'openapi'`: when `className` is not found in `components.schemas`.
	 * @throws {Error} For `'typescript'`: when no `interface` declaration is found in the source.
	 */
	static fromSchema<T extends IFromSchemaFormat>(
		format: T,
		schema: IFromSchemaInput<T>,
		className?: string
	): string {
		switch (format) {
			case 'json':
			case 'ajv': {
				const obj = schema as Record<string, unknown>;
				const name =
					className ??
					(typeof (obj as IJsonSchemaObject).title === 'string'
						? (obj as IJsonSchemaObject).title
						: undefined) ??
					'GeneratedModel';
				return fromJsonSchemaObject(obj as IJsonSchemaObject, name);
			}

			case 'openapi': {
				const doc = schema as IOpenApiDoc;
				if (doc.components?.schemas) {
					const resolvedName =
						className ??
						Object.keys(doc.components.schemas)[0] ??
						'GeneratedModel';
					const inner = doc.components.schemas[resolvedName];
					if (!inner) {
						const available = Object.keys(
							doc.components.schemas
						).join(', ');
						throw new Error(
							`[QuickModel] fromSchema("openapi"): schema '${resolvedName}' not found in ` +
								`components.schemas. Available: ${available || '(none)'}`
						);
					}
					return fromJsonSchemaObject(inner, resolvedName);
				}
				const name =
					className ??
					(typeof doc.title === 'string' ? doc.title : undefined) ??
					'GeneratedModel';
				return fromJsonSchemaObject(doc as IJsonSchemaObject, name);
			}

			case 'typescript': {
				return fromTypeScriptInterface(schema as string, className);
			}

			default: {
				const exhaustive: never = format;
				throw new Error(
					`[QuickModel] fromSchema: unsupported format '${exhaustive as string}'. ` +
						`Supported: json, openapi, ajv, typescript.`
				);
			}
		}
	}
}
