import { BaseTransformer } from '../core/bases/base-transformer';
import type {
	IQIntegrityChecker,
	IQIntegrityContext,
	IQIntegrityResult,
	IQTransformContext,
} from '../core/interfaces/transformer.interface';

// ─────────────────────────────────────────────────────────────────────────────
// Tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal JSON key used to mark a special float/undefined token.
 * @example `{ __qm: 'nan' }` represents `NaN` in JSON-safe form.
 */
export const QM_SPECIAL_TOKEN_KEY = '__qm' as const;

/**
 * The set of valid token values stored on a `IQMSpecialToken`.
 *
 * | Token value | Decoded value |
 * |-------------|---------------|
 * | `'nan'`     | `NaN`         |
 * | `'inf'`     | `Infinity`    |
 * | `'-inf'`    | `-Infinity`   |
 */
export type IQMSpecialTokenValue = 'nan' | 'inf' | '-inf';

/**
 * A plain JSON-safe object that encodes a special numeric value
 * (`NaN`, `Infinity`, `-Infinity`) for lossless round-trips through
 * `JSON.stringify` / `JSON.parse`.
 *
 * @example
 * ```json
 * { "__qm": "nan" }   // NaN
 * { "__qm": "inf" }   // Infinity
 * { "__qm": "-inf" }  // -Infinity
 * ```
 */
export interface IQMSpecialToken {
	__qm: IQMSpecialTokenValue;
}

/**
 * Type guard: returns `true` when `value` is a `IQMSpecialToken`.
 *
 * Used internally by the `Serializer` / `PropertyTransformer` to transparently
 * encode and decode special float values without explicit `@Quick` declarations.
 *
 * @param value - Any runtime value.
 * @returns `true` if the value is a valid QM special token.
 *
 * @example
 * ```typescript
 * isQMSpecialToken({ __qm: 'nan' })  // true
 * isQMSpecialToken(42)               // false
 * isQMSpecialToken(null)             // false
 * ```
 */
export function isQMSpecialToken(value: unknown): value is IQMSpecialToken {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		QM_SPECIAL_TOKEN_KEY in value &&
		typeof (value as Record<string, unknown>)[QM_SPECIAL_TOKEN_KEY] ===
			'string'
	);
}

/**
 * Decodes a `IQMSpecialToken` back to its original JavaScript numeric value.
 *
 * @param token - A validated `IQMSpecialToken` object.
 * @returns The decoded value: `NaN`, `Infinity`, or `-Infinity`.
 *
 * @example
 * ```typescript
 * decodeQMSpecialToken({ __qm: 'nan' })   // NaN
 * decodeQMSpecialToken({ __qm: 'inf' })   // Infinity
 * decodeQMSpecialToken({ __qm: '-inf' })  // -Infinity
 * ```
 */
export function decodeQMSpecialToken(token: IQMSpecialToken): number {
	switch (token[QM_SPECIAL_TOKEN_KEY]) {
		case 'nan':
			return NaN;
		case 'inf':
			return Infinity;
		case '-inf':
			return -Infinity;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transformer for special IEEE-754 float values: `NaN`, `Infinity`, `-Infinity`.
 *
 * These values cannot be represented in JSON natively (`JSON.stringify(NaN)` → `"null"`).
 * This transformer encodes them as JSON-safe marker objects and decodes them back:
 *
 * | Runtime value | Serialized token      |
 * |---------------|-----------------------|
 * | `NaN`         | `{ __qm: "nan" }`     |
 * | `Infinity`    | `{ __qm: "inf" }`     |
 * | `-Infinity`   | `{ __qm: "-inf" }`    |
 *
 * **Auto-encoding**: the built-in `Serializer` detects NaN / Infinity values automatically
 * and encodes them without needing an explicit `@Quick` declaration.
 *
 * **Auto-decoding**: the built-in `Deserializer` detects `{ __qm: … }` tokens automatically
 * and restores the original value when constructing a model.
 *
 * **Explicit usage** (optional, for documentation/type-safety):
 * ```typescript
 * @Quick({ score: 'nan' })      // accepts NaN, Infinity, -Infinity
 * class Stats extends QModel<IStats> {
 *   declare score: number;
 * }
 * ```
 *
 * @implements {IQIntegrityChecker}
 */
export class SpecialFloatTransformer
	extends BaseTransformer<IQMSpecialToken | number, number>
	implements IQIntegrityChecker
{
	/**
	 * Decodes a QM special token — or passes through a plain number unchanged.
	 *
	 * @param value - Token `{ __qm: … }`, a plain number, `null`, or `undefined`.
	 * @returns The decoded number (`NaN` / `Infinity` / `-Infinity`) or the plain value.
	 */
	deserialize(
		value: IQMSpecialToken | number | null | undefined,
		_propertyKey: string,
		_className: string,
		_context?: IQTransformContext
	): number | null {
		if (value === null || value === undefined) return null;
		if (typeof value === 'number') return value;
		if (isQMSpecialToken(value)) return decodeQMSpecialToken(value);
		return null;
	}

	/**
	 * Encodes a special float as a JSON-safe token.
	 *
	 * For regular finite numbers passed to this transformer (unusual but valid),
	 * the value is returned unchanged.
	 *
	 * @param value - A numeric value (`NaN`, `Infinity`, `-Infinity`, or finite).
	 * @returns A `IQMSpecialToken` for special values, or the raw number otherwise.
	 */
	serialize(
		value: number,
		_context?: IQTransformContext
	): IQMSpecialToken | number {
		if (Number.isNaN(value))
			return { [QM_SPECIAL_TOKEN_KEY]: 'nan' } as IQMSpecialToken;
		if (value === Infinity)
			return { [QM_SPECIAL_TOKEN_KEY]: 'inf' } as IQMSpecialToken;
		if (value === -Infinity)
			return { [QM_SPECIAL_TOKEN_KEY]: '-inf' } as IQMSpecialToken;
		return value;
	}

	/**
	 * Validates that a value is acceptable for a special-float field.
	 *
	 * Accepted types:
	 * - `null` / `undefined` — treated as absent (valid)
	 * - `number` — any finite or non-finite JavaScript number
	 * - `IQMSpecialToken` — QM serialised token `{ __qm: 'nan' | 'inf' | '-inf' }`
	 *
	 * @param value - Runtime value to check.
	 * @param ctx - Integrity context carrying the class and property name for error messages.
	 * @returns `{ isValid: true }` for accepted values; `{ isValid: false, error }` otherwise.
	 * @see IQMSpecialToken
	 * @see isQMSpecialToken
	 */
	checkIntegrity(value: unknown, ctx: IQIntegrityContext): IQIntegrityResult {
		if (value === null || value === undefined) return { isValid: true };
		if (typeof value === 'number') return { isValid: true };
		if (isQMSpecialToken(value)) return { isValid: true };
		return {
			isValid: false,
			error: `${ctx.className ?? 'Unknown'}.${ctx.propertyKey}: Expected a number or special-float token, got ${typeof value}`,
		};
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton exports (opt-in explicit use via @Quick({ field: 'nan' }) etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-built transformer instance for fields that may hold `NaN`, `Infinity`,
 * or `-Infinity`. Register under any key via `QTransformerRegistry.register()` or
 * declare explicitly: `@Quick({ score: 'nan' })`.
 *
 * @example
 * ```typescript
 * import { QTransformerRegistry } from 'quickmodel/core';
 * import { NanTransformer } from 'quickmodel/transformers/special-float';
 *
 * QTransformerRegistry.register('nan', NanTransformer);
 * ```
 */
export const NanTransformer = new SpecialFloatTransformer();

/**
 * Alias for `NanTransformer`. Use when the field stores `Infinity` / `-Infinity`
 * rather than `NaN` — semantics are identical, the transformer handles all three.
 *
 * @example
 * ```typescript
 * @Quick({ ratio: 'infinity' })
 * class Stats extends QModel<IStats> {
 *   declare ratio: number;
 * }
 * ```
 */
export const InfinityTransformer = new SpecialFloatTransformer();
