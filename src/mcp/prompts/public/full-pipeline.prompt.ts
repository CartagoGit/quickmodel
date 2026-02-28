import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Walk the full QuickModel pipeline end-to-end.
 *
 * Guides the AI through:
 * 1. create() — hydrate raw data into a typed model instance
 * 2. checkIntegrity() — transformer-level checks (invalid Date, BigInt range, etc.)
 * 3. checkRules() — @QRule business-logic predicates
 * 4. serialize() / toJSON() — safe round-trip back to JSON
 *
 * Uses: check_integrity, simulate_validation, simulate_transformation tools.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QCheckIntegrityTool} for integrity checks
 * @see {@link QSimulateValidationTool} for rule validation
 * @see {@link QSimulateTransformationTool} for transformation verification
 */
export class QFullPipelinePrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	sample_data: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_full_pipeline';
	title = 'Walk the Full QuickModel Pipeline';
	description =
		'Guides the AI through the complete QuickModel data lifecycle: ' +
		'raw data → create() → checkIntegrity() → checkRules() → serialize() / toJSON(). ' +
		'Uses check_integrity, simulate_validation, and simulate_transformation to verify each step.';

	argsSchema = {
		model_code: z
			.string()
			.describe('The QuickModel class definition to walk through'),
		sample_data: z
			.string()
			.optional()
			.describe(
				'Optional JSON string with sample data to use at each step (e.g. \'{"id":"1","createdAt":"2024-01-01"}\')'
			),
	};

	execute(args: {
		model_code: string;
		sample_data?: string;
	}): Promise<IQPromptResult> {
		const { model_code, sample_data } = args;

		const sampleBlock = sample_data
			? `\n\n**Sample data to use:**\n\`\`\`json\n${sample_data}\n\`\`\``
			: '';

		return Promise.resolve({
			description: 'Walk the full QuickModel pipeline',
			messages: [
				this.user(
					`I want to understand the complete QuickModel pipeline for this model:${sampleBlock}\n\n` +
						`\`\`\`typescript\n${model_code}\n\`\`\`\n\n` +
						`Please walk me through each stage:\n` +
						`1. **Hydration** — \`create()\` / \`new Model(data)\`\n` +
						`2. **Integrity check** — \`checkIntegrity()\`\n` +
						`3. **Rule validation** — \`checkRules()\`\n` +
						`4. **Serialization** — \`serialize()\` / \`toJSON()\``
				),
				this.assistant(
					'I will walk through each stage of the QuickModel pipeline:\n\n' +
						'---\n\n' +
						'**Stage 1 — Hydration: `create()` / `new Model(data)`**\n\n' +
						'When you pass raw data to `create()`, QuickModel:\n' +
						'- Reads the `@Quick({ field: Transformer })` map\n' +
						'- Runs each transformer (e.g. string → Date, string → bigint)\n' +
						'- Stores values in an internal hidden store\n' +
						'- Installs lazy getters so `instance.field` accesses the transformed value\n\n' +
						'Call `simulate_transformation` with your data and options to preview this step:\n' +
						'```json\n' +
						'{ "data": { "createdAt": "2024-01-01" }, "options": { "createdAt": "Date" } }\n' +
						'```\n\n' +
						'---\n\n' +
						'**Stage 2 — Integrity check: `checkIntegrity()`**\n\n' +
						'After transformation, `checkIntegrity()` asks each transformer:\n' +
						'*"Is this value still valid after transformation?"*\n\n' +
						'Examples that fail:\n' +
						'- `new Date("not-a-date")` → `Invalid Date`\n' +
						'- BigInt values outside safe range\n' +
						'- RegExp patterns with catastrophic backtracking (ReDoS)\n\n' +
						'Call `check_integrity` with your data and options to test this:\n' +
						'```json\n' +
						'{ "data": { "createdAt": "not-a-date" }, "options": { "createdAt": "Date" } }\n' +
						'```\n\n' +
						'---\n\n' +
						'**Stage 3 — Rule validation: `checkRules()`**\n\n' +
						'`checkRules()` evaluates all `@QRule` predicates on the **already-transformed** instance.\n' +
						'This is where business logic lives — format, range, cross-field constraints.\n\n' +
						'Returns `{ valid: boolean, errors: Array<{ field, message, value }> }`.\n\n' +
						'Call `simulate_validation` to test predicates without a real class:\n' +
						'```json\n' +
						'{\n' +
						'  "data": { "age": 15 },\n' +
						'  "rules": [{ "field": "age", "predicate": "value >= 18", "message": "Must be 18+" }]\n' +
						'}\n' +
						'```\n\n' +
						'---\n\n' +
						'**Stage 4 — Serialization: `serialize()` / `toJSON()`**\n\n' +
						'The final stage converts the runtime instance back to a JSON-safe object:\n' +
						'- `Date` → ISO string\n' +
						'- `bigint` → string (numeric)\n' +
						'- `Set`/`Map` → array/object\n' +
						'- `RegExp` → `{ source, flags }`\n\n' +
						'```typescript\n' +
						'const instance = Model.create(rawData);\n\n' +
						'// Stage 2 — integrity\n' +
						'const integrity = instance.checkIntegrity(); // []\n\n' +
						'// Stage 3 — rules\n' +
						'const rules = instance.checkRules(); // { valid: true, errors: [] }\n\n' +
						'// Stage 4 — serialization\n' +
						'const json = instance.toJSON(); // JSON string\n' +
						'const obj = instance.serialize(); // plain object\n' +
						'```\n\n' +
						'**Combined shortcut:**\n' +
						'```typescript\n' +
						'const report = instance.validationReport();\n' +
						'// { valid, integrity: [], rules: { valid, errors: [] } }\n' +
						'```'
				),
				this.user(
					`Now please verify this model step by step using the tools:\n\n` +
						`1. Call \`simulate_transformation\` with representative data from the model\n` +
						`2. Call \`check_integrity\` to verify transformer-level validity\n` +
						`3. Call \`simulate_validation\` to test any @QRule predicates\n` +
						`4. Show the final serialized output\n\n` +
						`Model:\n\`\`\`typescript\n${model_code}\n\`\`\`` +
						(sample_data
							? `\n\nSample data: \`${sample_data}\``
							: '')
				),
			],
		});
	}
}
