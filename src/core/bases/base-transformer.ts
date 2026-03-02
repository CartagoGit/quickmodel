/**
 * Abstract base class for all transformers.
 *
 * Provides a common implementation foundation for transformers,
 * allowing them to focus only on their specific transformation logic.
 *
 * @template TInput - The IQSerialized type (typically for JSON)
 * @template TOutput - The runtime type (typically a native JavaScript object)
 *
 * @remarks
 * All transformers should extend this class and implement the two abstract methods:
 * - `deserialize`: Deserialize from JSON-compatible format to runtime type
 * - `serialize`: Serialize from runtime type to JSON-compatible format
 *
 * This follows the SOLID principles:
 * - Single Responsibility: Each transformer handles one type conversion
 * - Open/Closed: New transformers can be added without modifying base class
 * - Liskov Substitution: All transformers can be used interchangeably
 *
 * @see {@link IQTransformer} — the interface this class implements
 * @see {@link QTransformerRegistry} — registry where custom transformers are registered
 *
 * @example
 * ```typescript
 * class CustomTransformer extends BaseTransformer<string, CustomType> {
 *   deserialize(value: string, propertyKey: string, className: string): CustomType {
 *     return new CustomType(value);
 *   }
 *
 *   serialize(value: CustomType): string {
 *     return value.toString();
 *   }
 * }
 * ```
 */

import {
	IQTransformer,
	IQTransformContext,
} from '../interfaces/transformer.interface';

export abstract class BaseTransformer<
	TInput = unknown,
	TOutput = unknown,
> implements IQTransformer<TInput, TOutput> {
	/**
	 * Transforms from IQSerialized format (JSON) to runtime type.
	 *
	 * @param value - The value to deserialize
	 * @param propertyKey - The property name (for error messages)
	 * @param className - The class name (for error messages)
	 * @returns The deserialized runtime value
	 * @throws {Error} When transformation fails or value is invalid
	 * @see {@link BaseTransformer.serialize} — inverse operation
	 * @see {@link IQTransformer} — interface contract for this method
	 * @see {@link TransformerLookupService} — selects the transformer that calls this
	 */
	abstract deserialize(
		value: TInput | null | undefined,
		propertyKey: string,
		className: string,
		context?: IQTransformContext
	): TOutput | null;

	/**
	 * Serializes from runtime type to JSON-compatible format.
	 *
	 * @param value - The runtime value to serialize
	 * @returns The IQSerialized value suitable for JSON
	 * @see {@link BaseTransformer.deserialize} — inverse operation
	 * @see {@link IQTransformer} — interface contract for this method
	 * @see {@link Serializer} — calls this during `QModel.$qSerialize()`
	 */
	abstract serialize(value: TOutput): TInput;
}
