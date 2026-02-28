import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * Metadata entry describing a built-in validator decorator.
 * @see {@link QListValidatorsTool} — MCP tool that returns an array of these entries
 * @see {@link QListTransformersTool} — complementary tool for transformer metadata
 */
export interface IValidatorEntry {
	/** Decorator name (e.g. "IsEmail") */
	name: string;
	/** Short description of what the validator checks */
	description: string;
	/** Decorator usage signature (e.g. "IsEmail()" or "Min(n: number)") */
	usage: string;
}

const VALIDATORS: IValidatorEntry[] = [
	{
		name: 'IsDateString',
		description:
			'Validates that the value is a valid ISO 8601 date string.',
		usage: '@IsDateString()',
	},
	{
		name: 'IsEmail',
		description: 'Validates that the value is a valid email address.',
		usage: '@IsEmail()',
	},
	{
		name: 'IsIn',
		description: 'Validates that the value is one of the allowed values.',
		usage: '@IsIn(values: unknown[])',
	},
	{
		name: 'IsInt',
		description:
			'Validates that the value is an integer (no decimal part).',
		usage: '@IsInt()',
	},
	{
		name: 'IsNegative',
		description: 'Validates that the value is a negative number (< 0).',
		usage: '@IsNegative()',
	},
	{
		name: 'IsNotEmpty',
		description: 'Validates that the string value is not empty or blank.',
		usage: '@IsNotEmpty()',
	},
	{
		name: 'IsPositive',
		description: 'Validates that the value is a positive number (> 0).',
		usage: '@IsPositive()',
	},
	{
		name: 'IsUrl',
		description: 'Validates that the value is a valid URL.',
		usage: '@IsUrl()',
	},
	{
		name: 'IsUuid',
		description: 'Validates that the value is a valid UUID v4.',
		usage: '@IsUuid()',
	},
	{
		name: 'Matches',
		description:
			'Validates that the value matches a given regular expression.',
		usage: '@Matches(regex: RegExp)',
	},
	{
		name: 'Max',
		description: 'Validates that the number is at most n.',
		usage: '@Max(n: number)',
	},
	{
		name: 'MaxLength',
		description:
			'Validates that the string length is at most n characters.',
		usage: '@MaxLength(n: number)',
	},
	{
		name: 'Min',
		description: 'Validates that the number is at least n.',
		usage: '@Min(n: number)',
	},
	{
		name: 'MinLength',
		description:
			'Validates that the string length is at least n characters.',
		usage: '@MinLength(n: number)',
	},
];

/**
 * MCP tool that lists all built-in QuickModel validator decorators.
 *
 * @see {@link QCheckIntegrityTool} — run transformer-level integrity checks
 * @see {@link QSimulateValidationTool} — simulate @QRule predicate validation
 * @see {@link IsEmail} — example built-in validator decorator listed here
 */
export class QListValidatorsTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'list_validators';
	description =
		'List all built-in validator decorators available in QuickModel (e.g., @IsEmail, @Min, @MaxLength).';
	schema = z.object({});

	/**
	 * Returns a sorted list of all built-in QuickModel validator decorator entries.
	 *
	 * @param _args - No arguments required.
	 * @returns Array of `IValidatorEntry` objects sorted alphabetically by name.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QListTransformersTool} — list available data transformers
	 */
	execute(_args: z.infer<z.ZodObject<{}>>): Promise<IValidatorEntry[]> {
		return Promise.resolve(
			[...VALIDATORS].sort((aVal, bVal) =>
				aVal.name.localeCompare(bVal.name)
			)
		);
	}
}
