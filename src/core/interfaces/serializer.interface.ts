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
import type { IFileModeOutput } from '../helpers/form-data.helpers';

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

	/**
	 * Controls how binary fields (`File`, `Blob`, `ArrayBuffer`, TypedArrays) are
	 * serialized in the plain-object output.
	 *
	 * - `'auto'` / `'binary'` *(default)*: metadata POJO — `{ name, size, type, … }` for
	 *   `File`; `{ size, type, _blobRef: true }` for `Blob`; byte array for buffers.
	 * - `'reference'`: descriptive string — `File` → `file.name`;
	 *   `Blob` → `'[Blob]'`; `ArrayBuffer`/TypedArray → `'[binary]'`.
	 *
	 * @default 'auto'
	 */
	fileMode?: IFileModeOutput;
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
	 * Serializes a model instance to its JSON-compatible plain-object form.
	 *
	 * @param model - The model instance to serialize
	 * @param seen - Optional `WeakSet` used for circular-reference detection across
	 *   recursive calls; pass `undefined` to let the serializer manage its own set.
	 * @param options - Fine-grained serialization control (date strategy, case
	 *   transformation, field inclusion/exclusion, etc.)
	 * @returns A plain `TInterface` object ready for `JSON.stringify()` or network transfer
	 */
	serialize(
		model: TModel,
		seen?: WeakSet<object>,
		options?: IQSerializationOptions
	): TInterface;

	/**
	 * Serializes a model instance directly to a JSON string.
	 *
	 * Equivalent to `JSON.stringify(serializer.serialize(model, undefined, options))`.
	 *
	 * @param model - The model instance to serialize
	 * @param options - Fine-grained serialization options (same as `serialize()`)
	 * @returns A JSON-encoded string representation of the model
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
	 * Deserializes a plain-object payload into a fully-typed model instance.
	 *
	 * @param data - Plain object matching the `TInterface` shape
	 * @param modelClass - Constructor of the target model class
	 * @returns A fully-populated `TModel` instance with all transformers applied
	 */
	deserialize(
		data: TInterface,
		modelClass: new (data: TInterface) => TModel
	): TModel;

	/**
	 * Parses a JSON string and deserializes the result into a fully-typed model instance.
	 *
	 * @param json - A valid JSON string
	 * @param modelClass - Constructor of the target model class
	 * @returns A fully-populated `TModel` instance with all transformers applied
	 * @throws {SyntaxError} If `json` is not valid JSON
	 */
	deserializeFromJson(
		json: string,
		modelClass: new (data: unknown) => TModel
	): TModel;
}
