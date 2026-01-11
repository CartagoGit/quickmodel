/**
 * SOLID - Single Responsibility: Separate serialization from model logic
 * SOLID - Dependency Inversion: Depend on abstractions (interfaces)
 */

export interface ISerializationOptions {
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
		options?: ISerializationOptions
	): TInterface;

	/**
	 * Serializa a JSON string
	 */
	serializeToJson(model: TModel, options?: ISerializationOptions): string;
}

export interface IQDeserializer<
	TInterface extends Record<string, unknown>,
	TModel,
> {
	/**
	 * Deserializa una interfaz a un modelo
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
