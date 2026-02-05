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

		// SECURITY: Validate class name to prevent code injection
		if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(className)) {
			throw new Error(
				`Invalid class name: "${className}". Must be a valid identifier.`
			);
		}

		const quickProps = Object.keys(properties)
			.map((key) => {
				// Prevent property injection
				if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
					// Quote the key if it's not a simple identifier
					return `  ${JSON.stringify(key)}: ${properties[key]}`;
				}
				return `  ${key}: ${properties[key]}`;
			})
			.join(',\n\t');

		const declProps = Object.keys(properties)
			.map((key) => {
				const tsType = this.mapTypeToTs(properties[key] ?? 'any');
				// Validate key for class declaration
				if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
					return `  declare ${JSON.stringify(key)}: ${tsType};`;
				}
				return `  declare ${key}: ${tsType};`;
			})
			.join('\n\t');

		const interfaceProps = Object.keys(properties)
			.map((key) => {
				const tsType = this.mapTypeToTs(properties[key] ?? 'any');
				if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
					return `${JSON.stringify(key)}: ${tsType};`;
				}
				return `${key}: ${tsType};`;
			})
			.join('\n  ');

		const code = `
import { Quick, QModel } from '@cartago-git/quickmodel';

interface I${className} {
  ${interfaceProps}
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
