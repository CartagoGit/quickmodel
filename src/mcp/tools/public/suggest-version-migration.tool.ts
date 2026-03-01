import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * Extracts all `declare <field>: <type>` declarations from model source code.
 * Returns a Map of fieldName → typeString.
 */
function extractDeclaredFields(code: string): Map<string, string> {
	const fields = new Map<string, string>();
	const pattern = /declare\s+(\w+)\s*:\s*([^;]+);/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(code)) !== null) {
		const name = match[1];
		const typ = match[2]?.trim() ?? '';
		if (name) fields.set(name, typ);
	}
	return fields;
}

/**
 * Extracts the @Quick({...}) options string from model source code.
 * Returns a plain string of the options object interior (e.g. "createdAt: Date, age: Number").
 */
function extractQuickOpts(code: string): string {
	const match = /@Quick\s*\(\s*\{([^}]*)\}/s.exec(code);
	return match?.[1]?.trim() ?? '';
}

/**
 * Parses a Quick-options string into a Map of fieldName → transformerName.
 * E.g. "createdAt: Date, tags: Set" → Map { createdAt → "Date", tags → "Set" }
 */
function parseTransformerMap(optionsStr: string): Map<string, string> {
	const result = new Map<string, string>();
	if (!optionsStr) return result;
	for (const entry of optionsStr.split(',')) {
		const colonIdx = entry.indexOf(':');
		if (colonIdx === -1) continue;
		const key = entry.slice(0, colonIdx).trim();
		const val = entry.slice(colonIdx + 1).trim();
		if (key && val) result.set(key, val);
	}
	return result;
}

/**
 * Extracts the class name from QuickModel source code.
 * Returns the first class name that extends QModel, or null if not found.
 */
function extractClassName(code: string): string | null {
	const match = /class\s+(\w+)\s+extends\s+QModel/.exec(code);
	return match?.[1] ?? null;
}

/**
 * Detects the declared @QVersion version number from model source, if present.
 * Returns the detected version or null.
 */
function detectCurrentVersion(code: string): number | null {
	const match = /@QVersion\s*\(\s*(\d+)/.exec(code);
	return match?.[1] !== undefined ? parseInt(match[1], 10) : null;
}

/**
 * Builds the migration function body skeleton for a single step.
 *
 * @param addedFields   Fields present in the new model but not the old one.
 * @param removedFields Fields present in the old model but not the new one.
 * @param changedTypes  Fields present in both but with different TypeScript types.
 */
function buildMigrationBody(opts: {
	addedFields: string[];
	removedFields: string[];
	changedTypes: Array<{ field: string; typeFrom: string; typeTo: string }>;
}): string {
	const { addedFields, removedFields, changedTypes } = opts;
	const lines: string[] = ['(data) => ({', '  ...data,'];

	for (const field of addedFields) {
		lines.push(
			`  ${field}: undefined, // TODO: provide default or mapping`
		);
	}
	for (const field of removedFields) {
		lines.push(
			`  // "${field}" removed — omit or keep for backward compat`
		);
	}
	for (const { field, typeFrom, typeTo } of changedTypes) {
		lines.push(
			`  // "${field}" changed: ${typeFrom} → ${typeTo} — transform if needed`
		);
	}

	lines.push('})');
	return lines.join('\n');
}

/** Represents a single migration step entry in the output */
interface IMigrationStepInfo {
	/** Source version (the data version this step upgrades from) */
	from: number;
	/** Target version (the data version this step upgrades to) */
	to: number;
	/** Skeleton code for the migration function of this step */
	skeleton: string;
	/** Optional human-readable description of why this migration step was needed */
	description: string | undefined;
	/** Fields added in this step that need a default value or mapping */
	manual_defaults: string[];
	/** Fields removed in this step */
	removed: string[];
	/** Fields whose TypeScript types changed */
	type_changes: Array<{ field: string; type_from: string; type_to: string }>;
}

/** Return shape of {@link QSuggestVersionMigrationTool.execute} */
interface ISuggestVersionMigrationResult {
	/** The target version number (from_version + 1) */
	target_version: number;
	/** Generated @QVersion decorator code ready to prepend to the model */
	qversion_decorator: string;
	/** The full updated model code with @QVersion applied */
	suggested_code: string;
	/** Details for each migration step generated */
	migration_steps: IMigrationStepInfo[];
	/** Items that require manual attention before the migration is production-ready */
	manual_items: string[];
	/** Human-readable summary of changes */
	summary: string;
}

/**
 * Tool to automatically generate a `@QVersion` decorator and migration skeleton
 * when a QuickModel schema evolves between versions.
 *
 * Given the "before" and "after" model source code plus the current schema version,
 * it computes the structural diff (added/removed/type-changed fields) and produces
 * a ready-to-annotate `@QVersion(N+1, { migrations: { N: ... } })` decorator with
 * properly placed TODOs for values that require manual attention.
 *
 * Use this tool when:
 * - You renamed or restructured fields and want to preserve old JSON/localStorage data
 * - You are adding a required field and need a sensible default for legacy records
 * - You want to ensure no migration step is accidentally skipped (gap validation)
 *
 * @see {@link QDiffModelsTool} — structural diff without migration scaffold
 * @see {@link QMigrationPrompt} — guided skill for migrating legacy code to QuickModel
 * @see {@link QValidateUsageTool} — static analysis of the resulting model code
 */
export class QSuggestVersionMigrationTool extends QAbstractTool<
	z.ZodObject<{
		current_model: z.ZodString;
		next_model: z.ZodString;
		from_version: z.ZodDefault<z.ZodNumber>;
		migration_description: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'suggest_version_migration';
	description =
		'Given two versions of a QuickModel class (before and after a schema change), ' +
		'automatically generates the @QVersion decorator with migration skeleton. ' +
		'Computes the structural diff (added/removed/type-changed fields), emits a ' +
		'ready-to-use @QVersion(N+1, { migrations: { N: fn } }) block, and flags every ' +
		'field that needs a manual default or transformation. ' +
		'Input: current_model (old code), next_model (new code), from_version (current version, default 1), ' +
		'migration_description (optional — short explanation of why the schema changed, embedded as a comment in the generated step). ' +
		'Returns { target_version, qversion_decorator, suggested_code, migration_steps, manual_items, summary }.';

	schema = z.object({
		current_model: z
			.string()
			.max(100_000)
			.describe(
				'TypeScript source code of the existing QuickModel class (the "before" version)'
			),
		next_model: z
			.string()
			.max(100_000)
			.describe(
				'TypeScript source code of the updated QuickModel class (the "after" version, without @QVersion yet)'
			),
		from_version: z
			.number()
			.int()
			.min(1)
			.max(1000)
			.default(1)
			.describe(
				'Current schema version number declared in the existing model (default: 1)'
			),
		migration_description: z
			.string()
			.max(500)
			.optional()
			.describe(
				'Optional short description of why the schema changed (e.g. "Merged firstName+lastName into fullName"). ' +
					'Embedded as a comment above the migration step in the generated @QVersion decorator.'
			),
	});

	/**
	 * Computes the migration diff and emits the `@QVersion` scaffold.
	 *
	 * @param args - Tool arguments.
	 * @param args.current_model - Source code of the old model (version N).
	 * @param args.next_model - Source code of the new model (target version N+1).
	 * @param args.from_version - The current schema version (default 1).
	 * @returns Migration scaffold with decorator, skeleton code, and manual-fix list.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QDiffModelsTool} — structural diff without migration scaffold
	 */
	async execute(args: {
		current_model: string;
		next_model: string;
		from_version: number;
		migration_description?: string;
	}): Promise<ISuggestVersionMigrationResult> {
		await Promise.resolve();

		const {
			current_model,
			next_model,
			from_version,
			migration_description,
		} = args;

		// Auto-detect version from existing @QVersion if not explicitly set by user
		const detectedVersion = detectCurrentVersion(current_model);
		const resolvedFromVersion =
			detectedVersion !== null ? detectedVersion : from_version;
		const targetVersion = resolvedFromVersion + 1;

		// Structural diff
		const fieldsOld = extractDeclaredFields(current_model);
		const fieldsNew = extractDeclaredFields(next_model);
		const transformersOld = parseTransformerMap(
			extractQuickOpts(current_model)
		);
		const transformersNew = parseTransformerMap(
			extractQuickOpts(next_model)
		);

		const addedFields: string[] = [];
		const removedFields: string[] = [];
		const changedTypes: Array<{
			field: string;
			typeFrom: string;
			typeTo: string;
		}> = [];

		for (const [name] of fieldsNew) {
			if (!fieldsOld.has(name)) addedFields.push(name);
		}
		for (const [name] of fieldsOld) {
			if (!fieldsNew.has(name)) removedFields.push(name);
		}
		for (const [name, typeOld] of fieldsOld) {
			const typeNew = fieldsNew.get(name);
			if (typeNew !== undefined && typeNew !== typeOld) {
				changedTypes.push({
					field: name,
					typeFrom: typeOld,
					typeTo: typeNew,
				});
			}
		}

		// Transformer changes — new fields with transformers need explicit migration
		const transformerAdditions: string[] = [];
		for (const [key] of transformersNew) {
			if (!transformersOld.has(key)) transformerAdditions.push(key);
		}

		// Build the step info
		const migrationBody = buildMigrationBody({
			addedFields,
			removedFields,
			changedTypes,
		});
		const stepInfo: IMigrationStepInfo = {
			from: resolvedFromVersion,
			to: targetVersion,
			skeleton: migrationBody,
			description: migration_description,
			manual_defaults: addedFields,
			removed: removedFields,
			type_changes: changedTypes.map((itm) => ({
				field: itm.field,
				type_from: itm.typeFrom,
				type_to: itm.typeTo,
			})),
		};

		// Build the @QVersion decorator string (properly indented, multi-step-safe)
		// We always output migrations for existing steps (if model already had @QVersion) + new step
		const existingMigrationsLines = this.buildExistingMigrationLines(
			current_model,
			resolvedFromVersion
		);

		const descriptionField =
			migration_description !== undefined
				? `  description: '${migration_description}',\n`
				: '';
		const newStepLine = `  ${resolvedFromVersion}: ${migrationBody},`;
		const allMigrationLines = [...existingMigrationsLines, newStepLine];

		const qversionDecorator =
			`@QVersion(${targetVersion}, {\n` +
			descriptionField +
			`  migrations: {\n` +
			allMigrationLines.map((line) => `    ${line}`).join('\n') +
			`\n  },\n` +
			`})`;

		// Build suggested model code — inject @QVersion before the class declaration
		const suggestedCode = this.injectQVersionDecorator(
			next_model,
			qversionDecorator
		);

		// Manual items
		const manual_items: string[] = [];
		for (const field of addedFields) {
			manual_items.push(
				`Field "${field}" was added — provide a default value or mapping expression in the migration`
			);
		}
		for (const { field, typeFrom, typeTo } of changedTypes) {
			manual_items.push(
				`Field "${field}" changed type from "${typeFrom}" to "${typeTo}" — add a transform if the raw value shape differs`
			);
		}
		for (const field of transformerAdditions) {
			manual_items.push(
				`Field "${field}" gained a transformer in @Quick({}) — verify raw data in old records is compatible`
			);
		}
		if (removedFields.length > 0) {
			manual_items.push(
				`Removed fields [${removedFields.join(', ')}] — decide whether their data should be preserved for rollback purposes`
			);
		}

		// Summary
		const className = extractClassName(next_model) ?? 'Model';
		const parts: string[] = [
			`${className}: v${resolvedFromVersion} → v${targetVersion}`,
		];
		if (addedFields.length)
			parts.push(`${addedFields.length} field(s) added`);
		if (removedFields.length)
			parts.push(`${removedFields.length} field(s) removed`);
		if (changedTypes.length)
			parts.push(`${changedTypes.length} type(s) changed`);
		if (manual_items.length === 0)
			parts.push('migration skeleton is complete');
		else
			parts.push(
				`${manual_items.length} item(s) need manual attention — see manual_items`
			);
		const summary = parts.join(' | ');

		return {
			target_version: targetVersion,
			qversion_decorator: qversionDecorator,
			suggested_code: suggestedCode,
			migration_steps: [stepInfo],
			manual_items,
			summary,
		};
	}

	/**
	 * Extracts existing migration entries from a model that already has `@QVersion`,
	 * formatted as raw lines to be embedded inside the new migrations map.
	 *
	 * @param code          Source code of the current model.
	 * @param fromVersion   The current declared version.
	 * @returns Array of raw `.ts` lines for steps 1 … fromVersion-1.
	 */
	private buildExistingMigrationLines(
		code: string,
		fromVersion: number
	): string[] {
		if (fromVersion <= 1) return [];
		// Extract the body of the existing migrations: {} object
		const match = /migrations\s*:\s*\{([^}]+)\}/s.exec(code);
		if (!match?.[1]) {
			// Cannot parse existing migrations — emit placeholders
			const lines: string[] = [];
			for (let step = 1; step < fromVersion; step++) {
				lines.push(
					`${step}: (data) => data, // TODO: restore from previous migration`
				);
			}
			return lines;
		}
		// Return each entry line trimmed
		return match[1]
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	/**
	 * Injects the `@QVersion(...)` decorator into model source code.
	 *
	 * Replaces an existing `@QVersion` if present, otherwise inserts it
	 * immediately before the `@Quick` decorator or the `class` keyword.
	 *
	 * @param code       The model source code to modify.
	 * @param decorator  The full decorator string to inject.
	 * @returns Updated source code with the decorator applied.
	 */
	private injectQVersionDecorator(code: string, decorator: string): string {
		// Replace existing @QVersion(...) block (multiline-safe)
		const existingPattern = /@QVersion\s*\([^)]*\)\s*\n?/s;
		if (existingPattern.test(code)) {
			return code.replace(existingPattern, `${decorator}\n`);
		}
		// Insert before @Quick(
		if (code.includes('@Quick(')) {
			return code.replace('@Quick(', `${decorator}\n@Quick(`);
		}
		// Insert before class keyword
		return code.replace(/\bclass\s+/, `${decorator}\nclass `);
	}
}
