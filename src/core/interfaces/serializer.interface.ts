/**
 * SOLID - Single Responsibility: Separate serialization from model logic
 * SOLID - Dependency Inversion: Depend on abstractions (interfaces)
 */

import { IQCaseOptions } from '../types/case.type';

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
