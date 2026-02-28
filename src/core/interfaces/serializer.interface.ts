/**
 * Serialization and deserialization contracts for QuickModel.
 *
 * - `IQSerializationOptions` — full option bag controlling `serialize()` / `toJSON()` output.
 * - `IQSerializer<TModel, TInterface>` — converts a model instance to its JSON-compatible form.
 * - `IQDeserializer<TInterface, TModel>` — converts a plain object / JSON string to a model instance.
 *
 * @module core/interfaces/serializer.interface
 */

import { IQCaseOptions } from '../types/case.type';

/**
 * Options controlling how a `QModel` instance is serialized to a plain object or JSON string.
 */
export interface IQSerializationOptions {
	/**
	 * Include properties starting with a single underscore `_` (e.g., `_id`, `_value`)
	 * These are often used for private/protected conventions or special API fields like HAL `_links`.
	 * @default false
	 */
	includeUnderscore?: boolean;

	/**
	 * Include properties starting with double underscore `__` (e.g., `__meta`)
	 * These are almost always internal framework properties.
	 * @default false
	 */
	includeDoubleUnderscore?: boolean;

	/**
	 * Internal recursion depth tracking for security
	 * @internal
	 */
	_depth?: number;

	/**
	 * Date serialization strategy overlap (internal use for passing down config)
	 */
	dateStrategy?: 'iso' | 'timestamp' | 'native';

	/**
	 * Case transformation strategy.
	 */
	transformCase?: IQCaseOptions;

	/**
	 * Include fields with undefined/null values in the serialized output.
	 */
	exposeUnsetFields?: boolean;

	/**
	 * Include ONLY the specified fields in the serialized output.
	 * Takes precedence over `omit` when both are provided.
	 */
	pick?: string[];

	/**
	 * Exclude the specified fields from the serialized output.
	 * Ignored when `pick` is also provided.
	 */
	omit?: string[];
}

/**
 * Serializes a model instance into its JSON-compatible interface representation.
 *
 * @template TModel - Model class instance type (extends `Record<string, unknown>`).
 * @template TInterface - Resulting plain-object type.
 */
export interface IQSerializer<
	TModel extends Record<string, unknown>,
	TInterface,
> {
	/**
	 * Serializes a model to its interface representation
	 * @param model - The model to serialize
	 * @param seen - Optional WeakSet to track circular references
	 * @param options - Serialization options
	 */
	serialize(
		model: TModel,
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): TInterface;

	/**
	 * Serializes to JSON string
	 */
	serializeToJson(model: TModel, options?: IQSerializationOptions): string;
}

/**
 * Deserializes a plain object or JSON string into a fully-typed model instance.
 *
 * @template TInterface - Plain-object input type (extends `Record<string, unknown>`).
 * @template TModel - Resulting model type.
 */
export interface IQDeserializer<
	TInterface extends Record<string, unknown>,
	TModel,
> {
	/**
	 * Deserializes an interface to a model
	 */
	deserialize(
		data: TInterface,
		modelClass: new (data: TInterface) => TModel
	): TModel;

	/**
	 * Deserializes from JSON string.
	 */
	deserializeFromJson(
		json: string,
		modelClass: new (data: unknown) => TModel
	): TModel;
}
