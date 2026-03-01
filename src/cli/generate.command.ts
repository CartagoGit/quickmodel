/**
 * CLI `generate` subcommand logic for QuickModel.
 *
 * Exposes pure generation functions (no file I/O) so they can be tested in
 * isolation and composed by the CLI entry point (`mcp-cli.ts`).
 *
 * @example
 * ```sh
 * npx quickmodel generate model  User  --fields "id:number,email:string"
 * npx quickmodel generate transformer  Decimal
 * npx quickmodel generate integration  prisma
 * ```
 *
 * @see {@link runGenerateCommand} — main dispatcher called by the CLI
 * @module quickmodel/cli/generate
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A single field descriptor parsed from the `--fields` CLI argument.
 *
 * @example `{ name: 'createdAt', type: 'Date' }`
 */
export interface IGenerateField {
	/** Property name (e.g. `'createdAt'`). */
	name: string;
	/** TypeScript type name (e.g. `'Date'`, `'number'`). */
	type: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** TypeScript primitives that need no QuickModel transformer. */
const PRIMITIVES = new Set<string>([
	'number',
	'string',
	'boolean',
	'null',
	'undefined',
	'unknown',
	'any',
	'void',
	'never',
]);

const GENERATE_USAGE = `
Usage:
  quickmodel generate model <ClassName> [--fields "field:type,..."]
  quickmodel generate transformer <Name>
  quickmodel generate integration <target>

Targets for integration: prisma, drizzle, zod

Examples:
  quickmodel generate model User --fields "id:number,name:string,createdAt:Date"
  quickmodel generate transformer Decimal
  quickmodel generate integration prisma
`.trim();

// ─── Integration snippets ────────────────────────────────────────────────────

const PRISMA_SNIPPET = `\
// QuickModel + Prisma integration
// See: https://quickmodel.dev/integrations/prisma
import { Quick, QModel } from 'quickmodel';
import { PrismaClient } from '@prisma/client';

interface IUser {
\tid: number;
\temail: string;
\tcreatedAt: string; // serialized ISO string
}

@Quick({ createdAt: Date })
export class User extends QModel<IUser> {
\tdeclare id: number;
\tdeclare email: string;
\tdeclare createdAt: Date; // runtime Date
}

const prisma = new PrismaClient();

export async function findUser(id: number): Promise<User | null> {
\tconst raw = await prisma.user.findUnique({ where: { id } });
\treturn raw ? new User(raw) : null;
}
`;

const DRIZZLE_SNIPPET = `\
// QuickModel + Drizzle ORM integration
// See: https://quickmodel.dev/integrations/drizzle
import { Quick, QModel } from 'quickmodel';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from './schema'; // your Drizzle schema file

interface IUser {
\tid: number;
\temail: string;
\tcreatedAt: string; // serialized ISO string
}

@Quick({ createdAt: Date })
export class User extends QModel<IUser> {
\tdeclare id: number;
\tdeclare email: string;
\tdeclare createdAt: Date;
}

const db = drizzle(process.env['DATABASE_URL']!);

export async function findUser(id: number): Promise<User | null> {
\tconst [raw] = await db.select().from(users).where(eq(users.id, id));
\treturn raw ? new User(raw) : null;
}
`;

const ZOD_SNIPPET = `\
// QuickModel + Zod integration
// See: https://quickmodel.dev/integrations/zod
import { Quick, QModel } from 'quickmodel';
import { z } from 'zod';

interface IUser {
\tid: number;
\temail: string;
}

@Quick({})
export class User extends QModel<IUser> {
\tdeclare id: number;
\tdeclare email: string;
}

// Generate a Zod schema from QuickModel metadata
const UserZodSchema = User.getSchema('zod');
// → z.object({ id: z.number(), email: z.string() })

export function parseUser(data: unknown): User {
\treturn new User(UserZodSchema.parse(data));
}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lowercases the first character of a `PascalCase` string. */
function toCamelCase(name: string): string {
	return name.charAt(0).toLowerCase() + name.slice(1);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parses a comma-separated `"field:type"` string into an array of field descriptors.
 *
 * @param raw - Raw fields string, e.g. `"id:number,createdAt:Date"`.
 * @returns Parsed `IGenerateField[]`; empty array for an empty or blank input.
 *
 * @see {@link IGenerateField} — shape of each parsed descriptor
 * @see {@link generateModel} — consumes the array returned by this function
 *
 * @example
 * ```ts
 * parseFields('id:number,name:string');
 * // → [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }]
 * ```
 */
export function parseFields(raw: string): IGenerateField[] {
	if (!raw.trim()) return [];
	return raw
		.split(',')
		.map((entry) => {
			const parts = entry.split(':').map((str) => str.trim());
			return { name: parts[0] ?? '', type: parts[1] ?? 'unknown' };
		})
		.filter((field) => field.name.length > 0);
}

/**
 * Generates TypeScript source code for a QModel class scaffold.
 *
 * Automatically detects non-primitive types (e.g. `Date`, `Set`, `Map`) and
 * includes them in the `@Quick({})` transformer config.
 *
 * @param className - PascalCase class name (e.g. `'User'`).
 * @param fields - Parsed field descriptors from `parseFields()`.
 * @returns TypeScript source string ready to write to a `.ts` file.
 *
 * @see {@link parseFields} — helper that produces the `fields` argument
 * @see {@link runGenerateCommand} — CLI dispatcher that calls this function
 *
 * @example
 * ```ts
 * generateModel('User', [{ name: 'id', type: 'number' }, { name: 'createdAt', type: 'Date' }]);
 * ```
 */
export function generateModel(
	className: string,
	fields: IGenerateField[]
): string {
	const transformerFields = fields.filter(
		(field) => !PRIMITIVES.has(field.type)
	);

	const quickDecorator =
		transformerFields.length === 0
			? '@Quick({})'
			: `@Quick({\n${transformerFields.map((field) => `\t${field.name}: ${field.type},`).join('\n')}\n})`;

	const interfaceLines =
		fields.length === 0
			? '\t// add your fields here'
			: fields
					.map((field) => `\t${field.name}: ${field.type};`)
					.join('\n');

	const classLines =
		fields.length === 0
			? '\t// declare your fields here'
			: fields
					.map((field) => `\tdeclare ${field.name}: ${field.type};`)
					.join('\n');

	return [
		`import { Quick, QModel } from 'quickmodel';`,
		``,
		`export interface I${className} {`,
		interfaceLines,
		`}`,
		``,
		quickDecorator,
		`export class ${className} extends QModel<I${className}> {`,
		classLines,
		`}`,
	].join('\n');
}

/**
 * Generates a TypeScript transformer skeleton for a custom runtime type.
 *
 * The generated constant follows the `IQTransformer` contract and can be
 * registered via `@Quick({ field: myTransformer })` or in `QConfig.configure()`.
 *
 * @param name - PascalCase name of the custom type (e.g. `'Decimal'`, `'MyCustomType'`).
 * @returns TypeScript source string with TODO stubs for `serialize` and `deserialize`.
 *
 * @see {@link runGenerateCommand} — CLI dispatcher that calls this function
 * @see {@link generateModel} — sibling generator for QModel class scaffolds
 *
 * @example
 * ```ts
 * generateTransformer('Decimal'); // → "export const decimalTransformer: IQTransformer = ..."
 * ```
 */
export function generateTransformer(name: string): string {
	const varName = `${toCamelCase(name)}Transformer`;
	return [
		`import type { IQTransformer } from 'quickmodel/advanced';`,
		``,
		`/**`,
		` * Custom transformer for ${name}.`,
		` *`,
		` * Register via \`@Quick({ field: ${varName} })\` or`,
		` * \`QConfig.configure({ transformers: { [key]: ${varName} } })\`.`,
		` */`,
		`export const ${varName}: IQTransformer = {`,
		`\tserialize: (value: unknown): unknown => {`,
		`\t\t// TODO: convert value to a JSON-serializable form`,
		`\t\treturn String(value);`,
		`\t},`,
		`\tdeserialize: (value: unknown): unknown => {`,
		`\t\t// TODO: convert value back to the runtime ${name} type`,
		`\t\treturn value;`,
		`\t},`,
		`};`,
	].join('\n');
}

/**
 * Generates a ready-to-use integration boilerplate snippet for the given target.
 *
 * @param target - Integration target: `'prisma'`, `'drizzle'`, or `'zod'`.
 * @returns TypeScript source boilerplate.
 * @throws {RangeError} When `target` is not a supported integration.
 *
 * @see {@link runGenerateCommand} — CLI dispatcher that calls this function
 * @see {@link generateModel} — sibling generator for QModel class scaffolds
 *
 * @example
 * ```ts
 * generateIntegration('prisma'); // → QuickModel + Prisma boilerplate
 * ```
 */
export function generateIntegration(target: string): string {
	switch (target) {
		case 'prisma':
			return PRISMA_SNIPPET;
		case 'drizzle':
			return DRIZZLE_SNIPPET;
		case 'zod':
			return ZOD_SNIPPET;
		default:
			throw new RangeError(
				`Unknown integration target: "${target}". Supported: prisma, drizzle, zod`
			);
	}
}

/**
 * Main dispatcher for the `quickmodel generate` CLI subcommand.
 *
 * Parses `args` (everything after `generate`) and delegates to the appropriate
 * sub-generator. Always returns a string — errors are returned as formatted
 * messages rather than thrown.
 *
 * @param args - Positional and flag arguments after the `generate` keyword.
 * @returns Generated source code or a usage / error string.
 *
 * @see {@link generateModel} — called when `sub === 'model'`
 * @see {@link generateTransformer} — called when `sub === 'transformer'`
 * @see {@link generateIntegration} — called when `sub === 'integration'`
 *
 * @example
 * ```ts
 * runGenerateCommand(['model', 'User', '--fields', 'id:number,name:string']);
 * runGenerateCommand(['transformer', 'Decimal']);
 * runGenerateCommand(['integration', 'prisma']);
 * ```
 */
export function runGenerateCommand(args: string[]): string {
	const [sub, name, ...rest] = args;

	if (!sub || !['model', 'transformer', 'integration'].includes(sub)) {
		return GENERATE_USAGE;
	}

	switch (sub) {
		case 'model': {
			if (!name) return GENERATE_USAGE;
			let fieldsRaw = '';
			const fieldsIdx = rest.indexOf('--fields');
			if (fieldsIdx !== -1) {
				fieldsRaw = rest[fieldsIdx + 1] ?? '';
			}
			return generateModel(name, parseFields(fieldsRaw));
		}
		case 'transformer': {
			if (!name) return GENERATE_USAGE;
			return generateTransformer(name);
		}
		case 'integration': {
			if (!name) return GENERATE_USAGE;
			try {
				return generateIntegration(name);
			} catch (err) {
				if (err instanceof RangeError) {
					return `Unknown integration: "${name}". Supported: prisma, drizzle, zod\n\nUsage:\n  quickmodel generate integration <target>`;
				}
				throw err;
			}
		}
		default:
			return GENERATE_USAGE;
	}
}
