import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import {
	IQValidationContext,
	IQValidationResult,
	IQValidator,
} from '../core/interfaces/transformer.interface';

/**
 * IQSerialized representation of a RegExp.
 */
interface IRegExpData {
	source: string;
	flags: string;
}

/**
 * Transformer for RegExp type: converts between string representation and RegExp object.
 *
 * **Serialization**: `RegExp` → `string` (format: `/pattern/flags`)
 * **Deserialization**: `string | {source, flags}` → `RegExp`
 *
 * @remarks
 * Supports multiple input formats:
 * - String with slashes: `/pattern/flags`
 * - Plain string: `pattern` (no flags)
 * - Object: `{source: 'pattern', flags: 'gi'}`
 *
 * @example
 * @example
 * ```typescript
 * @Quick({ emailPattern: RegExp })
 * class Config extends QuickModel<IConfig> {
 *   declare emailPattern: RegExp;
 * }
 *
 * // From string with slashes
 * const config1 = new Config({ emailPattern: "/^[a-z]+@[a-z]+\\.com$/i" });
 *
 * // From object
 * const config2 = new Config({ emailPattern: { source: "^test$", flags: "g" } });
 *
 * // Serialization
 * const data = config1.serialize();
 * console.log(data.emailPattern); // "/^[a-z]+@[a-z]+\\.com$/i"
 * ```
 */
export class RegExpTransformer
	extends BaseTransformer<
		| string
		| RegExp
		| { __type: 'regexp'; source: string; flags: string }
		| IRegExpData,
		RegExp
	>
	implements IQValidator
{
	/**
	 * Converts a string or object to RegExp.
	 *
	 * @param value - The value to convert (string, object, or RegExp)
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns The RegExp object
	 * @throws {Error} If the value cannot be converted to RegExp
	 */
	deserialize(
		value: IRegExpData | string | RegExp | null | undefined,
		propertyKey: string,
		className: string
	): RegExp | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a RegExp instance - return as-is
		if (value instanceof RegExp) {
			return value;
		}

		// SECURITY: Prevent ReDoS by limiting pattern length
		// Long patterns can cause catastrophic backtracking or memory issues
		const MAX_LENGTH = 1000;
		if (typeof value === 'string' && value.length > MAX_LENGTH) {
			throw new QModelError(
				`${className}.${propertyKey}: RegExp pattern too long (> ${MAX_LENGTH} chars).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: 'Short RegExp',
				}
			);
		}

		// Format: {__type, source, flags} or {source, flags}
		if (typeof value === 'object' && value !== null && 'source' in value) {
			if (typeof value.source !== 'string') {
				throw new QModelError(
					`${className}.${propertyKey}: RegExp object must have 'source' as string.\\n` +
						`Received: source type = ${typeof value.source}`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'RegExp data object',
					}
				);
			}

			if (value.source.length > MAX_LENGTH) {
				throw new QModelError(
					`${className}.${propertyKey}: RegExp source too long (> ${MAX_LENGTH} chars).`,
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Short RegExp',
					}
				);
			}

			try {
				return new RegExp(value.source, value.flags || '');
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : String(error);
				throw new QModelError(
					`${className}.${propertyKey}: Invalid RegExp pattern.\\n` +
						`source: "${value.source}"\\n` +
						`flags: "${value.flags || ''}"\\n` +
						`Error: ${errorMsg}`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'Valid RegExp source/flags',
					}
				);
			}
		}

		// Format: "/pattern/flags" or plain pattern string
		if (typeof value === 'string') {
			const match = value.match(/^\/(.+)\/([gimsuy]*)$/);
			if (match && match[1]) {
				try {
					return new RegExp(match[1], match[2] || '');
				} catch (error) {
					const errorMsg =
						error instanceof Error ? error.message : String(error);
					throw new QModelError(
						`${className}.${propertyKey}: Invalid RegExp string with slashes.\\n` +
							`Input: "${value}"\\n` +
							`Pattern: "${match[1]}"\\n` +
							`Flags: "${match[2] || ''}"\\n` +
							`Error: ${errorMsg}`,
						{
							className,
							propertyKey,
							value,
							expectedType: 'Valid RegExp string',
						}
					);
				}
			}
			// Try as plain pattern (no slashes)
			try {
				return new RegExp(value);
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : String(error);
				throw new QModelError(
					`${className}.${propertyKey}: Invalid RegExp pattern.\\n` +
						`Pattern: "${value}"\\n` +
						`Error: ${errorMsg}`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'Valid RegExp pattern',
					}
				);
			}
		}

		throw new QModelError(
			`${className}.${propertyKey}: RegExp transformer ONLY accepts:\\n` +
				`  - string with slashes (e.g., "/[a-z]+/gi")\\n` +
				`  - plain pattern string (e.g., "[a-z]+")\\n` +
				`  - object ({ source: "[a-z]+", flags: "gi" })\\n` +
				`  - RegExp instance\\n` +
				`Received: ${typeof value} = ${JSON.stringify(value)}`,
			{
				className,
				propertyKey,
				value,
				expectedType: 'RegExp compatible value',
			}
		);
	}

	/**
	 * Converts a RegExp to an object with __type marker for reliable detection.
	 *
	 * @param value - The RegExp object to serialize
	 * @returns Object with __type, source, and flags
	 */
	serialize(value: RegExp): {
		__type: 'regexp';
		source: string;
		flags: string;
	} {
		return { __type: 'regexp', source: value.source, flags: value.flags };
	}

	/**
	 * Validates if a value can be converted to RegExp.
	 *
	 * @param value - The value to validate
	 * @param context - Validation context with property and class information
	 * @returns Validation result
	 */
	validate(value: unknown, context: IQValidationContext): IQValidationResult {
		if (value instanceof RegExp) {
			return { isValid: true };
		}

		if (typeof value === 'object' && value !== null && 'source' in value) {
			return { isValid: true };
		}

		if (typeof value === 'string') {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected RegExp, {source, flags} object, or string, got ${typeof value}`,
		};
	}
}

export const regExpTransformer = new RegExpTransformer();
