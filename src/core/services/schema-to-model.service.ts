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
 * | `'graphql'`    | `string`                | GraphQL SDL `type` block            |
 * | `'prisma'`     | `string`                | Prisma `model` block                |
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
 * @see `QFromSchemaTool` — MCP tool wrapping this service
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
	// Arrays must be checked first — before substring checks like `.includes('Date')`
	// to avoid `Date[]` matching the `Date` branch before the array branch.
	if (tsType.endsWith('[]')) {
		const elem = tsType.slice(0, -2).trim();
		const inner = inferTransformerFromTsType(elem);
		return inner ? `[${inner}]` : undefined;
	}
	if (tsType.includes('Date')) return 'Date';
	if (tsType.includes('BigInt') || tsType === 'bigint') return 'BigInt';
	if (tsType.includes('RegExp')) return 'RegExp';
	if (tsType.startsWith('Set')) return 'Set';
	if (tsType.startsWith('Map')) return 'Map';
	if (tsType.startsWith('URL')) return 'URL';
	if (tsType === 'number') return 'Number';
	if (tsType === 'boolean') return 'Boolean';
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

	// Derive class name: strip leading 'I' from PascalCase interface names (e.g. IUser → User)
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

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

// ── GraphQL SDL → QModel ————————————————————————————————————————————

/**
 * @internal Maps a single GraphQL SDL scalar type to QModel tokens.
 *
 * | GraphQL type   | transformer | tsType                   |
 * |----------------|-------------|---------------------------|
 * | `Float!`       | `Number`    | `number`                  |
 * | `Int!`         | `Number`    | `number`                  |
 * | `Boolean!`     | `Boolean`   | `boolean`                 |
 * | `DateTime!`    | `Date`      | `Date`                    |
 * | `BigInt!`      | `BigInt`    | `bigint`                  |
 * | `[T!]!`        | `[T]`       | `T[]`                     |
 * | `JSON!`        | _(none)_    | `Record<string, unknown>` |
 * | `String!`/`ID!`| _(none)_    | `string`                  |
 */
function mapGraphQLType(gqlType: string, forArrayItem = false): IFieldMapping {
	// Strip non-null marker for analysis
	const base = gqlType.replace(/!/g, '').trim();

	// Array type: [ElementType]
	if (base.startsWith('[') && base.endsWith(']')) {
		const inner = base.slice(1, -1).replace(/!/g, '').trim();
		const innerMapping = mapGraphQLType(inner, true);
		const arr = innerMapping.transformer
			? `[${innerMapping.transformer}]`
			: undefined;
		const arrTs =
			inner === 'unknown' ? 'unknown[]' : `${innerMapping.tsType}[]`;
		return { transformer: arr, tsType: arrTs };
	}

	switch (base) {
		case 'Float':
		case 'Int':
			return { transformer: 'Number', tsType: 'number' };
		case 'Boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'DateTime':
			return { transformer: 'Date', tsType: 'Date' };
		case 'BigInt':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'JSON':
			return {
				transformer: undefined,
				tsType: 'Record<string, unknown>',
			};
		case 'String':
		case 'ID':
		default:
			return {
				transformer: forArrayItem ? 'String' : undefined,
				tsType: 'string',
			};
	}
}

/** @internal Parses a GraphQL SDL `type` block string into QModel code. */
function fromGraphQLSchema(src: string, className?: string): string {
	const typeMatch = src.match(/type\s+(\w+)\s*\{([\s\S]*?)\}/);
	if (!typeMatch) {
		throw new Error(
			'[QuickModel] fromSchema("graphql"): no `type` block found in input. ' +
				'Provide a GraphQL SDL type definition (e.g. the output of getSchema("graphql")).'
		);
	}

	const typeName = typeMatch[1] ?? 'GeneratedModel';
	const body = typeMatch[2] ?? '';
	const baseName = className ?? typeName;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('#')) continue;

		// fieldName: GqlType — e.g. `name: String!`
		const propMatch = trim.match(/^(\w+)\s*:\s*(.+)$/);
		if (!propMatch) continue;

		const key = propMatch[1];
		const rawType = (propMatch[2] ?? '').trim();
		// Fields without `!` suffix are nullable (optional)
		const optional = rawType.endsWith('!') ? '' : '?';
		const { transformer, tsType } = mapGraphQLType(rawType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}${optional}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

// ── Prisma model → QModel ———————————————————————————————————————————

/**
 * @internal Maps a Prisma scalar type name to QModel tokens.
 *
 * | Prisma type  | transformer | tsType                   |
 * |--------------|-------------|---------------------------|
 * | `Float`      | `Number`    | `number`                  |
 * | `Int`        | `Number`    | `number`                  |
 * | `Boolean`    | `Boolean`   | `boolean`                 |
 * | `DateTime`   | `Date`      | `Date`                    |
 * | `BigInt`     | `BigInt`    | `bigint`                  |
 * | `Json`       | _(none)_    | `Record<string, unknown>` |
 * | `String`     | _(none)_    | `string`                  |
 */
function mapPrismaType(prismaType: string): IFieldMapping {
	// Strip optional marker (`?`) for lookup
	const base = prismaType.replace('?', '').trim();

	switch (base) {
		case 'Float':
		case 'Int':
			return { transformer: 'Number', tsType: 'number' };
		case 'Boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'DateTime':
			return { transformer: 'Date', tsType: 'Date' };
		case 'BigInt':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'Json':
			return {
				transformer: undefined,
				tsType: 'Record<string, unknown>',
			};
		case 'String':
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

/** @internal Parses a Prisma `model` block string into QModel code. */
function fromPrismaSchema(src: string, className?: string): string {
	const modelMatch = src.match(/model\s+(\w+)\s*\{([\s\S]*?)\}/);
	if (!modelMatch) {
		throw new Error(
			'[QuickModel] fromSchema("prisma"): no `model` block found in input. ' +
				'Provide a Prisma model definition string (e.g. the output of getSchema("prisma")).'
		);
	}

	const modelName = modelMatch[1] ?? 'GeneratedModel';
	const body = modelMatch[2] ?? '';
	const baseName = className ?? modelName;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		// Skip blank lines, comments, and model-level attributes (@@)
		if (!trim || trim.startsWith('//') || trim.startsWith('@@')) continue;

		// fieldName  PrismaType  (optional: PrismaType?)
		const propMatch = trim.match(/^(\w+)\s+(\S+)/);
		if (!propMatch) continue;

		const key = propMatch[1];
		const rawType = (propMatch[2] ?? '').trim();
		const optional = rawType.endsWith('?') ? '?' : '';
		const { transformer, tsType } = mapPrismaType(rawType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}${optional}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

// ── Valibot parser ──────────────────────────────────────────────────────────

function fromValibotSchema(src: string, className?: string): string {
	const blockMatch = src.match(
		/export\s+const\s+(\w+)Schema\s*=\s*v\.object\(\{([\s\S]*?)\}\)/
	);
	if (!blockMatch) {
		throw new Error(
			'[QuickModel] fromSchema("valibot"): no `v.object` block found in input. ' +
				'Provide a Valibot schema source string (e.g. the output of getSchema("valibot")).'
		);
	}

	const schemaName = blockMatch[1] ?? 'GeneratedModel';
	const body = blockMatch[2] ?? '';
	const baseName = className ?? schemaName;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('//')) continue;

		// fieldName: v.type(),
		const fieldMatch = trim.match(/^(\w+):\s*v\.(\w+)\(\)/);
		if (!fieldMatch) continue;

		const key = fieldMatch[1];
		const vType = fieldMatch[2] ?? '';
		const { transformer, tsType } = mapValibotType(vType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

function mapValibotType(vType: string): {
	transformer: string | undefined;
	tsType: string;
} {
	switch (vType) {
		case 'number':
			return { transformer: 'Number', tsType: 'number' };
		case 'boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'date':
			return { transformer: 'Date', tsType: 'Date' };
		case 'bigint':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'string':
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

// ── Yup parser ───────────────────────────────────────────────────────────────

function fromYupSchema(src: string, className?: string): string {
	const blockMatch = src.match(
		/export\s+const\s+(\w+)Schema\s*=\s*yup\.object\(\{([\s\S]*?)\}\)/
	);
	if (!blockMatch) {
		throw new Error(
			'[QuickModel] fromSchema("yup"): no `yup.object` block found in input. ' +
				'Provide a Yup schema source string (e.g. the output of getSchema("yup")).'
		);
	}

	const schemaName = blockMatch[1] ?? 'GeneratedModel';
	const body = blockMatch[2] ?? '';
	const baseName = className ?? schemaName;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('//')) continue;

		// fieldName: yup.type().required(),
		const fieldMatch = trim.match(/^(\w+):\s*yup\.(\w+)\(/);
		if (!fieldMatch) continue;

		const key = fieldMatch[1];
		const yupType = fieldMatch[2] ?? '';
		const { transformer, tsType } = mapYupType(yupType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

function mapYupType(yupType: string): {
	transformer: string | undefined;
	tsType: string;
} {
	switch (yupType) {
		case 'number':
			return { transformer: 'Number', tsType: 'number' };
		case 'boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'date':
			return { transformer: 'Date', tsType: 'Date' };
		case 'string':
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

// ── Shared utility — balanced-brace body extractor ──────────────────────────

/**
 * Extracts the content of the outermost `{…}` block that follows a given
 * header regex match.  Handles nested braces correctly.
 *
 * @returns `{ name, body }` or `null` if the header regex does not match.
 */
function extractBracedBlock(
	src: string,
	headerPattern: RegExp
): { name: string; body: string } | null {
	const headerMatch = src.match(headerPattern);
	if (!headerMatch) return null;

	const name = headerMatch[1] ?? 'GeneratedModel';
	const afterHeader = src.slice(
		(headerMatch.index ?? 0) + headerMatch[0].length
	);

	// Find the opening `{`
	const openIdx = afterHeader.indexOf('{');
	if (openIdx === -1) return null;

	let depth = 0;
	let bodyStart = -1;
	let bodyEnd = -1;

	for (let idx = openIdx; idx < afterHeader.length; idx++) {
		const chr = afterHeader[idx];
		if (chr === '{') {
			if (depth === 0) bodyStart = idx + 1;
			depth++;
		} else if (chr === '}') {
			depth--;
			if (depth === 0) {
				bodyEnd = idx;
				break;
			}
		}
	}

	if (bodyStart === -1 || bodyEnd === -1) return null;
	return { name, body: afterHeader.slice(bodyStart, bodyEnd) };
}

// ── TypeBox parser ───────────────────────────────────────────────────────────

function fromTypeBoxSchema(src: string, className?: string): string {
	const parsed = extractBracedBlock(
		src,
		/(?:export\s+)?const\s+(\w+)Schema\s*=\s*Type\.Object\(/ // eslint-disable-line security/detect-unsafe-regex
	);
	if (!parsed) {
		throw new Error(
			'[QuickModel] fromSchema("typebox"): no `Type.Object` block found in input. ' +
				'Provide a TypeBox schema source string (e.g. the output of getSchema("typebox")).'
		);
	}

	const { name: schemaName, body } = parsed;
	const baseName = className ?? schemaName;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('//')) continue;

		// fieldName: Type.Kind(...) — capture full value to detect date-time option
		const fieldMatch = trim.match(/^(\w+):\s*Type\.(\w+)\(([^)]*)\)/);
		if (!fieldMatch) continue;

		const key = fieldMatch[1];
		const typeKind = fieldMatch[2] ?? '';
		const typeArgs = fieldMatch[3] ?? '';
		const { transformer, tsType } = mapTypeBoxType(typeKind, typeArgs);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

function mapTypeBoxType(
	typeKind: string,
	typeArgs: string
): { transformer: string | undefined; tsType: string } {
	switch (typeKind) {
		case 'Number':
			return { transformer: 'Number', tsType: 'number' };
		case 'Boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'BigInt':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'String':
			if (
				typeArgs.includes("format: 'date-time'") ||
				typeArgs.includes('format:"date-time"')
			) {
				return { transformer: 'Date', tsType: 'Date' };
			}
			return { transformer: undefined, tsType: 'string' };
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

// ── Effect Schema parser ─────────────────────────────────────────────────────

function fromEffectSchema(src: string, className?: string): string {
	const blockMatch = src.match(
		/const\s+(\w+)Schema\s*=\s*Schema\.Struct\(\{([\s\S]*?)\}\)/
	);
	if (!blockMatch) {
		throw new Error(
			'[QuickModel] fromSchema("effect-schema"): no `Schema.Struct` block found in input. ' +
				'Provide an Effect Schema source string (e.g. the output of getSchema("effect-schema")).'
		);
	}

	const schemaName = blockMatch[1] ?? 'GeneratedModel';
	const body = blockMatch[2] ?? '';
	const baseName = className ?? schemaName;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('//')) continue;

		// fieldName: Schema.Type,
		const fieldMatch = trim.match(/^(\w+):\s*Schema\.(\w+),?$/);
		if (!fieldMatch) continue;

		const key = fieldMatch[1];
		const schemaType = fieldMatch[2] ?? '';
		const { transformer, tsType } = mapEffectType(schemaType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

function mapEffectType(schemaType: string): {
	transformer: string | undefined;
	tsType: string;
} {
	switch (schemaType) {
		case 'Number':
			return { transformer: 'Number', tsType: 'number' };
		case 'Boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'Date':
			return { transformer: 'Date', tsType: 'Date' };
		case 'BigIntFromSelf':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'String':
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

// ── Drizzle parser ───────────────────────────────────────────────────────────

function fromDrizzleSchema(src: string, className?: string): string {
	// extractBracedBlock captures the tableName in group-1 and finds the
	// balanced column-object body after the comma separator.
	const parsed = extractBracedBlock(
		src,
		/pgTable\s*\(\s*['"](\w+)['"]\s*,\s*/
	);
	if (!parsed) {
		throw new Error(
			'[QuickModel] fromSchema("drizzle"): no `pgTable` block found in input. ' +
				'Provide a Drizzle schema source string (e.g. the output of getSchema("drizzle")).'
		);
	}

	const tableName = parsed.name;
	const body = parsed.body;
	const baseName = className ?? tableNameToClassName(tableName);

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const line of body.split('\n')) {
		const trim = line.trim();
		if (!trim || trim.startsWith('//')) continue;

		// fieldName: columnFunction('col_name', ...).notNull(),
		const fieldMatch = trim.match(/^(\w+):\s*(\w+)\s*\(/);
		if (!fieldMatch) continue;

		const key = fieldMatch[1];
		const colFn = fieldMatch[2] ?? '';
		const { transformer, tsType } = mapDrizzleColumnType(colFn);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

/** Converts a snake_case table name to a PascalCase singular class name. */
function tableNameToClassName(tableName: string): string {
	const singular = tableName.endsWith('s')
		? tableName.slice(0, -1)
		: tableName;
	return singular
		.split('_')
		.map((part) =>
			part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ''
		)
		.join('');
}

function mapDrizzleColumnType(colFn: string): {
	transformer: string | undefined;
	tsType: string;
} {
	switch (colFn) {
		case 'integer':
		case 'serial':
		case 'smallint':
		case 'decimal':
		case 'numeric':
		case 'real':
		case 'doublePrecision':
			return { transformer: 'Number', tsType: 'number' };
		case 'boolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'timestamp':
		case 'date':
		case 'time':
			return { transformer: 'Date', tsType: 'Date' };
		case 'bigint':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'jsonb':
		case 'json':
			return { transformer: '[String]', tsType: 'string[]' };
		case 'varchar':
		case 'text':
		case 'char':
		case 'uuid':
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

// ── Mongo schema parser ──────────────────────────────────────────────────────

function fromMongoSchema(
	schema: Record<string, unknown>,
	className?: string
): string {
	const baseName = className ?? 'GeneratedModel';

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const [key, rawEntry] of Object.entries(schema)) {
		const entry = rawEntry as Record<string, unknown>;
		const fieldType = entry['type'];
		const { transformer, tsType } = mapMongoType(fieldType);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

function mapMongoType(fieldType: unknown): {
	transformer: string | undefined;
	tsType: string;
} {
	if (Array.isArray(fieldType)) {
		// Array type: [String], [Number], etc.
		const inner = fieldType[0];
		if (inner === Number)
			return { transformer: '[Number]', tsType: 'number[]' };
		if (inner === Boolean)
			return { transformer: '[Boolean]', tsType: 'boolean[]' };
		if (inner === Date) return { transformer: '[Date]', tsType: 'Date[]' };
		return { transformer: '[String]', tsType: 'string[]' };
	}
	if (fieldType === Number)
		return { transformer: 'Number', tsType: 'number' };
	if (fieldType === Boolean)
		return { transformer: 'Boolean', tsType: 'boolean' };
	if (fieldType === Date) return { transformer: 'Date', tsType: 'Date' };
	return { transformer: undefined, tsType: 'string' };
}

// ── Zod schema parser ─────────────────────────────────────────────────────────

function fromZodSchema(
	schema: import('zod').z.ZodObject<any>,
	className?: string
): string {
	const baseName = className ?? 'GeneratedModel';

	const shape = (schema as any).shape as Record<string, any>;

	const decoratorLines: string[] = [];
	const interfaceLines: string[] = [];
	const declareLines: string[] = [];

	for (const [key, field] of Object.entries(shape)) {
		const def = field._def as Record<string, any>;
		const typeName: string = (def['typeName'] as string) ?? '';
		const { transformer, tsType } = mapZodType(typeName, def);

		if (transformer !== undefined) {
			decoratorLines.push(`\t${key}: ${transformer}`);
		}
		interfaceLines.push(`\t${key}: ${tsType};`);
		declareLines.push(`\tdeclare ${key}: ${tsType};`);
	}

	return renderQModelClass({
		className: baseName,
		interfaceLines,
		decoratorLines,
		declareLines,
	});
}

function mapZodType(
	typeName: string,

	def: Record<string, any>
): { transformer: string | undefined; tsType: string } {
	switch (typeName) {
		case 'ZodNumber':
			return { transformer: 'Number', tsType: 'number' };
		case 'ZodBoolean':
			return { transformer: 'Boolean', tsType: 'boolean' };
		case 'ZodDate':
			return { transformer: 'Date', tsType: 'Date' };
		case 'ZodBigInt':
			return { transformer: 'BigInt', tsType: 'bigint' };
		case 'ZodArray': {
			const innerDef = def['type']?._def as
				| Record<string, any>
				| undefined;
			const innerType = (innerDef?.['typeName'] as string) ?? '';
			const inner = mapZodType(innerType, innerDef ?? {});
			const wrapperTransformer =
				inner.transformer !== undefined
					? `[${inner.transformer}]`
					: '[String]';
			return {
				transformer: wrapperTransformer,
				tsType: `${inner.tsType}[]`,
			};
		}
		case 'ZodString': {
			const checks: Array<Record<string, unknown>> =
				(def['checks'] as any[]) ?? [];
			const hasDatetime = checks.some(
				(chk) => chk['kind'] === 'datetime'
			);
			const hasRegex = checks.some((chk) => chk['kind'] === 'regex');
			if (hasDatetime) return { transformer: 'Date', tsType: 'Date' };
			if (hasRegex) return { transformer: 'BigInt', tsType: 'bigint' };
			return { transformer: undefined, tsType: 'string' };
		}
		default:
			return { transformer: undefined, tsType: 'string' };
	}
}

// ── Public service ——————————————————————————————————————————————————————

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
 * @see `QFromSchemaTool` — MCP tool
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
	 * - `'graphql'` — GraphQL SDL `type` block string
	 * - `'prisma'` — Prisma `model` block string
	 * - `'valibot'` — Valibot `v.object({…})` source string
	 * - `'yup'` — Yup `yup.object({…})` source string
	 * - `'typebox'` — TypeBox `Type.Object({…})` source string
	 * - `'effect-schema'` — Effect `Schema.Struct({…})` source string
	 * - `'drizzle'` — Drizzle `pgTable(…)` source string
	 * - `'mongo'` — Mongoose/Mongo schema object (`Record<string, unknown>`)
	 * - `'zod'` — Live `ZodObject<any>` instance (produced by `getSchema('zod')`)
	 *
	 * @param format - Schema format (must match a supported `IFromSchemaFormat` value)
	 * @param schema - The schema to convert (type depends on `format`)
	 * @param className - Optional class name override. Falls back to schema name or `'GeneratedModel'`.
	 * @returns TypeScript source code string for a class extending `QModel`.
	 * @throws {Error} For `'openapi'`: when `className` is not found in `components.schemas`.
	 * @throws {Error} For `'typescript'`: when no `interface` declaration is found in the source.
	 * @throws {Error} For `'graphql'`: when no `type` block is found in the source.
	 * @throws {Error} For `'prisma'`: when no `model` block is found in the source.
	 * @throws {Error} For `'valibot'`: when no `v.object` block is found in the source.
	 * @throws {Error} For `'yup'`: when no `yup.object` block is found in the source.
	 * @throws {Error} For `'typebox'`: when no `Type.Object` block is found in the source.
	 * @throws {Error} For `'effect-schema'`: when no `Schema.Struct` block is found in the source.
	 * @throws {Error} For `'drizzle'`: when no `pgTable` block is found in the source.
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

			case 'graphql': {
				return fromGraphQLSchema(schema as string, className);
			}

			case 'prisma': {
				return fromPrismaSchema(schema as string, className);
			}

			case 'valibot': {
				return fromValibotSchema(schema as string, className);
			}

			case 'yup': {
				return fromYupSchema(schema as string, className);
			}

			case 'typebox': {
				return fromTypeBoxSchema(schema as string, className);
			}

			case 'effect-schema': {
				return fromEffectSchema(schema as string, className);
			}

			case 'drizzle': {
				return fromDrizzleSchema(schema as string, className);
			}

			case 'mongo': {
				return fromMongoSchema(
					schema as Record<string, unknown>,
					className
				);
			}

			case 'zod': {
				return fromZodSchema(
					schema as import('zod').z.ZodObject<any>,
					className
				);
			}

			default: {
				const exhaustive: never = format;
				throw new Error(
					`[QuickModel] fromSchema: unsupported format '${exhaustive as string}'. ` +
						`Supported: json, openapi, ajv, typescript, graphql, prisma, ` +
						`valibot, yup, typebox, effect-schema, drizzle, mongo, zod.`
				);
			}
		}
	}
}
