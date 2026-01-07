/**
 * @Quick() class decorator for automatic property registration.
 * 
 * This decorator automatically applies @QType() to all properties of a class,
 * eliminating the need for manual decoration of each property. It uses TypeScript's
 * design:type metadata to detect property types and applies the appropriate 
 * transformations.
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles automatic property registration
 * - Open/Closed: Extends QType functionality without modifying it
 * - Don't Repeat Yourself: Eliminates repetitive @QType() decorators
 * 
 * @example
 * **Without @Quick()** (verbose):
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() id!: string;
 *   @QType() name!: string;
 *   @QType() email!: string;
 *   @QType() age!: number;
 *   @QType() createdAt!: Date;
 * }
 * ```
 * 
 * @example
 * **With @Quick()** (concise):
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   id!: string;
 *   name!: string;
 *   email!: string;
 *   age!: number;
 *   createdAt!: Date;
 * }
 * ```
 * 
 * @example
 * **Special types still work**:
 * ```typescript
 * @Quick()
 * class Account extends QModel<IAccount> {
 *   id!: string;
 *   balance!: bigint;      // Auto-detected
 *   pattern!: RegExp;      // Auto-detected
 *   createdAt!: Date;      // Auto-detected
 *   metadata!: Map<string, any>;  // Auto-detected
 * }
 * ```
 * 
 * @example
 * **Mix with @QType() for specific control**:
 * ```typescript
 * @Quick()
 * class Product extends QModel<IProduct> {
 *   id!: string;           // Auto from @Quick()
 *   name!: string;         // Auto from @Quick()
 *   
 *   @QType(Category)       // Explicit for nested model
 *   category!: Category;
 *   
 *   @QType(Tag)           // Explicit for array of models
 *   tags!: Tag[];
 * }
 * ```
 */

import 'reflect-metadata';
import { QType } from './qtype.decorator';

const QUICK_DECORATOR_KEY = '__quickModel__';

/**
 * Class decorator that automatically applies @QType() to all properties.
 * 
 * Properties are inferred from the data passed to the constructor.
 * 
 * **IMPORTANT:** Properties MUST be declared with `declare` keyword because they are
 * initialized dynamically in the base class constructor. This is the semantically
 * correct approach for properties that are initialized externally.
 * 
 * @returns A class decorator function
 * 
 * @example
 * **✅ Correct: Use `declare` keyword:**
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   declare id: string;       // ✅ Semantically correct
 *   declare name: string;     // ✅ Properties initialized by QModel
 *   declare age: number;      // ✅ Works with modern TypeScript
 * }
 * 
 * const user = new User({ id: '1', name: 'Alice', age: 30 });
 * console.log(user.id); // '1' - value preserved
 * ```
 * 
 * @example
 * **❌ Incorrect: Using `!` for dynamically initialized properties:**
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   id!: string;    // ❌ Tells TS "I will initialize this"
 *   name!: string;  // ❌ But QModel initializes it, not you
 * }
 * 
 * const user = new User({ id: '1', name: 'Alice' });
 * console.log(user.id); // undefined - field initialization resets value
 * ```
 * 
 * @remarks
 * **Why `declare` is the correct choice:**
 * 
 * - **Semantic correctness**: `declare` means "this property exists but is initialized externally"
 * - **ES2022+ compatibility**: Works with modern `useDefineForClassFields: true`
 * - **Universal support**: Bun, tsc, esbuild all handle it the same way
 * - **Not a workaround**: This is the proper TypeScript pattern for this use case
 * 
 * **What about `!`?**
 * - `id!: string` means "I definitely assign this"
 * - But QModel's base constructor assigns it, not the subclass
 * - With `useDefineForClassFields: true` (ES2022+), `!` generates field initialization that runs AFTER constructor
 * - This resets values assigned by the base constructor
 * 
 * @see {@link QType} for manual property decoration
 */
export function Quick(): ClassDecorator {
  return function <T extends Function>(target: any): T | void {
    // Mark class as using @Quick() for auto-registration
    Reflect.defineMetadata(QUICK_DECORATOR_KEY, true, target);
    
    // Note: We can't register properties here because we don't have data yet
    // Properties will be registered on first instantiation
    
    // Wrap constructor to register properties on FIRST instantiation BEFORE constructor runs
    const originalConstructor = target;
    let propertiesRegistered = false;
    
    const wrappedConstructor: any = function(this: any, ...args: any[]) {
      // On first instantiation, register properties BEFORE calling original constructor
      if (!propertiesRegistered && args[0]) {
        const data = args[0];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const properties = Object.keys(data);
          
          for (const propertyKey of properties) {
            // Check if already decorated
            const existingFieldType = Reflect.getMetadata('fieldType', originalConstructor.prototype, propertyKey);
            const existingArrayClass = Reflect.getMetadata('arrayElementClass', originalConstructor.prototype, propertyKey);
            
            if (existingFieldType === undefined && existingArrayClass === undefined) {
              const value = data[propertyKey];
              
              // Infer type and set metadata
              if (value !== null && value !== undefined) {
                const inferredType = value.constructor;
                Reflect.defineMetadata('design:type', inferredType, originalConstructor.prototype, propertyKey);
              }
              
              // Apply @QType() decorator
              const decorator = QType();
              decorator(originalConstructor.prototype, propertyKey);
            }
          }
          
          propertiesRegistered = true;
        }
      }
      
      // Call original constructor
      return Reflect.construct(originalConstructor, args, wrappedConstructor);
    };
    
    // Copy prototype and static members
    wrappedConstructor.prototype = originalConstructor.prototype;
    Object.setPrototypeOf(wrappedConstructor, originalConstructor);
    
    for (const key of Object.getOwnPropertyNames(originalConstructor)) {
      if (key !== 'prototype' && key !== 'length' && key !== 'name') {
        const descriptor = Object.getOwnPropertyDescriptor(originalConstructor, key);
        if (descriptor) {
          Object.defineProperty(wrappedConstructor, key, descriptor);
        }
      }
    }
    
    Object.defineProperty(wrappedConstructor, 'name', {
      value: originalConstructor.name,
      writable: false,
      configurable: true
    });
    
    return wrappedConstructor as T;
  };
}

/**
 * Checks if a class is decorated with @Quick()
 * @internal
 */
export function isQuickDecorated(constructor: Function): boolean {
  return Reflect.getMetadata(QUICK_DECORATOR_KEY, constructor) === true;
}

