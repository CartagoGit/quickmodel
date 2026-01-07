/**
 * Decorador universal para campos
 * SOLID - Open/Closed: Permite marcar campos sin modificar QuickModel
 */

import 'reflect-metadata';

/**
 * Decorador @Field() para marcar propiedades del modelo
 *
 * @param typeOrClass - Opcional: Constructor de clase para modelos anidados o Symbol para tipos especiales
 *
 * @example
 * ```typescript
 * class User extends QuickModel<IUser> {
 *   @Field() name!: string;                    // Campo básico
 *   @Field(BigIntField) balance!: bigint;       // Campo con tipo especial
 *   @Field(Address) address!: Address;          // Modelo anidado
 *   @Field(Vehicle) vehicles!: Vehicle[];       // Array de modelos
 * }
 * ```
 */
export function Field<T>(typeOrClass?: (new (data: any) => T) | symbol): any {
  return function (target: any, propertyKey?: string | symbol, _descriptor?: any) {
    // Compatibilidad con decorators legacy (experimentalDecorators: true)
    const key = propertyKey as string | symbol;

    if (typeof typeOrClass === 'symbol') {
      // Símbolo de tipo especial (BigIntField, RegExpField, etc.)
      const symbolKey = typeOrClass.toString();
      Reflect.defineMetadata('fieldType', symbolKey, target, key);
    } else if (typeOrClass && typeof typeOrClass === 'function') {
      // Clase de modelo (para arrays o anidados)
      Reflect.defineMetadata('arrayElementClass', typeOrClass, target, key);
    }
  };
}
