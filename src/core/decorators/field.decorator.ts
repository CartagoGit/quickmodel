/**
 * Decorador universal para campos
 * SOLID - Open/Closed: Permite marcar campos sin modificar QuickModel
 */

import 'reflect-metadata';

/**
 * Tipos disponibles como string literals para IntelliSense
 * Permite usar @Field('regexp'), @Field('bigint'), etc. con autocompletado
 */
export type FieldTypeString =
  // Primitivos
  | 'string'
  | 'number'
  | 'boolean'
  // Tipos especiales con constructores
  | 'date'
  | 'regexp'
  | 'error'
  | 'url'
  | 'urlsearchparams'
  // Tipos especiales sin constructor usable
  | 'bigint'
  | 'symbol'
  // Colecciones
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
 * Decorador @Field() para marcar propiedades del modelo
 *
 * @param typeOrClass - Opcional: Constructor, Symbol o String literal para el tipo
 *
 * @example
 * ```typescript
 * class User extends QuickModel<IUser> {
 *   // Auto-detección
 *   @Field() name!: string;
 *   @Field() createdAt!: Date;
 *   
 *   // String literal (con IntelliSense)
 *   @Field('bigint') balance!: bigint;
 *   @Field('regexp') pattern!: RegExp;
 *   @Field('int8array') bytes!: Int8Array;
 *   
 *   // Constructor nativo
 *   @Field(RegExp) pattern!: RegExp;
 *   @Field(Int8Array) bytes!: Int8Array;
 *   
 *   // Symbol (forma original)
 *   @Field(BigIntField) balance!: bigint;
 *   @Field(RegExpField) pattern!: RegExp;
 *   
 *   // Modelos anidados
 *   @Field(Address) address!: Address;
 *   @Field(Vehicle) vehicles!: Vehicle[];
 * }
 * ```
 */
export function Field<T>(typeOrClass?: (new (data: any) => T) | symbol | FieldTypeString): any {
  return function (target: any, propertyKey?: string | symbol, _descriptor?: any) {
    // Compatibilidad con decorators legacy (experimentalDecorators: true)
    const key = propertyKey as string | symbol;

    if (typeof typeOrClass === 'string') {
      // String literal ('bigint', 'regexp', 'int8array', etc.)
      Reflect.defineMetadata('fieldType', typeOrClass, target, key);
    } else if (typeof typeOrClass === 'symbol') {
      // Símbolo de tipo especial (BigIntField, RegExpField, etc.)
      const symbolKey = typeOrClass.toString();
      Reflect.defineMetadata('fieldType', symbolKey, target, key);
    } else if (typeOrClass && typeof typeOrClass === 'function') {
      // Verificar si es un constructor nativo registrado (RegExp, Error, URL, etc.)
      // Los constructores nativos built-in de JS tienen nombres que coinciden con la función
      const nativeConstructors = [
        RegExp, Error, URL, URLSearchParams,
        Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
        Int32Array, Uint32Array, Float32Array, Float64Array,
        BigInt64Array, BigUint64Array, ArrayBuffer, DataView
      ];
      
      const isNativeConstructor = nativeConstructors.includes(typeOrClass as any);
      
      if (isNativeConstructor) {
        // Guardar como fieldType usando el constructor directamente
        Reflect.defineMetadata('fieldType', typeOrClass, target, key);
      } else {
        // Clase de modelo personalizada (para arrays o anidados)
        Reflect.defineMetadata('arrayElementClass', typeOrClass, target, key);
      }
    }
  };
}
