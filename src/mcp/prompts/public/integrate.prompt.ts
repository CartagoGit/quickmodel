import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Guided workflow for integrating QuickModel with an external library or framework.
 *
 * Orchestrates the full integration pipeline:
 *  1. Analyse the external library's data types / API surface
 *  2. Map library-specific types to QuickModel transformer tokens
 *  3. Generate a QuickModel DTO / adapter class
 *  4. Validate with `validate_usage`
 *  5. Simulate a transformation with `simulate_transformation`
 *  6. Generate integration tests with `generate_integration_test`
 *
 * Covers any library: ORMs (Prisma, Mongoose, Drizzle), HTTP clients (Axios, Fetch),
 * state managers (Zustand, Redux), form libraries (RHF, Formik), etc.
 *
 * For Drizzle ORM specifically prefer the dedicated `quickmodel_drizzle` skill
 * (more precise type mappings).
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QValidateUsageTool} — validates the generated model
 * @see {@link QSimulateTransformationTool} — verifies type coercion in step 5
 * @see {@link QGenerateIntegrationTestTool} — generates integration tests in step 6
 * @see {@link QDrizzlePrompt} — dedicated Drizzle ORM integration skill
 */
export class QIntegratePrompt extends QAbstractPrompt<{
	library: z.ZodString;
	use_case: z.ZodString;
	model_code: z.ZodOptional<z.ZodString>;
	patterns: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_integrate';
	title = 'Integrate QuickModel with an External Library';
	description =
		'Guided workflow for integrating QuickModel with any external library or framework. ' +
		'Steps: analyse library API → map types to @Quick() config → generate DTO class → ' +
		'validate_usage → simulate_transformation → generate_integration_test. ' +
		'Works with ORMs (Prisma, Mongoose, TypeORM), HTTP clients, form libs (RHF, Formik), ' +
		'state managers (Zustand, Redux), and more. ' +
		'For Drizzle ORM use quickmodel_drizzle (more specific type mappings).';

	argsSchema = {
		library: z
			.string()
			.describe(
				'Name of the external library to integrate with (e.g. "Prisma", "Mongoose", "Axios", "React Hook Form", "Zustand")'
			),
		use_case: z
			.string()
			.describe(
				'Description of the integration use case ' +
					'(e.g. "Map Prisma User model to a QuickModel DTO for API responses", ' +
					'"Validate React Hook Form submission data with @QRule")'
			),
		model_code: z
			.string()
			.optional()
			.describe(
				'Optional: existing TypeScript type, interface, or schema from the library ' +
					'(e.g. Prisma model, Mongoose schema, Zod schema). ' +
					'Providing this enables more accurate type mappings.'
			),
		patterns: z
			.string()
			.optional()
			.describe(
				'Comma-separated list of additional patterns to generate alongside the base DTO. ' +
					'Examples: "create-dto" (insert/create input), "repository" (service layer), ' +
					'"validation" (add @QRule rules), "tests" (integration test suite), "adapter" (adapter class).'
			),
	};

	execute(args: {
		library: string;
		use_case: string;
		model_code?: string;
		patterns?: string;
	}): Promise<IQPromptResult> {
		const { library, use_case, model_code, patterns = '' } = args;
		const patternList = patterns
			.split(',')
			.map((pat) => pat.trim())
			.filter(Boolean);

		const modelCodeSection = model_code
			? `\n\n**Existing schema/type provided:**\n\`\`\`typescript\n${model_code}\n\`\`\``
			: '';

		const patternSection =
			patternList.length > 0
				? `\n\n**Additionally generate:** ${patternList.map((pat) => `\`${pat}\``).join(', ')}`
				: '';

		return Promise.resolve({
			description: `Integrate QuickModel with ${library}: ${use_case}`,
			messages: [
				this.user(
					`I need to integrate QuickModel with **${library}**.\n\n` +
						`**Use case:** ${use_case}` +
						modelCodeSection +
						patternSection
				),

				this.assistant(
					`## 🔗 QuickModel × ${library} Integration\n\n` +
						`I'll guide you through the complete integration in 7 steps (Step 0 first — registration, then Steps 1–6).\n\n` +
						`---\n\n` +
						`### Step 0 — 🤝 Register your work (mandatory)\n\n` +
						`Before generating or writing any file:\n` +
						`1. Call \`agent_coordinate\` with \`action: "check"\` — confirm no other agent is writing to the same source area\n` +
						`2. Call \`agent_coordinate\` with \`action: "claim"\`, your \`agentId\`, task \`"integrate ${library}"\`, and \`files\` (paths of model + test files you will create)\n` +
						`3. If \`conflict: true\` → **STOP**. Do not write any file until the conflict is resolved.\n` +
						`4. Release when done: \`agent_coordinate action="release"\`\n\n` +
						`---\n\n` +
						`### Step 1 — Analyse ${library} data types\n\n` +
						`First I'll examine the ${library} data structures involved in: **${use_case}**\n\n` +
						`Key questions to resolve:\n` +
						`- What TypeScript types/interfaces does ${library} expose for this use case?\n` +
						`- Which fields contain raw database types, strings, or plain objects that need coercion?\n` +
						`- Are there timestamps (ISO string → Date), numbers-as-strings, or nested objects?\n` +
						`- What fields should be stripped (join artifacts, audit columns, internal IDs)?\n\n` +
						`---\n\n` +
						`### Step 2 — Map ${library} types → @Quick() transformer config\n\n` +
						`Standard mappings I'll apply:\n\n` +
						`| ${library} type | QuickModel config |\n` +
						`|---|---|\n` +
						`| \`Date\` / ISO timestamp string | \`{ field: Date }\` |\n` +
						`| \`number\` / numeric string | \`{ field: 'number' }\` |\n` +
						`| \`boolean\` / 0\\|1 | \`{ field: 'boolean' }\` |\n` +
						`| \`string\` coercion | \`{ field: 'string' }\` |\n` +
						`| JSON/JSONB fields | \`'string'\` (serialized) or nested QModel |\n` +
						`| arrays of typed items | \`{ field: [Date] }\` / \`{ field: ['number'] }\` |\n\n` +
						(model_code
							? `I'll use the provided schema to determine the exact mappings.\n\n`
							: `Provide the ${library} type/schema so I can generate accurate mappings.\n\n`) +
						`---\n\n` +
						`### Step 3 — Generate the QuickModel DTO\n\n` +
						`I'll create a class following these rules:\n` +
						`- Extends \`QModel<IYourInterface>\`\n` +
						`- Uses \`@Quick({})\` with correct transformer config\n` +
						`- Adds \`@QRule\` validation where needed\n` +
						`- Applies \`unknownPropertyPolicy: 'strip'\` to remove ${library}-internal fields\n` +
						`- Uses \`coercionStrategy: 'loose'\` if the source provides raw query results\n\n` +
						`Then I'll call \`validate_usage\` to confirm the class is correct.\n\n` +
						`---\n\n` +
						`### Step 4 — Validate the generated model\n\n` +
						`\`\`\`\ncall: validate_usage({ code: <generated DTO> })\n\`\`\`\n\n` +
						`Expected: \`{ valid: true }\`. Any issues are fixed before proceeding.\n\n` +
						`---\n\n` +
						`### Step 5 — Simulate a sample transformation\n\n` +
						`\`\`\`\ncall: simulate_transformation({ data: <sample ${library} output>, options: <@Quick config> })\n\`\`\`\n\n` +
						`Confirms that all type coercions work correctly with real ${library} data.\n\n` +
						`For a field-by-field trace: \`explain_transformation\` to understand\n` +
						`which transformer activated for each field and why.\n\n` +
						`---\n\n` +
						`### Step 6 — Generate integration tests\n\n` +
						`\`\`\`\ncall: generate_integration_test({ base_model: "<DTO name>", test_type: "roundtrip" })\n\`\`\`\n\n` +
						`This generates a Bun-compatible test suite covering:\n` +
						`- Coercion of ${library} raw output types\n` +
						`- Round-trip serialize → create → serialize idempotency\n` +
						`- Validation rules (if @QRule decorators were added)\n\n` +
						`---\n\n` +
						`**Let me start.** Please confirm the ${library} type/schema we're working with, ` +
						`or share a sample data object the integration should handle.`
				),

				this.user(
					`Please proceed with the integration.\n\n` +
						(model_code
							? `Use the schema I provided above.`
							: `Here is a sample data object from ${library} for the use case "${use_case}":\n` +
								`\`\`\`typescript\n// FILL IN: paste a sample ${library} data object here\n\`\`\``) +
						`\n\nGenerate the QuickModel DTO, validate it, simulate the transformation, ` +
						`and generate the integration test suite.`
				),

				this.assistant(
					`## 🚀 Executing integration — ${library} × QuickModel\n\n` +
						`### Checklist\n\n` +
						`- [ ] Step 1: Analysed ${library} type surface\n` +
						`- [ ] Step 2: Type mapping table complete\n` +
						`- [ ] Step 3: DTO generated\n` +
						`- [ ] Step 4: \`validate_usage\` → \`valid: true\`\n` +
						`- [ ] Step 5: \`simulate_transformation\` verified\n` +
						`- [ ] Step 6: Integration tests generated\n\n` +
						(patternList.length > 0
							? `Additionally generating: ${patternList.map((pat) => `**${pat}**`).join(', ')}\n\n`
							: '') +
						`Starting with Step 1 — analysing ${library} types for: ${use_case}`
				),
			],
		});
	}
}
