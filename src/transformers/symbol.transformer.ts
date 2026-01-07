import { BaseTransformer } from '../core/bases/base-transformer';
import { IQValidationContext, IQValidationResult, IQValidator } from '../core/interfaces';

/**
 * Transformer for Symbol type: converts between string and symbol.
 * 
 * **Serialization**: `symbol` → `string`
 * **Deserialization**: `string` → `symbol`
 * 
 * @remarks
 * Uses `Symbol.for()` to create global symbols that can be serialized.
 * Retrieves the key using `Symbol.keyFor()` during serialization.
 * Falls back to `toString()` for symbols without a global key.
 * 
 * @example
 * ```typescript
 * class Entity extends QuickModel<IEntity> {
 *   @QType(QSymbol) id!: symbol;
 * }
 * 
 * const entity = new Entity({ id: "unique-id" });
 * console.log(typeof entity.id); // 'symbol'
 * console.log(entity.id === Symbol.for("unique-id")); // true
 * 
 * const data = entity.toInterface();
 * console.log(typeof data.id); // 'string'
 * console.log(data.id); // "unique-id"
 * ```
 */
export class SymbolTransformer extends BaseTransformer<string, symbol> implements IQValidator {
  /**
   * Converts a string or object with __type to a global symbol using Symbol.for().
   * 
   * @param value - The value to convert (string, symbol, or {__type, description})
   * @param propertyKey - The property name (for error messages)
   * @param className - The class name (for error messages)
   * @returns A global symbol
   * @throws {Error} If the value is not a string or symbol
   */
  fromInterface(value: string | symbol | { __type: 'symbol'; description: string }, propertyKey: string, className: string): symbol {
    if (typeof value === 'symbol') {
      return value;
    }

    // Handle new format with __type marker
    if (typeof value === 'object' && value !== null && '__type' in value && value.__type === 'symbol') {
      return Symbol.for(value.description);
    }

    if (typeof value !== 'string') {
      throw new Error(
        `${className}.${propertyKey}: Expected string for Symbol, got ${typeof value}`,
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
  toInterface(value: symbol): { __type: 'symbol'; description: string } {
    const key = Symbol.keyFor(value);
    const description = key !== undefined ? key : value.toString();
    return { __type: 'symbol', description };
  }

  /**
   * Validates if a value is a string or symbol.
   * 
   * @param value - The value to validate
   * @param context - Validation context with property and class information
   * @returns Validation result
   */
  validate(value: unknown, context: IQValidationContext): IQValidationResult {
    if (typeof value === 'symbol' || typeof value === 'string') {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `${context.className}.${context.propertyKey}: Expected string or symbol, got ${typeof value}`,
    };
  }
}

export const symbolTransformer = new SymbolTransformer();
