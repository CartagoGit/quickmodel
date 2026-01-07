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
 * **Works with both `declare` and `!` syntax:**
 * 
 * @returns A class decorator function
 * 
 * @example
 * **With `declare` keyword:**
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   declare id: string;       // ✅ Works perfectly
 *   declare name: string;     // ✅ Properties initialized by QModel
 *   declare age: number;      // ✅ Semantically correct
 * }
 * 
 * const user = new User({ id: '1', name: 'Alice', age: 30 });
 * console.log(user.id); // '1' - value preserved
 * ```
 * 
 * @example
 * **With `!` (definite assignment):**
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   id!: string;      // ✅ Also works!
 *   name!: string;    // ✅ @Quick() handles field initialization
 *   age!: number;     // ✅ Values preserved correctly
 * }
 * 
 * const user = new User({ id: '1', name: 'Alice', age: 30 });
 * console.log(user.id); // '1' - value preserved
 * ```
 * 
 * @remarks
 * **How it works:**
 * 
 * - Registers properties dynamically on first instantiation
 * - Applies @QType() automatically to all properties from the input data
 * - Handles both `declare` and `!` syntax by preserving values after field initialization
 * - Works with `useDefineForClassFields: true` (ES2022+)
 * 
 * @see {@link QType} for manual property decoration
 */
export function Quick(): ClassDecorator {
  return function <T extends Function>(target: any): T | void {
    // Mark class as using @Quick() for auto-registration
    Reflect.defineMetadata(QUICK_DECORATOR_KEY, true, target);
    
    // Wrap constructor to register properties
    const originalConstructor = target;
    let propertiesRegistered = false;
    
    const wrappedConstructor: any = function(this: any, ...args: any[]) {
      // Store the data before calling constructor
      const data = args[0];
      
      // On first instantiation, register properties BEFORE calling original constructor
      if (!propertiesRegistered && data && typeof data === 'object' && !Array.isArray(data)) {
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
      
      // Call original constructor
      const instance = Reflect.construct(originalConstructor, args, wrappedConstructor);
      
      // Wrap instance with Proxy to handle field initialization
      // This prevents properties with `!` from being reset to undefined
      return new Proxy(instance, {
        set(target: any, property: string | symbol, value: any, receiver: any): boolean {
          // If trying to set undefined after initialization, ignore it
          if (value === undefined && property in target && target[property] !== undefined) {
            // Property already has a value, don't overwrite with undefined
            return true;
          }
          // Otherwise, set normally
          return Reflect.set(target, property, value, receiver);
        }
      });
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

