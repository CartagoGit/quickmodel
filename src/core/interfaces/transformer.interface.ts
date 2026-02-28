/**
 * Core transformer and integrity-check contracts for QuickModel transformers.
 *
 * - `IQTransformer<TInput, TOutput>` — bidirectional type conversion (JSON ↔ model).
 * - `IQIntegrityChecker` — optional post-deserialization value validation.
 * - `IQTransformContext` / `IQIntegrityContext` / `IQIntegrityResult` — shared context shapes.
 *
 * @module core/interfaces/transformer.interface
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
	 * Transforms from interface (JSON) to model type
	 * @param value - Value from JSON/Interface
	 * @param propertyKey - Property name
	 * @param className - Class name
	 */
	deserialize(
		value: TInput | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): TOutput | null;

	/**
	 * Serializes from model type to interface (JSON)
	 * @param value - Model value
	 * @param context - Optional context
	 */
	serialize(value: TOutput, context?: IQTransformContext): TInput;
}

/**
 * Accepted key types when registering or looking up a transformer in `QTransformerRegistry`.
 * Can be a string alias (`'date'`), a constructor (`Date`), or an arbitrary object.
 */
export type IQTransformerKey = string | Function | object;

/**
 * Optional integrity-check contract.
 * Transformers can additionally implement this interface to validate that a
 * deserialized value meets their type constraints (used by `IntegrityService`).
 */
export interface IQIntegrityChecker {
	/**
	 * Checks that the value meets type integrity constraints
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

/** Context passed to `IQIntegrityChecker.checkIntegrity()`. */
export interface IQIntegrityContext {
	/** Property being validated. */
	propertyKey: string;
	/** Name of the owning class (optional for standalone checks). */
	className?: string;
	/** Raw value before deserialization. */
	value?: unknown;
	/** The model instance or target object (for cross-field rules). */
	target?: unknown;
}

/** Outcome of a single integrity check. */
export interface IQIntegrityResult {
	/** `true` when the value passes all constraints. */
	isValid: boolean;
	/** Human-readable description of the failure (only present when `isValid` is `false`). */
	error?: string;
}
