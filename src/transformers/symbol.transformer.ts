// @quickmodel-rule-ignore: no-console — console.log appears only in @example JSDoc blocks
// to demonstrate usage; no actual console.log calls in production code.
/**
 * @fileoverview Symbol transformer for QuickModel.
 *
 * Handles round-trip serialization/deserialization of JavaScript `Symbol` values:
 * `string | { __type: 'symbol'; description: string }` ↔ `Symbol`.
 *
 * Uses `Symbol.for(description)` to ensure the same symbol can be recovered
 * across serialization boundaries.
 *
 * @see {@link QModel.serialize} — triggers this transformer when a `Symbol` field is encountered
 * @see {@link Quick} — use `@Quick({ field: Symbol })` to activate this transformer
 * @module transformers/symbol
 */
import { BaseTransformer } from '../core/bases/base-transformer';
import { QModelError } from '@/core/errors/quickmodel.error';
import { safeStringify } from '@/core/helpers/transform-helpers';
import {
	IQTransformContext,
	IQIntegrityContext,
	IQIntegrityResult,
	IQIntegrityChecker,
} from '../core/interfaces/transformer.interface';

/**
 * Transformer for Symbol type: converts between string and symbol.
 *
 * **Serialization**: `symbol` → `string`
 * **Deserialization**: `string` → `symbol`
 *
 * @remarks
 * Uses `Symbol.for()` to create global symbols that can be IQSerialized.
 * Retrieves the key using `Symbol.keyFor()` during serialization.
 * Falls back to `toString()` for symbols without a global key.
 *
 * @example
 * ```typescript
 * @Quick({ id: QSymbol })
 * class Entity extends QuickModel<IEntity> {
 *   declare id: symbol;
 * }
 *
 * const entity = new Entity({ id: "unique-id" });
 * typeof entity.id; // → 'symbol'
 * (entity.id === Symbol.for("unique-id")); // → true
 *
 * const data = entity.$qm.serialize();
 * typeof data.id; // → 'string'
 * data.id; // → "unique-id"
 * ```
 *
 * @see {@link BaseTransformer} — abstract base this class extends
 * @see {@link QTransformerRegistry} — register custom transformers alongside this one
 */
export class SymbolTransformer
	extends BaseTransformer<
		string | symbol | { __type: 'symbol'; description: string },
		symbol
	>
	implements IQIntegrityChecker
{
	/**
	 * Converts a string or object with __type to a global symbol using Symbol.for().
	 *
	 * @param value - The value to convert (string, symbol, or {__type, description})
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns A global symbol
	 * @throws {Error} If the value is not a string or symbol
	 */
	deserialize(
		value:
			| string
			| symbol
			| { __type: 'symbol'; description: string }
			| null
			| undefined,
		propertyKey: string,
		className: string,
		_context?: IQTransformContext
	): symbol | null {
		// Passthrough null/undefined
		if (value === null || value === undefined) {
			return value as null;
		}

		// Already a symbol - return as-is
		if (typeof value === 'symbol') {
			return value;
		}

		// SECURITY: Prevent DoS via massive symbol keys in Global Registry
		const MAX_LEN = 1024;
		if (typeof value === 'string' && value.length > MAX_LEN) {
			throw new QModelError(
				`${className}.${propertyKey}: Symbol description too long (> ${MAX_LEN} chars).`,
				{
					className,
					propertyKey,
					value: 'TRUNCATED',
					expectedType: 'Short String',
				}
			);
		}

		// Handle format with __type marker
		if (
			typeof value === 'object' &&
			value !== null &&
			'__type' in value &&
			value.__type === 'symbol'
		) {
			if (typeof value.description !== 'string') {
				throw new QModelError(
					`${className}.${propertyKey}: Symbol object must have 'description' as string.\\n` +
						`Received: description type = ${typeof value.description}`,
					{
						className,
						propertyKey,
						value,
						expectedType: 'string description',
					}
				);
			}
			if (value.description.length > MAX_LEN) {
				throw new QModelError(
					`${className}.${propertyKey}: Symbol description too long (> ${MAX_LEN} chars).`,
					{
						className,
						propertyKey,
						value: 'TRUNCATED',
						expectedType: 'Short String',
					}
				);
			}
			return Symbol.for(value.description);
		}

		// Must be string for simple description format
		if (typeof value !== 'string') {
			throw new QModelError(
				`${className}.${propertyKey}: Symbol transformer ONLY accepts:\\n` +
					`  - string (symbol description, e.g., "mySymbol")\\n` +
					`  - object ({ __type: "symbol", description: "mySymbol" })\\n` +
					`  - symbol instance\\n` +
					`Note: Uses Symbol.for() to create global symbols.\\n` +
					`Received: ${typeof value} = ${safeStringify(value)}`,
				{
					className,
					propertyKey,
					value,
					expectedType: 'string | symbol | object',
				}
			);
		}

		return Symbol.for(value);
	}

	/**
	 * Converts a symbol to an object with __type marker for reliable detection.
	 * Uses Symbol.keyFor() for global symbols, falls back to toString().
	 *
	 * @param value - The symbol to serialize
	 * @returns Object with __type marker and string description
	 */
	serialize(value: symbol): { __type: 'symbol'; description: string } {
		const key = Symbol.keyFor(value);
		const description = key !== undefined ? key : value.toString();
		return { __type: 'symbol', description };
	}

	/**
	 * Validates that `value` is a valid symbol representation:
	 * a `symbol` primitive, a `string` (description), or a
	 * `{ __type: 'symbol', description: string }` object token.
	 *
	 * @param value   - Runtime value to validate.
	 * @param context - Context providing `className` and `propertyKey` for error messages.
	 * @returns `{ isValid: true }` for valid symbol forms;
	 *          `{ isValid: false, error }` otherwise.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult {
		if (typeof value === 'symbol' || typeof value === 'string') {
			return { isValid: true };
		}

		if (
			typeof value === 'object' &&
			value !== null &&
			'__type' in value &&
			(value as { __type: string }).__type === 'symbol'
		) {
			return { isValid: true };
		}

		return {
			isValid: false,
			error: `${context.className}.${context.propertyKey}: Expected string, symbol or symbol object, got ${typeof value}`,
		};
	}
}

/** Pre-registered singleton instance of {@link SymbolTransformer}. */
export const symbolTransformer = new SymbolTransformer();
