/**
 * Core transformer and integrity-check contracts for QuickModel transformers.
 *
 * - `IQTransformer<TInput, TOutput>` — bidirectional type conversion (JSON ↔ model).
 * - `IQIntegrityChecker` — optional post-deserialization value validation.
 * - `IQTransformContext` / `IQIntegrityContext` / `IQIntegrityResult` — shared context shapes.
 *
 * @module core/interfaces/transformer.interface
 *
 * @see {@link IQTransformer} — the primary bidirectional transformer interface
 * @see {@link QTransformerRegistry} — registry that accepts IQTransformer implementations
 */

/**
 * Bidirectional transformer between a serialized JSON representation (`TInput`)
 * and an in-memory model value (`TOutput`).
 *
 * Implement this interface to register a custom type transformer via
 * `QTransformerRegistry.register(key, transformer)`.
 *
 * @template TInput - Serialized form (what comes in from / goes out to JSON).
 * @template TOutput - In-memory form (what the model property holds).
 */
export interface IQTransformer<TInput = unknown, TOutput = unknown> {
	/**
	 * Converts a serialized (JSON) value to the in-memory model type.
	 *
	 * @param value - The raw value from the JSON/interface layer (may be `null` or `undefined`)
	 * @param propertyKey - Name of the property being deserialized (used for error messages)
	 * @param className - Name of the model class (used for error messages)
	 * @param context - Optional transform context with additional metadata
	 * @returns The deserialized in-memory value, or `null` when the input was `null`/`undefined`
	 */
	deserialize(
		value: TInput | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): TOutput | null;

	/**
	 * Converts an in-memory model value back to its serialized (JSON-compatible) form.
	 *
	 * @param value - The model-layer value to serialize
	 * @param context - Optional transform context with additional metadata
	 * @returns The serialized `TInput` form suitable for JSON encoding
	 */
	serialize(value: TOutput, context?: IQTransformContext): TInput;
}

/**
 * Accepted key types when registering or looking up a transformer in `QTransformerRegistry`.
 *
 * - `string` — alias token (e.g. `'date'`, `'bigint'`)
 * - `Function` — constructor reference (e.g. `Date`, `BigInt`)
 * - `object` — arbitrary object key (for symbol-like keys stored as objects)
 *
 * @see {@link QTransformerRegistry.register}
 * @see {@link QTransformerRegistry.get}
 */
export type IQTransformerKey = string | Function | object;

/**
 * Optional integrity-check contract that transformers can implement to validate
 * post-deserialized values before they are committed to the model instance.
 *
 * Called by `IntegrityService` during `checkIntegrity()` / `isValid()`.
 * Transformers may implement this alongside `IQTransformer` to provide structural
 * or domain-level constraints beyond what the deserialization step enforces.
 *
 * @see {@link IQIntegrityContext} for the context shape passed to each call
 * @see {@link IQIntegrityResult} for the expected return shape
 * @see {@link BaseTransformer} for the base class that implements `IQTransformer`
 */
export interface IQIntegrityChecker {
	/**
	 * Validates that `value` satisfies this transformer's type constraints.
	 *
	 * Called after deserialization by `IntegrityService`. Return `{ isValid: false, error }`
	 * to surface a human-readable error in `checkIntegrity()` results.
	 *
	 * @param value   - The runtime (already-deserialized) value to validate.
	 * @param context - Context providing `propertyKey`, `className`, and optional `target`.
	 * @returns `{ isValid: true }` on success, or `{ isValid: false, error }` on failure.
	 */
	checkIntegrity(
		value: unknown,
		context: IQIntegrityContext
	): IQIntegrityResult;
}

/** Contextual information forwarded through the transform pipeline. */
export interface IQTransformContext {
	/** Name of the property being transformed. */
	propertyKey: string;
	/** Name of the model class owning the property. */
	className: string;
	/** Optional transformer-specific metadata. */
	metadata?: Record<string, unknown>;
}

/**
 * Context passed to `IQIntegrityChecker.checkIntegrity()`.
 *
 * @see {@link IQIntegrityChecker.checkIntegrity}
 * @see {@link IQIntegrityResult}
 */
export interface IQIntegrityContext {
	/** Name of the property being validated. */
	propertyKey: string;
	/** Name of the owning class. Optional for standalone checks outside a model context. */
	className?: string;
	/** Raw value before deserialization (used for context in error messages). */
	value?: unknown;
	/** The model instance or target object — available for cross-field validation rules. */
	target?: unknown;
}

/**
 * Outcome of a single integrity check performed by `IQIntegrityChecker.checkIntegrity()`.
 *
 * @see {@link IQIntegrityChecker}
 * @see {@link IQIntegrityContext}
 * @see {@link QModel.$qCheckIntegrity} — collects these results for all model properties
 * @see {@link QModel.$qHasIntegrity} — boolean short-circuit over this array
 */
export interface IQIntegrityResult {
	/** `true` when the value passes all transformer-level constraints. */
	isValid: boolean;
	/**
	 * Human-readable description of the failure.
	 * Only present when `isValid` is `false`.
	 */
	error?: string;
}
