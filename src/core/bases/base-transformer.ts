/**
 * Abstract base class for all transformers.
 * 
 * Provides a common implementation foundation for transformers,
 * allowing them to focus only on their specific transformation logic.
 * 
 * @template TInput - The serialized type (typically for JSON)
 * @template TOutput - The runtime type (typically a native JavaScript object)
 * 
 * @remarks
 * All transformers should extend this class and implement the two abstract methods:
 * - `fromInterface`: Deserialize from JSON-compatible format to runtime type
 * - `toInterface`: Serialize from runtime type to JSON-compatible format
 * 
 * This follows the SOLID principles:
 * - Single Responsibility: Each transformer handles one type conversion
 * - Open/Closed: New transformers can be added without modifying base class
 * - Liskov Substitution: All transformers can be used interchangeably
 * 
 * @example
 * ```typescript
 * class CustomTransformer extends BaseTransformer<string, CustomType> {
 *   fromInterface(value: string, propertyKey: string, className: string): CustomType {
 *     return new CustomType(value);
 *   }
 *   
 *   toInterface(value: CustomType): string {
 *     return value.toString();
 *   }
 * }
 * ```
 */

import { ITransformer } from '../interfaces/transformer.interface';

export abstract class BaseTransformer<TInput = any, TOutput = any> implements ITransformer<
  TInput,
  TOutput
> {
  /**
   * Transforms from serialized format (JSON) to runtime type.
   * 
   * @param value - The value to deserialize
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns The deserialized runtime value
   * @throws {Error} When transformation fails or value is invalid
   */
  abstract fromInterface(value: TInput, propertyKey: string, className: string): TOutput;

  /**
   * Serializes from runtime type to JSON-compatible format.
   * 
   * @param value - The runtime value to serialize
   * @returns The serialized value suitable for JSON
   */
  abstract toInterface(value: TOutput): TInput;
}
