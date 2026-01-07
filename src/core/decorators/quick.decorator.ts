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
const QUICK_TYPE_MAP_KEY = '__quickTypeMap__';

/**
 * Options for @Quick() decorator to specify property types explicitly
 */
export interface QuickOptions {
  [propertyName: string]: any;
}

/**
 * Class decorator that automatically applies @QType() to all properties.
 * 
 * Properties are inferred from the data passed to the constructor.
 * 
 * **IMPORTANT:** This decorator **only works with `declare` keyword**.
 * Properties with `!` (definite assignment) will NOT work due to how
 * TypeScript compiles field initialization with `useDefineForClassFields: true`.
 * 
 * @param typeMap Optional mapping of property names to their target types (Set, Map, etc.)
 * @returns A class decorator function
 * 
 * @example
 * **✅ CORRECT - Use `declare`:**
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   declare id: string;       // ✅ Works
 *   declare name: string;     // ✅ Works
 *   declare createdAt: Date;  // ✅ Works - autodetected from ISO string
 * }
 * ```
 * 
 * @example
 * **✅ With type mapping for Set/Map:**
 * ```typescript
 * @Quick({ tags: Set, metadata: Map })
 * class User extends QModel<IUser> {
 *   declare tags: Set<string>;           // ✅ Array → Set
 *   declare metadata: Map<string, any>;  // ✅ Array pairs → Map
 * }
 * ```
 * 
 * @example
 * **❌ INCORRECT - Don't use `!`:**
 * ```typescript
 * @Quick()
 * class User extends QModel<IUser> {
 *   id!: string;      // ❌ Won't work
 *   name!: string;    // ❌ Won't work
 * }
 * ```
 * 
 * @remarks
 * **Why only `declare` works:**
 * 
 * With `useDefineForClassFields: true` (ES2022+):
 * - `declare` means "this property exists but is not initialized here"
 * - `!` means "I will definitely assign this" and generates initialization code
 * - That initialization code runs AFTER the constructor, overwriting values
 * 
 * For `!` syntax, use `@QType()` on each property instead:
 * ```typescript
 * class User extends QModel<IUser> {
 *   @QType() id!: string;
 *   @QType() name!: string;
 * }
 * ```
 * 
 * @see {@link QType} for the decorator that works with both syntaxes
 */
export function Quick(typeMap?: QuickOptions): ClassDecorator {
  return function <T extends Function>(target: any): T | void {
    // Mark class as using @Quick() for auto-registration
    Reflect.defineMetadata(QUICK_DECORATOR_KEY, true, target);
    
    // Store type map if provided
    if (typeMap) {
      Reflect.defineMetadata(QUICK_TYPE_MAP_KEY, typeMap, target);
    }
    
    // Wrap constructor to register properties on first instantiation
    const originalConstructor = target;
    let propertiesRegistered = false;
    
    // Track values set during construction to restore after field initialization
    const constructorValues = new WeakMap<any, Map<string, any>>();
    
    const wrappedConstructor: any = function(this: any, ...args: any[]) {
      // On first instantiation, register properties BEFORE calling original constructor
      if (!propertiesRegistered && args[0]) {
        const data = args[0];
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const properties = Object.keys(data);
          const typeMap = Reflect.getMetadata(QUICK_TYPE_MAP_KEY, originalConstructor) || {};
          
          for (const propertyKey of properties) {
            // Check if already decorated
            const existingFieldType = Reflect.getMetadata('fieldType', originalConstructor.prototype, propertyKey);
            const existingArrayClass = Reflect.getMetadata('arrayElementClass', originalConstructor.prototype, propertyKey);
            
            // Skip if property already has @QType() decorator
            if (existingFieldType !== undefined || existingArrayClass !== undefined) {
              continue;
            }
            
            // Get the declared type from TypeScript metadata (if available)
            // Note: design:type is only emitted when property has a decorator
            const designType = Reflect.getMetadata('design:type', originalConstructor.prototype, propertyKey);
            
            // Check if type is specified in typeMap
            const mappedType = typeMap[propertyKey];
            
            if (mappedType) {
              // Use explicitly mapped type
              Reflect.defineMetadata('design:type', mappedType, originalConstructor.prototype, propertyKey);
            } else if (designType) {
              // TypeScript metadata available
              // Transformers will handle the conversion from arrays to Set/Map
            } else {
                // No metadata available - need to infer from value
                // @Quick() doesn't work with declare/! because TypeScript doesn't emit metadata
                // We need to detect the type from the actual value
                const value = data[propertyKey];
                
                if (value !== null && value !== undefined) {
                  // Detect special types by checking the actual value
                  let inferredType = value.constructor;
                  
                  // Special detection for Date strings (ISO format)
                  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                    inferredType = Date;
                  }
                  // Special detection for BigInt strings (very large numbers)
                  else if (typeof value === 'string' && /^\d{15,}$/.test(value)) {
                    inferredType = BigInt;
                  }
                  // RegExp objects with __type marker
                  else if (value && typeof value === 'object' && value.__type === 'regexp') {
                    inferredType = RegExp;
                  }
                  // Symbol objects with __type marker
                  else if (value && typeof value === 'object' && value.__type === 'symbol') {
                    inferredType = Symbol;
                  }
                  // Map objects with __type marker or array of entries
                  else if (value && typeof value === 'object' && value.__type === 'Map') {
                    inferredType = Map;
                  }
                  // Set objects with __type marker or plain array
                  else if (value && typeof value === 'object' && value.__type === 'Set') {
                    inferredType = Set;
                  }
                  
                  Reflect.defineMetadata('design:type', inferredType, originalConstructor.prototype, propertyKey);
                }
              }
              
              // Apply @QType() decorator to register the transformer
              const decorator = QType();
              decorator(originalConstructor.prototype, propertyKey);
            }
          
          propertiesRegistered = true;
        }
      }
      
      // Call original constructor
      const instance = Reflect.construct(originalConstructor, args, wrappedConstructor);
      
      // For ! syntax: Prevent field initialization from overwriting constructor-set values
      // This runs after TypeScript's field initialization code
      if (args[0] && typeof args[0] === 'object') {
        const data = args[0];
        // Use setTimeout to run after field initialization completes
        Promise.resolve().then(() => {
          for (const [propertyKey, value] of Object.entries(data)) {
            if (instance[propertyKey] === undefined && value !== undefined) {
              // Field was reset by TypeScript field initialization, restore it
              Object.defineProperty(instance, propertyKey, {
                value: instance.__deserializedValues?.[propertyKey] || value,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        });
      }
      
      return instance;
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

