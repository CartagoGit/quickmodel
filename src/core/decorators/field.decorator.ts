/**
 * Universal field decorator for QuickModel properties.
 * 
 * SOLID Principles:
 * - Open/Closed: Allows marking fields without modifying QuickModel core
 * - Interface Segregation: Provides multiple ways to specify field types
 */

import 'reflect-metadata';

/**
 * Available field types as string literals with IntelliSense support.
 * Allows using @Field('regexp'), @Field('bigint'), etc. with autocomplete.
 * 
 * @example
 * ```typescript
 * class User extends QuickModel<IUser> {
 *   @Field('bigint') balance!: bigint;
 *   @Field('regexp') pattern!: RegExp;
 *   @Field('int8array') bytes!: Int8Array;
 * }
 * ```
 */
export type FieldTypeString =
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
 * Metadata key symbol for storing the list of properties decorated with @Field().
 * Used internally by QuickModel to track which properties need serialization/deserialization.
 */
export const FIELDS_METADATA_KEY = Symbol('quickmodel:fields');

/**
 * Property decorator for marking QuickModel fields with automatic type handling.
 * 
 * Supports multiple ways to specify field types:
 * 1. **Auto-detection**: TypeScript's design:type for primitives (string, number, boolean, Date)
 * 2. **String literals**: Type-safe string literals with IntelliSense ('bigint', 'regexp', etc.)
 * 3. **Native constructors**: Direct constructor references (RegExp, Int8Array, etc.)
 * 4. **Symbols**: Original symbol-based approach (BigIntField, RegExpField, etc.)
 * 5. **Model classes**: For nested models and arrays of models
 * 
 * @template T - The property type
 * @param typeOrClass - Optional: Constructor, Symbol, or String literal for the field type
 * @returns A property decorator function
 * 
 * @example
 * **Auto-detection** (primitives and Date):
 * ```typescript
 * class User extends QuickModel<IUser> {
 *   @Field() name!: string;          // Auto-detected
 *   @Field() age!: number;            // Auto-detected
 *   @Field() active!: boolean;        // Auto-detected
 *   @Field() createdAt!: Date;        // Auto-detected
 * }
 * ```
 * 
 * @example
 * **String literals** (with IntelliSense):
 * ```typescript
 * class Account extends QuickModel<IAccount> {
 *   @Field('bigint') balance!: bigint;
 *   @Field('symbol') id!: symbol;
 *   @Field('regexp') pattern!: RegExp;
 *   @Field('int8array') bytes!: Int8Array;
 *   @Field('map') metadata!: Map<string, any>;
 * }
 * ```
 * 
 * @example
 * **Native constructors**:
 * ```typescript
 * class Binary extends QuickModel<IBinary> {
 *   @Field(RegExp) pattern!: RegExp;
 *   @Field(Error) lastError!: Error;
 *   @Field(Int8Array) bytes!: Int8Array;
 *   @Field(ArrayBuffer) buffer!: ArrayBuffer;
 * }
 * ```
 * 
 * @example
 * **Symbol-based** (original approach):
 * ```typescript
 * class Account extends QuickModel<IAccount> {
 *   @Field(BigIntField) balance!: bigint;
 *   @Field(SymbolField) id!: symbol;
 *   @Field(RegExpField) pattern!: RegExp;
 * }
 * ```
 * 
 * @example
 * **Nested models**:
 * ```typescript
 * class User extends QuickModel<IUser> {
 *   @Field(Address) address!: Address;
 *   @Field(Vehicle) vehicles!: Vehicle[];  // Array of models
 * }
 * ```
 */
export function Field<T>(typeOrClass?: (new (data: any) => T) | symbol | FieldTypeString): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol): void {
    // Register the property in the fields list
    const existingFields = (Reflect.getMetadata(FIELDS_METADATA_KEY, target) as Array<string | symbol>) || [];
    if (!existingFields.includes(propertyKey)) {
      Reflect.defineMetadata(FIELDS_METADATA_KEY, [...existingFields, propertyKey], target);
    }

    if (typeof typeOrClass === 'string') {
      // String literal ('bigint', 'regexp', 'int8array', etc.)
      Reflect.defineMetadata('fieldType', typeOrClass, target, propertyKey);
    } else if (typeof typeOrClass === 'symbol') {
      // Type symbol (BigIntField, RegExpField, etc.)
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
  };
}
