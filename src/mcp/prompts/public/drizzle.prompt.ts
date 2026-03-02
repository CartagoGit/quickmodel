import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Generate a QuickModel DTO from a Drizzle ORM table schema.
 *
 * Guides the AI through the full Drizzle → QuickModel workflow:
 * 1. Parse the Drizzle table schema (column types, constraints)
 * 2. Map Drizzle column types to QuickModel `@Quick()` transformer config
 * 3. Generate the DTO class with `@QRule` / `@QComputed` / `@QField` decorators
 * 4. Call `validate_usage` to confirm the generated class is correct
 * 5. Optionally call `simulate_transformation` to verify type coercion
 *
 * Key type mappings applied automatically:
 * - `timestamp()` / `date()` → `Date` transformer
 * - `integer()` / `bigint()` / `doublePrecision()` / `real()` → `'number'`
 * - `varchar()` / `text()` / `char()` → `'string'`
 * - `boolean()` → `'boolean'`
 * - `jsonb()` / `json()` → `'string'` (serialized via JSON.stringify)
 *
 * Drizzle-specific config applied by default:
 * - `unknownPropertyPolicy: 'strip'` — removes join artifacts, audit columns, relational fields
 * - `coercionStrategy: 'loose'` — handles raw query string-to-primitive coercion
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QValidateUsageTool} — validates the generated model
 * @see {@link QSimulateTransformationTool} — verifies type coercion in step 5
 * @see {@link QInterfaceToModelTool} — used when only a TS interface is available
 */
export class QDrizzlePrompt extends QAbstractPrompt<{
	drizzle_schema: z.ZodString;
	dto_name: z.ZodOptional<z.ZodString>;
	patterns: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_drizzle';
	title = 'Generate QuickModel DTO from Drizzle ORM schema';
	description =
		'Generates a type-safe QuickModel DTO from a Drizzle ORM table schema. ' +
		'Automatically maps Drizzle column types to @Quick() transformer config: ' +
		'timestamp() → Date, integer()/doublePrecision() → number, boolean() → boolean, jsonb() → string. ' +
		'Applies unknownPropertyPolicy: strip (removes join artifacts) and coercionStrategy: loose (raw query coercion). ' +
		'Optionally generates insert DTO, repository class, copy() partial update, createMany() seed, and async uniqueness rules. ' +
		'Calls validate_usage and simulate_transformation to verify the result.';

	argsSchema = {
		drizzle_schema: z
			.string()
			.describe(
				"Drizzle table schema definition (e.g. `export const users = pgTable('users', { id: integer().primaryKey(), name: varchar({ length: 255 }), createdAt: timestamp().notNull() })`)"
			),
		dto_name: z
			.string()
			.optional()
			.describe(
				"Optional name for the generated select DTO class (defaults to the table name in PascalCase + 'Dto', e.g. 'UserDto')"
			),
		patterns: z
			.string()
			.optional()
			.describe(
				"Comma-separated list of additional patterns to generate. 'select' is always included. " +
					"Available: 'insert' (CreateDto with @QRule validation), " +
					"'repository' (DrizzleRepository class), " +
					"'copy' (partial update with copy() + db.update().set()), " +
					"'createMany' (bulk seed/import), " +
					"'async-rules' ($qCheckRulesAsync() DB uniqueness). " +
					"Example: 'insert,repository,copy'"
			),
	};

	execute(args: {
		drizzle_schema: string;
		dto_name?: string;
		patterns?: string;
	}): Promise<IQPromptResult> {
		const { drizzle_schema, dto_name, patterns = '' } = args;
		const patternList = patterns
			.split(',')
			.map((pat) => pat.trim())
			.filter(Boolean);
		const dtoNameHint = dto_name
			? ` Name the select DTO \`${dto_name}\`.`
			: '';
		const patternDesc =
			patternList.length > 0
				? `\n\nAlso generate the following patterns:\n${patternList.map((pat) => `- **${pat}**`).join('\n')}`
				: '';

		return Promise.resolve({
			description: `Generate QuickModel DTO from Drizzle schema${dto_name ? ` (${dto_name})` : ''}`,
			messages: [
				this.user(
					`I have this Drizzle ORM table schema and I want to generate a QuickModel DTO from it:\n\n` +
						`\`\`\`typescript\n${drizzle_schema}\n\`\`\`\n` +
						dtoNameHint +
						patternDesc
				),
				this.assistant(
					`I will generate a QuickModel DTO from this Drizzle schema.\n\n` +
						`### Step 0 — 🤝 Register your work (mandatory)\n\n` +
						`Before writing any file:\n` +
						`1. Call \`agent_coordinate\` with \`action: "check"\` — confirm no other agent is writing to the same source area\n` +
						`2. Call \`agent_coordinate\` with \`action: "claim"\`, your \`agentId\`, task \`"drizzle DTO: ${dto_name ?? 'untitled'}"\`, and \`files\` (the path where the new DTO file will be saved)\n` +
						`3. If \`conflict: true\` → **STOP**. Do not write any file until the conflict is resolved.\n` +
						`4. **Read before every write:** Immediately before modifying each file, read its current content from disk — your context may be stale if another agent edited it since you started. If the file changed: adapt your change, merge carefully, or skip if no longer needed. Never overwrite from stale context.\n` +
						`5. Release when done: \`agent_coordinate action="release"\`\n\n` +
						`---\n\n` +
						`**Step 1 — Analyze column types**\n` +
						`I will map each Drizzle column to its QuickModel transformer:\n` +
						`- \`integer()\` / \`serial()\` / \`bigint()\` / \`doublePrecision()\` / \`real()\` → \`'number'\`\n` +
						`- \`varchar()\` / \`text()\` / \`char()\` → \`'string'\`\n` +
						`- \`boolean()\` → \`'boolean'\`\n` +
						`- \`timestamp()\` / \`date()\` → \`Date\` (transformer class — coerces ISO string to Date instance)\n` +
						`- \`jsonb()\` / \`json()\` → \`'string'\` (requires JSON.stringify before insert, JSON.parse after select)\n\n` +
						`**Step 2 — Apply Drizzle config**\n` +
						`I will always apply:\n` +
						`- \`unknownPropertyPolicy: 'strip'\` — removes join artifacts (\`_count\`, relations, audit columns like \`updatedAt\`, \`version\`)\n` +
						`- \`coercionStrategy: 'loose'\` — handles raw query string-to-primitive coercion\n\n` +
						`**Step 3 — Generate the DTO**\n` +
						`I will call \`validate_usage\` on the generated class to verify correctness.\n\n` +
						`**Step 4 — Verify type coercion**\n` +
						`I will call \`simulate_transformation\` with a sample row (including ISO strings for timestamps) to confirm the coercion works correctly.\n\n` +
						`Let me start by parsing the schema.`
				),
				this.user(
					`Please:\n` +
						`1. Parse the Drizzle schema and identify all column types\n` +
						`2. Generate the QuickModel DTO class using the type mapping above\n` +
						`3. Call \`validate_usage\` on the generated class\n` +
						`4. Call \`simulate_transformation\` with a sample row to verify Date coercion\n` +
						(patternList.includes('insert')
							? `5. Also generate a \`Create${dto_name ?? 'Entity'}Dto\` with @QRule validators for create/insert operations\n`
							: '') +
						(patternList.includes('repository')
							? `6. Generate a \`Drizzle${dto_name ?? 'Entity'}Repository\` class with insert(), findById(), findAll(), and delete() methods\n`
							: '') +
						(patternList.includes('copy')
							? `7. Show the partial update pattern: \`existing.$qCopy({ field: value })\` → \`db.update().set(...)\`\n`
							: '') +
						(patternList.includes('createMany')
							? `8. Show the bulk seed/import pattern using \`${dto_name ?? 'EntityDto'}.createMany(seed)\`\n`
							: '') +
						(patternList.includes('async-rules')
							? `9. Show the DB-level uniqueness validation pattern using \`$qCheckRulesAsync()\`\n`
							: '') +
						`\nShow me the complete final code.`
				),
			],
		});
	}
}
