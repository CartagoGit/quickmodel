import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * Extracts all `declare <field>: <type>` declarations from model source code.
 * Returns a Map of fieldName → typeString.
 */
function extractFields(code: string): Map<string, string> {
	const fields = new Map<string, string>();
	// Match: declare fieldName: TypeName (ignoring leading decorators on same/previous line)
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
function extractQuickOptions(code: string): string {
	const match = /@Quick\s*\(\s*\{([^}]*)\}/s.exec(code);
	return match?.[1]?.trim() ?? '';
}

/**
 * Parses a Quick-options string into a Map of fieldName → transformerName.
 * E.g. "createdAt: Date, tags: Set" → Map { createdAt → "Date", tags → "Set" }
 */
function parseTransformers(optionsStr: string): Map<string, string> {
	const result = new Map<string, string>();
	if (!optionsStr) return result;
	// Split by comma (avoid splitting inside nested braces — best-effort for common cases)
	const entries = optionsStr.split(',');
	for (const entry of entries) {
		const colonIdx = entry.indexOf(':');
		if (colonIdx === -1) continue;
		const key = entry.slice(0, colonIdx).trim();
		const val = entry.slice(colonIdx + 1).trim();
		if (key && val) result.set(key, val);
	}
	return result;
}

/**
 * Extracts all unique decorator names (e.g. QField, QRule, QGroup, QAlias, QComputed)
 * attached to declared fields in the code.
 */
function extractDecorators(code: string): Set<string> {
	const decorators = new Set<string>();
	// Match @ followed by identifier (not @Quick itself, which is class-level)
	const pattern = /@(QField|QRule|QGroup|QAlias|QComputed)\s*[({]/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(code)) !== null) {
		if (match[1]) decorators.add(match[1]);
	}
	return decorators;
}

/**
 * Tool to compare two QuickModel class definitions and report structural differences.
 *
 * Performs static analysis (no execution) on both source code strings.
 * Detects:
 *  - Added / removed declared fields
 *  - Changed transformer configuration in @Quick({...})
 *  - Added / removed field-level decorators (@QField, @QRule, @QGroup, @QAlias, @QComputed)
 *
 * Useful for: migration reviews, PR diffs, understanding what changed between model versions.
 *
 * @see {@link QInspectModelTool} — inspect a single model structure
 * @see {@link QCheckApiCompatibilityTool} — detect breaking changes in the public API
 * @see {@link QMigrationPrompt} — guided workflow for migrating between model versions
 */
export class QDiffModelsTool extends QAbstractTool<
	z.ZodObject<{
		model_a: z.ZodString;
		model_b: z.ZodString;
	}>
> {
	name = 'diff_models';
	description =
		'Compare two QuickModel class definitions and report structural differences. ' +
		'Detects added/removed fields, changed transformer configuration in @Quick({}), ' +
		'and added/removed field decorators (@QField, @QRule, @QGroup, @QAlias, @QComputed). ' +
		'Performs static code analysis — no execution needed. ' +
		'Returns { added_fields, removed_fields, changed_fields, changed_transformers, added_decorators, removed_decorators, summary }.';

	schema = z.object({
		model_a: z
			.string()
			.describe(
				'Source code of the baseline QuickModel class (the "before")'
			),
		model_b: z
			.string()
			.describe('Source code of the new QuickModel class (the "after")'),
	});

	/**
	 * Compares two QuickModel class definitions and reports structural differences.
	 *
	 * Performs static analysis — no execution required.
	 *
	 * @param args - Tool arguments.
	 * @param args.model_a - Source code of the baseline model (the "before").
	 * @param args.model_b - Source code of the new model (the "after").
	 * @returns Diff report with `added_fields`, `removed_fields`, `changed_fields`,
	 *   `changed_transformers`, `added_decorators`, `removed_decorators`, and `summary`.
	 */
	async execute(args: { model_a: string; model_b: string }): Promise<{
		added_fields: string[];
		removed_fields: string[];
		changed_fields: Array<{
			field: string;
			type_a: string;
			type_b: string;
		}>;
		changed_transformers: Array<{
			field: string;
			transformer_a: string;
			transformer_b: string;
		}>;
		added_decorators: string[];
		removed_decorators: string[];
		summary: string;
	}> {
		await Promise.resolve();

		const { model_a, model_b } = args;

		const fieldsA = extractFields(model_a);
		const fieldsB = extractFields(model_b);
		const transformersA = parseTransformers(extractQuickOptions(model_a));
		const transformersB = parseTransformers(extractQuickOptions(model_b));
		const decoratorsA = extractDecorators(model_a);
		const decoratorsB = extractDecorators(model_b);

		const added_fields: string[] = [];
		const removed_fields: string[] = [];
		const changed_fields: Array<{
			field: string;
			type_a: string;
			type_b: string;
		}> = [];
		const changed_transformers: Array<{
			field: string;
			transformer_a: string;
			transformer_b: string;
		}> = [];

		// Fields added in B
		for (const [name] of fieldsB) {
			if (!fieldsA.has(name)) added_fields.push(name);
		}

		// Fields removed from A
		for (const [name] of fieldsA) {
			if (!fieldsB.has(name)) removed_fields.push(name);
		}

		// Fields present in both — check type changes
		for (const [name, typeA] of fieldsA) {
			const typeB = fieldsB.get(name);
			if (typeB !== undefined && typeB !== typeA) {
				changed_fields.push({
					field: name,
					type_a: typeA,
					type_b: typeB,
				});
			}
		}

		// Transformer changes: union of all keys in A and B transformers
		const allTransformerKeys = new Set([
			...transformersA.keys(),
			...transformersB.keys(),
		]);
		for (const key of allTransformerKeys) {
			const valA = transformersA.get(key) ?? '(none)';
			const valB = transformersB.get(key) ?? '(none)';
			if (valA !== valB) {
				changed_transformers.push({
					field: key,
					transformer_a: valA,
					transformer_b: valB,
				});
			}
		}

		// Decorator diff
		const added_decorators: string[] = [];
		const removed_decorators: string[] = [];
		for (const dec of decoratorsB) {
			if (!decoratorsA.has(dec)) added_decorators.push(dec);
		}
		for (const dec of decoratorsA) {
			if (!decoratorsB.has(dec)) removed_decorators.push(dec);
		}

		// Summary
		const parts: string[] = [];
		if (added_fields.length)
			parts.push(
				`${added_fields.length} field(s) added: ${added_fields.join(', ')}`
			);
		if (removed_fields.length)
			parts.push(
				`${removed_fields.length} field(s) removed: ${removed_fields.join(', ')}`
			);
		if (changed_fields.length)
			parts.push(`${changed_fields.length} field type(s) changed`);
		if (changed_transformers.length)
			parts.push(`${changed_transformers.length} transformer(s) changed`);
		if (added_decorators.length)
			parts.push(`decorators added: ${added_decorators.join(', ')}`);
		if (removed_decorators.length)
			parts.push(`decorators removed: ${removed_decorators.join(', ')}`);

		const summary = parts.length
			? parts.join(' | ')
			: 'Models are structurally identical.';

		return {
			added_fields,
			removed_fields,
			changed_fields,
			changed_transformers,
			added_decorators,
			removed_decorators,
			summary,
		};
	}
}
