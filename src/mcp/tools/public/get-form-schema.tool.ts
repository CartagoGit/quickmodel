import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { QModel } from '../../../core/models/quick.model';
import {
	QFIELD_FIELDS_KEY,
	QFIELD_METADATA_KEY,
} from '../../../core/decorators/qfield.decorator';
import type { IQFieldMeta } from '../../../core/decorators/qfield.decorator';
import { QGROUP_METADATA_KEY } from '../../../core/decorators/qgroup.decorator';

/** @internal Intermediate representation of a parsed `@QField`-decorated property. */
interface IParsedField {
	field: string;
	meta: IQFieldMeta;
	group?: string;
}

/**
 * Tool to call the real `QModel.getFormSchema()` / `getFormSchemaGrouped()` API
 * by parsing `@QField` and `@QGroup` annotations from a code string.
 *
 * @see {@link QGetModelSchemaTool} — multi-format schema (openapi, zod, graphql, etc.)
 * @see {@link QExportJsonSchemaTool} — JSON Schema export
 * @see {@link QInspectModelTool} — full structural model inspection
 */
export class QGetFormSchemaTool extends QAbstractTool<
	z.ZodObject<{
		code: z.ZodString;
		grouped: z.ZodOptional<z.ZodBoolean>;
	}>
> {
	name = 'get_form_schema';
	description =
		'Extract the form schema from a QuickModel class by parsing its @QField and @QGroup decorators. ' +
		'Uses the real QModel.getFormSchema() API. ' +
		'Set grouped=true to get the schema grouped by @QGroup sections. ' +
		'Returns { schema, count }.';

	schema = z.object({
		code: z
			.string()
			.describe(
				'The QuickModel class code containing @QField and optional @QGroup decorators'
			),
		grouped: z
			.boolean()
			.optional()
			.describe(
				'When true, returns the schema grouped by @QGroup sections (default: false)'
			),
	});

	/**
	 * Extracts the form schema from a QuickModel class decorated with `@QField`.
	 *
	 * @param args - Tool arguments.
	 * @param args.code - TypeScript source code of the QuickModel class.
	 * @param args.grouped - When `true`, groups the schema by `@QGroup` sections.
	 * @returns `{ schema, count }` — array of field metadata entries and total count.
	 */
	async execute(args: {
		code: string;
		grouped?: boolean;
	}): Promise<{ schema: unknown; count: number }> {
		await Promise.resolve();

		const parsedFields = this.parseFields(args.code);

		// Build dynamic class with metadata programmatically
		/** @internal Ephemeral model built from parsed field definitions for form-schema extraction. */
		class DynamicForm extends QModel<any> {
			[key: string]: any;
		}

		const proto = DynamicForm.prototype;

		// Register each field's metadata on the prototype
		const fieldNames: string[] = [];
		for (const { field, meta, group } of parsedFields) {
			Reflect.defineMetadata(QFIELD_METADATA_KEY, meta, proto, field);
			if (group !== undefined) {
				Reflect.defineMetadata(
					QGROUP_METADATA_KEY,
					group,
					proto,
					field
				);
			}
			fieldNames.push(field);
		}
		Reflect.defineMetadata(QFIELD_FIELDS_KEY, fieldNames, proto);

		let schema: Array<Record<string, unknown>>;

		if (args.grouped) {
			schema = DynamicForm.getFormSchemaGrouped() as unknown as Array<
				Record<string, unknown>
			>;
		} else {
			schema = DynamicForm.getFormSchema() as Array<
				Record<string, unknown>
			>;
		}

		return { schema, count: fieldNames.length };
	}

	/**
	 * Extracts `@QField` args and the corresponding field names from code.
	 * Also captures `@QGroup` grouping applied to the same field.
	 */
	private parseFields(code: string): IParsedField[] {
		const fields: IParsedField[] = [];

		// Build two maps: field → QField args string, field → QGroup name
		const qfieldArgs = this.extractDecoratorArgs(code, 'QField');
		const qgroupArgs = this.extractGroupArgs(code);

		for (const [field, argStr] of qfieldArgs) {
			const meta: IQFieldMeta = this.parseQFieldMeta(argStr);
			fields.push({ field, meta, group: qgroupArgs.get(field) });
		}

		return fields;
	}

	/**
	 * Safely extracts @QField metadata from a decorator argument string using pattern matching.
	 * Avoids eval/Function and dynamic RegExp for security compliance.
	 */
	private parseQFieldMeta(argStr: string): IQFieldMeta {
		const widget =
			/\bwidget\s*:\s*['"]([^'"]*)['"]/i.exec(argStr)?.[1] ?? 'input';
		const label = /\blabel\s*:\s*['"]([^'"]*)['"]/i.exec(argStr)?.[1];
		const placeholder = /\bplaceholder\s*:\s*['"]([^'"]*)['"]/i.exec(
			argStr
		)?.[1];
		const hint = /\bhint\s*:\s*['"]([^'"]*)['"]/i.exec(argStr)?.[1];
		const inputType = /\binputType\s*:\s*['"]([^'"]*)['"]/i.exec(
			argStr
		)?.[1];
		const reqMatch = /\brequired\s*:\s*(true|false)\b/.exec(argStr);
		const required = reqMatch !== null ? reqMatch[1] === 'true' : undefined;

		const meta: IQFieldMeta = { widget };
		if (label !== undefined) meta.label = label;
		if (placeholder !== undefined) meta.placeholder = placeholder;
		if (hint !== undefined) meta['hint'] = hint;
		if (inputType !== undefined) meta.inputType = inputType;
		if (required !== undefined) meta.required = required;

		return meta;
	}

	/**
	 * Finds all `@DecoratorName({...}) ... declare fieldName` occurrences
	 * and returns a Map of fieldName → arg string.
	 */
	private extractDecoratorArgs(
		code: string,
		decoratorName: string
	): Map<string, string> {
		const result = new Map<string, string>();
		let pos = 0;

		while (pos < code.length) {
			const idx = code.indexOf(`@${decoratorName}(`, pos);
			if (idx === -1) break;

			// Find the opening paren after decorator name
			const parenStart = code.indexOf('(', idx + decoratorName.length);
			if (parenStart === -1) break;

			// Find matching closing paren (handles nested parens)
			let depth = 0;
			let end = parenStart;
			for (let cur = parenStart; cur < code.length; cur++) {
				if (code[cur] === '(') depth++;
				else if (code[cur] === ')') {
					depth--;
					if (depth === 0) {
						end = cur;
						break;
					}
				}
			}

			const argStr = code.slice(parenStart + 1, end);

			// Find the next `declare fieldName` within the next 300 chars.
			// A bounded slice avoids catastrophic backtracking risk.
			const context = code.slice(end + 1, end + 301);
			const declareMatch = context.match(/\bdeclare\s+(\w+)/);
			if (declareMatch?.[1]) {
				result.set(declareMatch[1], argStr);
			}

			pos = end + 1;
		}

		return result;
	}

	/**
	 * Finds all `@QGroup('groupName') ... declare fieldName` occurrences
	 * and returns a Map of fieldName → groupName.
	 */
	private extractGroupArgs(code: string): Map<string, string> {
		const result = new Map<string, string>();
		const pattern =
			/@QGroup\s*\(\s*['"`]([^'"`]+)['"`]\s*\)[^;]*?declare\s+(\w+)/gs;
		let match = pattern.exec(code);

		while (match !== null) {
			const groupName = match[1];
			const fieldName = match[2];
			if (groupName && fieldName) {
				result.set(fieldName, groupName);
			}
			match = pattern.exec(code);
		}

		return result;
	}
}
