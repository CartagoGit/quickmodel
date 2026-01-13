import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * Tool to generate a QModel class definition from a simple schema.
 * Useful for scaffolding new models.
 */
export class QCreateModelTool extends QAbstractTool<
	z.ZodObject<{
		className: z.ZodString;
		properties: z.ZodRecord<z.ZodString, z.ZodString>;
	}>
> {
	name = 'create_model';
	description =
		'Generates the TypeScript code for a class extending QModel based on a list of properties. Use this to quickly create new models.';
	schema = z.object({
		className: z.string().describe('The name of the class (e.g., "User")'),
		properties: z
			.record(z.string(), z.string())
			.describe(
				'Key-value pairs where key is property name and value is the type (e.g., "string", "Date")'
			),
	});

	async execute(args: {
		className: string;
		properties: Record<string, string>;
	}): Promise<{ code: string }> {
		await Promise.resolve();
		const { className, properties } = args;

		const quickProps = Object.keys(properties)
			.map((key) => `  ${key}: ${properties[key]}`)
			.join(',\n\t');

		const declProps = Object.keys(properties)
			.map(
				(key) =>
					`  declare ${key}: ${this.mapTypeToTs(properties[key] ?? 'any')};`
			)
			.join('\n\t');

		const code = `
import { Quick, QModel } from '@cartago-git/quickmodel';

interface I${className} {
  ${Object.keys(properties)
		.map((key) => `${key}: ${this.mapTypeToTs(properties[key] ?? 'any')};`)
		.join('\n  ')}
}

@Quick({
  ${quickProps}
})
export class ${className} extends QModel<I${className}> {
  ${declProps}
}
`.trim();

		return { code };
	}

	private mapTypeToTs(type: string): string {
		// Basic mapping for TS types from string representation
		if (['Date', 'RegExp', 'BigInt'].includes(type)) return type;
		if (type === 'string' || type === 'number' || type === 'boolean')
			return type;
		return 'any'; // Fallback
	}
}
