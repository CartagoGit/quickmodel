/**
 * Universal @QType() decorator for QModel properties.
 * 
 * This decorator marks properties that need automatic serialization/deserialization
 * with type transformation support. It's the cornerstone of QuickModel's type-safe
 * data transformation system.
 * 
 * SOLID Principles Applied:
 * - Open/Closed: Allows marking fields without modifying QModel core
 * - Interface Segregation: Provides multiple ways to specify field types
 * - Dependency Inversion: Works with abstract transformer registry
 */

import 'reflect-metadata';
import { qModelRegistry } from '../registry/model.registry';

/**
 * Available field types as string literals with IntelliSense support.
 * Allows using @QType('regexp'), @QType('bigint'), etc. with autocomplete.
 * 
 * These string literals provide a convenient alternative to symbol-based type hints.
 * 
 * @example
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType('bigint') balance!: bigint;
 *   @QType('regexp') pattern!: RegExp;
 *   @QType('int8array') bytes!: Int8Array;
 * }
 * ```
 */
export type QTypeString =
  // Primitives
  | 'string'
  | 'number'
  | 'boolean'
  // Special types with constructors
  | 'date'
  | 'regexp'
  | 'error'
  | 'url'
  | 'urlsearchparams'
  // Special types without usable constructor
  | 'bigint'
  | 'symbol'
  // Collections
  | 'map'
  | 'set'
  // Buffers
  | 'arraybuffer'
  | 'dataview'
  // TypedArrays
  | 'int8array'
  | 'uint8array'
  | 'int16array'
  | 'uint16array'
  | 'int32array'
  | 'uint32array'
  | 'float32array'
  | 'float64array'
  | 'bigint64array'
  | 'biguint64array';

/**
 * Metadata key symbol for storing the list of properties decorated with @QType().
 * Used internally by QModel to track which properties need serialization/deserialization.
 * 
 * @internal
 */
export const FIELDS_METADATA_KEY = Symbol('quickmodel:fields');

/**
 * Property decorator for marking QModel fields with automatic type handling.
 * 
 * The @QType() decorator supports multiple ways to specify field types, providing
 * maximum flexibility while maintaining type safety:
 * 
 * 1. **Auto-detection**: TypeScript's design:type metadata for basic types
 * 2. **String literals**: Type-safe string literals with IntelliSense
 * 3. **Native constructors**: Direct constructor references
 * 4. **Q-Symbols**: Q-prefixed symbols (QBigInt, QRegExp, etc.)
 * 5. **Model classes**: For nested models and model arrays
 * 
 * @template T - The property type
 * @param typeOrClass - Optional: Constructor, Symbol, or String literal for the field type
 * @returns A property decorator function that registers the field with appropriate metadata
 * 
 * @example
 * **Auto-detection** (primitives and Date):
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() name!: string;          // Auto-detected via design:type
 *   @QType() age!: number;            // Auto-detected via design:type
 *   @QType() active!: boolean;        // Auto-detected via design:type
 *   @QType() createdAt!: Date;        // Auto-detected via design:type
 * }
 * ```
 * 
 * @example
 * **String literals** (with IntelliSense):
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   @QType('bigint') balance!: bigint;
 *   @QType('symbol') id!: symbol;
 *   @QType('regexp') pattern!: RegExp;
 *   @QType('int8array') bytes!: Int8Array;
 *   @QType('map') metadata!: Map<string, any>;
 * }
 * ```
 * 
 * @example
 * **Native constructors**:
 * ```typescript
 * class Binary extends QModel<IBinary> {
 *   @QType(RegExp) pattern!: RegExp;
 *   @QType(Error) lastError!: Error;
 *   @QType(Int8Array) bytes!: Int8Array;
 *   @QType(ArrayBuffer) buffer!: ArrayBuffer;
 * }
 * ```
 * 
 * @example
 * **Q-Symbol based**:
 * ```typescript
 * class Account extends QModel<IAccount> {
 *   @QType(QBigInt) balance!: bigint;
 *   @QType(QSymbol) id!: symbol;
 *   @QType(QRegExp) pattern!: RegExp;
 *   @QType(QInt8Array) data!: Int8Array;
 * }
 * ```
 * 
 * @example
 * **Nested models**:
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType(Address) address!: Address;
 *   @QType(Vehicle) vehicles!: Vehicle[];  // Array of models
 * }
 * ```
 */
export function QType<T>(typeOrClass?: (new (data: any) => T) | symbol | QTypeString): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol): void {
    // Register the property in the fields list
    const existingFields = (Reflect.getMetadata(FIELDS_METADATA_KEY, target) as Array<string | symbol>) || [];
    if (!existingFields.includes(propertyKey)) {
      const newFields = [...existingFields, propertyKey];
      Reflect.defineMetadata(FIELDS_METADATA_KEY, newFields, target);
      
      // Register model class with its properties for automatic array inference
      // Only register if this is a string propertyKey (not symbol)
      if (typeof propertyKey === 'string') {
        const modelClass = target.constructor;
        if (modelClass && typeof modelClass === 'function') {
          // Convert to array of strings
          const stringFields = newFields.filter((f): f is string => typeof f === 'string');
          qModelRegistry.register(modelClass, stringFields);
        }
      }
    }

    if (typeof typeOrClass === 'string') {
      // String literal ('bigint', 'regexp', 'int8array', etc.)
      Reflect.defineMetadata('fieldType', typeOrClass, target, propertyKey);
    } else if (typeof typeOrClass === 'symbol') {
      // Q-Symbol (QBigInt, QRegExp, etc.)
      const symbolKey = typeOrClass.toString();
      Reflect.defineMetadata('fieldType', symbolKey, target, propertyKey);
    } else if (typeOrClass && typeof typeOrClass === 'function') {
      // Check if it's a registered native constructor (RegExp, Error, URL, etc.)
      type NativeConstructor = typeof RegExp | typeof Error | typeof URL | typeof URLSearchParams |
        typeof Int8Array | typeof Uint8Array | typeof Uint8ClampedArray | typeof Int16Array |
        typeof Uint16Array | typeof Int32Array | typeof Uint32Array | typeof Float32Array |
        typeof Float64Array | typeof BigInt64Array | typeof BigUint64Array | typeof ArrayBuffer |
        typeof DataView;

      const nativeConstructors: NativeConstructor[] = [
        RegExp, Error, URL, URLSearchParams,
        Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
        Int32Array, Uint32Array, Float32Array, Float64Array,
        BigInt64Array, BigUint64Array, ArrayBuffer, DataView
      ];
      
      const isNativeConstructor = nativeConstructors.some(ctor => ctor === typeOrClass);
      
      if (isNativeConstructor) {
        // Store as fieldType using the constructor directly
        Reflect.defineMetadata('fieldType', typeOrClass, target, propertyKey);
      } else {
        // Custom model class (for arrays or nested models)
        Reflect.defineMetadata('arrayElementClass', typeOrClass, target, propertyKey);
      }
    }
    // Si no se proporciona typeOrClass, confía en design:type (emitido con !)
    // o en la detección automática del valor
  };
}
