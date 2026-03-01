/**
 * SchemaToModelService — reverse of `QModel.getSchema()`.
 *
 * Converts a formal schema (JSON Schema Draft-07 or OpenAPI component schema)
 * into a complete QuickModel class definition (TypeScript source string).
 *
 * This is the **inverse** of `QModel.getSchema('json')` / `getSchema('openapi')`:
 * - `getSchema('json')` exports the model structure → JSON Schema
 * - `SchemaToModelService.fromJsonSchema(schema)` imports a JSON Schema → QModel class
 *
 * **Zero runtime dependencies** — pure string composition.
 *
 * JSON Schema → QuickModel type-mapping:
 *
 * | JSON Schema type                    | @Quick transformer | TypeScript type      |
 * |-------------------------------------|--------------------|----------------------|
 * | `string`                            | _(none)_           | `string`             |
 * | `string` + `format: date-time/date` | `Date`             | `Date`               |
 * | `string` + `format: bigint`         | `BigInt`           | `bigint`             |
 * | `number`                            | `Number`           | `number`             |
 * | `integer`                           | `Number`           | `number`             |
 * | `integer` + `format: int64`         | `BigInt`           | `bigint`             |
 * | `boolean`                           | `Boolean`          | `boolean`            |
 * | `array` + `items.type: string`      | `[String]`         | `string[]`           |
 * | `array` + `items.type: number`      | `[Number]`         | `number[]`           |
 * | `array` + `items.type: boolean`     | `[Boolean]`        | `boolean[]`          |
 * | `array` + `items (date-time)`       | `[Date]`           | `Date[]`             |
 * | `array` (no items)                  | _(none)_           | `unknown[]`          |
 * | `object`                            | _(none)_           | `Record<string, unknown>` |
 * | _(unknown)_                         | _(none)_           | `unknown`            |
 *
 * @see {@link QModel.fromSchema} — static entry point on QModel
 * @see {@link QFromSchemaTool} — MCP tool wrapping this service
 * @module core/services/schema-to-model
 */

// ── Internal types ───────────────────────────────────────────────────────────

/** @internal Minimal JSON Schema property descriptor used for type mapping. */
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

/** @internal OpenAPI document shape (minimal — only what we need). */
interface IOpenApiDoc {
	components?: {
		schemas?: Record<string, IJsonSchemaObject>;
	};
	// Allow also being used as a direct schema object
	type?: string;
	title?: string;
	properties?: Record<string, IJsonSchemaProp>;
	required?: string[];
}

// ── Type-mapping helpers ─────────────────────────────────────────────────────

/** @internal Result of mapping a single JSON Schema property. */
interface IFieldMapping {
	/** Transformer token for @Quick (e.g. 'Number', '[Date]') or undefined if not needed. */
	transformer: string | undefined;
	/** TypeScript type string (e.g. 'number', 'Date', 'string[]'). */
	tsType: string;
}

/**
 * @internal Maps a single JSON Schema property descriptor to QModel tokens.
 * @param forArrayItem - When true, plain `string` returns transformer `String`
 *   (needed for `[String]` array notation in @Quick).
 */
function mapProperty(
	prop: IJsonSchemaProp,
	forArrayItem = false
): IFieldMapping {
	const typ = (prop.type ?? '').toLowerCase();
	const fmt = (prop.format ?? '').toLowerCase();

	// Array
	if (typ === 'array') {
		if (!prop.items) {
			return { transformer: undefined, tsType: 'unknown[]' };
		}
		// For array items, always pass forArrayItem=true so string items get transformer 'String'
		const inner = mapProperty(prop.items, true);
		const arr = inner.transformer ? `[${inner.transformer}]` : undefined;
		const arrTs =
			inner.tsType === 'unknown' ? 'unknown[]' : `${inner.tsType}[]`;
		return { transformer: arr, tsType: arrTs };
	}

	// boolean
	if (typ === 'boolean') {
		return { transformer: 'Boolean', tsType: 'boolean' };
	}

	// integer with int64 format → BigInt
	if (typ === 'integer' && fmt === 'int64') {
		return { transformer: 'BigInt', tsType: 'bigint' };
	}

	// integer (general) → Number
	if (typ === 'integer') {
		return { transformer: 'Number', tsType: 'number' };
	}

	// number → Number
	if (typ === 'number') {
		return { transformer: 'Number', tsType: 'number' };
	}

	// string variants
	if (typ === 'string') {
		if (fmt === 'date-time' || fmt === 'date') {
			return { transformer: 'Date', tsType: 'Date' };
		}
		if (fmt === 'bigint') {
			return { transformer: 'BigInt', tsType: 'bigint' };
		}
		// Plain string — no transformer needed for single fields (@Quick default).
		// For array items we need 'String' so @Quick can use [String] notation.
		return {
			transformer: forArrayItem ? 'String' : undefined,
			tsType: 'string',
		};
	}

	// object
	if (typ === 'object') {
		return { transformer: undefined, tsType: 'Record<string, unknown>' };
	}

	return { transformer: undefined, tsType: 'unknown' };
}

// ── Code generator ───────────────────────────────────────────────────────────

/** @internal Generates QModel TypeScript source from a JSON Schema object. */
function generateFromJsonSchemaObject(
	schema: IJsonSchemaObject,
	className: string
): string {
	const iName = `I${className}`;
	const props = schema.properties ?? {};
	const required = new Set(schema.required ?? []);

	const quickDecorators: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const [key, prop] of Object.entries(props)) {
		const { transformer, tsType } = mapProperty(prop);
		const isRequired = required.has(key);
		const optional = isRequired ? '' : '?';

		// @Quick entry only when transformer is needed
		if (transformer !== undefined) {
			quickDecorators.push(`\t${key}: ${transformer}`);
		}

		interfaceLines.push(`\t${key}${optional}: ${tsType};`);
		// declare lines never carry '?' — QModel property declarations are always non-optional;
		// optionality is expressed through the interface generic parameter.
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	const quickConfig =
		quickDecorators.length > 0
			? `@Quick({\n${quickDecorators.join(',\n')}\n})`
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

// ── Public service ───────────────────────────────────────────────────────────

/**
 * Converts a JSON Schema / OpenAPI schema into a QuickModel TypeScript class.
 *
 * @example
 * ```typescript
 * const code = SchemaToModelService.fromJsonSchema({
 *   type: 'object',
 *   properties: { id: { type: 'number' }, name: { type: 'string' } },
 *   required: ['id'],
 * }, 'User');
 * // → TypeScript source for a User class extending QModel<IUser>
 * ```
 *
 * @see {@link QModel.fromSchema} — public entry point
 * @see {@link QFromSchemaTool} — MCP tool
 */
export class SchemaToModelService {
	/**
	 * Converts a JSON Schema Draft-07 object (with `type: 'object'` and
	 * `properties`) into a QuickModel class definition.
	 *
	 * @param schema - JSON Schema object. Must have `type: 'object'` and `properties`.
	 * @param className - Optional class name. Falls back to `schema.title`, then `'GeneratedModel'`.
	 * @returns TypeScript source code string.
	 */
	static fromJsonSchema(
		schema: Record<string, unknown>,
		className?: string
	): string {
		const resolvedName =
			className ??
			(typeof (schema as IJsonSchemaObject).title === 'string'
				? (schema as IJsonSchemaObject).title
				: undefined) ??
			'GeneratedModel';

		return generateFromJsonSchemaObject(
			schema as IJsonSchemaObject,
			resolvedName
		);
	}

	/**
	 * Converts an OpenAPI document or component schema into a QuickModel class.
	 *
	 * Accepts two shapes:
	 * 1. A full OpenAPI document with `components.schemas` — extracts the schema
	 *    for `className` from `components.schemas[className]`.
	 * 2. A bare OpenAPI/JSON Schema object (same as `fromJsonSchema`).
	 *
	 * @param doc - OpenAPI document or component schema object.
	 * @param className - Class name to generate. When `doc` has `components.schemas`,
	 *   this is also the key used to look up the schema.
	 * @returns TypeScript source code string.
	 * @throws {Error} When `components.schemas[className]` does not exist in the document.
	 */
	static fromOpenApiSchema(
		doc: Record<string, unknown>,
		className?: string
	): string {
		const typedDoc = doc as IOpenApiDoc;

		// If it has components.schemas, look up the schema by className
		if (typedDoc.components?.schemas) {
			const resolvedName =
				className ??
				Object.keys(typedDoc.components.schemas)[0] ??
				'GeneratedModel';

			const schema = typedDoc.components.schemas[resolvedName];
			if (!schema) {
				const available = Object.keys(typedDoc.components.schemas).join(
					', '
				);
				throw new Error(
					`[QuickModel] Schema '${resolvedName}' not found in components.schemas. ` +
						`Available: ${available || '(none)'}`
				);
			}
			return generateFromJsonSchemaObject(schema, resolvedName);
		}

		// Treat doc as a bare JSON/OpenAPI schema object
		return SchemaToModelService.fromJsonSchema(doc, className);
	}
}
